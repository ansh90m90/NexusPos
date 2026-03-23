import type { AccountState, Operation, Product, Customer, User, Promotion, Dish, RawMaterial, Supplier, Transaction, PurchaseOrder, PurchaseOrderItem, Batch, KitchenOrder, AppNotification, CartItem, ProductVariant, StockAdjustmentReason, StockAdjustment, ItemType, Expense, AppSettings, HeldCart } from './types';

// A helper to get the next numeric ID for an array of items.
function getNextId<T extends { id: number | string }>(items: T[]): number {
    if (!items || items.length === 0) return 1;
    const numericIds = items.map(item => typeof item.id === 'string' ? 0 : item.id).filter(id => !isNaN(id));
    return Math.max(0, ...numericIds) + 1;
}


// Main reducer function. It should not mutate the original state.
export function applyOperation(state: AccountState, operation: Operation): AccountState {
    const payload = operation.payload;
    // Deep copy for safety, although can be optimized later if performance is an issue.
    const newState = JSON.parse(JSON.stringify(state)) as AccountState;
    const now = new Date().toISOString();

    const addHistory = (action: 'create' | 'update' | 'delete' | 'restore', itemType: ItemType, itemId: number | string, itemName: string, details?: string) => {
        newState.history.push({
            id: `hist-${Date.now()}`,
            timestamp: now,
            user: payload.user || 'System',
            action,
            itemType,
            itemId,
            itemName,
            details,
        });
    }

    switch (operation.type) {
        case 'CREATE_TRANSACTION': {
            const { transaction } = payload as { transaction: Transaction };
            transaction.date = now;
            
            let calculatedProfit = 0;

            for (const cartItem of transaction.items) {
                const item = cartItem.item;
                if (item.id < 0) { // Custom items have no cost, profit is the full price
                    calculatedProfit += cartItem.appliedPrice * cartItem.quantity;
                    continue; 
                }

                if ('productId' in item) { // It's a ProductVariant
                    const variantId = item.id;
                    let quantityToDeduct = cartItem.quantity;
                    
                    if (newState.appSettings.enableAdvancedInventory) {
                        // FIFO logic using batches
                        const relevantBatches = newState.batches
                            .filter(b => String(b.variantId) === String(variantId))
                            .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());

                        for (const batch of relevantBatches) {
                            if (quantityToDeduct <= 0) break;

                            const deductFromThisBatch = Math.min(quantityToDeduct, batch.quantity);
                            
                            calculatedProfit += (cartItem.appliedPrice - batch.netPurchasePrice) * deductFromThisBatch;
                            
                            batch.quantity -= deductFromThisBatch;
                            quantityToDeduct -= deductFromThisBatch;
                        }

                        // If still quantity to deduct (oversold), use variant's average cost for profit calculation
                        if (quantityToDeduct > 0) {
                            calculatedProfit += (cartItem.appliedPrice - item.netPurchasePrice) * quantityToDeduct;
                        }

                        // Remove empty batches
                        newState.batches = newState.batches.filter(b => b.quantity > 0);

                        // Recalculate total stock for the variant from remaining batches to ensure consistency
                        const product = newState.products.find(p => String(p.id) === String(item.productId));
                        const variant = product?.variants.find(v => String(v.id) === String(variantId));
                        if (variant) {
                            const newStock = newState.batches
                                .filter(b => String(b.variantId) === String(variantId))
                                .reduce((sum, b) => sum + b.quantity, 0);
                            variant.stock = newStock;
                        }
                    } else {
                        // Simple logic if advanced inventory is off
                        calculatedProfit += (cartItem.appliedPrice - item.netPurchasePrice) * cartItem.quantity;
                        const product = newState.products.find(p => String(p.id) === String(item.productId));
                        const variant = product?.variants.find(v => String(v.id) === String(item.id));
                        if (variant) {
                            variant.stock -= cartItem.quantity;
                        }
                    }
                     const product = newState.products.find(p => String(p.id) === String(item.productId));
                     const variant = product?.variants.find(v => String(v.id) === String(item.id));
                     if (product && variant && product.minStock !== undefined && variant.stock < product.minStock) {
                        const lowStockNotificationExists = newState.notifications.some(n => n.link?.context?.variantId === variant?.id);
                        if (!lowStockNotificationExists) {
                            newState.notifications.push({
                                id: `lowstock-${variant.id}-${Date.now()}`,
                                type: 'low_stock',
                                message: `${product.name} (${variant.name}) is low on stock (${variant.stock} remaining).`,
                                link: { page: 'Products', context: { productId: product.id, variantId: variant.id } },
                                isRead: false,
                                timestamp: now
                            });
                        }
                     }

                } else { // It's a Dish
                    const ingredientCost = item.ingredients.reduce((cost, ing) => {
                        const material = newState.rawMaterials.find(rm => String(rm.id) === String(ing.id));
                        return cost + ((material?.purchasePrice || 0) * ing.quantity);
                    }, 0);
                    const dishCost = ingredientCost + (item.costOverhead || 0);
                    calculatedProfit += (cartItem.appliedPrice - dishCost) * cartItem.quantity;

                    item.ingredients.forEach(ingredient => {
                        const material = newState.rawMaterials.find(rm => String(rm.id) === String(ingredient.id));
                        if (material) {
                            material.stock -= ingredient.quantity * cartItem.quantity;
                        }
                    });
                }
            }
            transaction.profit = parseFloat(calculatedProfit.toFixed(2));

            newState.transactions.push(transaction);
            const customerName = transaction.customer ? ` to ${transaction.customer.name}` : '';
            addHistory('create', 'Sale', transaction.id, `Sale #${transaction.id.slice(-4)}${customerName}`, `Total: ₹${transaction.total.toFixed(2)}`);

            // 3. Update customer credit and loyalty points
            const creditPayment = transaction.payments.find(p => p.method === 'Credit');
            if (transaction.customer) {
                const customer = newState.customers.find(c => String(c.id) === String(transaction.customer!.id));
                if (customer) {
                    customer.lastActivity = now;
                    if (creditPayment) {
                        customer.creditBalance = parseFloat((customer.creditBalance + creditPayment.amount).toFixed(2));
                        customer.creditLedger.push({
                            id: getNextId(customer.creditLedger),
                            date: transaction.date,
                            details: 'Purchase',
                            amount: creditPayment.amount,
                            type: 'debit',
                            transactionId: transaction.id,
                        });
                    }
                    // Award loyalty points
                    if (newState.appSettings.loyaltyPointsPerRupee > 0) {
                        const pointsEarned = Math.floor(transaction.total * newState.appSettings.loyaltyPointsPerRupee);
                        if (pointsEarned > 0) {
                            customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;
                        }
                    }
                }
            }

            // 4. Create Kitchen Orders
            const dishItems = transaction.items.filter(i => 'ingredients' in i.item);
            if (dishItems.length > 0 && newState.appSettings.enableKitchenDisplay) {
                const newKitchenOrder: KitchenOrder = {
                    id: `KDS-${transaction.id}`,
                    orderNumber: transaction.id.slice(-4),
                    items: dishItems.map(ci => ({ dish: ci.item as Dish, quantity: ci.quantity })),
                    status: 'Pending',
                    timestamp: transaction.date,
                };
                newState.kitchenOrders.push(newKitchenOrder);
            }
            return newState;
        }
        
        case 'CANCEL_TRANSACTION': {
            const { transactionId } = payload;
            const transaction = newState.transactions.find(t => t.id === transactionId);
            if (!transaction || transaction.status === 'Cancelled') return newState;
            
            transaction.status = 'Cancelled';
            addHistory('delete', 'Sale', transactionId, `Transaction #${transactionId.slice(-4)}`);
            
            // Restore stock
            transaction.items.forEach(cartItem => {
                const item = cartItem.item;
                 if ('productId' in item) { // ProductVariant
                    const product = newState.products.find(p => String(p.id) === String(item.productId));
                    const variant = product?.variants.find(v => String(v.id) === String(item.id));
                    if (variant) {
                        if (newState.appSettings.enableAdvancedInventory) {
                            // Create a return batch instead of just adding to stock
                            const newReturnBatch: Batch = {
                                id: `B-RET-${Date.now()}-${variant.id}`,
                                variantId: variant.id,
                                quantity: cartItem.quantity,
                                receivedDate: now, // The date of the return
                                netPurchasePrice: variant.netPurchasePrice, // Use the variant's average price
                                batchNumber: 'RETURN'
                            };
                            newState.batches.push(newReturnBatch);

                            // Recalculate total stock for consistency
                            const newStock = newState.batches
                                .filter(b => String(b.variantId) === String(variant.id))
                                .reduce((sum, b) => sum + b.quantity, 0);
                            variant.stock = newStock;

                        } else {
                            // Simple logic: just add back to stock
                            variant.stock += cartItem.quantity;
                        }
                    }
                 } else { // Dish - Restore raw materials
                     item.ingredients.forEach(ingredient => {
                        const material = newState.rawMaterials.find(rm => String(rm.id) === String(ingredient.id));
                        if (material) {
                            material.stock += ingredient.quantity * cartItem.quantity;
                        }
                     });
                 }
            });

            // Revert credit and loyalty points
            if (transaction.customer) {
                const customer = newState.customers.find(c => String(c.id) === String(transaction.customer!.id));
                if(customer) {
                    customer.lastActivity = now;

                    // Revert credit
                    const creditPayment = transaction.payments.find(p => p.method === 'Credit');
                    if (creditPayment) {
                        customer.creditBalance = parseFloat((customer.creditBalance - creditPayment.amount).toFixed(2));
                        // Find and remove ledger entry
                        const ledgerIndex = customer.creditLedger.findIndex(l => l.transactionId === transactionId && l.type === 'debit');
                        if(ledgerIndex > -1) customer.creditLedger.splice(ledgerIndex, 1);
                    }
                    
                    // Revert loyalty points
                    if (newState.appSettings.loyaltyPointsPerRupee > 0) {
                        const pointsToRevert = Math.floor(transaction.total * newState.appSettings.loyaltyPointsPerRupee);
                        if (pointsToRevert > 0) {
                            customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) - pointsToRevert);
                        }
                    }
                }
            }
            return newState;
        }

        case 'SAVE_PRODUCT': {
            const { product: productData } = payload as { product: Partial<Product> };
            let details = '';

            if (productData.id && productData.id > 0) { // Edit
                const index = newState.products.findIndex(p => p.id === productData.id);
                if (index > -1) {
                    const originalProduct = newState.products[index];
                    const updatedProduct = { ...originalProduct, ...productData, updatedAt: now } as Product;
                    
                    const changes: string[] = [];
                    for (const key in productData) {
                        if (key !== 'id' && key !== 'variants' && originalProduct[key as keyof Product] !== productData[key as keyof Product]) {
                            changes.push(`Changed '${key}': "${originalProduct[key as keyof Product]}" -> "${productData[key as keyof Product]}"`);
                        }
                    }

                    if (productData.variants) {
                        const allVariants = newState.products.flatMap(p => p.variants);
                        updatedProduct.variants = productData.variants.map(v => {
                            const originalVariant = originalProduct.variants.find(ov => ov.id === v.id);
                            if (originalVariant) {
                                // Log changes for existing variant
                                const variantChanges: string[] = [];
                                for (const vKey in v) {
                                    if (vKey !== 'id' && originalVariant[vKey as keyof ProductVariant] !== v[vKey as keyof ProductVariant]) {
                                        variantChanges.push(`'${v.name}'-'${vKey}': "${originalVariant[vKey as keyof ProductVariant]}" -> "${v[vKey as keyof ProductVariant]}"`);
                                    }
                                }
                                if (variantChanges.length > 0) changes.push(...variantChanges);
                                return { ...originalVariant, ...v, updatedAt: now };
                            }
                            changes.push(`Added new variant: '${v.name}'`);
                            return { ...v, id: getNextId(allVariants), productId: updatedProduct.id, createdAt: now, updatedAt: now };
                        });
                    }
                    
                    details = changes.join('; ');
                    newState.products[index] = updatedProduct;
                    addHistory('update', 'Product', productData.id, productData.name || originalProduct.name, details);
                }
            } else { // Add
                const allVariants = newState.products.flatMap(p => p.variants);
                const newProduct: Product = {
                    id: getNextId(newState.products),
                    name: productData.name || 'New Product',
                    category: productData.category || 'General',
                    subCategory: productData.subCategory,
                    supplier: productData.supplier || '',
                    hsnCode: productData.hsnCode,
                    variants: [],
                    minStock: productData.minStock,
                    pricingType: productData.pricingType || 'fixed',
                    createdAt: now,
                    updatedAt: now
                };
                newProduct.variants = (productData.variants || []).map(v => {
                    const newId = getNextId(allVariants);
                    const newV = { ...v, id: newId, productId: newProduct.id, createdAt: now, updatedAt: now } as ProductVariant;
                    allVariants.push(newV);
                    return newV;
                });
                newState.products.push(newProduct);
                details = `Price: ${newProduct.variants[0]?.mrp}, Stock: ${newProduct.variants[0]?.stock}`;
                addHistory('create', 'Product', newProduct.id, newProduct.name, details);
            }
            return newState;
        }

        case 'DELETE_PRODUCT': {
            const product = newState.products.find(p => p.id === payload.productId);
            if (product) {
                product.isDeleted = true;
                product.updatedAt = now;
                addHistory('delete', 'Product', product.id, product.name);
            }
            return newState;
        }
        
        case 'SAVE_CUSTOMER': {
            const { customer: customerData } = payload as { customer: Partial<Customer> };
            let details = '';
            if (customerData.id && customerData.id > 0) {
                const index = newState.customers.findIndex(c => c.id === customerData.id);
                if (index > -1) {
                    const original = newState.customers[index];
                    const changes = Object.keys(customerData).map(key => {
                        if (key !== 'id' && original[key as keyof Customer] !== customerData[key as keyof Customer]) {
                            return `Changed '${key}': "${original[key as keyof Customer]}" -> "${customerData[key as keyof Customer]}"`;
                        }
                        return null;
                    }).filter(Boolean);
                    details = changes.join('; ');
                    newState.customers[index] = { ...original, ...customerData, updatedAt: now } as Customer;
                    addHistory('update', 'Customer', customerData.id, customerData.name || original.name, details);
                }
            } else {
                const newCustomer: Customer = {
                    creditBalance: 0,
                    creditLedger: [],
                    lastActivity: now,
                    loyaltyPoints: 0,
                    ...customerData,
                    id: getNextId(newState.customers),
                    createdAt: now,
                    updatedAt: now
                } as Customer;
                newState.customers.push(newCustomer);
                details = `Balance: ${newCustomer.creditBalance}`;
                addHistory('create', 'Customer', newCustomer.id, newCustomer.name, details);
            }
            return newState;
        }

        case 'DELETE_CUSTOMER': {
            const customer = newState.customers.find(c => c.id === payload.customerId);
            if (customer) {
                customer.isDeleted = true;
                customer.updatedAt = now;
                addHistory('delete', 'Customer', customer.id, customer.name);
            }
            return newState;
        }

        case 'ADD_CUSTOMER_PAYMENT': {
            const { customerId, amount } = payload;
            const customer = newState.customers.find(c => c.id === customerId);
            if (customer) {
                customer.creditBalance = parseFloat((customer.creditBalance - amount).toFixed(2));
                customer.lastActivity = now;
                customer.creditLedger.push({
                    id: getNextId(customer.creditLedger),
                    date: now,
                    details: 'Payment Received',
                    amount: amount,
                    type: 'credit',
                });
            }
            return newState;
        }
        
        case 'ADD_SUPPLIER_PAYMENT': {
            const { supplierId, amount } = payload;
            const supplier = newState.suppliers.find(s => s.id === supplierId);
            if (supplier) {
                supplier.creditBalance = parseFloat((supplier.creditBalance - amount).toFixed(2));
                supplier.creditLedger = supplier.creditLedger || [];
                supplier.creditLedger.push({
                    id: getNextId(supplier.creditLedger),
                    date: now,
                    details: 'Payment Paid',
                    amount: amount,
                    type: 'credit',
                });
                supplier.updatedAt = now;
            }
            return newState;
        }

        case 'UPDATE_CUSTOMER_AISUMMARY': {
            const { customerId, summary } = payload;
            const customer = newState.customers.find(c => c.id === customerId);
            if (customer) {
                customer.aiSummary = summary;
                customer.updatedAt = now;
            }
            return newState;
        }

        case 'CREATE_PURCHASE': {
            const { order, batches, newSupplierName } = payload as { order: PurchaseOrder, batches: (Omit<Batch, 'id'|'receivedDate'> & { productName?: string })[], newSupplierName?: string };
            
            if (newSupplierName) {
                const newSupplier: Supplier = {
                    id: getNextId(newState.suppliers),
                    name: newSupplierName,
                    contactPerson: '',
                    phone: '',
                    email: '',
                    address: '',
                    creditBalance: 0,
                    creditLedger: [],
                    createdAt: now,
                    updatedAt: now
                };
                newState.suppliers.push(newSupplier);
                order.supplierId = newSupplier.id;
                addHistory('create', 'Supplier', newSupplier.id, newSupplier.name, 'Created during purchase');
            }

            order.date = now;
            newState.purchaseOrders.push(order);
            const supplier = newState.suppliers.find(s => s.id === order.supplierId);
            if (supplier) {
                supplier.creditBalance += order.totalCost;
                supplier.creditLedger = supplier.creditLedger || [];
                supplier.creditLedger.push({
                    id: getNextId(supplier.creditLedger),
                    date: now,
                    details: `Purchase Order #${order.id.slice(-6)}`,
                    amount: order.totalCost,
                    type: 'debit',
                    transactionId: order.id
                });
            }

            addHistory('create', 'Purchase', order.id, `PO from ${supplier?.name || 'Unknown'}`, `Total: ₹${order.totalCost.toFixed(2)}`);
            
            batches.forEach(batch => {
                let variant: ProductVariant | undefined;
                let product: Product | undefined;
                
                let variantIdForBatch = batch.variantId;

                const matchingItem = order.items.find(i => (i.isNew && i.productName === batch.productName) || String(i.variantId) === String(batch.variantId));
                if (matchingItem?.isNew) {
                     const newProduct: Product = {
                        id: getNextId(newState.products),
                        name: matchingItem.productName!,
                        category: matchingItem.category!,
                        subCategory: matchingItem.subCategory,
                        supplier: supplier?.name || '',
                        hsnCode: matchingItem.hsnCode,
                        variants: [],
                        minStock: 10,
                        pricingType: 'fixed',
                        createdAt: now,
                        updatedAt: now
                    };
                    const newVariant: ProductVariant = {
                         id: getNextId(newState.products.flatMap(p => p.variants)),
                         productId: newProduct.id,
                         name: 'Standard',
                         mrp: matchingItem.mrp!,
                         netPurchasePrice: 0, // This will be calculated below
                         stock: 0,
                         sku: '',
                         createdAt: now,
                         updatedAt: now,
                    };
                    newProduct.variants.push(newVariant);
                    newState.products.push(newProduct);
                    variant = newVariant;
                    product = newProduct;
                    variantIdForBatch = newVariant.id;
                    matchingItem.variantId = newVariant.id; // Update original PO item
                    addHistory('create', 'Product', newProduct.id, newProduct.name, `Created from PO #${order.id.slice(-4)}`);
                } else {
                     for (const p of newState.products) {
                        const v = p.variants.find(v => String(v.id) === String(variantIdForBatch));
                        if(v) { variant = v; product = p; break; }
                     }
                }
                
                if(variant && matchingItem) {
                    const batchNetPrice = matchingItem.netRate;
                    // Update variant stock and average cost price
                    const oldTotalValue = variant.stock * variant.netPurchasePrice;
                    const newBatchValue = batch.quantity * batchNetPrice;
                    variant.stock += batch.quantity;
                    const newAverageCost = variant.stock > 0 ? (oldTotalValue + newBatchValue) / variant.stock : batchNetPrice;
                    variant.netPurchasePrice = parseFloat(newAverageCost.toFixed(4));
                    variant.updatedAt = now;
                    
                    // Add the new batch
                    newState.batches.push({ 
                        ...batch, 
                        variantId: variantIdForBatch,
                        id: `B-${Date.now()}-${Math.random()}`, 
                        receivedDate: order.date,
                        netPurchasePrice: batchNetPrice
                    } as Batch);
                }
            });
            return newState;
        }

        case 'SAVE_DISH': {
            const { dish } = payload;
            if (dish.id > 0) {
                const index = newState.dishes.findIndex(d => d.id === dish.id);
                if (index > -1) {
                    newState.dishes[index] = { ...newState.dishes[index], ...dish, updatedAt: now };
                    addHistory('update', 'Dish', dish.id, dish.name || newState.dishes[index].name);
                }
            } else {
                const newDish = { ...dish, id: getNextId(newState.dishes), createdAt: now, updatedAt: now };
                newState.dishes.push(newDish);
                addHistory('create', 'Dish', newDish.id, newDish.name);
            }
            return newState;
        }
        case 'DELETE_DISH': {
            const dish = newState.dishes.find(d => d.id === payload.dishId);
            if(dish) {
                dish.isDeleted = true;
                dish.updatedAt = now;
                addHistory('delete', 'Dish', dish.id, dish.name);
            }
            return newState;
        }
         case 'SAVE_RAW_MATERIAL': {
            const { material } = payload;
            if (material.id > 0) {
                const index = newState.rawMaterials.findIndex(rm => rm.id === material.id);
                if (index > -1) {
                    newState.rawMaterials[index] = { ...newState.rawMaterials[index], ...material, updatedAt: now };
                    addHistory('update', 'RawMaterial', material.id, material.name || newState.rawMaterials[index].name);
                }
            } else {
                const newMaterial = { ...material, id: getNextId(newState.rawMaterials), createdAt: now, updatedAt: now };
                newState.rawMaterials.push(newMaterial);
                addHistory('create', 'RawMaterial', newMaterial.id, newMaterial.name);
            }
            return newState;
        }
        case 'DELETE_RAW_MATERIAL': {
            const material = newState.rawMaterials.find(rm => rm.id === payload.materialId);
            if(material) {
                material.isDeleted = true;
                material.updatedAt = now;
                addHistory('delete', 'RawMaterial', material.id, material.name);
            }
            return newState;
        }
        case 'SAVE_SUPPLIER': {
            const { supplier } = payload;
            if (supplier.id > 0) {
                const index = newState.suppliers.findIndex(s => s.id === supplier.id);
                if (index > -1) {
                    newState.suppliers[index] = { ...newState.suppliers[index], ...supplier, updatedAt: now };
                    addHistory('update', 'Supplier', supplier.id, supplier.name || newState.suppliers[index].name);
                }
            } else {
                const newSupplier = { ...supplier, creditBalance: 0, creditLedger: [], id: getNextId(newState.suppliers), createdAt: now, updatedAt: now };
                newState.suppliers.push(newSupplier);
                addHistory('create', 'Supplier', newSupplier.id, newSupplier.name);
            }
            return newState;
        }
        case 'DELETE_SUPPLIER': {
             const supplier = newState.suppliers.find(s => s.id === payload.supplierId);
            if(supplier) {
                supplier.isDeleted = true;
                supplier.updatedAt = now;
                addHistory('delete', 'Supplier', supplier.id, supplier.name);
            }
            return newState;
        }

        case 'SAVE_USER': {
            const { user } = payload;
            if(user.id > 0) {
                 const index = newState.users.findIndex(u => u.id === user.id);
                 if (index > -1) {
                     newState.users[index] = { ...newState.users[index], ...user, updatedAt: now };
                     addHistory('update', 'User', user.id, user.name || newState.users[index].name);
                 }
            } else {
                const newUser = { ...user, id: getNextId(newState.users), createdAt: now, updatedAt: now };
                newState.users.push(newUser);
                addHistory('create', 'User', newUser.id, newUser.name);
            }
            return newState;
        }
        
        case 'DELETE_USER': {
            const admins = newState.users.filter(u => u.role === 'Admin' && !u.isDeleted);
            const userToDelete = newState.users.find(u => u.id === payload.userId);
            
            if (admins.length <= 1 && userToDelete && userToDelete.role === 'Admin') {
                console.error("Cannot delete the last admin.");
                // Optionally add an in-app notification here.
                return state; // Return original state, unchanged.
            }

            if (userToDelete) {
                userToDelete.isDeleted = true;
                userToDelete.updatedAt = now;
                addHistory('delete', 'User', userToDelete.id, userToDelete.name);
            }
            return newState;
        }

         case 'UPDATE_CURRENT_USER': {
            const { updateData, userId } = payload;
            const index = newState.users.findIndex(u => u.id === userId);
            if(index > -1) {
                newState.users[index].name = updateData.name;
                newState.users[index].email = updateData.email;
                newState.users[index].updatedAt = now;
                if(updateData.newPassword) newState.users[index].password = updateData.newPassword;
            }
            return newState;
        }

        case 'SAVE_PROMOTION': {
            const { promotion } = payload as { promotion: Partial<Promotion> };
            if (promotion.id) {
                const index = newState.promotions.findIndex(p => p.id === promotion.id);
                if (index > -1) {
                    newState.promotions[index] = { ...newState.promotions[index], ...promotion, updatedAt: now } as Promotion;
                    addHistory('update', 'Promotion', promotion.id, promotion.name || newState.promotions[index].name);
                }
            } else {
                const newPromotion = {
                    id: `promo-${Date.now()}`,
                    ...promotion,
                    createdAt: now,
                    updatedAt: now,
                } as Promotion;
                newState.promotions.push(newPromotion);
                addHistory('create', 'Promotion', newPromotion.id, newPromotion.name);
            }
            return newState;
        }

        case 'DELETE_PROMOTION': {
            const promo = newState.promotions.find(p => p.id === payload.promotionId);
            if (promo) {
                promo.isDeleted = true;
                promo.updatedAt = now;
                addHistory('delete', 'Promotion', promo.id, promo.name);
            }
            return newState;
        }

        case 'TOGGLE_PROMOTION_STATUS': {
            const promo = newState.promotions.find(p => p.id === payload.promotionId);
            if (promo) {
                promo.isActive = !promo.isActive;
                promo.updatedAt = now;
            }
            return newState;
        }

        case 'MARK_NOTIFICATIONS_READ': {
            newState.notifications.forEach(n => n.isRead = true);
            return newState;
        }
        
        case 'RESTORE_ITEM': {
            const { itemType, itemId } = payload;
            let item: any;
            switch(itemType) {
                case 'Product': item = newState.products.find(i => i.id === itemId); break;
                case 'Customer': item = newState.customers.find(i => i.id === itemId); break;
                case 'Supplier': item = newState.suppliers.find(i => i.id === itemId); break;
                case 'Dish': item = newState.dishes.find(i => i.id === itemId); break;
                case 'RawMaterial': item = newState.rawMaterials.find(i => i.id === itemId); break;
                case 'User': item = newState.users.find(i => i.id === itemId); break;
                case 'Promotion': item = newState.promotions.find(i => i.id === itemId); break;
                case 'Expense': item = newState.expenses.find(i => i.id === itemId); break;
            }
            if(item) {
                item.isDeleted = false;
                item.updatedAt = now;
                addHistory('restore', itemType, item.id, item.name || item.description);
            }
            return newState;
        }

        case 'ADJUST_STOCK': {
            const { variantId, productName, quantityChange, reason, notes } = payload;
            const variant = newState.products.flatMap(p => p.variants).find(v => v.id === variantId);
            
            if (variant) {
                if (newState.appSettings.enableAdvancedInventory) {
                    if (quantityChange > 0) { // Adding stock
                        const newBatch: Batch = {
                            id: `B-ADJ-${Date.now()}-${variantId}`,
                            variantId: variantId,
                            quantity: quantityChange,
                            receivedDate: now,
                            netPurchasePrice: variant.netPurchasePrice, // Use current average cost for the adjustment
                            batchNumber: 'ADJUST-ADD'
                        };
                        newState.batches.push(newBatch);
                    } else { // Removing stock
                        let quantityToRemove = Math.abs(quantityChange);
                        const relevantBatches = newState.batches
                            .filter(b => b.variantId === variantId)
                            .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());

                        for (const batch of relevantBatches) {
                            if (quantityToRemove <= 0) break;
                            const deductFromThisBatch = Math.min(quantityToRemove, batch.quantity);
                            batch.quantity -= deductFromThisBatch;
                            quantityToRemove -= deductFromThisBatch;
                        }
                        newState.batches = newState.batches.filter(b => b.quantity > 0);
                    }
                    // Always recalculate total stock from batches to ensure consistency
                    const newStock = newState.batches
                        .filter(b => b.variantId === variantId)
                        .reduce((sum, b) => sum + b.quantity, 0);
                    variant.stock = newStock;
                } else {
                    // Simple logic when advanced inventory is off
                    variant.stock += quantityChange;
                }

                variant.updatedAt = now;

                const product = newState.products.find(p => p.id === variant.productId);
                if (product && product.minStock && variant.stock < product.minStock) {
                    const lowStockNotificationExists = newState.notifications.some(n => n.link?.context?.variantId === variant.id);
                    if (!lowStockNotificationExists) {
                        newState.notifications.push({
                            id: `lowstock-${variant.id}-${Date.now()}`,
                            type: 'low_stock',
                            message: `${product.name} (${variant.name}) is low on stock (${variant.stock} remaining).`,
                            link: { page: 'Products', context: { productId: product.id, variantId: variant.id } },
                            isRead: false,
                            timestamp: now
                        });
                    }
                }

                const adjustment: StockAdjustment = {
                    id: `adj-${Date.now()}`,
                    timestamp: now,
                    user: payload.user || 'System',
                    variantId,
                    productName,
                    quantityChange,
                    reason,
                    notes,
                };
                newState.stockAdjustments.push(adjustment);
                addHistory('update', 'Product', variant.productId, productName, `Stock adjusted by ${quantityChange} for '${variant.name}' (${reason})`);
            }
            return newState;
        }
        
        case 'UPDATE_APP_SETTINGS': {
            const originalSettings = state.appSettings;
            const newSettings = { ...originalSettings, ...payload.settings };
            const changes = Object.keys(payload.settings).map(key => {
                if (originalSettings[key as keyof AppSettings] !== newSettings[key as keyof AppSettings]) {
                    return `Changed '${key}': "${originalSettings[key as keyof AppSettings]}" -> "${newSettings[key as keyof AppSettings]}"`;
                }
                return null;
            }).filter(Boolean).join('; ');

            newState.appSettings = newSettings;
            if (changes) {
                addHistory('update', 'Settings', 'appSettings', 'Application Settings', changes);
            }
            return newState;
        }
        case 'UPDATE_KITCHEN_ORDERS': {
            newState.kitchenOrders = payload.orders;
            // Recalculate allocated raw materials
            const newAllocation: Record<number, number> = {};
            newState.kitchenOrders.filter(o => o.status === 'Pending').forEach(order => {
                order.items.forEach(item => {
                    item.dish.ingredients.forEach(ing => {
                        newAllocation[ing.id] = (newAllocation[ing.id] || 0) + (ing.quantity * item.quantity);
                    });
                });
            });
            newState.allocatedRawMaterials = newAllocation;
            return newState;
        }

        case 'IMPORT_ACCOUNT_STATE': {
            const { newState: importedData } = payload as { newState: Omit<AccountState, 'id' | 'name' | 'lastSyncId'>};
            // Safely merge, preserving the current account's core identity and sync state.
            return {
                ...newState,
                ...importedData,
                id: newState.id,
                name: newState.name,
                lastSyncId: newState.lastSyncId,
            };
        }
        
        case 'SAVE_EXPENSE': {
            const { expense } = payload;
            if (expense.id) {
                const index = newState.expenses.findIndex(e => e.id === expense.id);
                if (index > -1) {
                    newState.expenses[index] = { ...newState.expenses[index], ...expense, updatedAt: now };
                    addHistory('update', 'Expense', expense.id, expense.description || newState.expenses[index].description);
                }
            } else {
                const newExpense = { ...expense, id: `exp-${Date.now()}`, createdAt: now, updatedAt: now };
                newState.expenses.push(newExpense);
                addHistory('create', 'Expense', newExpense.id, newExpense.description);
            }
            return newState;
        }

        case 'DELETE_EXPENSE': {
            const expense = newState.expenses.find(e => e.id === payload.expenseId);
            if(expense) {
                expense.isDeleted = true;
                expense.updatedAt = now;
                addHistory('delete', 'Expense', expense.id, expense.description);
            }
            return newState;
        }

        case 'UPDATE_HELD_CARTS': {
            newState.heldCarts = payload.carts;
            return newState;
        }

        default:
            console.warn(`Unhandled operation type: ${operation.type}`);
            return state;
    }
}