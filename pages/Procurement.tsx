
import React, { useState, useMemo } from 'react';
import type { Product, PurchaseOrder, PurchaseOrderItem, Supplier, Transaction, Batch } from '../types';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';

interface ProcurementProps {
  accountId: string;
  products: Product[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onNewPurchase: (order: PurchaseOrder, batches: (Omit<Batch, 'id' | 'receivedDate'> & { productName?: string })[], newSupplierName?: string) => void;
  transactions: Transaction[];
  modalState: { type: string | null; data: any };
  setModalState: (state: { type: string | null; data: any }) => void;
}

const ReceiveStockModal: React.FC<{
    products: Product[];
    suppliers: Supplier[];
    onSave: (order: PurchaseOrder, batches: (Omit<Batch, 'id' | 'receivedDate'> & { productName?: string })[], newSupplierName?: string) => void;
    onClose: () => void;
    initialData?: Partial<PurchaseOrder>;
}> = ({ products, suppliers, onSave, onClose, initialData }) => {
    const isPreview = !!initialData;
    const [supplierId, setSupplierId] = useState<number | string | undefined>(initialData?.supplierId || '');
    const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || '');
    const [createNewSupplier] = useState(false);
    const toast = useToast();
    
    type ItemState = PurchaseOrderItem & { productId?: number };
    const [items, setItems] = useState<ItemState[]>(
        initialData?.items?.map(item => ({
            ...item,
            variantId: 0,
            productId: 0,
            isNew: false,
            mrp: item.mrp || Math.round(item.netRate * 1.25),
            category: item.category || 'General',
            subCategory: item.subCategory || '',
        })) || []
    );
    const [batches, setBatches] = useState<(Omit<Batch, 'id'|'receivedDate'|'netPurchasePrice'> & { productName?: string })[]>(
        initialData?.items?.map(item => ({ variantId: 0, quantity: item.quantity, productName: item.productName })) || 
        [{ variantId: 0, quantity: 1, batchNumber: '', expiryDate: '', productName: '' }]
    );
    
    const [extraCharges, setExtraCharges] = useState<{ description: string, amount: number }[]>(initialData?.extraCharges || []);
    
    const totalCost = useMemo(() => {
        const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.netRate, 0);
        const chargesTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
        return itemsTotal + chargesTotal;
    }, [items, extraCharges]);

    const handleItemChange = (index: number, field: keyof ItemState, value: string | number | boolean) => {
        const newItems = [...items];
        let updatedItem = { ...newItems[index]};
        
        if (typeof value === 'string' && ['quantity', 'rate', 'gstRate', 'netRate', 'mrp', 'variantId'].includes(field)) {
            (updatedItem as any)[field] = parseFloat(value) || 0;
        } else {
            (updatedItem as any)[field] = value;
        }

        if (field === 'productId') updatedItem.variantId = 0;
        
        if (field === 'variantId') {
            const variantId = Number(value);
            updatedItem.isNew = false;
            for (const p of products) {
                const variant = p.variants.find(v => v.id === variantId);
                if (variant) {
                    updatedItem.netRate = variant.netPurchasePrice;
                    updatedItem.productName = `${p.name} - ${variant.name}`;
                    updatedItem.hsnCode = p.hsnCode || '';
                    updatedItem.mrp = variant.mrp;
                    updatedItem.category = p.category;
                    updatedItem.subCategory = p.subCategory;
                    break;
                }
            }
        }
        
        if (field === 'rate' || field === 'gstRate') {
            const rate = field === 'rate' ? Number(value) : updatedItem.rate;
            const gst = field === 'gstRate' ? Number(value) : updatedItem.gstRate;
            if (!isNaN(rate) && !isNaN(gst)) {
                updatedItem.netRate = rate * (1 + gst / 100);
            }
        }

        newItems[index] = updatedItem;
        setItems(newItems);

        // Sync corresponding batch
        const newBatches = [...batches];
        if (!newBatches[index]) {
            newBatches[index] = { variantId: 0, quantity: 1, batchNumber: '', expiryDate: '', productName: '' };
        }
        newBatches[index] = {
            ...newBatches[index],
            variantId: updatedItem.variantId,
            quantity: updatedItem.quantity,
            productName: updatedItem.productName
        };
        setBatches(newBatches);
    };

    const handleBatchChange = (index: number, field: 'batchNumber' | 'expiryDate', value: string) => {
        const newBatches = [...batches];
        if (!newBatches[index]) {
            newBatches[index] = { variantId: 0, quantity: 1, batchNumber: '', expiryDate: '', productName: '' };
        }
        newBatches[index] = { ...newBatches[index], [field]: value };
        setBatches(newBatches);
    };

    const addItem = () => {
        const newItem: ItemState = { variantId: 0, productName: '', quantity: 1, rate: 0, gstRate: 0, netRate: 0, isNew: true, mrp: 0, category: 'General', subCategory: '' };
        setItems([...items, newItem]);
        setBatches([...batches, { variantId: 0, quantity: 1, batchNumber: '', expiryDate: '', productName: '' }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
        setBatches(batches.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const validItemsAndBatches = items
            .map((item, index) => ({ item, batch: batches[index] }))
            .filter(({ item }) => (item.variantId && item.variantId > 0 && item.quantity > 0) || (item.isNew && item.productName));

        const finalItems: PurchaseOrderItem[] = validItemsAndBatches.map(({ item }) => {
            const newItem = { ...item };
            delete (newItem as any).productId;
            return newItem as PurchaseOrderItem;
        });

        if (finalItems.length === 0 || (!supplierId && !createNewSupplier)) {
            toast.showToast('Please provide a supplier and at least one valid item.', 'error');
            return;
        }

        const finalBatches = validItemsAndBatches.map(({ item, batch }) => ({
             ...batch,
             netPurchasePrice: item.netRate
        }));
        
        onSave({
            id: initialData?.id || `PO-${Date.now()}`,
            date: new Date(date).toISOString(),
            supplierId: Number(supplierId) || 0,
            items: finalItems,
            totalCost: totalCost,
            extraCharges: extraCharges,
            invoiceNumber: invoiceNumber,
            status: 'Completed'
        }, finalBatches);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-4 border-b dark:border-gray-700 flex-shrink-0">
                         <h3 className="text-xl font-bold">{isPreview ? 'Confirm Purchase' : 'Receive Stock'}</h3>
                    </div>
                    
                    <div className="p-4 flex-grow overflow-y-auto space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                             <select value={supplierId} onChange={e => setSupplierId(Number(e.target.value))} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" required={!createNewSupplier}>
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                             <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Invoice Number" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" />
                             <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" required />
                        </div>

                        <h4 className="font-semibold pt-2 text-sm">Items</h4>
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                            {items.map((item, index) => (
                                <div key={index} className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 items-end">
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-medium mb-1">Product</label>
                                            <select value={item.variantId} onChange={e => handleItemChange(index, 'variantId', e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm mb-2">
                                                <option value={0}>Select existing product</option>
                                                {products.map(p => (
                                                    <optgroup key={p.id} label={p.name}>
                                                        {p.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                    </optgroup>
                                                ))}
                                            </select>
                                            {item.variantId === 0 && (
                                                <input type="text" value={item.productName || ''} onChange={e => handleItemChange(index, 'productName', e.target.value)} placeholder="New Product Name" className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" required />
                                            )}
                                        </div>
                                         <div className="md:col-span-2">
                                            <label className="block text-xs font-medium mb-1">Batch No.</label>
                                            <input type="text" value={batches[index]?.batchNumber || ''} onChange={e => handleBatchChange(index, 'batchNumber', e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium mb-1">Expiry Date</label>
                                            <input type="date" value={batches[index]?.expiryDate?.split('T')[0] || ''} onChange={e => handleBatchChange(index, 'expiryDate', e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" />
                                        </div>
                                         <div className="md:col-span-1">
                                            <label className="block text-xs font-medium mb-1">Qty</label>
                                            <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium mb-1">Net Cost/Unit</label>
                                            <input type="number" step="0.01" value={item.netRate} onChange={e => handleItemChange(index, 'netRate', e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-medium mb-1">Total</label>
                                            <p className="p-2 font-bold">₹{(item.quantity * item.netRate).toFixed(2)}</p>
                                        </div>
                                        <div className="md:col-span-1 flex items-end justify-end">
                                            <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500 hover:text-red-700">
                                                <Icon name="remove" className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addItem} className="text-sm font-semibold text-primary-600 hover:underline">+ Add Item Manually</button>
                    </div>

                    <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-xl">Total: ₹{totalCost.toFixed(2)}</p>
                                <Tooltip content="Add Service Charge / Extra Cost" position="top">
                                    <button 
                                        type="button" 
                                        onClick={() => setExtraCharges([...extraCharges, { description: 'Service Charge', amount: 0 }])}
                                        className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        <Icon name="plus" className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition">Cancel</button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition font-semibold">Save Purchase</button>
                            </div>
                        </div>

                        {extraCharges.length > 0 && (
                            <div className="space-y-2 pt-2 border-t dark:border-slate-700">
                                {extraCharges.map((charge, idx) => (
                                    <div key={`charge-${idx}`} className="flex items-center gap-3">
                                        <input 
                                            type="text" 
                                            value={charge.description} 
                                            onChange={e => {
                                                const newCharges = [...extraCharges];
                                                newCharges[idx].description = e.target.value;
                                                setExtraCharges(newCharges);
                                            }}
                                            className="flex-grow p-1.5 text-xs border rounded dark:bg-slate-900 dark:border-slate-700"
                                            placeholder="Charge Description"
                                        />
                                        <div className="relative w-24">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₹</span>
                                            <input 
                                                type="number" 
                                                value={charge.amount} 
                                                onChange={e => {
                                                    const newCharges = [...extraCharges];
                                                    newCharges[idx].amount = parseFloat(e.target.value) || 0;
                                                    setExtraCharges(newCharges);
                                                }}
                                                className="w-full pl-5 p-1.5 text-xs border rounded dark:bg-slate-900 dark:border-slate-700 font-bold"
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setExtraCharges(extraCharges.filter((_, i) => i !== idx))}
                                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        >
                                            <Icon name="close" className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

const PurchaseDetailPage: React.FC<{
    order: PurchaseOrder,
    supplier?: Supplier,
    onClose: () => void
}> = ({ order, supplier, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Purchase Order Details</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Order ID: {order.id} • {new Date(order.date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <Icon name="close" className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow space-y-8">
                    {/* Supplier & Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Supplier Information</h3>
                            <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                <p className="font-bold text-lg text-slate-900 dark:text-white">{supplier?.name || 'Unknown Supplier'}</p>
                                {supplier?.phone && <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1"><Icon name="phone" className="w-3 h-3" /> {supplier.phone}</p>}
                                {supplier?.email && <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2"><Icon name="mail" className="w-3 h-3" /> {supplier.email}</p>}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Order Summary</h3>
                            <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Invoice Number:</span>
                                    <span className="font-mono font-bold">{order.invoiceNumber || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Status:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.status}</span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t dark:border-slate-700">
                                    <span className="text-slate-500">Total Items:</span>
                                    <span className="font-bold">{order.items.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Itemized List</h3>
                        <div className="border dark:border-slate-700 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr>
                                        <th className="px-4 py-3">Item Name</th>
                                        <th className="px-4 py-3 text-center">Qty</th>
                                        <th className="px-4 py-3 text-right">Rate</th>
                                        <th className="px-4 py-3 text-right">GST</th>
                                        <th className="px-4 py-3 text-right">Net Rate</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-700">
                                    {order.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/20">
                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.productName}</td>
                                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right">₹{item.rate.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right">{item.gstRate}%</td>
                                            <td className="px-4 py-3 text-right">₹{item.netRate.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-bold">₹{(item.quantity * item.netRate).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Extra Charges */}
                    {order.extraCharges && order.extraCharges.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Extra Charges</h3>
                            <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                                {order.extraCharges.map((charge, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-slate-500">{charge.description}</span>
                                        <span className="font-bold">₹{charge.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Grand Total</p>
                        <p className="text-3xl font-black text-primary-600 dark:text-primary-400">₹{order.totalCost.toFixed(2)}</p>
                    </div>
                    <button 
                        onClick={() => window.print()}
                        className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold hover:scale-105 transition-transform flex items-center gap-2"
                    >
                        <Icon name="print" className="w-5 h-5" />
                        Print Invoice
                    </button>
                </div>
            </div>
        </div>
    );
};

const Procurement: React.FC<ProcurementProps> = ({ products, suppliers, purchaseOrders, onNewPurchase, modalState, setModalState }) => {
    const handleCloseModal = () => {
        setModalState({ type: null, data: null });
    }

    return (
        <div className="space-y-6">
             {(modalState.type === 'add_purchase') && (
                <ReceiveStockModal 
                    products={products} 
                    suppliers={suppliers}
                    onSave={(order, batches, newSupplierName) => { onNewPurchase(order, batches, newSupplierName); handleCloseModal(); }}
                    onClose={handleCloseModal}
                    initialData={modalState.data || undefined}
                />
            )}

            {modalState.type === 'view_purchase' && modalState.data && (
                <PurchaseDetailPage 
                    order={modalState.data as PurchaseOrder}
                    supplier={suppliers.find(s => s.id === (modalState.data as PurchaseOrder).supplierId)}
                    onClose={handleCloseModal}
                />
            )}
            
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchases</h1>
                 <Tooltip content="Create a new purchase order" position="bottom">
                     <button 
                        onClick={() => setModalState({ type: 'add_purchase', data: null })}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2 font-semibold"
                     >
                        <Icon name="plus" className="w-5 h-5" />
                        New Purchase
                     </button>
                 </Tooltip>
            </div>

             <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <h3 className="p-4 text-lg font-semibold">Recent Purchase Orders</h3>
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/60">
                            <tr>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Supplier</th>
                                <th className="px-4 py-2">Items</th>
                                <th className="px-4 py-2 text-right">Total</th>
                                <th className="px-4 py-2 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                           {[...purchaseOrders].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(po => {
                                const supplier = suppliers.find(s => s.id === po.supplierId);
                                return (
                                <Tooltip key={po.id} content={`View details for PO from ${supplier?.name || 'Unknown'}`} position="top">
                                    <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                                        <td className="px-4 py-2">{new Date(po.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{supplier?.name || 'Unknown'}</td>
                                        <td className="px-4 py-2">{po.items.length}</td>
                                        <td className="px-4 py-2 text-right font-semibold">₹{po.totalCost.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${po.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : po.status === 'Draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                                {po.status}
                                            </span>
                                        </td>
                                    </tr>
                                </Tooltip>
                            )})}
                        </tbody>
                    </table>
                     {purchaseOrders.length === 0 && <p className="text-center py-8 text-gray-500 text-sm">No purchase orders recorded.</p>}
                </div>
                <div className="lg:hidden space-y-3 p-3">
                    {[...purchaseOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(po => {
                        const supplier = suppliers.find(s => s.id === po.supplierId);
                        return (
                        <div key={po.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-sm">{supplier?.name || 'Unknown'}</p>
                                    <p className="text-xs text-gray-500">{new Date(po.date).toLocaleDateString()}</p>
                                </div>
                                <p className="font-bold text-sm">₹{po.totalCost.toFixed(2)}</p>
                            </div>
                            <div className="flex justify-between items-end mt-2 pt-2 border-t dark:border-gray-700">
                            <p className="text-xs text-gray-500">{po.items.length} items</p>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${po.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : po.status === 'Draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                    {po.status}
                                </span>
                            </div>
                        </div>
                        )
                    })}
                    {purchaseOrders.length === 0 && <p className="text-center text-xs py-4">No recent purchase orders.</p>}
                </div>
            </div>
        </div>
    );
};

export default Procurement;
