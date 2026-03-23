import React, { useState, useMemo, useCallback } from 'react';
import type { Product, ProductVariant, AppSettings, Batch, ProductsPageTab, StockAdjustmentReason, Supplier } from '../types';
import SlideOverPanel from '../components/SlideOverPanel';
import { useToast } from '../components/Toast';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import Icon from '../components/Icon';
import ConfirmationModal from '../components/ConfirmationModal';
import { Tooltip } from '../components/Tooltip';

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
                    <span key={i} className="bg-yellow-200 dark:bg-yellow-700 rounded-sm">{part}</span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};

const StockLevelBar: React.FC<{ stock: number, minStock: number }> = ({ stock, minStock }) => {
    const percentage = minStock > 0 ? (stock / (minStock * 2)) * 100 : 100;
    const color = stock < minStock ? 'bg-red-500' : stock < minStock * 1.5 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5" title={`Stock: ${stock} / Min Stock: ${minStock}`}>
            <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
        </div>
    );
};

const SortIndicator: React.FC<{ direction: SortDirection | null }> = ({ direction }) => {
    if (!direction) return null;
    return <span className="ml-1">{direction === 'asc' ? '▲' : '▼'}</span>;
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
            variants: [{ id: -Date.now(), productId: 0, name: category === 'Rashan' ? 'per kg' : 'Standard', mrp: 0, wholesalePrice: 0, netPurchasePrice: 0, stock: 0, sku: '', unit: category === 'Rashan' ? 'kg' : 'pcs' }] 
        }
    );

    const uniqueSuppliers = useMemo(() => [...new Set(suppliers.map(s => s.name))].sort(), [suppliers]);
    const uniqueSubCategories = useMemo(() => [...new Set(products.map(p => p.subCategory).filter(Boolean) as string[])].sort(), [products]);

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
    
    const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number) => {
        const newVariants = [...(formData.variants || [])];
        const newVariant = { ...newVariants[index], [field]: value };
        newVariants[index] = newVariant;
        setFormData(prev => ({ ...prev, variants: newVariants }));
    };
    
    const addVariant = () => {
        const newVariant: Partial<ProductVariant> = {
            id: -(Date.now()),
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
        onSave(formData);
    };

    const isPerUnit = formData.pricingType === 'per_unit';

    return (
        <SlideOverPanel
            title={product ? 'Edit Product' : 'Add New Product'}
            onClose={onClose}
            footer={
                 <>
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                    <button type="submit" form="product-form" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition font-semibold">Save Product</button>
                </>
            }
        >
            <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
                <input name="name" value={formData.name} onChange={handleMainChange} placeholder="Product Name (e.g., Lays Classic)" className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm focus:ring-1 focus:ring-primary-500" required/>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Low Stock Threshold</label>
                        <input type="number" name="minStock" value={formData.minStock} onChange={handleMainChange} className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm"/>
                        <p className="text-xs text-slate-400 mt-1">Receive a notification when stock falls below this level.</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Pricing Type</label>
                        <select name="pricingType" value={formData.pricingType} onChange={handleMainChange} className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm" required>
                            <option value="fixed">Fixed Price (Packaged)</option>
                            <option value="per_unit">Per Unit (by Weight/Vol)</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">'Fixed' for packaged items, 'Per Unit' for loose items.</p>
                    </div>
                </div>
                
                <h4 className="font-semibold pt-4 border-t dark:border-slate-700 text-base">Variants / Pricing</h4>
                <div className="space-y-3">
                    {isPerUnit ? (
                         <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Unit</label>
                                    <select value={formData.variants?.[0]?.unit || 'kg'} onChange={(e) => handleVariantChange(0, 'unit', e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm">
                                        <option value="kg">kg</option><option value="g">g</option><option value="l">l</option><option value="ml">ml</option><option value="pcs">pcs</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Sale Price / Unit</label>
                                    <input type="number" step="0.01" value={formData.variants?.[0]?.mrp || 0} onChange={(e) => handleVariantChange(0, 'mrp', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">W/S Price / Unit</label>
                                    <input type="number" step="0.01" value={formData.variants?.[0]?.wholesalePrice || ''} onChange={(e) => handleVariantChange(0, 'wholesalePrice', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Net Cost / Unit</label>
                                    <input type="number" step="0.01" value={formData.variants?.[0]?.netPurchasePrice || 0} onChange={(e) => handleVariantChange(0, 'netPurchasePrice', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Total Stock</label>
                                    <input type="number" step="0.001" value={formData.variants?.[0]?.stock || 0} onChange={(e) => handleVariantChange(0, 'stock', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm" />
                                </div>
                            </div>
                        </div>
                    ) : (
                    <>
                        {formData.variants?.map((variant, index) => (
                             <div key={variant.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-700">
                                <input value={variant.name} onChange={e => handleVariantChange(index, 'name', e.target.value)} placeholder="Variant Name (e.g., 500g, 10-pack)" className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm" />
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3">
                                    <div>
                                        <label className="text-xs font-medium mb-1 block">Sale Price (MRP)</label>
                                        <input type="number" step="0.01" value={variant.mrp} onChange={e => handleVariantChange(index, 'mrp', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1 block">Wholesale Price (Opt.)</label>
                                        <input type="number" step="0.01" value={variant.wholesalePrice || ''} onChange={e => handleVariantChange(index, 'wholesalePrice', parseFloat(e.target.value) || 0)} placeholder="0" className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm" />
                                    </div>
                                     <div>
                                        <label className="text-xs font-medium mb-1 block">Net Cost Price</label>
                                        <input type="number" step="0.01" value={variant.netPurchasePrice} onChange={e => handleVariantChange(index, 'netPurchasePrice', parseFloat(e.target.value) || 0)} placeholder="Price you paid" className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1 block">Stock Quantity</label>
                                        <input type="number" value={variant.stock} onChange={e => handleVariantChange(index, 'stock', parseInt(e.target.value, 10) || 0)} placeholder="Units in stock" className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm" />
                                    </div>
                                </div>
                                {formData.variants && formData.variants.length > 1 && (
                                <div className="text-center pt-3 mt-3 border-t dark:border-slate-700">
                                     <button
                                        type="button"
                                        onClick={() => removeVariant(index)}
                                        className="text-sm text-red-600 hover:underline font-semibold"
                                    >
                                        Remove Variant
                                    </button>
                                </div>
                                )}
                            </div>
                        ))}
                         <button type="button" onClick={addVariant} className="text-sm font-semibold text-primary-600 hover:text-primary-800">+ Add Variant</button>
                    </>
                    )}
                </div>

                <h4 className="font-semibold pt-4 border-t dark:border-slate-700 text-base">Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Sub-Category</label>
                        <input list="subcategories-list" name="subCategory" value={formData.subCategory} onChange={handleMainChange} placeholder="e.g., Wafers, Cool Drinks" className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm focus:ring-1 focus:ring-primary-500"/>
                        <datalist id="subcategories-list">
                            {uniqueSubCategories.map(sc => <option key={sc} value={sc} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Supplier</label>
                        <input list="suppliers-list" name="supplier" value={formData.supplier} onChange={handleMainChange} placeholder="e.g., Pepsico, ITC" className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm focus:ring-1 focus:ring-primary-500"/>
                         <datalist id="suppliers-list">
                            {uniqueSuppliers.map(s => <option key={s} value={s} />)}
                        </datalist>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-slate-500 dark:text-slate-400">HSN Code (Optional)</label>
                        <input name="hsnCode" value={formData.hsnCode} onChange={handleMainChange} placeholder="HSN Code for GST" className="w-full mt-1 p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-sm focus:ring-1 focus:ring-primary-500"/>
                    </div>
                </div>
            </form>
        </SlideOverPanel>
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full space-y-4">
                <h3 className="text-xl font-bold">Adjust Stock</h3>
                <p><strong>Product:</strong> {productName} ({variant.name})</p>
                <p><strong>Current Stock:</strong> {variant.stock}</p>
                <div className="flex gap-2">
                    <select value={type} onChange={e => setType(e.target.value as 'add'|'remove')} className="p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
                        <option value="remove">Remove</option>
                        <option value="add">Add</option>
                    </select>
                    <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600" min="1" />
                </div>
                <select value={reason} onChange={e => setReason(e.target.value as StockAdjustmentReason)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
                    <option value="Damaged">Damaged Goods</option>
                    <option value="Internal Consumption">Internal Consumption</option>
                    <option value="Correction">Stock Count Correction</option>
                    <option value="Other">Other</option>
                </select>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (Optional)" className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600" />
                 <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition">Confirm</button>
                </div>
            </form>
        </div>
    );
};

const ProductList: React.FC<{
    products: Product[];
    appSettings: AppSettings;
    batches: Batch[];
    searchTerm: string;
    setModalState: (state: { type: string, data: any }) => void;
    onDeleteProduct: (productId: number) => void;
    onAdjustStock: (variantId: number, productName: string, quantityChange: number, reason: StockAdjustmentReason, notes?: string) => void;
}> = ({ products, appSettings, batches, searchTerm, setModalState, onDeleteProduct, onAdjustStock }) => {
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
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto hidden lg:block">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700/60">
                        <tr>
                            {headers.map(header => (
                                <th key={header.key} scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort(header.key)}>
                                    {header.label}
                                    {sortBy === header.key && <SortIndicator direction={sortDirection} />}
                                </th>
                            ))}
                             <th scope="col" className="px-4 py-3">Stock Level</th>
                            <th scope="col" className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedProducts.map(p => (
                            <tr key={p.id} className="border-b dark:border-slate-700 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white"><Highlighted text={p.name} highlight={searchTerm} /></td>
                                <td className="px-4 py-3"><Highlighted text={p.subCategory || ''} highlight={searchTerm} /></td>
                                <td className="px-4 py-3"><Highlighted text={p.supplier} highlight={searchTerm} /></td>
                                <td className="px-4 py-3">
                                    {p.variants.map(v => (
                                        <div key={v.id} className="flex justify-between items-center text-xs py-0.5" title={`SKU: ${v.sku}`}>
                                            <span>{v.name}</span>
                                            <span className="font-semibold">{v.stock}</span>
                                        </div>
                                    ))}
                                </td>
                                <td className="px-4 py-3 w-40">
                                    {p.minStock && p.variants.map(v => <StockLevelBar key={v.id} stock={v.stock} minStock={p.minStock!} />)}
                                </td>
                                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                                    <Tooltip content="Edit Product" position="top">
                                        <button onClick={() => setModalState({ type: 'edit_product', data: p })} className="font-medium text-primary-600 dark:text-primary-500 hover:underline text-xs">Edit</button>
                                    </Tooltip>
                                    <Tooltip content="Delete Product" position="top">
                                        <button onClick={() => setDeleteConfirm(p)} className="font-medium text-red-600 dark:text-red-500 hover:underline text-xs">Delete</button>
                                    </Tooltip>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="lg:hidden space-y-3 p-3">
            {sortedProducts.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-800 rounded-lg p-3 border dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white"><Highlighted text={p.name} highlight={searchTerm} /></h3>
                            <p className="text-xs text-slate-500">{p.subCategory} &bull; {p.supplier}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip content="Edit Product" position="top">
                                <button onClick={() => setModalState({ type: 'edit_product', data: p })} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <Icon name="edit" className="w-4 h-4 text-slate-600 dark:text-slate-300"/>
                                </button>
                            </Tooltip>
                             <Tooltip content="Delete Product" position="top">
                                 <button onClick={() => setDeleteConfirm(p)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <Icon name="delete" className="w-4 h-4 text-red-500"/>
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="mt-2 pt-2 border-t dark:border-slate-700 space-y-1">
                         {p.variants.map(v => (
                            <div key={v.id} className="flex justify-between items-center text-xs">
                                <span>{v.name}</span>
                                <div>
                                    <span className="font-semibold">{v.stock} in stock</span>
                                    <button onClick={() => setModalState({ type: 'adjust_stock', data: { variant: v, productName: p.name }})} className="ml-2 font-medium text-primary-600 hover:underline">Adjust</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
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
  batches: Batch[];
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
  batches,
  activeTab,
  setActiveTab,
  modalState,
  setModalState,
  onAdjustStock
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setScannerOpen] = useState(false);
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
    return productsToFilter.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.subCategory || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.supplier || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants.some(v => (v.sku || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [activeTab, storeProducts, rashanProducts, searchTerm]);

  const handleBarcodeScan = (text: string) => {
    setSearchTerm(text);
    setScannerOpen(false);
    toast.showToast(`Searched for SKU: ${text}`, 'info');
  };

  const handleStockAdjustment = (quantityChange: number, reason: StockAdjustmentReason, notes?: string) => {
    if (modalState.data?.variant) {
      const { variant, productName } = modalState.data;
      onAdjustStock(variant.id, productName, quantityChange, reason, notes);
      toast.showToast('Stock adjusted successfully.', 'success');
    }
    handleCloseModal();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Products</h1>
        <div className="flex items-center bg-slate-200/50 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-800 self-start shadow-sm">
            <Tooltip content="Manage general store items" position="bottom">
                <button 
                    onClick={() => setActiveTab('store')} 
                    className={`px-6 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'store' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    Store Items
                </button>
            </Tooltip>
            {appSettings.enableRashanCategory && (
                <Tooltip content="Manage grocery and loose items" position="bottom">
                    <button 
                        onClick={() => setActiveTab('rashan')} 
                        className={`px-6 py-1.5 text-sm font-bold rounded-lg transition-all duration-200 ${activeTab === 'rashan' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Rashan / Grocery
                    </button>
                </Tooltip>
            )}
        </div>
      </div>

      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={`Search ${activeTab === 'store' ? 'Store Items' : 'Rashan'}...`} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-primary-500" />
        </div>
        <Tooltip content="Scan barcode to search" position="bottom">
            <button onClick={() => setScannerOpen(true)} className="p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600">
               <Icon name="barcode" className="w-6 h-6" />
            </button>
        </Tooltip>
        <Tooltip content={`Add a new ${activeTab === 'store' ? 'Store Item' : 'Rashan Item'}`} position="bottom">
            <button onClick={() => setModalState({ type: 'add_product', data: null })} className="p-2 px-4 border rounded bg-primary-600 text-white border-primary-600 hover:bg-primary-700 font-semibold whitespace-nowrap">Add Product</button>
        </Tooltip>
      </div>

      <ProductList
        products={filteredProducts}
        appSettings={appSettings}
        batches={batches}
        searchTerm={searchTerm}
        setModalState={setModalState}
        onDeleteProduct={onDeleteProduct}
        onAdjustStock={onAdjustStock}
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
       <BarcodeScannerModal isOpen={isScannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} />
    </div>
  );
};

export default Products;
