import type { Product, Dish, Customer, RawMaterial, PurchaseOrder, Transaction, Supplier, User, Reward, AppSettings, KitchenOrder, Batch, AppNotification, AccountState, Promotion, ShopType, Expense, HeldCart, ProductVariant, PaymentMethod } from '../types';

export const createInitialAccountState = (id: string, name: string, shopTypes: ShopType[]): AccountState => {
    const initialSettings: AppSettings = {
      shopTypes: shopTypes,
      masterEnabled: true,
      shopName: name,
      upiId: 'your-name@your-bank',
      showReceiptAfterSale: true,
      enableKitchenDisplay: false,
      enableRashanCategory: false,
      enableAdvancedInventory: true,
      enableStaffManagement: true,
      enableCreditSystem: true,
      enableWholesale: true,
      receiptFooter: 'Thank you for your visit!',
      defaultGstRate: 5,
      loyaltyPointsPerRupee: 0.1, // 1 point per Rs.10 spent
      tutorialCompleted: false,
      enableBarcodeScanner: true,
      enableQrScanner: true,
  };

  // Customize settings based on shop types
  if (shopTypes.includes('Restaurant')) {
      initialSettings.enableKitchenDisplay = true;
  }
  if (shopTypes.includes('Rashan')) {
      initialSettings.enableRashanCategory = true;
  }
   if (shopTypes.includes('Retail')) {
      initialSettings.enableRashanCategory = true; // Retail often includes groceries
  }


    return {
        id,
        name,
        users: [] as (User & { password?: string })[],
        products: [] as Product[],
        dishes: [] as Dish[],
        rawMaterials: [] as RawMaterial[],
        customers: [] as Customer[],
        suppliers: [] as Supplier[],
        transactions: [] as Transaction[],
        purchaseOrders: [] as PurchaseOrder[],
        kitchenOrders: [] as KitchenOrder[],
        batches: [] as Batch[],
        notifications: [] as AppNotification[],
        appSettings: initialSettings,
        rewards: [] as Reward[],
        promotions: [] as Promotion[],
        allocatedRawMaterials: {},
        lastSyncId: 0,
        history: [],
        stockAdjustments: [],
        expenses: [] as Expense[],
        heldCarts: [] as HeldCart[],
    }
};


// --- TEST ACCOUNT DATA ---
const productNames = ["Lays Classic", "Coca-Cola", "Amul Gold Milk", "Parle-G", "Maggi Noodles", "Surf Excel", "Tata Salt", "Dairy Milk", "Good Day", "Colgate MaxFresh", "Head & Shoulders", "Britannia Milk Bikis", "Haldiram's Bhujia", "Kissan Ketchup", "Nescafe Classic", "Aashirvaad Atta"];
const customerNames = ["Rohan Sharma", "Priya Patel", "Amit Singh", "Sunita Devi", "Vikram Kumar", "Anjali Mehta", "Rajesh Gupta", "Meena Joshi", "Sandeep Reddy", "Deepika Nair"];
const dishNames = ["Samosa", "Vada Pav", "Masala Dosa", "Paneer Tikka", "Chole Bhature", "Veg Biryani", "Pav Bhaji"];
const materialNames = ["Potato", "Onion", "Tomato", "Gram Flour", "Refined Oil", "Paneer", "Mixed Spices", "Bread Pav", "Rice", "Mixed Vegetables"];
const supplierNames = ["Pepsico India", "Hindustan Unilever", "ITC Limited", "Parle Products", "Nestle India", "Tata Consumer Products", "Amul Dairy", "Mondelez India", "Britannia Industries"];

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomDate = (): Date => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function getNextId<T extends { id: number | string }>(items: T[]): number {
    if (!items || items.length === 0) return 1;
    const numericIds = items.map(item => typeof item.id === 'string' ? 0 : item.id).filter(id => !isNaN(id));
    return Math.max(0, ...numericIds) + 1;
}

export const createTestAccountState = (): AccountState => {
    const state = createInitialAccountState('test-account', "Priya's General Store", ['Retail', 'Restaurant', 'Rashan']);
    state.isTest = true;
    state.appSettings.tutorialCompleted = true;

    state.users.push({ id: '999', name: 'Demo User', email: 'demo@example.com', role: 'Admin', accountId: 'test-account', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    
    supplierNames.forEach((name, i) => state.suppliers.push({ 
        id: i + 1, 
        name, 
        contactPerson: "Sales Rep", 
        phone: "9876543210", 
        email: `${name.split(' ')[0].toLowerCase()}@example.com`, 
        address: "Mumbai, India", 
        creditBalance: i % 3 === 0 ? randInt(1000, 5000) : 0,
        creditLedger: i % 3 === 0 ? [{id: 1, date: getRandomDate().toISOString(), details: "Opening Balance", amount: randInt(1000, 5000), type: 'debit'}] : [],
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
    }));
    
    materialNames.forEach((name, i) => state.rawMaterials.push({ id: i + 1, name, stock: randInt(500, 2000), unit: 'g', purchasePrice: randInt(1,5), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));

    let variantIdCounter = 1;
    productNames.forEach((name, i) => {
        const isRashan = name.includes('Atta') || name.includes('Salt');
        const p: Product = {
            id: i + 1, name, category: isRashan ? 'Rashan' : 'General', subCategory: isRashan ? 'Staples' : 'Snacks & Beverages',
            supplier: getRandomItem(supplierNames), minStock: 20, pricingType: isRashan ? 'per_unit' : 'fixed',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), variants: []
        };
        const numVariants = isRashan ? 1 : randInt(1, 2);
        for(let j=0; j<numVariants; j++) {
            const stock = randInt(10, 100);
            const v: ProductVariant = {
                id: variantIdCounter++, productId: p.id, name: isRashan ? 'per kg' : (numVariants > 1 ? (j === 0 ? 'Small' : 'Large') : 'Standard'),
                mrp: isRashan ? randInt(40, 60) : randInt(10, 50), netPurchasePrice: isRashan ? randInt(30, 40) : randInt(5, 40), stock, sku: `SKU${variantIdCounter}`,
                unit: isRashan ? 'kg' : 'pcs', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            };
            p.variants.push(v);

            // Create batches for this variant
            let remainingStock = stock;
            let batchCount = 0;
            while(remainingStock > 0 && batchCount < 3) {
                const batchQty = Math.min(remainingStock, randInt(10, 40));
                state.batches.push({ id: `B${v.id}-${batchCount}`, variantId: v.id, quantity: batchQty, receivedDate: getRandomDate().toISOString(), netPurchasePrice: v.netPurchasePrice * (1 - Math.random() * 0.1) });
                remainingStock -= batchQty;
                batchCount++;
            }
        }
        state.products.push(p);
    });

    dishNames.forEach((name, i) => {
        state.dishes.push({
            id: i + 1, name, price: randInt(50, 150), imageUrl: `https://placehold.co/400x300/a78bfa/FFFFFF/png?text=${name.replace(' ','+')}`,
            ingredients: Array.from({length: randInt(2,4)}, () => {
                const mat = getRandomItem(state.rawMaterials);
                return { id: mat.id, name: mat.name, quantity: randInt(10,50) }
            }),
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
    });

    customerNames.forEach((name, i) => {
        const creditBalance = Math.random() > 0.6 ? randInt(100, 1000) : 0;
        state.customers.push({
            id: i + 1, name, phone: `987654321${i}`, address: "Surat, Gujarat", creditBalance,
            enableSms: true, lastActivity: getRandomDate().toISOString(), tier: 'Retail', loyaltyPoints: randInt(50, 500),
            creditLedger: creditBalance > 0 ? [{id: 1, date: getRandomDate().toISOString(), details: "Initial Balance", amount: creditBalance, type: 'debit'}] : [],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
    });

    for(let i=0; i<50; i++) {
        const items: any[] = [];
        const numItems = randInt(1, 5);
        for(let j=0; j<numItems; j++) {
            const item = Math.random() > 0.3 ? getRandomItem(state.products).variants[0] : getRandomItem(state.dishes);
            items.push({ item, quantity: randInt(1,3), appliedPrice: 'mrp' in item ? item.mrp : item.price });
        }
        const subtotal = items.reduce((sum, i) => sum + i.appliedPrice * i.quantity, 0);
        const customer = Math.random() > 0.4 ? getRandomItem(state.customers) : undefined;
        const paymentMethods: PaymentMethod[] = ['Cash', 'Credit', 'Online'];
        const paymentMethod = getRandomItem(paymentMethods);
        
        const t: Transaction = {
            id: `TXN${Date.now()}-${i}`, date: getRandomDate().toISOString(), items, subtotal, total: subtotal,
            payments: [{ method: customer && paymentMethod === 'Credit' ? 'Credit' : 'Cash', amount: subtotal }],
            customer, status: 'Completed'
        };

        if (customer && t.payments[0].method === 'Credit') {
            const c = state.customers.find(c => c.id === customer.id)!;
            c.creditBalance += subtotal;
            c.creditLedger.push({ id: getNextId(c.creditLedger), date: t.date, details: "Purchase", amount: subtotal, type: 'debit', transactionId: t.id });
        }
        
        state.transactions.push(t);
    }
    
    return state;
};