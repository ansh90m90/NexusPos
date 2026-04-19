import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import type { Product, ProductVariant, AppSettings, ProductsPageTab, StockAdjustmentReason, Supplier } from '../types';
import SlideOverPanel from '../components/SlideOverPanel';
import { useToast } from '../components/Toast';
import Icon from '../components/Icon';
import ConfirmationModal from '../components/ConfirmationModal';
import { Tooltip } from '../components/Tooltip';
import ComboBox from '../components/ComboBox';
import { fuzzySearch, normalizePhonetic, multiTermSearch } from '../lib/searchUtils';

type ProductSortKeys = 'name' | 'subCategory' | 'supplier' | 'variants';
type SortDirection = 'asc' | 'desc';

// #region Helper Components
const Highlighted: React.FC<{text: string, highlight: string}> = ({text, highlight}) => {
    if (!text || !highlight.trim()) {
        return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span key={i} className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-sm px-0.5">{part}</span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};

const StockLevelBar: React.FC<{ stock: number, minStock: number }> = ({ stock, minStock }) => {
    const percentage = minStock > 0 ? (stock / (minStock * 2)) * 100 : 100;
    const color = stock < minStock ? 'bg-rose-500' : stock < minStock * 1.5 ? 'bg-amber-500' : 'bg-emerald-500';

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden" title={`Stock: ${stock} / Min Stock: ${minStock}`}>
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percentage, 100)}%` }}
                className={`${color} h-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
            />
        </div>
    );
};

const SortIndicator: React.FC<{ direction: SortDirection | null }> = ({ direction }) => {
    if (!direction) return null;
    return (
        <motion.span 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-1 inline-block text-primary-500"
        >
            {direction === 'asc' ? '↑' : '↓'}
        </motion.span>
    );
};
// #endregion

// #region Modals
const ProductPanel: React.FC<{
    product: Product | null;
    category: 'General' | 'Rashan';
    onClose: () => void;
    onSave: (productData: Partial<Product>) => void;
    suppliers: Supplier[];
    products: Product[];
}> = ({ product, category, onClose, onSave, suppliers, products }) => {
    const [formData, setFormData] = useState<Partial<Product>>(() => 
        product ? JSON.parse(JSON.stringify(product)) : { 
            name: '', 
            category: category, 
            pricingType: category === 'Rashan' ? 'per_unit' : 'fixed',
            subCategory: '', 
            supplier: '', 
            hsnCode: '', 
            minStock: 10,
            tags: [],
            variants: [{ id: -Date.now() - Math.floor(Math.random() * 1000), productId: 0, name: category === 'Rashan' ? 'per kg' : 'Standard', mrp: 0, wholesalePrice: 0, netPurchasePrice: 0, stock: 0, sku: '', unit: category === 'Rashan' ? 'kg' : 'pcs' }] 
        }
    );

    const uniqueSuppliers = useMemo(() => [...new Set(suppliers.map(s => s.name))].sort(), [suppliers]);
    const uniqueSubCategories = useMemo(() => [...new Set(products.map(p => p.subCategory).filter(Boolean) as string[])].sort(), [products]);
    const uniqueHsnCodes = useMemo(() => {
        const fromProducts = products.map(p => p.hsnCode).filter(Boolean) as string[];
        const defaults = ['1006', '1001', '1905', '2106', '0902', '1701', '1512'];
        // Ensure the current formData.hsnCode is also in the list if it's not already
        const current = formData.hsnCode ? [formData.hsnCode] : [];
        return [...new Set([...defaults, ...fromProducts, ...current])].sort();
    }, [products, formData.hsnCode]);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        products.forEach(p => {
            p.tags?.forEach(t => tags.add(t));
            p.variants.forEach(v => v.tags?.forEach(t => tags.add(t)));
        });
        return Array.from(tags).sort();
    }, [products]);

    const similarProduct = useMemo(() => {
        if (!formData.name || formData.name.trim().length < 3) return null;
        return products.find(p => 
            p.id !== product?.id && 
            !p.isDeleted &&
            (p.name.toLowerCase().trim() === formData.name?.toLowerCase().trim() || normalizePhonetic(p.name) === normalizePhonetic(formData.name!))
        );
    }, [formData.name, products, product?.id]);

    const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);

    const handleMainChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'pricingType') {
            const newPricingType = value as 'fixed' | 'per_unit';
            const newCategory = newPricingType === 'per_unit' ? 'Rashan' : 'General';
            setFormData(prev => {
                const newVariants = prev.variants?.map(v => ({
                    ...v,
                    unit: newCategory === 'Rashan' && v.unit === 'pcs' ? 'kg' : v.unit,
                    name: newCategory === 'Rashan' && v.name === 'Standard' ? 'per kg' : v.name,
                }));
                return { ...prev, pricingType: newPricingType, category: newCategory, variants: newVariants };
            });
            return;
        }

        if ((e.target as HTMLInputElement).type === 'number') {
            setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
        const newVariants = [...(formData.variants || [])];
        const newVariant = { ...newVariants[index], [field]: value };
        newVariants[index] = newVariant;
        setFormData(prev => ({ ...prev, variants: newVariants }));
    };
    
    const addVariant = () => {
        const newVariant: Partial<ProductVariant> = {
            id: -(Date.now() + Math.floor(Math.random() * 1000)),
            productId: formData.id || 0,
            name: '',
            mrp: 0,
            wholesalePrice: 0,
            netPurchasePrice: 0,
            stock: 0,
            sku: '',
            unit: 'pcs',
        };
        setFormData(prev => ({ ...prev, variants: [...(prev.variants || []), newVariant as ProductVariant]}));
    };

    const removeVariant = (index: number) => {
         if (formData.variants && formData.variants.length > 1) {
            setFormData(prev => ({ ...prev, variants: prev.variants?.filter((_, i) => i !== index)}));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (similarProduct && !showDuplicateConfirm) {
            setShowDuplicateConfirm(true);
            return;
        }
        onSave(formData);
    };

    const isPerUnit = formData.pricingType === 'per_unit';

    return (
        <>
        <SlideOverPanel
            title={product ? 'Edit Product' : 'Add New Product'}
            onClose={onClose}
            footer={
                 <div className="flex gap-4 w-full">
                    <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black uppercase tracking-widest text-xs">Cancel</button>
                    <button type="submit" form="product-form" className="flex-2 px-8 py-4 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 font-black uppercase tracking-widest text-xs">Save Product</button>
                </div>
            }
        >
            <form id="product-form" onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Product Name *</label>
                    <input name="name" value={formData.name} onChange={handleMainChange} placeholder="e.g., Lays Classic" className={`w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold ${similarProduct ? 'border-amber-500' : 'border-slate-200 dark:border-slate-700'}`} required/>
                    {similarProduct && (
                        <div className="flex items-center gap-2 mt-2 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest animate-pulse ml-2">
                            <Icon name="alert" size={12} />
                            <span>Similar product already exists ({similarProduct.name})</span>
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Low Stock Threshold</label>
                        <input type="number" name="minStock" value={formData.minStock} onChange={handleMainChange} className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold"/>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Notify when stock falls below this.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pricing Type</label>
                        <select name="pricingType" value={formData.pricingType} onChange={handleMainChange} className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold" required>
                            <option value="fixed">Fixed Price (Packaged)</option>
                            <option value="per_unit">Per Unit (by Weight/Vol)</option>
                        </select>
                    </div>
                </div>
                
                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Variants & Pricing</h4>
                    <div className="space-y-6">
                        {isPerUnit ? (
                             <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                                        <select value={formData.variants?.[0]?.unit || 'kg'} onChange={(e) => handleVariantChange(0, 'unit', e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-bold">
                                            <option value="kg">kg</option><option value="g">g</option><option value="l">l</option><option value="ml">ml</option><option value="pcs">pcs</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sale Price</label>
                                        <input type="number" step="0.01" value={formData.variants?.[0]?.mrp || 0} onChange={(e) => handleVariantChange(0, 'mrp', parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">W/S Price</label>
                                        <input type="number" step="0.01" value={formData.variants?.[0]?.wholesalePrice || ''} onChange={(e) => handleVariantChange(0, 'wholesalePrice', parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Net Cost</label>
                                        <input type="number" step="0.01" value={formData.variants?.[0]?.netPurchasePrice || 0} onChange={(e) => handleVariantChange(0, 'netPurchasePrice', parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Stock</label>
                                        <input type="number" step="0.001" value={formData.variants?.[0]?.stock || 0} onChange={(e) => handleVariantChange(0, 'stock', parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                        <>
                            {formData.variants?.map((variant, index) => (
                                 <div key={variant.id} className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <div className="space-y-2 mb-6">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Variant Name</label>
                                        <input value={variant.name} onChange={e => handleVariantChange(index, 'name', e.target.value)} placeholder="e.g., 500g, 10-pack" className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-bold" />
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Variant Tags</label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {variant.tags?.map((tag, i) => (
                                                <span key={i} className="px-3 py-1 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                    {tag}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleVariantChange(index, 'tags', variant.tags?.filter((_, idx) => idx !== i))}
                                                        className="hover:text-rose-500 transition-colors"
                                                    >
                                                        <Icon name="close" size={10} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <ComboBox
                                            value=""
                                            onChange={(val) => {
                                                if (val && !variant.tags?.includes(val)) {
                                                    handleVariantChange(index, 'tags', [...(variant.tags || []), val]);
                                                }
                                            }}
                                            options={allTags}
                                            placeholder="Type or select a tag..."
                                            allowCustom={true}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sale Price (MRP)</label>
                                            <input type="number" step="0.01" value={variant.mrp} onChange={e => handleVariantChange(index, 'mrp', parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Wholesale Price</label>
                                            <input type="number" step="0.01" value={variant.wholesalePrice || ''} onChange={e => handleVariantChange(index, 'wholesalePrice', parseFloat(e.target.value) || 0)} placeholder="0" className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black" />
                                        </div>
                                         <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Net Cost Price</label>
                                            <input type="number" step="0.01" value={variant.netPurchasePrice} onChange={e => handleVariantChange(index, 'netPurchasePrice', parseFloat(e.target.value) || 0)} placeholder="Price you paid" className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Quantity</label>
                                            <input type="number" value={variant.stock} onChange={e => handleVariantChange(index, 'stock', parseInt(e.target.value, 10) || 0)} placeholder="Units in stock" className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black" />
                                        </div>
                                    </div>
                                    {formData.variants && formData.variants.length > 1 && (
                                    <div className="text-center pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                                         <button
                                            type="button"
                                            onClick={() => removeVariant(index)}
                                            className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors"
                                        >
                                            Remove Variant
                                        </button>
                                    </div>
                                    )}
                                </div>
                            ))}
                             <button type="button" onClick={addVariant} className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary-500 hover:border-primary-500/50 transition-all">+ Add Variant</button>
                        </>
                        )}
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Additional Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ComboBox
                            label="Sub-Category"
                            value={formData.subCategory || ''}
                            onChange={(val) => setFormData(prev => ({ ...prev, subCategory: val }))}
                            options={uniqueSubCategories}
                            placeholder="e.g., Wafers, Cool Drinks"
                        />
                        <ComboBox
                            label="Supplier"
                            value={formData.supplier || ''}
                            onChange={(val) => setFormData(prev => ({ ...prev, supplier: val }))}
                            options={uniqueSuppliers}
                            placeholder="e.g., Pepsico, ITC"
                        />
                        <ComboBox
                            label="HSN Code"
                            value={formData.hsnCode || ''}
                            onChange={(val) => setFormData(prev => ({ ...prev, hsnCode: val }))}
                            options={uniqueHsnCodes}
                            placeholder="e.g., 1006"
                        />
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Product Tags</h4>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {formData.tags?.map((tag, i) => (
                                <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    {tag}
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags?.filter((_, idx) => idx !== i) }))}
                                        className="hover:text-rose-500 transition-colors"
                                    >
                                        <Icon name="close" size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val && !formData.tags?.includes(val)) {
                                        setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), val] }));
                                        (e.target as HTMLInputElement).value = '';
                                    }
                                }
                            }}
                            placeholder="Type a tag and press Enter..." 
                            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold"
                        />
                    </div>
                </div>
            </form>
        </SlideOverPanel>

        <ConfirmationModal
            isOpen={showDuplicateConfirm}
            title="Duplicate Product Warning"
            message={`A product with a similar name "${similarProduct?.name}" already exists. Are you sure you want to save this as a new product?`}
            onConfirm={() => {
                setShowDuplicateConfirm(false);
                onSave(formData);
            }}
            onCancel={() => setShowDuplicateConfirm(false)}
            confirmText="Yes, Save Anyway"
            cancelText="No, Go Back"
        />
        </>
    );
};

const StockAdjustmentModal: React.FC<{
    variant: ProductVariant,
    productName: string,
    onClose: () => void,
    onConfirm: (quantityChange: number, reason: StockAdjustmentReason, notes?: string) => void,
}> = ({ variant, productName, onClose, onConfirm }) => {
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState<StockAdjustmentReason>('Correction');
    const [notes, setNotes] = useState('');
    const [type, setType] = useState<'remove' | 'add'>('remove');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const quantityChange = type === 'remove' ? -quantity : quantity;
        onConfirm(quantityChange, reason, notes);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4">
            <motion.form 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                onSubmit={handleSubmit} 
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full space-y-8 border border-white/20 dark:border-slate-800/50"
            >
                <div className="text-center">
                    <div className="w-16 h-16 rounded-3xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/10">
                        <Icon name="receive-stock" size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Adjust Stock</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{productName}</p>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Variant</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white">{variant.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Stock</span>
                            <span className="text-sm font-black text-primary-500">{variant.stock}</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-1/3 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Action</label>
                            <select 
                                value={type} 
                                onChange={e => setType(e.target.value as 'add'|'remove')} 
                                className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-bold"
                            >
                                <option value="remove">Remove</option>
                                <option value="add">Add</option>
                            </select>
                        </div>
                        <div className="flex-grow space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Quantity</label>
                            <input 
                                type="number" 
                                value={quantity} 
                                onChange={e => setQuantity(parseInt(e.target.value) || 0)} 
                                className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-black text-lg" 
                                min="1" 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Reason</label>
                        <select 
                            value={reason} 
                            onChange={e => setReason(e.target.value as StockAdjustmentReason)} 
                            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-bold"
                        >
                            <option value="Damaged">Damaged Goods</option>
                            <option value="Internal Consumption">Internal Consumption</option>
                            <option value="Correction">Stock Count Correction</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Notes (Optional)</label>
                        <input 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            placeholder="Add any relevant details..." 
                            className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-medium" 
                        />
                    </div>
                </div>

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black uppercase tracking-widest text-xs">Cancel</button>
                    <button type="submit" className="flex-2 px-8 py-4 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 font-black uppercase tracking-widest text-xs">Confirm</button>
                </div>
            </motion.form>
        </div>
    );
};

const ProductList: React.FC<{
    products: Product[];
    searchTerm: string;
    setModalState: (state: { type: string, data: any }) => void;
    onDeleteProduct: (productId: number) => void;
}> = ({ products, searchTerm, setModalState, onDeleteProduct }) => {
    const [sortBy, setSortBy] = useState<ProductSortKeys>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const toast = useToast();

    const handleSort = (key: ProductSortKeys) => {
        if (sortBy === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortDirection('asc');
        }
    };

    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
            let aVal, bVal;
            if (sortBy === 'variants') {
                aVal = a.variants.length;
                bVal = b.variants.length;
            } else {
                aVal = a[sortBy] || '';
                bVal = b[sortBy] || '';
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });
    }, [products, sortBy, sortDirection]);
    
    const headers: { key: ProductSortKeys; label: string }[] = [
        { key: 'name', label: 'Product Name' },
        { key: 'subCategory', label: 'Category' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'variants', label: 'Stock' },
    ];
    
    const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
     return (
        <div className="bg-theme-surface backdrop-blur-xl rounded-[2rem] border border-theme-main shadow-xl shadow-theme-main/10 overflow-hidden">
            <div className="overflow-x-auto hidden lg:block">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] font-black uppercase tracking-widest text-theme-muted bg-theme-main border-b border-theme-main">
                        <tr>
                            {headers.map(header => (
                                <th key={header.key} scope="col" className="px-6 py-4 cursor-pointer hover:text-primary-500 transition-colors" onClick={() => handleSort(header.key)}>
                                    <div className="flex items-center">
                                        {header.label}
                                        {sortBy === header.key && <SortIndicator direction={sortDirection} />}
                                    </div>
                                </th>
                            ))}
                             <th scope="col" className="px-6 py-4">Stock Level</th>
                            <th scope="col" className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-main">
                        {sortedProducts.map(p => (
                            <tr key={p.id} className="group transition-colors hover:bg-theme-main/50">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-theme-main group-hover:text-primary-600 transition-colors">
                                            <Highlighted text={p.name} highlight={searchTerm} />
                                        </span>
                                        {p.tags && p.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {p.tags.map((tag, i) => (
                                                    <span key={i} className="text-[9px] px-2 py-0.5 bg-theme-main text-theme-muted rounded-lg font-black uppercase tracking-tighter border border-theme-main">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-theme-muted font-medium"><Highlighted text={p.subCategory || ''} highlight={searchTerm} /></td>
                                <td className="px-6 py-4 text-theme-muted font-medium"><Highlighted text={p.supplier} highlight={searchTerm} /></td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-2">
                                        {p.variants.map(v => (
                                            <div key={v.id} className="flex justify-between items-center text-xs" title={`SKU: ${v.sku}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-theme-muted font-bold">{v.name}</span>
                                                    <button onClick={() => setModalState({ type: 'adjust_stock', data: { variant: v, productName: p.name }})} className="text-[10px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100">Adjust</button>
                                                </div>
                                                <span className="font-black text-theme-main bg-theme-main px-2 py-0.5 rounded-lg">{v.stock}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 w-48">
                                    <div className="space-y-2">
                                        {p.minStock && p.variants.map(v => <StockLevelBar key={v.id} stock={v.stock} minStock={p.minStock!} />)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                                    <Tooltip content="Edit Product" position="top">
                                        <button onClick={() => setModalState({ type: 'edit_product', data: p })} className="p-2 rounded-xl bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white transition-all">
                                            <Icon name="edit" size={16} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Delete Product" position="top">
                                        <button onClick={() => setDeleteConfirm(p)} className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                                            <Icon name="delete" size={16} />
                                        </button>
                                    </Tooltip>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="lg:hidden space-y-4 p-4">
            {sortedProducts.map(p => (
                <motion.div 
                    layout
                    key={p.id} 
                    className="bg-theme-surface rounded-3xl p-5 border border-theme-main shadow-sm"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-black text-theme-main tracking-tight text-lg">
                                <Highlighted text={p.name} highlight={searchTerm} />
                            </h3>
                            <p className="text-xs font-bold text-theme-muted uppercase tracking-widest mt-1">{p.subCategory} &bull; {p.supplier}</p>
                            {p.tags && p.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {p.tags.map((tag, i) => (
                                        <span key={i} className="text-[9px] px-2 py-0.5 bg-theme-main text-theme-muted rounded-lg border border-theme-main uppercase font-black tracking-tighter">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setModalState({ type: 'edit_product', data: p })} className="p-2.5 rounded-2xl bg-theme-main text-primary-500 shadow-sm border border-theme-main">
                                <Icon name="edit" size={18} />
                            </button>
                            <button onClick={() => setDeleteConfirm(p)} className="p-2.5 rounded-2xl bg-theme-main text-rose-500 shadow-sm border border-theme-main">
                                <Icon name="delete" size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-theme-main space-y-3">
                         {p.variants.map(v => (
                            <div key={v.id} className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-theme-muted">{v.name}</span>
                                    <button onClick={() => setModalState({ type: 'adjust_stock', data: { variant: v, productName: p.name }})} className="text-[10px] font-black uppercase tracking-widest text-primary-500 mt-0.5">Adjust Stock</button>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-black text-theme-main bg-theme-main px-3 py-1 rounded-xl shadow-sm border border-theme-main">{v.stock}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            ))}
        </div>
        <ConfirmationModal 
            isOpen={!!deleteConfirm}
            title="Delete Product"
            message={`Are you sure you want to delete ${deleteConfirm?.name}? This action cannot be undone.`}
            onConfirm={() => {
                if (deleteConfirm) {
                    onDeleteProduct(deleteConfirm.id);
                    setDeleteConfirm(null);
                    toast.showToast('Product deleted successfully', 'success');
                }
            }}
            onCancel={() => setDeleteConfirm(null)}
        />
        </div>
    );
};

interface ProductsProps {
  products: Product[];
  suppliers: Supplier[];
  setProducts: (productData: Partial<Product>) => void;
  onDeleteProduct: (productId: number) => void;
  appSettings: AppSettings;
  activeTab: ProductsPageTab;
  setActiveTab: (tab: ProductsPageTab) => void;
  modalState: { type: string | null; data: any };
  setModalState: (state: { type: string | null; data: any }) => void;
  onAdjustStock: (variantId: number, productName: string, quantityChange: number, reason: StockAdjustmentReason, notes?: string) => void;
}

const Products: React.FC<ProductsProps> = ({
  products,
  suppliers,
  setProducts,
  onDeleteProduct,
  appSettings,
  activeTab,
  setActiveTab,
  modalState,
  setModalState,
  onAdjustStock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();

  const handleCloseModal = useCallback(() => {
    setModalState({type: null, data: null});
  }, [setModalState]);

  const { storeProducts, rashanProducts } = useMemo(() => ({
    storeProducts: products.filter(p => p.category === 'General' && !p.isDeleted),
    rashanProducts: products.filter(p => p.category === 'Rashan' && !p.isDeleted),
  }), [products]);

  const filteredProducts = useMemo(() => {
    const productsToFilter = activeTab === 'store' ? storeProducts : rashanProducts;
    return productsToFilter.filter(p => multiTermSearch(searchTerm, [
      p.name,
      p.subCategory,
      p.supplier,
      p.tags,
      ...p.variants.map(v => v.name),
      ...p.variants.map(v => v.sku),
      ...p.variants.flatMap(v => v.tags || [])
    ]));
  }, [activeTab, storeProducts, rashanProducts, searchTerm]);

  const handleStockAdjustment = (quantityChange: number, reason: StockAdjustmentReason, notes?: string) => {
    if (modalState.data?.variant) {
      const { variant, productName } = modalState.data;
      onAdjustStock(variant.id, productName, quantityChange, reason, notes);
      toast.showToast('Stock adjusted successfully.', 'success');
    }
    handleCloseModal();
  };

  return (
    <div className="space-y-8 p-4 sm:p-8 pb-20">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Products</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Manage your inventory and pricing</p>
        </div>
        <div className="flex items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl p-1.5 border border-slate-200/60 dark:border-slate-800/60 shadow-lg shadow-slate-200/20 dark:shadow-none self-start">
            <Tooltip content="Manage general store items" position="bottom">
                <button 
                    onClick={() => setActiveTab('store')} 
                    className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${activeTab === 'store' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    Store Items
                </button>
            </Tooltip>
            {appSettings.enableRashanCategory && (
                <Tooltip content="Manage grocery and loose items" position="bottom">
                    <button 
                        onClick={() => setActiveTab('rashan')} 
                        className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-300 ${activeTab === 'rashan' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        Rashan / Grocery
                    </button>
                </Tooltip>
            )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
            <Icon name="search" size={20} />
          </div>
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder={`Search ${activeTab === 'store' ? 'Store Items' : 'Rashan'}...`} 
            className="w-full pl-14 pr-8 py-5 rounded-[2rem] bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl text-slate-900 dark:text-white border border-slate-200/60 dark:border-slate-800/60 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all shadow-xl shadow-slate-200/30 dark:shadow-none font-bold" 
          />
        </div>
        <Tooltip content={`Add a new ${activeTab === 'store' ? 'Store Item' : 'Rashan Item'}`} position="bottom">
            <button 
                onClick={() => setModalState({ type: 'add_product', data: null })} 
                className="group flex items-center gap-3 px-10 py-5 rounded-[2rem] bg-primary-500 text-white hover:bg-primary-600 font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
                <Icon name="plus" size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                Add Product
            </button>
        </Tooltip>
      </div>

      <ProductList
        products={filteredProducts}
        searchTerm={searchTerm}
        setModalState={setModalState}
        onDeleteProduct={onDeleteProduct}
      />

      {(modalState.type === 'add_product' || modalState.type === 'edit_product') && (
        <ProductPanel
          product={modalState.data}
          category={activeTab === 'store' ? 'General' : 'Rashan'}
          onClose={handleCloseModal}
          onSave={(product) => { setProducts(product); handleCloseModal(); }}
          suppliers={suppliers}
          products={products}
        />
      )}
       {modalState.type === 'adjust_stock' && (
         <StockAdjustmentModal 
            variant={modalState.data.variant}
            productName={modalState.data.productName}
            onClose={handleCloseModal}
            onConfirm={handleStockAdjustment}
         />
       )}
    </div>
  );
};

export default Products;
