import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import type { Product, Dish, Customer, CartItem, PaymentMethod, Transaction, ProductVariant, HeldCart, AppSettings, Payment, RawMaterial, Promotion } from '../types';
import Avatar from '../components/Avatar';
import SlideOverPanel from '../components/SlideOverPanel';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';

const getCartIngredients = (cart: CartItem[]): Record<number, number> => {
    const requirements: Record<number, number> = {};
    for (const cartItem of cart) {
        if ('ingredients' in cartItem.item) {
            for (const ingredient of cartItem.item.ingredients) {
                requirements[ingredient.id] = (requirements[ingredient.id] || 0) + (ingredient.quantity * cartItem.quantity);
            }
        }
    }
    return requirements;
};

interface POSProps {
  products: Product[];
  dishes: Dish[];
  rawMaterials: RawMaterial[];
  customers: Customer[];
  onTransaction: (transaction: Transaction) => void;
  appSettings: AppSettings;
  promotions: Promotion[];
  allocatedRawMaterials: Record<number, number>;
  heldCarts: HeldCart[];
  setHeldCarts: (updater: (prev: HeldCart[]) => HeldCart[]) => void;
  transactions: Transaction[];
  onUpdateAppSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onSaveCustomer: (customer: Partial<Customer>) => void;
}

const SingleVariantProductTile: React.FC<{ product: Product; onAdd: (variant: ProductVariant, element: HTMLDivElement) => void; isOutOfStock: boolean; }> = ({ product, onAdd, isOutOfStock }) => {
    const variant = product.variants.find(v => !v.isDeleted);
    const tileRef = React.useRef<HTMLDivElement>(null);
    if (!variant) return null;
    return (
        <Tooltip content={`Add ${product.name} to cart. Stock: ${variant.stock}`} position="top">
            <div 
                ref={tileRef}
                onClick={() => !isOutOfStock && tileRef.current && onAdd(variant, tileRef.current)}
                className={`bg-theme-surface rounded-lg border border-theme-main shadow-sm transition-all duration-200 flex flex-col p-2 relative group ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-500 hover:ring-1 hover:ring-primary-500 cursor-pointer hover:-translate-y-1 hover:shadow-lg'}`}
            >
                {isOutOfStock && <span className="absolute top-1 right-1 text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded-full">Sold Out</span>}
                <div className="flex-grow">
                    {product.subCategory && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5 text-slate-500 dark:text-slate-400 font-semibold">{product.subCategory}</span>}
                    <h3 className="font-bold text-theme-main mt-2 text-sm leading-tight break-words">
                        {product.name}
                    </h3>
                </div>
                <div className="mt-2 flex justify-between items-end">
                    <p className="text-lg font-extrabold text-primary-600 dark:text-primary-400">
                        ₹{variant.mrp}
                    </p>
                    <p className="text-xs text-theme-muted">
                        Stock: {variant.stock}
                    </p>
                </div>
            </div>
        </Tooltip>
    );
};

const MasterProductTile: React.FC<{ product: Product; onAddVariant: (variant: ProductVariant, element: HTMLDivElement) => void; cart: CartItem[] }> = ({ product, onAddVariant, cart }) => {
    const tileRef = React.useRef<HTMLDivElement>(null);
    return (
        <Tooltip content={`Select a variant for ${product.name}`} position="top">
            <div ref={tileRef} className="bg-theme-surface rounded-lg border border-theme-main shadow-sm transition-all duration-200 flex flex-col p-2 hover:border-primary-500 hover:ring-1 hover:ring-primary-500 hover:shadow-lg">
                <div className="flex-grow">
                    {product.subCategory && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5 text-slate-500 dark:text-slate-400 font-semibold">{product.subCategory}</span>}
                    <h3 className="font-bold text-theme-main mt-2 text-sm leading-tight break-words">
                        {product.name}
                    </h3>
                </div>
                <div className="flex flex-col gap-1.5 mt-2 max-h-24 overflow-y-auto pr-1">
                    {product.variants.filter(v => !v.isDeleted).map(variant => {
                        const quantityInCart = cart.find(ci => 'productId' in ci.item && ci.item.id === variant.id)?.quantity || 0;
                        const isOutOfStock = variant.stock <= quantityInCart;
                        return (
                            <button
                                key={variant.id}
                                onClick={() => !isOutOfStock && tileRef.current && onAddVariant(variant, tileRef.current)}
                                disabled={isOutOfStock}
                                className="w-full flex justify-between items-center px-2 py-1 rounded-md text-xs font-semibold bg-theme-main border border-theme-main hover:bg-primary-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={`Stock: ${variant.stock}`}
                            >
                                <span>{variant.name}</span>
                                <span className="font-bold">₹{variant.mrp}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </Tooltip>
    );
};

const DishTile: React.FC<{ dish: Dish; onAdd: (dish: Dish, element: HTMLDivElement) => void; isOutOfStock: boolean; }> = ({ dish, onAdd, isOutOfStock }) => {
    const tileRef = React.useRef<HTMLDivElement>(null);
    return (
        <Tooltip content={`Add ${dish.name} to cart. Price: ₹${dish.price}`} position="top">
            <div
                ref={tileRef}
                onClick={() => !isOutOfStock && tileRef.current && onAdd(dish, tileRef.current)}
                className={`rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200 relative group overflow-hidden ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:-translate-y-1'}`}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>
                <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div className="absolute bottom-0 left-0 p-2 z-20 text-white">
                    <h3 className="font-bold text-sm leading-tight break-words">{dish.name}</h3>
                    <p className="text-lg font-extrabold">₹{dish.price}</p>
                </div>
                {isOutOfStock && <span className="absolute top-1 right-1 text-xs font-bold text-red-100 bg-red-600/80 px-1.5 py-0.5 rounded-full z-20">Sold Out</span>}
            </div>
        </Tooltip>
    );
};

// FIX: Add `products` to props to resolve 'Cannot find name' error and refactor name logic for better type safety.
const CartItemComponent: React.FC<{ cartItem: CartItem, onUpdate: (quantity: number) => void, onRemove: () => void, products: Product[] }> = ({ cartItem, onUpdate, onRemove, products }) => {
    const { item, quantity } = cartItem;
    const isWeightBased = 'unit' in item && ['kg', 'g', 'l', 'ml'].includes(item.unit || '');
    
    let name: string;
    if ('productId' in item) {
        const product = products.find(p => p.id === item.productId);
        name = (product?.name || 'Product') + ` (${item.name})`;
    } else {
        name = item.name;
    }

    return (
        <li className="flex items-center gap-3 py-2">
            <div className="flex-grow">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{name}</p>
                <p className="text-xs text-slate-500">₹{cartItem.appliedPrice.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onUpdate(quantity - 1)} disabled={isWeightBased} className="p-1 rounded-full bg-slate-200 dark:bg-slate-600 disabled:opacity-50 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"><Icon name="remove" className="w-4 h-4" /></button>
                <span className="font-bold w-6 text-center">{quantity}</span>
                <button onClick={() => onUpdate(quantity + 1)} disabled={isWeightBased} className="p-1 rounded-full bg-slate-200 dark:bg-slate-600 disabled:opacity-50 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"><Icon name="plus" className="w-4 h-4" /></button>
            </div>
            <p className="font-bold w-16 text-right">₹{(quantity * cartItem.appliedPrice).toFixed(2)}</p>
            <Tooltip content="Remove Item" position="left">
                <button onClick={onRemove} className="p-1 text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><Icon name="delete" className="w-4 h-4" /></button>
            </Tooltip>
        </li>
    );
};

const CartView: React.FC<{
    cart: CartItem[],
    customer: Customer | null,
    onUpdateItem: (itemId: number | string, quantity: number, isProduct: boolean) => void,
    onRemoveItem: (itemId: number | string, isProduct: boolean) => void,
    onClearCart: () => void,
    onHoldCart: () => void,
    onSelectCustomer: () => void,
    onPay: (total: number, subtotal: number, discount?: any) => void,
    promotions: Promotion[],
    products: Product[],
    topCustomers: Customer[],
    onSetCustomer: (customer: Customer | null) => void;
    extraCharges: { description: string, amount: number }[];
    onAddExtraCharge: (charge: { description: string, amount: number }) => void;
    onRemoveExtraCharge: (index: number) => void;
    onOpenCustomCharge: () => void;
}> = ({ cart, customer, onUpdateItem, onRemoveItem, onHoldCart, onSelectCustomer, onPay, promotions, products, topCustomers, onSetCustomer, extraCharges, onRemoveExtraCharge, onOpenCustomCharge }) => {
    const { subtotal, total, discountInfo } = useMemo(() => {
        const sub = cart.reduce((acc, item) => acc + item.appliedPrice * item.quantity, 0);
        const extra = extraCharges.reduce((acc, c) => acc + c.amount, 0);
        let bestDiscount = 0;
        let appliedPromotion: Promotion | null = null;

        const activePromotions = promotions.filter(p => p.isActive);

        for (const promo of activePromotions) {
            let eligibleAmount = 0;
            if (promo.conditions.minPurchase && sub < promo.conditions.minPurchase) continue;

            if (promo.conditions.appliesTo === 'ENTIRE_CART') {
                eligibleAmount = sub;
            } else if (promo.conditions.appliesTo === 'SPECIFIC_PRODUCTS') {
                cart.forEach(ci => {
                    if ('productId' in ci.item && promo.conditions.applicableIds?.includes(ci.item.id)) {
                        eligibleAmount += ci.appliedPrice * ci.quantity;
                    }
                });
            } else if (promo.conditions.appliesTo === 'SPECIFIC_CATEGORIES') {
                 // FIX: Add type guard to correctly narrow `ci.item` to `ProductVariant` before accessing `productId`.
                 cart.forEach(ci => {
                    const item = ci.item;
                    if ('productId' in item) {
                        const product = products.find(p => p.id === item.productId);
                        if (product && promo.conditions.applicableIds?.includes(product.subCategory || '')) {
                            eligibleAmount += ci.appliedPrice * ci.quantity;
                        }
                    }
                });
            }

            let currentDiscount = 0;
            if (promo.type === 'PERCENTAGE_OFF') {
                currentDiscount = eligibleAmount * (promo.value / 100);
            } else {
                currentDiscount = Math.min(eligibleAmount, promo.value);
            }

            if (currentDiscount > bestDiscount) {
                bestDiscount = currentDiscount;
                appliedPromotion = promo;
            }
        }
        
        const tot = sub + extra - bestDiscount;
        const discountInfo = appliedPromotion ? { promotionId: appliedPromotion.id, promotionName: appliedPromotion.name, amount: bestDiscount } : undefined;
        return { subtotal: sub, total: tot, discountInfo };
    }, [cart, promotions, products, extraCharges]);

    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
            <div className="p-3 border-b dark:border-slate-700">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">Current Order</h2>
                    <Tooltip content="Hold Order" position="bottom">
                        <button onClick={onHoldCart} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><Icon name="hold-order" className="w-5 h-5"/></button>
                    </Tooltip>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {customer ? (
                        <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 p-1.5 pr-3 rounded-full border border-primary-200 dark:border-primary-800/50">
                            <Avatar name={customer.name} className="w-8 h-8 text-xs" />
                            <div className="flex-grow">
                                <p className="text-xs font-bold text-primary-700 dark:text-primary-300">{customer.name}</p>
                                <p className="text-[10px] text-primary-600/70 dark:text-primary-400/70">₹{customer.creditBalance.toFixed(2)}</p>
                            </div>
                            <button onClick={() => onSetCustomer(null)} className="p-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-full transition-colors">
                                <Icon name="close" className="w-3 h-3 text-primary-600" />
                            </button>
                        </div>
                    ) : (
                        <>
                            {topCustomers.map((c, i) => (
                                <Tooltip key={`top-cust-${c.id}-${i}`} content={`Select ${c.name}`} position="bottom">
                                    <button onClick={() => onSetCustomer(c)} className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 hover:border-primary-500 transition-all overflow-hidden flex items-center justify-center">
                                        <Avatar name={c.name} className="w-full h-full text-[10px]" />
                                    </button>
                                </Tooltip>
                            ))}
                            {/* Two custom customer icons */}
                            <Tooltip content="Walk-in Customer" position="bottom">
                                <button onClick={() => onSetCustomer(null)} className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 hover:border-primary-500 transition-all flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                                    <Icon name="user" className="w-4 h-4 text-slate-400" />
                                </button>
                            </Tooltip>
                            <Tooltip content="Guest Customer" position="bottom">
                                <button onClick={() => onSetCustomer({ id: -1, name: 'Guest', phone: '', email: '', address: '', creditBalance: 0, transactions: [], createdAt: new Date().toISOString(), isDeleted: false })} className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 hover:border-primary-500 transition-all flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                                    <Icon name="user-plus" className="w-4 h-4 text-slate-400" />
                                </button>
                            </Tooltip>
                            <Tooltip content="Select More Customers" position="bottom">
                                <button onClick={onSelectCustomer} className="w-9 h-9 rounded-full border-2 border-dashed border-primary-300 dark:border-primary-700 hover:border-primary-500 hover:border-solid transition-all flex items-center justify-center text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                                    <Icon name="user-plus" className="w-5 h-5" />
                                </button>
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>

            <ul className="flex-grow p-3 overflow-y-auto divide-y dark:divide-slate-700">
                {cart.length === 0 ? (
                    <p className="text-center text-slate-500 py-10">Cart is empty</p>
                ) : cart.map(ci => {
                    const isProduct = 'productId' in ci.item;
                    const itemKey = `${isProduct ? 'p' : 'd'}-${ci.item.id}`;
                    return (
                        <CartItemComponent 
                            key={itemKey} 
                            cartItem={ci} 
                            onUpdate={(qty) => onUpdateItem(ci.item.id, qty, isProduct)} 
                            onRemove={() => onRemoveItem(ci.item.id, isProduct)} 
                            products={products} 
                        />
                    );
                })}
            </ul>

            <div className="p-3 border-t dark:border-slate-700 space-y-2 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-semibold">₹{subtotal.toFixed(2)}</span></div>
                {extraCharges.map((c, i) => (
                    <div key={`extra-${i}`} className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                            <span>{c.description}</span>
                            <button onClick={() => onRemoveExtraCharge(i)} className="text-red-500 hover:text-red-700"><Icon name="close" className="w-3 h-3" /></button>
                        </div>
                        <span className="font-semibold">₹{c.amount.toFixed(2)}</span>
                    </div>
                ))}
                {discountInfo && <div className="flex justify-between text-sm text-green-600"><span>Discount ({discountInfo.promotionName})</span><span className="font-semibold">-₹{discountInfo.amount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-2xl font-bold border-t dark:border-slate-700 pt-2 mt-2">
                    <div className="flex items-center gap-2">
                        <span>Total</span>
                        <Tooltip content="Add Service Charge" position="top">
                            <button 
                                onClick={onOpenCustomCharge}
                                className="p-1 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                <Icon name="plus" className="w-3 h-3" />
                            </button>
                        </Tooltip>
                    </div>
                    <span>₹{total.toFixed(2)}</span>
                </div>
                <Tooltip content="Proceed to Payment" position="top">
                    <button onClick={() => onPay(total, subtotal, discountInfo)} disabled={cart.length === 0 && extraCharges.length === 0} className="w-full mt-2 p-3 text-lg font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-slate-400 dark:disabled:bg-slate-600">
                        Charge
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

// ... Other modals like Payment, CustomerSelect would go here

const CustomChargeModal: React.FC<{ isOpen: boolean; onClose: () => void; onAdd: (charge: { description: string, amount: number }) => void }> = ({ isOpen, onClose, onAdd }) => {
    const [description, setDescription] = useState('Service Charge');
    const [amount, setAmount] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg">Add Custom Charge</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Icon name="close" className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Service Charge, Delivery Fee" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0.00" />
                    </div>
                    <button 
                        onClick={() => {
                            const val = parseFloat(amount);
                            if (val > 0 && description) {
                                onAdd({ description, amount: val });
                                onClose();
                                setAmount('');
                                setDescription('Service Charge');
                            }
                        }}
                        className="w-full py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Add Charge
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const QRScannerModal: React.FC<{ onClose: () => void; onScan: (decodedText: string) => void }> = ({ onClose, onScan }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );
        scanner.render(onScan, () => {
            // console.warn(error);
        });

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold">Scan QR / Barcode</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4">
                    <div id="qr-reader" className="overflow-hidden rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600"></div>
                    <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        Point your camera at a product barcode or QR code.
                    </p>
                </div>
            </div>
        </div>
    );
};

const CustomerSelectModal: React.FC<{
    customers: Customer[],
    onSelect: (customer: Customer) => void,
    onClose: () => void,
    pinnedIds: number[],
    onTogglePin: (id: number) => void,
    onSaveCustomer: (customer: Partial<Customer>) => void
}> = ({ customers, onSelect, onClose, pinnedIds, onTogglePin, onSaveCustomer }) => {
    const [search, setSearch] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.phone.includes(search)
    );

    const pinnedCustomers = customers.filter(c => pinnedIds.includes(c.id));

    const handleQuickAdd = () => {
        if (!newName.trim()) return;
        onSaveCustomer({
            name: newName,
            phone: newPhone,
            email: '',
            address: '',
            creditBalance: 0,
            transactions: [],
            lastActivity: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isDeleted: false
        });
        setIsAddingNew(false);
        setNewName('');
        setNewPhone('');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden border dark:border-slate-700">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {isAddingNew ? 'Quick Add Customer' : 'Select Customer'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isAddingNew ? 'Fill in basic details' : 'Choose a customer for this order'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>

                {isAddingNew ? (
                    <div className="p-6 space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Full Name *</label>
                            <input 
                                type="text" 
                                value={newName} 
                                onChange={e => setNewName(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="Enter customer name"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                            <input 
                                type="tel" 
                                value={newPhone} 
                                onChange={e => setNewPhone(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={() => setIsAddingNew(false)}
                                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleQuickAdd}
                                disabled={!newName.trim()}
                                className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20"
                            >
                                Save & Select
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b dark:border-slate-700 bg-white dark:bg-slate-800">
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search by name or phone..." 
                                        value={search} 
                                        onChange={e => setSearch(e.target.value)} 
                                        className="w-full pl-10 pr-10 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                                        autoFocus 
                                    />
                                    {search && (
                                        <button 
                                            onClick={() => setSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                                        >
                                            <Icon name="close" className="w-3 h-3 text-slate-400" />
                                        </button>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setIsAddingNew(true)}
                                    className="p-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center"
                                    title="Add New Customer"
                                >
                                    <Icon name="plus" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-2 custom-scrollbar">
                            {search === '' && pinnedCustomers.length > 0 && (
                                <div className="mb-4">
                                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pinned Customers</p>
                                    <div className="grid grid-cols-1 gap-1">
                                        {pinnedCustomers.map(c => (
                                            <div key={`pinned-${c.id}`} onClick={() => onSelect(c)} className="flex items-center gap-3 p-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl cursor-pointer transition-all border border-transparent hover:border-primary-200 dark:hover:border-primary-800 group">
                                                <Avatar name={c.name} className="w-10 h-10 ring-2 ring-amber-400/30" />
                                                <div className="flex-grow">
                                                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                        {c.name}
                                                        <Icon name="star" className="w-3 h-3 text-amber-500 fill-current" />
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.phone}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${c.creditBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>₹{Math.abs(c.creditBalance).toFixed(2)}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Balance</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mx-3 my-4 border-t dark:border-slate-700"></div>
                                </div>
                            )}

                            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                {search ? `Search Results (${filtered.length})` : 'All Customers'}
                            </p>
                            
                            <div className="grid grid-cols-1 gap-1">
                                {filtered.map((c, i) => {
                                    const isPinned = pinnedIds.includes(c.id);
                                    return (
                                        <div key={`cust-select-${c.id}-${i}`} className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group">
                                            <div onClick={() => onSelect(c)} className="flex items-center gap-3 flex-grow">
                                                <Avatar name={c.name} className="w-10 h-10" />
                                                <div className="flex-grow">
                                                    <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.phone}</p>
                                                </div>
                                                <div className="text-right mr-2">
                                                    <p className={`text-sm font-bold ${c.creditBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>₹{Math.abs(c.creditBalance).toFixed(2)}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Balance</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onTogglePin(c.id); }} 
                                                className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all ${isPinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <Icon name="star" className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {filtered.length === 0 && (
                                <div className="text-center py-12 px-4">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Icon name="customers" className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No customers found</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try a different search term or add a new customer.</p>
                                    <button 
                                        onClick={() => setIsAddingNew(true)}
                                        className="mt-6 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20"
                                    >
                                        Add New Customer
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const PaymentModal: React.FC<{
    total: number,
    onComplete: (payment: Payment) => void,
    onClose: () => void,
    customer: Customer | null,
    appSettings: AppSettings
}> = ({ total, onComplete, onClose, customer, appSettings }) => {
    const [method, setMethod] = useState<PaymentMethod>('Cash');
    const [received, setReceived] = useState(total.toString());
    const [transactionId, setTransactionId] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const change = parseFloat(received) - total;

    const handleComplete = () => {
        onComplete({
            method,
            amount: total,
            received: parseFloat(received) || total,
            change: Math.max(0, change),
            transactionId: method === 'Online' ? transactionId : undefined,
            isVerified: method === 'Online' ? isVerified : undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-theme-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-theme-main animate-page-fade-in">
                <div className="p-4 border-b border-theme-main flex justify-between items-center bg-theme-surface">
                    <h3 className="text-lg font-bold text-theme-main">Complete Payment</h3>
                    <button onClick={onClose} className="p-2 hover:bg-theme-main rounded-full transition-colors"><Icon name="close" className="w-5 h-5 text-theme-muted"/></button>
                </div>
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="text-center">
                        <p className="text-xs text-theme-muted uppercase tracking-widest font-bold">Total Amount</p>
                        <p className="text-5xl font-black text-primary-600 mt-1">₹{total.toFixed(2)}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {(['Cash', 'Online', 'Credit'] as PaymentMethod[]).map(m => (
                            <button 
                                key={m} 
                                onClick={() => setMethod(m)}
                                disabled={m === 'Credit' && !customer}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${method === m ? 'border-primary-500 bg-primary-500/10 text-primary-600' : 'border-theme-main hover:border-primary-500/50 text-theme-muted'} ${m === 'Credit' && !customer ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                                <Icon name={m.toLowerCase() as any} className="w-6 h-6" />
                                <span className="text-xs font-bold uppercase tracking-tighter">{m}</span>
                            </button>
                        ))}
                    </div>

                    {method === 'Online' && appSettings.upiId && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-theme-main shadow-inner">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Scan to Pay via UPI</p>
                                <div className="bg-white p-2 rounded-xl shadow-sm">
                                    <QRCodeSVG 
                                        value={`upi://pay?pa=${appSettings.upiId}&pn=${encodeURIComponent(appSettings.shopName)}&am=${total.toFixed(2)}&cu=INR`} 
                                        size={180} 
                                        level="H"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-4 text-center font-mono">{appSettings.upiId}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">Transaction ID / UTR (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter 12-digit UTR number"
                                        value={transactionId}
                                        onChange={e => setTransactionId(e.target.value)}
                                        className="w-full p-3 bg-theme-main border border-theme-main rounded-xl text-theme-main focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono"
                                    />
                                </div>
                                <button 
                                    onClick={() => setIsVerified(!isVerified)}
                                    className={`w-full p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${isVerified ? 'bg-green-500/10 border-green-500 text-green-600' : 'border-theme-main text-theme-muted hover:border-green-500/50'}`}
                                >
                                    <Icon name={isVerified ? 'sync-check' : 'sync-reload'} className="w-5 h-5" />
                                    <span className="font-bold">{isVerified ? 'Payment Verified' : 'Mark as Verified'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {method !== 'Credit' && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-theme-muted uppercase tracking-wider">Amount Received</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-theme-muted text-xl">₹</span>
                                <input 
                                    type="number" 
                                    value={received} 
                                    onChange={e => setReceived(e.target.value)} 
                                    className="w-full pl-10 p-4 text-3xl font-black border border-theme-main rounded-2xl bg-theme-main text-theme-main focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            {change > 0 && (
                                <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                                    <span className="text-sm font-bold text-green-600">Change to return</span>
                                    <span className="text-2xl font-black text-green-600">₹{change.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {method === 'Credit' && customer && (
                        <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <p className="text-sm font-bold text-amber-600">
                                Adding to <strong>{customer.name}'s</strong> balance.
                            </p>
                            <p className="text-xs mt-1 text-amber-500/80">New Balance: ₹{(customer.creditBalance + total).toFixed(2)}</p>
                        </div>
                    )}

                    <button 
                        onClick={handleComplete}
                        disabled={method !== 'Credit' && (parseFloat(received) < total || isNaN(parseFloat(received)))}
                        className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-primary-500/30 transition-all disabled:opacity-50 disabled:shadow-none transform active:scale-95"
                    >
                        Complete Sale
                    </button>
                </div>
            </div>
        </div>
    );
};

const POS: React.FC<POSProps> = (props) => {
    const { products, dishes, rawMaterials, customers, onTransaction, appSettings, promotions, allocatedRawMaterials, heldCarts, setHeldCarts, transactions, onUpdateAppSettings, onSaveCustomer } = props;
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [activeTab, setActiveTab] = useState<'products' | 'dishes'>(appSettings.shopTypes.includes('Retail') ? 'products' : 'dishes');
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileCartOpen, setMobileCartOpen] = useState(false);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
    const [isCustomChargeModalOpen, setCustomChargeModalOpen] = useState(false);
    const [paymentData, setPaymentData] = useState<{ total: number, subtotal: number, discount?: any } | null>(null);
    const { showToast } = useToast();
    
    const [isQRScannerOpen, setQRScannerOpen] = useState(false);
    const [extraCharges, setExtraCharges] = useState<{ description: string, amount: number }[]>([]);

    const handleAddExtraCharge = useCallback((charge: { description: string, amount: number }) => {
        setExtraCharges(prev => [...prev, charge]);
    }, []);

    const handleRemoveExtraCharge = useCallback((index: number) => {
        setExtraCharges(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleAddItem = useCallback((item: ProductVariant | Dish) => {
        setCart(prevCart => {
            const isItemProduct = 'productId' in item;
            const existing = prevCart.find(ci => ci.item.id === item.id && (('productId' in ci.item) === isItemProduct));
            if (existing) {
                return prevCart.map(ci => (ci.item.id === item.id && (('productId' in ci.item) === isItemProduct)) ? { ...ci, quantity: ci.quantity + 1 } : ci);
            }
            const price = 'mrp' in item ? item.mrp : item.price;
            return [...prevCart, { item, quantity: 1, appliedPrice: price }];
        });
    }, []);

    const handleQRScan = useCallback((decodedText: string) => {
        // Try to find product by SKU or barcode
        const foundProduct = products.find(p => 
            p.variants.some(v => v.sku === decodedText)
        );
        
        if (foundProduct) {
            const variant = foundProduct.variants.find(v => v.sku === decodedText);
            if (variant) {
                handleAddItem(variant);
                showToast(`Added ${foundProduct.name} (${variant.name})`, 'success');
                setQRScannerOpen(false);
                return;
            }
        }

        // Also check if it's a UPI ID (for the user's request)
        if (decodedText.startsWith('upi://pay')) {
            // This is a UPI payment link, maybe handle it differently?
            // For now, just show a toast
            showToast("UPI QR Scanned. Use this in the payment modal.", "info");
            setQRScannerOpen(false);
            return;
        }

        showToast("No matching product found for this code.", "error");
    }, [products, handleAddItem, showToast]);

    const handleUpdateItem = useCallback((itemId: number | string, quantity: number, isProduct: boolean) => {
        if (quantity <= 0) {
            setCart(prev => prev.filter(ci => !(ci.item.id === itemId && ('productId' in ci.item) === isProduct)));
        } else {
            setCart(prev => prev.map(ci => (ci.item.id === itemId && ('productId' in ci.item) === isProduct) ? { ...ci, quantity } : ci));
        }
    }, []);

    const handleRemoveItem = useCallback((itemId: number | string, isProduct: boolean) => {
        setCart(prev => prev.filter(ci => !(ci.item.id === itemId && ('productId' in ci.item) === isProduct)));
    }, []);

    const handleClearCart = useCallback(() => {
        setCart([]);
        setCustomer(null);
    }, []);

    const handleHoldCart = useCallback(() => {
        if (cart.length === 0) return;
        const newHeldCart: HeldCart = {
            id: Date.now(),
            customer: customer || undefined,
            items: cart,
            date: new Date().toISOString(),
            total: cart.reduce((sum, i) => sum + i.appliedPrice * i.quantity, 0)
        };
        setHeldCarts(prev => [...prev, newHeldCart]);
        setCart([]);
        setCustomer(null);
        setExtraCharges([]);
        showToast('Order put on hold', 'success');
    }, [cart, customer, setHeldCarts, showToast]);

    const handlePay = useCallback((total: number, subtotal: number, discount?: any) => {
        setPaymentData({ total, subtotal, discount });
        setPaymentModalOpen(true);
    }, []);

    const handleCompleteTransaction = (payment: Payment) => {
        const transaction: Transaction = {
            id: `TXN-${Date.now()}`,
            date: new Date().toISOString(),
            items: cart,
            subtotal: paymentData?.subtotal || 0,
            total: paymentData?.total || 0,
            payments: [payment],
            customer: customer || undefined,
            status: 'Completed',
            discount: paymentData?.discount,
            extraCharges: extraCharges
        };
        onTransaction(transaction);
        setCart([]);
        setCustomer(null);
        setExtraCharges([]);
        setPaymentModalOpen(false);
        setPaymentData(null);
        showToast('Transaction completed successfully', 'success');
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => !p.isDeleted && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [products, searchTerm]);

    const filteredDishes = useMemo(() => {
        const cartRequirements = getCartIngredients(cart);
        return dishes.filter(d => !d.isDeleted && d.name.toLowerCase().includes(searchTerm.toLowerCase())).map(dish => {
            const isOutOfStock = dish.ingredients.some(ing => {
                const material = rawMaterials.find(rm => rm.id === ing.id);
                const available = (material?.stock || 0) - (allocatedRawMaterials[ing.id] || 0) - (cartRequirements[ing.id] || 0);
                return available < ing.quantity;
            });
            return { ...dish, isOutOfStock };
        });
    }, [dishes, rawMaterials, allocatedRawMaterials, searchTerm, cart]);

    const topCustomers = useMemo(() => {
        const pinnedIds = appSettings.pinnedCustomerIds || [];
        const pinned = customers.filter(c => pinnedIds.includes(c.id) && !c.isDeleted);
        
        // 2 Recent from last transactions (excluding pinned)
        const recentFromTxns: Customer[] = [];
        const seenRecent = new Set(pinned.map(c => c.id));
        
        [...(transactions || [])].reverse().forEach(t => {
            if (t.customer?.id && !seenRecent.has(t.customer.id) && recentFromTxns.length < 2) {
                const cust = customers.find(c => c.id === t.customer?.id && !c.isDeleted);
                if (cust) {
                    recentFromTxns.push(cust);
                    seenRecent.add(cust.id);
                }
            }
        });

        // 1 for queued purchase (most recent held cart)
        let queuedCust: Customer | null = null;
        if (heldCarts && heldCarts.length > 0) {
            const lastHeld = heldCarts[heldCarts.length - 1];
            if (lastHeld.customer && !seenRecent.has(lastHeld.customer.id)) {
                const cust = customers.find(c => c.id === lastHeld.customer?.id && !c.isDeleted);
                if (cust) {
                    queuedCust = cust;
                }
            }
        }

        // Combine: up to 2 pinned, then 2 recent, then 1 queued
        // User requested: "two pinned customers, two from recent transactions, and one for queued purchases, totaling five customer icons."
        const result: Customer[] = [];
        const seenIds = new Set<number>();

        // 1. Pinned (up to 2)
        pinned.slice(0, 2).forEach(c => {
            if (!seenIds.has(c.id)) {
                result.push(c);
                seenIds.add(c.id);
            }
        });

        // 2. Recent (up to 2 more)
        recentFromTxns.forEach(c => {
            if (result.length < 4 && !seenIds.has(c.id)) {
                result.push(c);
                seenIds.add(c.id);
            }
        });

        // 3. Queued (up to 1 more)
        if (queuedCust && result.length < 5 && !seenIds.has(queuedCust.id)) {
            result.push(queuedCust);
            seenIds.add(queuedCust.id);
        }
        
        // 4. Fill remaining of 5 slots with top counts
        if (result.length < 5) {
            const customerCounts: Record<number, number> = {};
            (transactions || []).forEach(t => {
                if (t.customer?.id) {
                    customerCounts[t.customer.id] = (customerCounts[t.customer.id] || 0) + 1;
                }
            });
            const others = customers
                .filter(c => !c.isDeleted && !seenIds.has(c.id))
                .sort((a, b) => (customerCounts[b.id] || 0) - (customerCounts[a.id] || 0));
            
            while (result.length < 5 && others.length > 0) {
                const next = others.shift();
                if (next) {
                    result.push(next);
                    seenIds.add(next.id);
                }
            }
        }

        return result;
    }, [customers, transactions, heldCarts, appSettings.pinnedCustomerIds]);

    const handleTogglePin = useCallback((id: number) => {
        const currentPinned = appSettings.pinnedCustomerIds || [];
        let newPinned;
        if (currentPinned.includes(id)) {
            newPinned = currentPinned.filter(pid => pid !== id);
        } else {
            newPinned = [...currentPinned, id].slice(0, 3); // Max 3 pinned
        }
        onUpdateAppSettings(s => ({ ...s, pinnedCustomerIds: newPinned }));
    }, [appSettings.pinnedCustomerIds, onUpdateAppSettings]);

    return (
        <div className="md:grid md:grid-cols-3 md:gap-4">
            {/* Main content: Search, Filters, Product Grid */}
            <div className="md:col-span-2">
                <div className="relative mb-3 flex gap-2">
                    <div className="relative flex-grow">
                        <Icon name="search" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search products or dishes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                    </div>
                    {props.appSettings.enableBarcodeScanner && (
                        <Tooltip content="Scan Barcode" position="bottom">
                            <button 
                                onClick={() => setQRScannerOpen(true)}
                                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                            >
                                <Icon name="barcode" className="w-6 h-6" />
                            </button>
                        </Tooltip>
                    )}
                    {props.appSettings.enableQrScanner && (
                        <Tooltip content="Scan QR Code" position="bottom">
                            <button 
                                onClick={() => setQRScannerOpen(true)}
                                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                            >
                                <Icon name="camera" className="w-6 h-6" />
                            </button>
                        </Tooltip>
                    )}
                </div>
                
                {props.appSettings.shopTypes.includes('Restaurant') && props.appSettings.shopTypes.includes('Retail') && (
                    <div className="flex items-center bg-slate-200/50 dark:bg-slate-800/50 rounded-xl p-1 mb-4 self-start w-fit border border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={() => setActiveTab('products')} 
                            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'products' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Products
                        </button>
                        <button 
                            onClick={() => setActiveTab('dishes')} 
                            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'dishes' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Dishes
                        </button>
                    </div>
                )}

                <div data-tutorial-id="pos-product-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-28 md:pb-4">
                    {activeTab === 'products' && filteredProducts.map(p => (
                        p.variants.length === 1 && p.pricingType === 'fixed' ? (
                            <SingleVariantProductTile key={p.id} product={p} onAdd={(v) => handleAddItem(v)} isOutOfStock={p.variants[0].stock <= 0} />
                        ) : (
                            <MasterProductTile key={p.id} product={p} onAddVariant={(v) => handleAddItem(v)} cart={cart} />
                        )
                    ))}
                    {activeTab === 'dishes' && filteredDishes.map(d => (
                        <DishTile key={d.id} dish={d} onAdd={(dish) => handleAddItem(dish)} isOutOfStock={d.isOutOfStock} />
                    ))}
                </div>
            </div>

            {/* Desktop Cart */}
            <div className="hidden md:block">
                <div className="sticky top-4 h-[calc(100vh-6rem)]">
                   <CartView 
                        cart={cart} 
                        customer={customer} 
                        onUpdateItem={handleUpdateItem} 
                        onRemoveItem={handleRemoveItem} 
                        onClearCart={handleClearCart} 
                        onHoldCart={handleHoldCart} 
                        onSelectCustomer={() => setCustomerModalOpen(true)} 
                        onPay={handlePay} 
                        promotions={promotions} 
                        products={products} 
                        topCustomers={topCustomers}
                        onSetCustomer={setCustomer}
                        extraCharges={extraCharges}
                        onAddExtraCharge={handleAddExtraCharge}
                        onRemoveExtraCharge={handleRemoveExtraCharge}
                        onOpenCustomCharge={() => setCustomChargeModalOpen(true)}
                    />
                </div>
            </div>
            
            {/* Mobile Cart UI */}
            <div data-tutorial-id="pos-cart" className="md:hidden fixed bottom-16 left-0 right-0 z-20">
                {cart.length > 0 && (
                     <Tooltip content="View Cart Details" position="top">
                         <div onClick={() => setMobileCartOpen(true)} className="bg-primary-600 text-white p-3 shadow-lg flex justify-between items-center cursor-pointer">
                            <div>
                                <span className="font-bold">{cart.length} items</span>
                                <span className="ml-2">Total: ₹{cart.reduce((t, i) => t + i.appliedPrice * i.quantity, 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold">View Order</span>
                                <Icon name="chevron-up" className="w-5 h-5"/>
                            </div>
                        </div>
                     </Tooltip>
                )}
            </div>
 
            {isMobileCartOpen && (
                <SlideOverPanel title="Current Order" onClose={() => setMobileCartOpen(false)} footer={<></>} position="bottom">
                   <div className="h-[70vh]">
                       <CartView 
                            cart={cart} 
                            customer={customer} 
                            onUpdateItem={handleUpdateItem} 
                            onRemoveItem={handleRemoveItem} 
                            onClearCart={handleClearCart} 
                            onHoldCart={handleHoldCart} 
                            onSelectCustomer={() => setCustomerModalOpen(true)} 
                            onPay={handlePay} 
                            promotions={promotions} 
                            products={products} 
                            topCustomers={topCustomers}
                            onSetCustomer={setCustomer}
                            extraCharges={extraCharges}
                            onAddExtraCharge={handleAddExtraCharge}
                            onRemoveExtraCharge={handleRemoveExtraCharge}
                            onOpenCustomCharge={() => setCustomChargeModalOpen(true)}
                        />
                   </div>
                </SlideOverPanel>
            )}
 
            {isCustomerModalOpen && (
                <CustomerSelectModal 
                    customers={customers} 
                    onSelect={(c) => { setCustomer(c); setCustomerModalOpen(false); }} 
                    onClose={() => setCustomerModalOpen(false)} 
                    pinnedIds={appSettings.pinnedCustomerIds || []}
                    onTogglePin={handleTogglePin}
                    onSaveCustomer={(c) => {
                        onSaveCustomer(c);
                        // The newly added customer will eventually show up in the list
                        // For immediate feedback, we might need to wait for state sync
                    }}
                />
            )}
 
            {isPaymentModalOpen && paymentData && (
                <PaymentModal 
                    total={paymentData.total} 
                    onComplete={handleCompleteTransaction} 
                    onClose={() => setPaymentModalOpen(false)} 
                    customer={customer}
                    appSettings={appSettings}
                />
            )}

            <CustomChargeModal
                isOpen={isCustomChargeModalOpen}
                onClose={() => setCustomChargeModalOpen(false)}
                onAdd={handleAddExtraCharge}
            />

            {isQRScannerOpen && (
                <QRScannerModal 
                    onClose={() => setQRScannerOpen(false)} 
                    onScan={handleQRScan} 
                />
            )}
        </div>
    );
};

export default POS;