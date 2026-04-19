import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fuzzySearch, multiTermSearch } from '../lib/searchUtils';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import type { Product, Dish, DishVariant, Customer, CartItem, PaymentMethod, Transaction, ProductVariant, HeldCart, AppSettings, Payment, RawMaterial, Promotion } from '../types';
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
            <motion.div 
                ref={tileRef}
                whileHover={!isOutOfStock ? { y: -4, scale: 1.02 } : {}}
                whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
                onClick={() => !isOutOfStock && tileRef.current && onAdd(variant, tileRef.current)}
                className={`group relative flex flex-col p-4 rounded-xl border transition-all duration-300 overflow-hidden ${
                    isOutOfStock 
                        ? 'bg-theme-main/50 border-theme-main opacity-60 cursor-not-allowed' 
                        : 'bg-theme-surface/80 backdrop-blur-md border-theme-main shadow-sm hover:shadow-xl hover:shadow-primary-500/10 hover:border-primary-500/50 cursor-pointer'
                }`}
            >
                {isOutOfStock && (
                    <div className="absolute top-3 right-3 z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                            Sold Out
                        </span>
                    </div>
                )}
                
                <div className="flex-grow">
                    {product.subCategory && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary-500 bg-primary-500/10 px-2 py-1 rounded-lg mb-3 inline-block">
                            {product.subCategory}
                        </span>
                    )}
                    <h3 className="font-bold text-theme-main text-sm leading-snug group-hover:text-primary-500 transition-colors line-clamp-2">
                        {product.name}
                    </h3>
                </div>

                <div className="mt-4 flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mb-0.5">Price</span>
                        <p className="text-xl font-black text-theme-main tracking-tight">
                            ₹{variant.mrp}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mb-0.5 block">Stock</span>
                        <p className={`text-xs font-bold ${variant.stock < 10 ? 'text-amber-500' : 'text-theme-muted'}`}>
                            {variant.stock}
                        </p>
                    </div>
                </div>

                {/* Hover decoration */}
                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primary-500/5 blur-2xl group-hover:bg-primary-500/10 transition-colors" />
            </motion.div>
        </Tooltip>
    );
};

const MasterProductTile: React.FC<{ 
    product: Product; 
    onOpenVariants: (item: Product | Dish) => void;
    cart: CartItem[] 
}> = ({ product, onOpenVariants }) => {
    const tileRef = React.useRef<HTMLDivElement>(null);
    const variantsCount = product.variants.filter(v => !v.isDeleted).length;
    
    return (
        <Tooltip content={`Select from ${variantsCount} variants of ${product.name}`} position="top">
            <motion.div 
                ref={tileRef} 
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenVariants(product)}
                className="group relative flex flex-col p-4 rounded-xl border border-theme-main bg-theme-surface/80 backdrop-blur-md shadow-sm hover:shadow-2xl hover:border-primary-500/50 cursor-pointer overflow-hidden aspect-[4/5] min-h-[180px]"
            >
                <div className="flex-grow flex flex-col">
                    {product.subCategory && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-500 bg-primary-500/10 px-2 py-1 rounded-lg mb-3 self-start">
                            {product.subCategory}
                        </span>
                    )}
                    <h3 className="font-black text-theme-main text-base leading-tight group-hover:text-primary-500 transition-colors line-clamp-3">
                        {product.name}
                    </h3>
                </div>

                <div className="mt-4 flex justify-between items-end">
                    <div className="flex flex-col">
                         <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mb-1">From</span>
                         <p className="text-xl font-black text-theme-main tracking-tighter">
                            ₹{Math.min(...product.variants.filter(v => !v.isDeleted).map(v => v.mrp))}
                         </p>
                    </div>
                    <div className="bg-primary-500 text-white p-2 rounded-xl shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform">
                        <Icon name="plus" size={16} />
                    </div>
                </div>
                
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <span className="text-[8px] font-black uppercase tracking-widest text-primary-400 bg-theme-surface px-1.5 py-0.5 rounded shadow-sm border border-primary-500/20">
                        {variantsCount} Variants
                    </span>
                </div>

                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-700" />
            </motion.div>
        </Tooltip>
    );
};

const DishTile: React.FC<{ 
    dish: Dish; 
    onAdd: (dish: DishVariant, element: HTMLDivElement) => void; 
    onOpenVariants: (item: Product | Dish) => void;
    isOutOfStock: boolean; 
}> = ({ dish, onAdd, onOpenVariants, isOutOfStock }) => {
    const tileRef = React.useRef<HTMLDivElement>(null);
    const hasMultipleVariants = dish.variants.length > 1;
    const variant = dish.variants[0];

    return (
        <Tooltip content={hasMultipleVariants ? `Select variant for ${dish.name}` : `Add ${dish.name} to cart`} position="top">
            <motion.div
                ref={tileRef}
                whileHover={!isOutOfStock ? { y: -4, scale: 1.02 } : {}}
                whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
                onClick={() => {
                    if (isOutOfStock) return;
                    if (hasMultipleVariants) {
                        onOpenVariants(dish);
                    } else if (tileRef.current) {
                        onAdd(variant, tileRef.current);
                    }
                }}
                className={`group relative rounded-2xl border transition-all duration-500 overflow-hidden aspect-[4/5] ${
                    isOutOfStock 
                        ? 'border-theme-main opacity-60 cursor-not-allowed grayscale' 
                        : 'border-theme-main shadow-xl shadow-theme-main/10 hover:shadow-2xl cursor-pointer'
                }`}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 opacity-90 group-hover:opacity-95 transition-all duration-500"></div>
                <img 
                    src={dish.imageUrl || 'https://picsum.photos/seed/dish/400/500'} 
                    alt={dish.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110" 
                />
                
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 transform group-hover:translate-y-[-4px] transition-transform duration-500">
                    <h3 className="font-black text-white text-lg leading-tight mb-2 group-hover:text-primary-300 transition-colors line-clamp-2 uppercase tracking-tight">
                        {dish.name}
                    </h3>
                    <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                            <span className="text-xs font-bold text-white/60">₹</span>
                            <p className="text-3xl font-black text-white tracking-tighter">
                                {hasMultipleVariants ? Math.min(...dish.variants.map(v => v.price)) : variant.price}
                                {hasMultipleVariants && <span className="text-xs ml-1 text-white/50">+</span>}
                            </p>
                        </div>
                        {hasMultipleVariants && (
                            <div className="bg-primary-500 text-white p-2 rounded-xl shadow-lg shadow-primary-500/30 group-hover:rotate-12 transition-all">
                                <Icon name="plus" size={16} />
                            </div>
                        )}
                    </div>
                </div>

                {isOutOfStock && (
                    <div className="absolute top-5 right-5 z-20">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white bg-rose-500 px-3 py-1.5 rounded-xl shadow-xl shadow-rose-500/40 border border-rose-400/30">
                            Out of Stock
                        </span>
                    </div>
                )}
                
                {!isOutOfStock && hasMultipleVariants && (
                    <div className="absolute top-5 left-5 z-20">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary-300 bg-slate-900/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-primary-500/30">
                            {dish.variants.length} Variants
                        </span>
                    </div>
                )}
            </motion.div>
        </Tooltip>
    );
};

const CustomItemTile: React.FC<{ onAdd: (name: string, price: number) => void }> = ({ onAdd }) => {
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    return (
        <div className="relative aspect-[4/5]">
            <AnimatePresence mode="wait">
                {!showForm ? (
                    <motion.div
                        key="tile"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => setShowForm(true)}
                        className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-theme-main rounded-2xl bg-theme-surface hover:border-primary-500 hover:bg-primary-500/5 transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-lg group-hover:shadow-primary-500/30">
                            <Icon name="plus" size={32} />
                        </div>
                        <p className="mt-4 font-black text-slate-400 group-hover:text-primary-600 uppercase tracking-widest text-xs">Custom Item</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="w-full h-full p-6 flex flex-col border-2 border-primary-500 rounded-2xl bg-theme-surface shadow-2xl shadow-primary-500/20 z-30"
                    >
                        <h4 className="text-xs font-black text-primary-500 uppercase tracking-widest mb-4">Add Custom Item</h4>
                        <div className="space-y-4 flex-grow">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Name</label>
                                <input 
                                    autoFocus
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="e.g. Special Order" 
                                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary-500 outline-none text-sm font-bold" 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
                                <input 
                                    type="number" 
                                    value={price} 
                                    onChange={e => setPrice(e.target.value)} 
                                    placeholder="0.00" 
                                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary-500 outline-none text-xl font-black" 
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400 hover:text-rose-500 transition-colors">Cancel</button>
                            <button 
                                onClick={() => {
                                    if (name && price) {
                                        onAdd(name, parseFloat(price));
                                        setName('');
                                        setPrice('');
                                        setShowForm(false);
                                    }
                                }}
                                className="flex-[2] py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary-500/30 transition-all"
                            >
                                Add
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const VariantGridModal: React.FC<{ 
    item: Product | Dish | null; 
    onClose: () => void; 
    onAddVariant: (variant: ProductVariant | DishVariant, element: HTMLDivElement) => void;
    cart: CartItem[];
}> = ({ item, onClose, onAddVariant, cart }) => {
    if (!item) return null;

    const variants = 'variants' in item ? item.variants.filter(v => !v.isDeleted) : [];
    const isDish = !('subCategory' in item);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" 
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-theme-surface rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-theme-main"
            >
                {/* Header */}
                <div className="p-8 border-b border-theme-main flex justify-between items-center bg-theme-main/30">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 shadow-xl shadow-primary-500/10">
                            <Icon name={isDish ? 'restaurant' : 'inventory'} size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-theme-main tracking-tight uppercase">{item.name}</h3>
                            <p className="text-xs font-bold text-theme-muted uppercase tracking-[0.3em] mt-1">Select from {variants.length} variations</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-theme-main text-theme-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-theme-main">
                        <Icon name="close" size={24} />
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-grow overflow-y-auto p-10 custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {variants.map((v, i) => {
                            const quantityInCart = cart.find(ci => ci.item.id === v.id)?.quantity || 0;
                            const isProduct = 'stock' in v;
                            const isOutOfStock = isProduct && (v as ProductVariant).stock <= quantityInCart;
                            const price = isProduct ? (v as ProductVariant).mrp : (v as DishVariant).price;

                            return (
                                <motion.div
                                    key={v.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                                    whileHover={!isOutOfStock ? { y: -8, scale: 1.05 } : {}}
                                    whileTap={!isOutOfStock ? { scale: 0.95 } : {}}
                                    onClick={(e) => {
                                        if (isOutOfStock) return;
                                        onAddVariant(v, e.currentTarget as HTMLDivElement);
                                    }}
                                    className={`relative p-5 rounded-xl border transition-all duration-300 flex flex-col items-center text-center cursor-pointer min-h-[140px] group ${
                                        isOutOfStock 
                                            ? 'bg-theme-main/50 border-theme-main opacity-40 grayscale cursor-not-allowed' 
                                            : 'bg-theme-surface border-theme-main shadow-lg hover:shadow-2xl hover:border-primary-500/50'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center transition-all duration-500 ${isOutOfStock ? 'bg-theme-main text-theme-muted' : 'bg-primary-500/10 text-primary-500 group-hover:bg-primary-500 group-hover:text-white group-hover:rotate-12'}`}>
                                        <Icon name={isProduct ? 'inventory' : 'restaurant'} size={18} />
                                    </div>
                                    <h4 className="font-black text-theme-main text-xs line-clamp-2 mb-2 uppercase tracking-tight leading-tight">{v.name}</h4>
                                    <div className="mt-auto">
                                        <p className="text-lg font-black text-primary-500 tracking-tighter self-end">₹{price}</p>
                                        {isProduct && (
                                            <p className="text-[8px] font-bold text-theme-muted uppercase tracking-widest mt-0.5">Stock: {(v as ProductVariant).stock}</p>
                                        )}
                                    </div>

                                    {quantityInCart > 0 && (
                                        <div className="absolute top-[-8px] right-[-8px] w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-emerald-500/40 border-2 border-theme-surface">
                                            {quantityInCart}
                                        </div>
                                    )}

                                    {isOutOfStock && (
                                        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">Sold Out</span>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-theme-surface border-t border-theme-main flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {variants.slice(0, 5).map((v, i) => (
                                <div key={i} className="w-10 h-10 rounded-full bg-primary-500 text-white border-2 border-theme-surface flex items-center justify-center text-[10px] font-black shadow-md" style={{ zIndex: 10 - i }}>
                                    {v.name.charAt(0)}
                                </div>
                            ))}
                            {variants.length > 5 && (
                                <div className="w-10 h-10 rounded-full bg-theme-main text-theme-muted border-2 border-theme-surface flex items-center justify-center text-[10px] font-black shadow-md">
                                    +{variants.length - 5}
                                </div>
                            )}
                        </div>
                        <p className="text-xs font-bold text-theme-muted uppercase tracking-[0.2em] ml-2">Displaying {variants.length} options for checkout</p>
                    </div>
                    <button onClick={onClose} className="px-10 py-4 bg-primary-500 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-primary-600 transition-all shadow-xl">Finish Selecting</button>
                </div>
            </motion.div>
        </div>
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
        <motion.li 
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-4 py-3 group"
        >
            <div className="flex-grow min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">₹{cartItem.appliedPrice.toFixed(2)}</p>
            </div>
            
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200/50 dark:border-slate-800/50">
                <button 
                    onClick={() => onUpdate(quantity - 1)} 
                    disabled={isWeightBased} 
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-primary-500 disabled:opacity-30 transition-all"
                >
                    <Icon name="remove" size={14} />
                </button>
                <span className="font-black text-sm w-8 text-center text-slate-900 dark:text-white">{quantity}</span>
                <button 
                    onClick={() => onUpdate(quantity + 1)} 
                    disabled={isWeightBased} 
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-primary-500 disabled:opacity-30 transition-all"
                >
                    <Icon name="plus" size={14} />
                </button>
            </div>

            <div className="text-right min-w-[70px]">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                    ₹{(quantity * cartItem.appliedPrice).toFixed(2)}
                </p>
            </div>

            <button 
                onClick={onRemove} 
                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
            >
                <Icon name="delete" size={16} />
            </button>
        </motion.li>
    );
};

const CartView: React.FC<{
    cart: CartItem[],
    customer: Customer | null,
    orderId: string,
    onUpdateItem: (itemId: number | string, quantity: number, isProduct: boolean) => void,
    onRemoveItem: (itemId: number | string, isProduct: boolean) => void,
    onClearCart: () => void,
    onHoldCart: () => void,
    onOpenHeldOrders: () => void,
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
}> = ({ cart, customer, orderId, onUpdateItem, onRemoveItem, onHoldCart, onOpenHeldOrders, onSelectCustomer, onPay, promotions, products, topCustomers, onSetCustomer, extraCharges, onRemoveExtraCharge, onOpenCustomCharge }) => {
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
        <div className="bg-theme-surface rounded-2xl border border-theme-main shadow-2xl h-full flex flex-col overflow-hidden">
            <div className="p-6 border-b border-theme-main">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">Current Order</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Order #{orderId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip content="Held Orders" position="bottom">
                            <button onClick={onOpenHeldOrders} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-500 transition-all border border-slate-100 dark:border-slate-800">
                                <Icon name="categories" size={20} />
                            </button>
                        </Tooltip>
                        <Tooltip content="Hold Order" position="bottom">
                            <button onClick={onHoldCart} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-500 transition-all border border-slate-100 dark:border-slate-800">
                                <Icon name="hold-order" size={20} />
                            </button>
                        </Tooltip>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {customer ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-3 bg-primary-500/10 p-1.5 pr-4 rounded-2xl border border-primary-500/20"
                        >
                            <Avatar name={customer.name} className="w-10 h-10 text-xs shadow-lg shadow-primary-500/20" />
                            <div className="flex-grow">
                                <p className="text-xs font-black text-primary-600 dark:text-primary-400">{customer.name}</p>
                                <p className="text-[10px] font-bold text-primary-500/70 uppercase tracking-widest">Balance: ₹{customer.creditBalance.toFixed(2)}</p>
                            </div>
                            <button onClick={() => onSetCustomer(null)} className="p-1.5 hover:bg-primary-500/20 rounded-xl transition-all">
                                <Icon name="close" size={12} className="text-primary-500" />
                            </button>
                        </motion.div>
                    ) : (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar">
                            {topCustomers.map((c, i) => (
                                <Tooltip key={`top-cust-${c.id}-${i}`} content={`Select ${c.name}`} position="bottom">
                                    <button onClick={() => onSetCustomer(c)} className="flex-shrink-0 w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary-500 transition-all overflow-hidden shadow-sm hover:shadow-lg hover:shadow-primary-500/10">
                                        <Avatar name={c.name} className="w-full h-full text-[10px]" />
                                    </button>
                                </Tooltip>
                            ))}
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                            <Tooltip content="Walk-in Customer" position="bottom">
                                <button onClick={() => onSetCustomer(null)} className="flex-shrink-0 w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary-500 transition-all flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-primary-500">
                                    <Icon name="user" size={18} />
                                </button>
                            </Tooltip>
                            <Tooltip content="Select More Customers" position="bottom">
                                <button onClick={onSelectCustomer} className="flex-shrink-0 w-10 h-10 rounded-2xl border-2 border-dashed border-primary-500/30 hover:border-primary-500 hover:border-solid transition-all flex items-center justify-center text-primary-500 hover:bg-primary-500/10">
                                    <Icon name="user-plus" size={18} />
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {cart.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full text-slate-400 py-12"
                        >
                            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                                <Icon name="cart" size={32} className="opacity-20" />
                            </div>
                            <p className="text-sm font-bold uppercase tracking-widest">Cart is empty</p>
                            <p className="text-xs mt-1">Add items to start an order</p>
                        </motion.div>
                    ) : (
                        <ul className="space-y-1 divide-y divide-slate-50 dark:divide-slate-800/50">
                            {cart.map(ci => {
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
                    )}
                </AnimatePresence>
            </div>

            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/50 space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span>Subtotal</span>
                        <span className="text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
                    </div>
                    
                    {extraCharges.map((c, i) => (
                        <div key={`extra-${i}`} className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <span>{c.description}</span>
                                <button onClick={() => onRemoveExtraCharge(i)} className="text-rose-500 hover:bg-rose-500/10 p-0.5 rounded-md transition-all">
                                    <Icon name="close" size={10} />
                                </button>
                            </div>
                            <span className="text-slate-900 dark:text-white">₹{c.amount.toFixed(2)}</span>
                        </div>
                    ))}
                    
                    {discountInfo && (
                        <div className="flex justify-between text-xs font-bold text-emerald-500 uppercase tracking-widest">
                            <span>Discount ({discountInfo.promotionName})</span>
                            <span>-₹{discountInfo.amount.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Total Amount</span>
                            <button 
                                onClick={onOpenCustomCharge}
                                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-400 hover:text-primary-500 hover:shadow-md transition-all border border-slate-100 dark:border-slate-700"
                            >
                                <Icon name="plus" size={12} />
                            </button>
                        </div>
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">₹{total.toFixed(2)}</span>
                    </div>
                    
                    <button 
                        onClick={() => onPay(total, subtotal, discountInfo)} 
                        disabled={cart.length === 0 && extraCharges.length === 0} 
                        className="w-full group relative flex items-center justify-center gap-3 p-5 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-2xl font-black text-xl shadow-xl shadow-primary-500/20 transition-all transform active:scale-[0.98] overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <Icon name="credit-card" size={24} />
                        <span>Checkout</span>
                        <Icon name="arrow-right" size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                className="relative bg-theme-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-theme-main"
            >
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
                    <div>
                        <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Extra Charge</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Add delivery, service, or other fees</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><Icon name="close" size={20} /></button>
                </div>
                <div className="p-10 space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Description</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary-500/10 outline-none text-slate-900 dark:text-white font-bold" placeholder="e.g. Service Charge, Delivery Fee" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">₹</span>
                            <input type="number" autoFocus value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 pl-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary-500/10 outline-none text-slate-900 dark:text-white text-3xl font-black tracking-tighter" placeholder="0.00" />
                        </div>
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
                        className="w-full py-5 bg-primary-500 text-white font-black rounded-2xl hover:bg-primary-600 transition-all shadow-xl shadow-primary-500/20 text-sm uppercase tracking-[0.2em]"
                    >
                        Apply Charge
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
            <div className="bg-theme-surface rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-theme-main">
                <div className="p-4 border-b border-theme-main flex justify-between items-center bg-theme-main">
                    <h3 className="text-lg font-bold text-theme-main">Scan QR / Barcode</h3>
                    <button onClick={onClose} className="p-2 hover:bg-theme-surface rounded-full transition-colors">
                        <Icon name="close" className="w-5 h-5 text-theme-main" />
                    </button>
                </div>
                <div className="p-4">
                    <div id="qr-reader" className="overflow-hidden rounded-xl border-2 border-dashed border-theme-main"></div>
                    <p className="mt-4 text-center text-sm text-theme-muted">
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
    const [newGstin, setNewGstin] = useState('');

    const filtered = customers.filter(c => 
        fuzzySearch(search, c.name) || 
        fuzzySearch(search, c.phone)
    );

    const pinnedCustomers = customers.filter(c => pinnedIds.includes(c.id));

    const handleQuickAdd = () => {
        if (!newName.trim()) return;
        onSaveCustomer({
            name: newName,
            phone: newPhone,
            gstin: newGstin,
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
        setNewGstin('');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-theme-surface rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden border border-theme-main">
                <div className="p-4 border-b border-theme-main flex justify-between items-center bg-theme-main">
                    <div>
                        <h3 className="text-lg font-bold text-theme-main">
                            {isAddingNew ? 'Quick Add Customer' : 'Select Customer'}
                        </h3>
                        <p className="text-xs text-theme-muted">
                            {isAddingNew ? 'Fill in basic details' : 'Choose a customer for this order'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-theme-surface rounded-full transition-colors">
                        <Icon name="close" className="w-5 h-5 text-theme-main" />
                    </button>
                </div>

                {isAddingNew ? (
                    <div className="p-6 space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-muted uppercase">Full Name *</label>
                            <input 
                                type="text" 
                                value={newName} 
                                onChange={e => setNewName(e.target.value)}
                                className="w-full p-3 bg-theme-main border border-theme-main rounded-xl focus:ring-2 focus:ring-theme-accent outline-none text-theme-main"
                                placeholder="Enter customer name"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-muted uppercase">Phone Number</label>
                            <input 
                                type="tel" 
                                value={newPhone} 
                                onChange={e => setNewPhone(e.target.value)}
                                className="w-full p-3 bg-theme-main border border-theme-main rounded-xl focus:ring-2 focus:ring-theme-accent outline-none text-theme-main"
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-theme-muted uppercase">GSTIN (Optional)</label>
                            <input 
                                type="text" 
                                value={newGstin} 
                                onChange={e => setNewGstin(e.target.value.toUpperCase())}
                                className="w-full p-3 bg-theme-main border border-theme-main rounded-xl focus:ring-2 focus:ring-theme-accent outline-none text-theme-main font-mono text-sm"
                                placeholder="15-digit GSTIN"
                                maxLength={15}
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={() => setIsAddingNew(false)}
                                className="flex-1 px-4 py-3 border border-theme-main rounded-xl font-bold text-theme-main hover:bg-theme-main transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleQuickAdd}
                                disabled={!newName.trim()}
                                className="flex-1 px-4 py-3 bg-theme-accent hover:bg-theme-accent/90 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-theme-accent/20"
                            >
                                Save & Select
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-theme-main bg-theme-surface">
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
                                    <input 
                                        type="text" 
                                        placeholder="Search by name or phone..." 
                                        value={search} 
                                        onChange={e => setSearch(e.target.value)} 
                                        className="w-full pl-10 pr-10 p-3 border border-theme-main rounded-xl bg-theme-main focus:ring-2 focus:ring-theme-accent outline-none transition-all text-theme-main" 
                                        autoFocus 
                                    />
                                    {search && (
                                        <button 
                                            onClick={() => setSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-theme-surface rounded-full"
                                        >
                                            <Icon name="close" className="w-3 h-3 text-theme-muted" />
                                        </button>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setIsAddingNew(true)}
                                    className="p-3 bg-theme-accent hover:bg-theme-accent/90 text-white rounded-xl transition-all shadow-lg shadow-theme-accent/20 flex items-center justify-center"
                                    title="Add New Customer"
                                >
                                    <Icon name="plus" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-2 custom-scrollbar">
                            {search !== '' && !customers.some(c => c.name.toLowerCase() === search.toLowerCase()) && (
                                <div 
                                    onClick={() => {
                                        setNewName(search);
                                        setIsAddingNew(true);
                                    }}
                                    className="flex items-center gap-3 p-3 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl cursor-pointer transition-all border border-amber-500/30 group mb-2"
                                >
                                    <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white">
                                        <Icon name="plus" className="w-6 h-6" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-bold text-amber-600 flex items-center gap-1.5">
                                            Create "{search}"
                                            <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">New</span>
                                        </p>
                                        <p className="text-xs text-amber-600/70">Click to add this as a new customer</p>
                                    </div>
                                    <Icon name="arrow-right" className="w-5 h-5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}

                            {search === '' && pinnedCustomers.length > 0 && (
                                <div className="mb-4">
                                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-theme-muted">Pinned Customers</p>
                                    <div className="grid grid-cols-1 gap-1">
                                        {pinnedCustomers.map(c => (
                                            <div key={`pinned-${c.id}`} onClick={() => onSelect(c)} className="flex items-center gap-3 p-3 hover:bg-theme-accent/10 rounded-xl cursor-pointer transition-all border border-transparent hover:border-theme-accent/30 group">
                                                <Avatar name={c.name} className="w-10 h-10 ring-2 ring-theme-accent/30" />
                                                <div className="flex-grow">
                                                    <p className="font-bold text-theme-main flex items-center gap-1.5">
                                                        {c.name}
                                                        <Icon name="star" className="w-3 h-3 text-theme-accent fill-current" />
                                                    </p>
                                                    <p className="text-xs text-theme-muted">{c.phone}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${c.creditBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>₹{Math.abs(c.creditBalance).toFixed(2)}</p>
                                                    <p className="text-[10px] text-theme-muted uppercase font-bold tracking-tighter">Balance</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mx-3 my-4 border-t border-theme-main"></div>
                                </div>
                            )}

                            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-theme-muted">
                                {search ? `Search Results (${filtered.length})` : 'All Customers'}
                            </p>
                            
                            <div className="grid grid-cols-1 gap-1">
                                {filtered.map((c, i) => {
                                    const isPinned = pinnedIds.includes(c.id);
                                    return (
                                        <div key={`cust-select-${c.id}-${i}`} className="flex items-center gap-3 p-3 hover:bg-theme-main rounded-xl cursor-pointer transition-all border border-transparent hover:border-theme-main group">
                                            <div onClick={() => onSelect(c)} className="flex items-center gap-3 flex-grow">
                                                <Avatar name={c.name} className="w-10 h-10" />
                                                <div className="flex-grow">
                                                    <p className="font-bold text-theme-main">{c.name}</p>
                                                    <p className="text-xs text-theme-muted">{c.phone}</p>
                                                </div>
                                                <div className="text-right mr-2">
                                                    <p className={`text-sm font-bold ${c.creditBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>₹{Math.abs(c.creditBalance).toFixed(2)}</p>
                                                    <p className="text-[10px] text-theme-muted uppercase font-bold tracking-tighter">Balance</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onTogglePin(c.id); }} 
                                                className={`p-2 rounded-lg hover:bg-theme-surface transition-all ${isPinned ? 'text-amber-500 bg-amber-500/10' : 'text-theme-muted opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <Icon name="star" className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {filtered.length === 0 && (
                                <div className="text-center py-12 px-4">
                                    <div className="w-16 h-16 bg-theme-main rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Icon name="customers" className="w-8 h-8 text-theme-muted" />
                                    </div>
                                    <h3 className="text-lg font-bold text-theme-main">No customers found</h3>
                                    <p className="text-sm text-theme-muted mt-1">Try a different search term or add a new customer.</p>
                                    <button 
                                        onClick={() => setIsAddingNew(true)}
                                        className="mt-6 px-6 py-2 bg-theme-accent hover:bg-theme-accent/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-theme-accent/20"
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
    total: number;
    onComplete: (payment: Payment) => void;
    onClose: () => void;
    customer: Customer | null;
    appSettings: AppSettings;
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-theme-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-theme-main"
            >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Complete Payment</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <Icon name="close" className="w-5 h-5 text-slate-400"/>
                    </button>
                </div>
                <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Amount</p>
                        <p className="text-6xl font-black text-primary-500 mt-1 tracking-tighter">₹{total.toFixed(2)}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {(['Cash', 'Online', 'Credit'] as PaymentMethod[]).map(m => (
                            <button 
                                key={m} 
                                onClick={() => setMethod(m)}
                                disabled={m === 'Credit' && !customer}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${method === m ? 'border-primary-500 bg-primary-500/10 text-primary-500 shadow-lg shadow-primary-500/10' : 'border-slate-100 dark:border-slate-800 hover:border-primary-500/50 text-slate-400'} ${m === 'Credit' && !customer ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                                <Icon name={m.toLowerCase() as any} className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                            </button>
                        ))}
                    </div>

                    {method === 'Online' && appSettings.upiId && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Scan to Pay via UPI</p>
                                <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100">
                                    <QRCodeSVG 
                                        value={`upi://pay?pa=${appSettings.upiId}&pn=${encodeURIComponent(appSettings.shopName)}&am=${total.toFixed(2)}&cu=INR`} 
                                        size={180} 
                                        level="H"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-4 text-center font-mono tracking-widest">{appSettings.upiId}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Transaction ID / UTR (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter 12-digit UTR number"
                                        value={transactionId}
                                        onChange={e => setTransactionId(e.target.value)}
                                        className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-mono font-bold"
                                    />
                                </div>
                                <button 
                                    onClick={() => setIsVerified(!isVerified)}
                                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-xs ${isVerified ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-500/10' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-emerald-500/50'}`}
                                >
                                    <Icon name={isVerified ? 'sync-check' : 'sync-reload'} className="w-5 h-5" />
                                    <span>{isVerified ? 'Payment Verified' : 'Mark as Verified'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {method !== 'Credit' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Amount Received</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-3xl">₹</span>
                                <input 
                                    type="number" 
                                    value={received} 
                                    onChange={e => setReceived(e.target.value)} 
                                    className="w-full pl-12 p-6 text-4xl font-black border border-slate-200 dark:border-slate-700 rounded-[2rem] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all tracking-tighter"
                                    autoFocus
                                />
                            </div>
                            {change > 0 && (
                                <div className="flex justify-between items-center p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Change to return</span>
                                    <span className="text-3xl font-black text-emerald-600 tracking-tighter">₹{change.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {method === 'Credit' && customer && (
                        <div className="p-5 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-lg shadow-amber-500/5">
                            <p className="text-xs font-black text-amber-600 uppercase tracking-widest">
                                Adding to <span className="text-amber-700 dark:text-amber-400">{customer.name}'s</span> balance
                            </p>
                            <p className="text-xl font-black text-amber-600 mt-1 tracking-tighter">New Balance: ₹{(customer.creditBalance + total).toFixed(2)}</p>
                        </div>
                    )}

                    <button 
                        onClick={handleComplete}
                        disabled={method !== 'Credit' && (parseFloat(received) < total || isNaN(parseFloat(received)))}
                        className="w-full py-6 bg-primary-500 hover:bg-primary-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-primary-500/30 transition-all disabled:opacity-50 disabled:shadow-none transform active:scale-95 uppercase tracking-widest"
                    >
                        Complete Sale
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const HeldOrdersModal: React.FC<{
    heldCarts: HeldCart[];
    onClose: () => void;
    onRestore: (heldCart: HeldCart) => void;
    onDelete: (id: string) => void;
}> = ({ heldCarts, onClose, onRestore, onDelete }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-white/20 dark:border-slate-800/50 overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Held Orders</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Manage orders in queue</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <Icon name="close" className="w-6 h-6 text-slate-400" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
                    {heldCarts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center mb-6">
                                <Icon name="categories" className="w-12 h-12 opacity-20" />
                            </div>
                            <p className="text-lg font-black tracking-tight text-slate-600 dark:text-slate-300">No held orders found</p>
                            <p className="text-xs font-bold uppercase tracking-widest mt-2">Orders you put on hold will appear here</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {heldCarts.map(hc => (
                                <div key={hc.id} className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 flex justify-between items-center hover:border-primary-500/50 transition-all group shadow-sm hover:shadow-xl hover:shadow-primary-500/5">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{hc.name}</span>
                                            <span className="text-[10px] bg-primary-500/10 text-primary-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                                {hc.cart.length} items
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5 text-primary-500">
                                                <Icon name="receipt" className="w-3.5 h-3.5" />
                                                ₹{hc.cart.reduce((t, i) => t + i.appliedPrice * i.quantity, 0).toFixed(2)}
                                            </span>
                                            <span className="opacity-30">•</span>
                                            <span className="flex items-center gap-1.5">
                                                <Icon name="clock" className="w-3.5 h-3.5" />
                                                {new Date(hc.date).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                        <button 
                                            onClick={() => onDelete(hc.id)}
                                            className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                                            title="Delete Order"
                                        >
                                            <Icon name="delete" className="w-6 h-6" />
                                        </button>
                                        <button 
                                            onClick={() => onRestore(hc)}
                                            className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 flex items-center gap-2"
                                        >
                                            <Icon name="sync-reload" className="w-4 h-4" />
                                            Restore
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const POS: React.FC<POSProps> = (props) => {
    const { products, dishes, rawMaterials, customers, onTransaction, appSettings, promotions, allocatedRawMaterials, heldCarts, setHeldCarts, transactions, onUpdateAppSettings, onSaveCustomer } = props;
    
    const [orderId] = useState(() => Date.now().toString().slice(-6));

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
    const [isHeldOrdersModalOpen, setHeldOrdersModalOpen] = useState(false);
    const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
    const [holdName, setHoldName] = useState('');
    const [extraCharges, setExtraCharges] = useState<{ description: string, amount: number }[]>([]);
    
    // New state for variants
    const [selectedItemForVariants, setSelectedItemForVariants] = useState<Product | Dish | null>(null);

    const handleAddExtraCharge = useCallback((charge: { description: string, amount: number }) => {
        setExtraCharges(prev => [...prev, charge]);
    }, []);

    const handleRemoveExtraCharge = useCallback((index: number) => {
        setExtraCharges(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleAddItem = useCallback((item: ProductVariant | DishVariant | { name: string, price: number }) => {
        setCart(prevCart => {
            const isProduct = 'productId' in item;
            const isDish = !isProduct && 'id' in item;
            const isCustom = !('id' in item);

            // Search for existing by ID and type
            const existing = prevCart.find(ci => {
                if (isCustom) return !('id' in ci.item) && ci.item.name === item.name;
                const ciIsProduct = 'productId' in ci.item;
                const ciIsDish = !ciIsProduct && 'id' in ci.item;
                if (isProduct && ciIsProduct) return ci.item.id === item.id;
                if (isDish && ciIsDish) return ci.item.id === item.id;
                return false;
            });

            if (existing) {
                return prevCart.map(ci => {
                    if (isCustom) return (!('id' in ci.item) && ci.item.name === item.name) ? { ...ci, quantity: ci.quantity + 1 } : ci;
                    const ciIsProduct = 'productId' in ci.item;
                    const ciIsDish = !ciIsProduct && 'id' in ci.item;
                    if (isProduct && ciIsProduct && ci.item.id === item.id) return { ...ci, quantity: ci.quantity + 1 };
                    if (isDish && ciIsDish && ci.item.id === item.id) return { ...ci, quantity: ci.quantity + 1 };
                    return ci;
                });
            }

            const price = isCustom ? (item as any).price : ('mrp' in item ? item.mrp : item.price);
            return [...prevCart, { item: item as any, quantity: 1, appliedPrice: price }];
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
        setExtraCharges([]);
    }, []);

    const handleHoldCart = useCallback(() => {
        if (cart.length === 0) {
            showToast('Cart is empty', 'error');
            return;
        }
        
        const name = holdName.trim() || (customer ? customer.name : `Order ${new Date().toLocaleTimeString()}`);
        
        const newHeldCart: HeldCart = {
            id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name,
            cart: [...cart],
            customer: customer || undefined,
            date: new Date().toISOString()
        };

        setHeldCarts(prev => [...prev, newHeldCart]);
        setCart([]);
        setCustomer(null);
        setExtraCharges([]);
        setHoldName('');
        setIsHoldModalOpen(false);
        showToast(`Order "${name}" held successfully`, 'success');
    }, [cart, customer, setHeldCarts, holdName, showToast]);

    const handleRestoreHeldCart = useCallback((heldCart: HeldCart) => {
        if (cart.length > 0) {
            // If current cart is not empty, maybe we should ask? 
            // For now, let's just hold the current cart and load the new one
            handleHoldCart();
        }
        setCart(heldCart.cart);
        setCustomer(heldCart.customer || null);
        setHeldCarts(prev => prev.filter(c => c.id !== heldCart.id));
        setHeldOrdersModalOpen(false);
        showToast('Order restored', 'success');
    }, [cart, handleHoldCart, setHeldCarts, showToast]);

    const handleDeleteHeldCart = useCallback((id: string) => {
        setHeldCarts(prev => prev.filter(c => c.id !== id));
        showToast('Held order deleted', 'info');
    }, [setHeldCarts, showToast]);

    const handlePay = useCallback((total: number, subtotal: number, discount?: any) => {
        setPaymentData({ total, subtotal, discount });
        setPaymentModalOpen(true);
    }, []);

    const handleCompleteTransaction = (payment: Payment) => {
        const transaction: Transaction = {
            id: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
        return products.filter(p => !p.isDeleted && multiTermSearch(searchTerm, [
            p.name,
            p.subCategory,
            p.tags,
            ...p.variants.map(v => v.name),
            ...p.variants.flatMap(v => v.tags || [])
        ]));
    }, [products, searchTerm]);

    const filteredDishes = useMemo(() => {
        const cartRequirements = getCartIngredients(cart);
        return dishes.filter(d => !d.isDeleted && multiTermSearch(searchTerm, [
            d.name,
            d.tags
        ])).map(dish => {
            // Check if ANY variant is in stock
            const isOutOfStock = dish.variants.every(v => {
                const ingredients = v.ingredients || [];
                return ingredients.some(ing => {
                    const material = rawMaterials.find(rm => rm.id === ing.id);
                    const available = (material?.stock || 0) - (allocatedRawMaterials[ing.id] || 0) - (cartRequirements[ing.id] || 0);
                    return available < ing.quantity;
                });
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
        <div className="md:grid md:grid-cols-3 md:gap-6">
            {/* Main content: Search, Filters, Product Grid */}
            <div className="md:col-span-2 space-y-8">
                <div className="relative flex gap-4">
                    <div className="relative flex-grow group">
                        <Icon name="search" className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search products or dishes..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full p-5 pl-14 bg-theme-surface border border-theme-main rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all text-theme-main shadow-xl shadow-theme-main/10 font-bold text-lg" 
                        />
                    </div>
                    {props.appSettings.enableBarcodeScanner && (
                        <Tooltip content="Scan Barcode" position="bottom">
                            <button 
                                onClick={() => setQRScannerOpen(true)}
                                className="p-5 bg-white/80 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-500 transition-all text-slate-600 dark:text-slate-400 shadow-xl shadow-slate-200/20 dark:shadow-none"
                            >
                                <Icon name="barcode" size={28} />
                            </button>
                        </Tooltip>
                    )}
                </div>
                
                {props.appSettings.shopTypes.includes('Restaurant') && props.appSettings.shopTypes.includes('Retail') && (
                    <div className="flex items-center bg-theme-main/20 rounded-xl p-2 self-start w-fit border border-theme-main">
                        <button 
                            onClick={() => setActiveTab('products')} 
                            className={`px-10 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'products' ? 'bg-theme-surface text-primary-500 shadow-lg' : 'text-theme-muted hover:text-theme-main'}`}
                        >
                            Products
                        </button>
                        <button 
                            onClick={() => setActiveTab('dishes')} 
                            className={`px-10 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'dishes' ? 'bg-theme-surface text-primary-500 shadow-lg' : 'text-theme-muted hover:text-theme-main'}`}
                        >
                            Dishes
                        </button>
                    </div>
                )}

                <div data-tutorial-id="pos-product-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6 pb-32 md:pb-6">
                    <AnimatePresence mode="popLayout">
                        {activeTab === 'products' ? (
                            <>
                                {filteredProducts.map((p, idx) => (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        {p.variants.filter(v => !v.isDeleted).length > 1 ? (
                                            <MasterProductTile 
                                                product={p} 
                                                onOpenVariants={setSelectedItemForVariants} 
                                                cart={cart}
                                            />
                                        ) : (
                                            <SingleVariantProductTile 
                                                product={p} 
                                                onAdd={(v) => handleAddItem(v)} 
                                                isOutOfStock={p.variants[0].stock <= (cart.find(ci => ci.item.id === p.variants[0].id)?.quantity || 0)} 
                                            />
                                        )}
                                    </motion.div>
                                ))}
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                    <CustomItemTile onAdd={(name, price) => handleAddItem({ name, price })} />
                                </motion.div>
                            </>
                        ) : (
                            <>
                                {filteredDishes.map((d, idx) => (
                                    <motion.div
                                        key={d.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <DishTile 
                                            dish={d} 
                                            onAdd={(variant) => handleAddItem(variant)} 
                                            onOpenVariants={setSelectedItemForVariants}
                                            isOutOfStock={d.isOutOfStock} 
                                        />
                                    </motion.div>
                                ))}
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                    <CustomItemTile onAdd={(name, price) => handleAddItem({ name, price })} />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Desktop Cart */}
            <div className="hidden md:block">
                <div className="sticky top-6 h-[calc(100vh-8rem)]">
                   <CartView 
                        cart={cart} 
                        customer={customer} 
                        orderId={orderId}
                        onUpdateItem={handleUpdateItem} 
                        onRemoveItem={handleRemoveItem} 
                        onClearCart={handleClearCart} 
                        onHoldCart={() => {
                            if (cart.length === 0) {
                                showToast('Cart is empty', 'error');
                                return;
                            }
                            setHoldName(customer ? customer.name : '');
                            setIsHoldModalOpen(true);
                        }}
                        onOpenHeldOrders={() => setHeldOrdersModalOpen(true)}
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
                         <div onClick={() => setMobileCartOpen(true)} className="bg-theme-accent text-white p-3 shadow-lg flex justify-between items-center cursor-pointer">
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
                            orderId={orderId}
                            onUpdateItem={handleUpdateItem} 
                            onRemoveItem={handleRemoveItem} 
                            onClearCart={handleClearCart} 
                            onHoldCart={() => {
                                if (cart.length === 0) {
                                    showToast('Cart is empty', 'error');
                                    return;
                                }
                                setHoldName(customer ? customer.name : '');
                                setIsHoldModalOpen(true);
                            }}
                            onOpenHeldOrders={() => setHeldOrdersModalOpen(true)}
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

            <VariantGridModal 
                item={selectedItemForVariants}
                onClose={() => setSelectedItemForVariants(null)}
                onAddVariant={(v) => handleAddItem(v)}
                cart={cart}
            />

            {isQRScannerOpen && (
                <QRScannerModal 
                    onClose={() => setQRScannerOpen(false)} 
                    onScan={handleQRScan} 
                />
            )}

            {isHeldOrdersModalOpen && (
                <HeldOrdersModal 
                    heldCarts={heldCarts}
                    onClose={() => setHeldOrdersModalOpen(false)}
                    onRestore={handleRestoreHeldCart}
                    onDelete={handleDeleteHeldCart}
                />
            )}

            {isHoldModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-theme-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-theme-main"
                    >
                        <div className="p-6 border-b border-theme-main flex justify-between items-center">
                            <h3 className="text-xl font-black text-theme-main tracking-tighter uppercase">Hold Current Order</h3>
                            <button onClick={() => setIsHoldModalOpen(false)} className="p-2 hover:bg-theme-main rounded-full transition-colors">
                                <Icon name="close" className="w-5 h-5 text-theme-muted" />
                            </button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-2">Order Name / Table Number</label>
                                <input 
                                    type="text" 
                                    value={holdName} 
                                    onChange={e => setHoldName(e.target.value)}
                                    className="w-full p-5 bg-theme-main border border-theme-main rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none text-theme-main font-bold text-lg transition-all"
                                    placeholder={customer ? customer.name : "e.g. Table 5, John Doe..."}
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleHoldCart()}
                                />
                                <p className="text-[10px] text-theme-muted font-bold uppercase tracking-widest ml-2">This helps you identify the order later</p>
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button 
                                    onClick={() => setIsHoldModalOpen(false)}
                                    className="flex-1 px-6 py-4 border border-theme-main rounded-xl font-black uppercase tracking-widest text-xs text-theme-muted hover:bg-theme-main transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleHoldCart}
                                    className="flex-1 px-6 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-primary-500/25"
                                >
                                    Hold Order
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default POS;