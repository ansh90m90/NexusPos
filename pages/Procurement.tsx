
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import type { Product, PurchaseOrder, PurchaseOrderItem, Supplier, Transaction, Batch } from '../types';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';
import ComboBox from '../components/ComboBox';

interface ProcurementProps {
  accountId: string;
  products: Product[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onNewPurchase: (
    order: PurchaseOrder, 
    batches: (Omit<Batch, 'id' | 'receivedDate'> & { productName?: string })[], 
    newSupplierName?: string, 
    newSupplierGstin?: string,
    newSupplierAddress?: string,
    newSupplierContact?: string
  ) => void;
  onDeletePurchase: (purchaseId: string) => void;
  transactions: Transaction[];
  modalState: { type: string | null; data: any };
  setModalState: (state: { type: string | null; data: any }) => void;
}

const ReceiveStockModal: React.FC<{
    products: Product[];
    suppliers: Supplier[];
    onSave: (
        order: PurchaseOrder, 
        batches: (Omit<Batch, 'id' | 'receivedDate'> & { productName?: string })[], 
        newSupplierName?: string, 
        newSupplierGstin?: string,
        newSupplierAddress?: string,
        newSupplierContact?: string
    ) => void;
    onClose: () => void;
    initialData?: Partial<PurchaseOrder>;
}> = ({ products, suppliers, onSave, onClose, initialData }) => {
    const isPreview = !!initialData;
    const [supplierName, setSupplierName] = useState<string>(() => {
        if (initialData?.supplierId) {
            return suppliers.find(s => s.id === initialData.supplierId)?.name || '';
        }
        return '';
    });
    const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || '');
    const [newSupplierGstin, setNewSupplierGstin] = useState('');
    const [newSupplierAddress, setNewSupplierAddress] = useState('');
    const [newSupplierContact, setNewSupplierContact] = useState('');
    const [isFetchingGst, setIsFetchingGst] = useState(false);
    const toast = useToast();

    const handleGstLookup = async () => {
        if (!newSupplierGstin || newSupplierGstin.length < 15) {
            toast.showToast('Please enter a valid 15-digit GSTIN.', 'error');
            return;
        }

        setIsFetchingGst(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const mockDetails: Record<string, any> = {
                '07AAAAA0000A1Z5': { name: 'Acme Retail Solutions', address: '123 Business Hub, Okhla Phase III, New Delhi, 110020', contact: 'John Doe' },
                '27BBBBB1111B1Z2': { name: 'Global Traders Pvt Ltd', address: '456 Industrial Estate, Andheri East, Mumbai, Maharashtra 400069', contact: 'Sarah Smith' },
                '09CCCCC2222C1Z0': { name: 'Bharat Electronics & Co', address: 'Plot 78, Sector 18, Noida, Uttar Pradesh 201301', contact: 'Rajesh Kumar' },
                '33DDDDD3333D1Z9': { name: 'South Connect Logistics', address: '12, Anna Salai, Little Mount, Chennai, Tamil Nadu 600015', contact: 'Meera Iyer' },
                '19EEEEE4444E1Z7': { name: 'Eastern Enterprises', address: 'Salt Lake City, Sector V, Kolkata, West Bengal 700091', contact: 'Amit Banerjee' },
                '24ECBPP9497K1ZT': { name: 'Gujarat Garment Hub', address: 'Shop 45, Textile Market, Ring Road, Surat, Gujarat 395002', contact: 'Pankaj Patel' },
                '29FFFFF5555F1Z4': { name: 'Karnataka Tech Supplies', address: '101, MG Road, Bangalore, Karnataka 560001', contact: 'Kiran Rao' },
            };
            const details = mockDetails[newSupplierGstin.toUpperCase()] || {
                name: `Business ${newSupplierGstin.slice(0, 5)}`,
                address: `Plot No. ${Math.floor(Math.random() * 500)}, Industrial Area, Phase ${Math.floor(Math.random() * 3) + 1}, Business District, State Code ${newSupplierGstin.slice(0, 2)}`,
                contact: 'Authorized Signatory'
            };
            setSupplierName(details.name);
            setNewSupplierAddress(details.address);
            setNewSupplierContact(details.contact);
            toast.showToast('Supplier details fetched from GSTIN!', 'success');
        } catch (_err) {
            toast.showToast('Failed to fetch details.', 'error');
        } finally {
            setIsFetchingGst(false);
        }
    };
    
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

        const selectedSupplier = suppliers.find(s => s.name === supplierName);
        const finalSupplierId = selectedSupplier ? selectedSupplier.id : 0;
        const newSupplierName = !selectedSupplier && supplierName.trim() !== '' ? supplierName : undefined;

        if (finalItems.length === 0 || (!finalSupplierId && !newSupplierName)) {
            toast.showToast('Please provide a supplier and at least one valid item.', 'error');
            return;
        }

        const finalBatches = validItemsAndBatches.map(({ item, batch }) => ({
             ...batch,
             netPurchasePrice: item.netRate
        }));
        
        onSave({
            id: initialData?.id || `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: new Date(date).toISOString(),
            supplierId: finalSupplierId,
            items: finalItems,
            totalCost: totalCost,
            extraCharges: extraCharges,
            invoiceNumber: invoiceNumber,
            status: 'Completed'
        }, finalBatches, newSupplierName, newSupplierGstin, newSupplierAddress, newSupplierContact);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 sm:p-6 overflow-hidden">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col border border-white/20 dark:border-slate-800/50 overflow-hidden"
            >
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-8 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
                         <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{isPreview ? 'Confirm Purchase' : 'Receive Stock'}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Inventory Procurement</p>
                         </div>
                         <button type="button" onClick={onClose} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors">
                            <Icon name="close" size={20} />
                         </button>
                    </div>
                    
                    <div className="p-8 flex-grow overflow-y-auto space-y-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Supplier</label>
                                <ComboBox
                                    value={supplierName}
                                    onChange={(val) => setSupplierName(val)}
                                    options={suppliers.map(s => s.name)}
                                    placeholder="Select or type new supplier"
                                    required
                                />
                            </div>
                            {!suppliers.some(s => s.name === supplierName) && supplierName.trim() !== '' && (
                                <div className="md:col-span-3 p-6 bg-primary-500/5 rounded-3xl border border-primary-500/20 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                                            <Icon name="plus" size={16} />
                                        </div>
                                        <h4 className="text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">New Supplier Details</h4>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em] ml-1">GSTIN</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    value={newSupplierGstin} 
                                                    onChange={e => setNewSupplierGstin(e.target.value.toUpperCase())} 
                                                    placeholder="15-digit GSTIN" 
                                                    className="flex-grow p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-mono text-xs" 
                                                    maxLength={15}
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={handleGstLookup}
                                                    disabled={isFetchingGst || !newSupplierGstin}
                                                    className="px-4 bg-primary-500 text-white rounded-2xl hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-primary-500/25"
                                                >
                                                    {isFetchingGst ? <Icon name="spinner" size={16} className="animate-spin" /> : <Icon name="sync-reload" size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em] ml-1">Contact Person</label>
                                            <input 
                                                value={newSupplierContact} 
                                                onChange={e => setNewSupplierContact(e.target.value)} 
                                                placeholder="Contact Name" 
                                                className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em] ml-1">Full Address</label>
                                            <input 
                                                value={newSupplierAddress} 
                                                onChange={e => setNewSupplierAddress(e.target.value)} 
                                                placeholder="Business Address" 
                                                className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Invoice Number</label>
                                <input 
                                    value={invoiceNumber} 
                                    onChange={e => setInvoiceNumber(e.target.value)} 
                                    placeholder="e.g., INV-2023-001" 
                                    className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Purchase Date</label>
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={e => setDate(e.target.value)} 
                                    className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold" 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Purchase Items</h4>
                                <button type="button" onClick={addItem} className="text-[10px] font-black text-primary-500 uppercase tracking-widest hover:text-primary-600 transition-colors flex items-center gap-2">
                                    <Icon name="plus" size={14} /> Add Item
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {items.map((item, index) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={index} 
                                        className="p-6 rounded-[2rem] bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/50"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                            <div className="md:col-span-3 space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product</label>
                                                <select 
                                                    value={item.variantId} 
                                                    onChange={e => handleItemChange(index, 'variantId', e.target.value)} 
                                                    className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold"
                                                >
                                                    <option value={0}>Select existing product</option>
                                                    {products.map(p => (
                                                        <optgroup key={p.id} label={p.name}>
                                                            {p.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                                {item.variantId === 0 && (
                                                    <input 
                                                        type="text" 
                                                        value={item.productName || ''} 
                                                        onChange={e => handleItemChange(index, 'productName', e.target.value)} 
                                                        placeholder="New Product Name" 
                                                        className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold" 
                                                        required 
                                                    />
                                                )}
                                            </div>
                                             <div className="md:col-span-2 space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch No.</label>
                                                <input 
                                                    type="text" 
                                                    value={batches[index]?.batchNumber || ''} 
                                                    onChange={e => handleBatchChange(index, 'batchNumber', e.target.value)} 
                                                    className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold" 
                                                    placeholder="Optional" 
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry</label>
                                                <input 
                                                    type="date" 
                                                    value={batches[index]?.expiryDate?.split('T')[0] || ''} 
                                                    onChange={e => handleBatchChange(index, 'expiryDate', e.target.value)} 
                                                    className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold" 
                                                />
                                            </div>
                                             <div className="md:col-span-1 space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty</label>
                                                <input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                    onChange={e => handleItemChange(index, 'quantity', e.target.value)} 
                                                    className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold" 
                                                    min="1" 
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Net Cost</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={item.netRate} 
                                                    onChange={e => handleItemChange(index, 'netRate', e.target.value)} 
                                                    className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold" 
                                                />
                                            </div>
                                            <div className="md:col-span-1 text-right pb-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                                                <p className="text-sm font-black text-slate-900 dark:text-white">₹{(item.quantity * item.netRate).toLocaleString()}</p>
                                            </div>
                                            <div className="md:col-span-1 flex items-center justify-end pb-1">
                                                <button type="button" onClick={() => removeItem(index)} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-colors">
                                                    <Icon name="remove" size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Grand Total</p>
                                    <p className="font-black text-4xl text-primary-600 dark:text-primary-400 tracking-tighter">₹{totalCost.toLocaleString()}</p>
                                </div>
                                <Tooltip content="Add Service Charge / Extra Cost" position="top">
                                    <button 
                                        type="button" 
                                        onClick={() => setExtraCharges([...extraCharges, { description: 'Service Charge', amount: 0 }])}
                                        className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-primary-500 hover:text-white transition-all text-slate-600 dark:text-slate-400 shadow-sm"
                                    >
                                        <Icon name="plus" size={20} />
                                    </button>
                                </Tooltip>
                            </div>
                            <div className="flex gap-4 w-full sm:w-auto">
                                <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-8 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 sm:flex-none px-10 py-4 rounded-2xl bg-primary-500 text-white font-black uppercase tracking-widest text-xs hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25">Save Purchase</button>
                            </div>
                        </div>

                        {extraCharges.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-slate-200/60 dark:border-slate-800/60 space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Extra Charges</h4>
                                {extraCharges.map((charge, idx) => (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={`charge-${idx}`} 
                                        className="flex items-center gap-4"
                                    >
                                        <input 
                                            type="text" 
                                            value={charge.description} 
                                            onChange={e => {
                                                const newCharges = [...extraCharges];
                                                newCharges[idx].description = e.target.value;
                                                setExtraCharges(newCharges);
                                            }}
                                            className="flex-grow p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-bold"
                                            placeholder="Charge Description"
                                        />
                                        <div className="relative w-40">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₹</span>
                                            <input 
                                                type="number" 
                                                value={charge.amount} 
                                                onChange={e => {
                                                    const newCharges = [...extraCharges];
                                                    newCharges[idx].amount = parseFloat(e.target.value) || 0;
                                                    setExtraCharges(newCharges);
                                                }}
                                                className="w-full pl-8 p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs font-black"
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setExtraCharges(extraCharges.filter((_, i) => i !== idx))}
                                            className="p-4 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-colors"
                                        >
                                            <Icon name="close" size={20} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const PurchaseDetailPage: React.FC<{
    order: PurchaseOrder,
    supplier?: Supplier,
    onClose: () => void,
    onDelete: (id: string) => void
}> = ({ order, supplier, onClose, onDelete }) => {
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 sm:p-6 overflow-hidden">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-white/20 dark:border-slate-800/50 overflow-hidden"
            >
                <div className="p-8 border-b border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Purchase Order Details</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Order ID: {order.id} • {new Date(order.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Tooltip content="Delete this purchase order" position="bottom">
                            <button 
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this purchase order? This will also revert stock and adjust supplier balance.')) {
                                        onDelete(order.id);
                                        onClose();
                                    }
                                }}
                                className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-colors"
                            >
                                <Icon name="remove" size={24} />
                            </button>
                        </Tooltip>
                        <button onClick={onClose} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                            <Icon name="close" size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto flex-grow space-y-10 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Supplier Information</h3>
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-700/50">
                                <p className="font-black text-xl text-slate-900 dark:text-white tracking-tight">{supplier?.name || 'Unknown Supplier'}</p>
                                {supplier?.phone && (
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-2">
                                        <Icon name="phone" size={12} /> {supplier.phone}
                                    </p>
                                )}
                                {supplier?.email && (
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                                        <Icon name="mail" size={12} /> {supplier.email}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Order Summary</h3>
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Invoice No.</span>
                                    <span className="font-mono font-black text-slate-900 dark:text-white">{order.invoiceNumber || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</span>
                                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${order.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Items</span>
                                    <span className="font-black text-slate-900 dark:text-white">{order.items.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Itemized List</h3>
                        <div className="border border-slate-200/60 dark:border-slate-800/60 rounded-[2rem] overflow-hidden bg-white/50 dark:bg-slate-900/50">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-200/60 dark:border-slate-800/60">
                                    <tr>
                                        <th className="px-6 py-4">Item Name</th>
                                        <th className="px-6 py-4 text-center">Qty</th>
                                        <th className="px-6 py-4 text-right">Rate</th>
                                        <th className="px-6 py-4 text-right">GST</th>
                                        <th className="px-6 py-4 text-right">Net Rate</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {order.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white">{item.productName}</td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400">{item.quantity}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-600 dark:text-slate-400">₹{item.rate.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-600 dark:text-slate-400">{item.gstRate}%</td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-600 dark:text-slate-400">₹{item.netRate.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">₹{(item.quantity * item.netRate).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {order.extraCharges && order.extraCharges.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Extra Charges</h3>
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 space-y-3">
                                {order.extraCharges.map((charge, idx) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{charge.description}</span>
                                        <span className="font-black text-slate-900 dark:text-white">₹{charge.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex justify-between items-center">
                    <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Grand Total</p>
                        <p className="text-4xl font-black text-primary-600 dark:text-primary-400 tracking-tighter">₹{order.totalCost.toLocaleString()}</p>
                    </div>
                    <button 
                        onClick={() => window.print()}
                        className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-500 hover:text-white transition-all flex items-center gap-3 shadow-sm"
                    >
                        <Icon name="print" size={18} />
                        Print Invoice
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const Procurement: React.FC<ProcurementProps> = ({ products, suppliers, purchaseOrders, onNewPurchase, onDeletePurchase, modalState, setModalState }) => {
    const handleCloseModal = () => {
        setModalState({ type: null, data: null });
    }

    const activePurchaseOrders = useMemo(() => purchaseOrders.filter(po => !po.isDeleted), [purchaseOrders]);

    return (
        <div className="space-y-8 p-4 sm:p-8">
             {(modalState.type === 'add_purchase') && (
                <ReceiveStockModal 
                    products={products} 
                    suppliers={suppliers}
                    onSave={(order, batches, newSupplierName, newSupplierGstin, newSupplierAddress, newSupplierContact) => { 
                        onNewPurchase(order, batches, newSupplierName, newSupplierGstin, newSupplierAddress, newSupplierContact); 
                        handleCloseModal(); 
                    }}
                    onClose={handleCloseModal}
                    initialData={modalState.data || undefined}
                />
            )}

            {modalState.type === 'view_purchase' && modalState.data && (
                <PurchaseDetailPage 
                    order={modalState.data as PurchaseOrder}
                    supplier={suppliers.find(s => s.id === (modalState.data as PurchaseOrder).supplierId)}
                    onClose={handleCloseModal}
                    onDelete={onDeletePurchase}
                />
            )}
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                 <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Purchases</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Inventory & Procurement Management</p>
                 </div>
                 <Tooltip content="Create a new purchase order" position="bottom">
                     <button 
                        onClick={() => setModalState({ type: 'add_purchase', data: null })}
                        className="px-8 py-4 bg-primary-500 text-white rounded-2xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 flex items-center gap-3 font-black uppercase tracking-widest text-xs"
                     >
                        <Icon name="plus" size={18} />
                        New Purchase
                     </button>
                 </Tooltip>
            </div>

             <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                <div className="p-8 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Recent Purchase Orders</h3>
                </div>
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-800/60">
                            <tr>
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Supplier</th>
                                <th className="px-8 py-5">Items</th>
                                <th className="px-8 py-5 text-right">Total</th>
                                <th className="px-8 py-5 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {[...activePurchaseOrders].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((po, idx) => {
                                const supplier = suppliers.find(s => s.id === po.supplierId);
                                return (
                                <motion.tr 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={po.id} 
                                    onClick={() => setModalState({ type: 'view_purchase', data: po })} 
                                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all cursor-pointer group"
                                >
                                    <td className="px-8 py-6 font-bold text-slate-600 dark:text-slate-400">{new Date(po.date).toLocaleDateString()}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={supplier?.name || 'Unknown'} size="sm" />
                                            <span className="font-black text-slate-900 dark:text-white tracking-tight">{supplier?.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            {po.items.length} Items
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right font-black text-slate-900 dark:text-white">₹{po.totalCost.toLocaleString()}</td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl border ${po.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' : po.status === 'Draft' ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' : 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'}`}>
                                            {po.status}
                                        </span>
                                    </td>
                                </motion.tr>
                            )})}
                        </tbody>
                    </table>
                     {activePurchaseOrders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Icon name="procurement" size={48} className="opacity-10 mb-4" />
                            <p className="text-xs font-bold uppercase tracking-[0.2em]">No purchase orders recorded</p>
                        </div>
                     )}
                </div>
                <div className="lg:hidden space-y-4 p-6">
                    {[...activePurchaseOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(po => {
                        const supplier = suppliers.find(s => s.id === po.supplierId);
                        return (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={po.id} 
                            onClick={() => setModalState({ type: 'view_purchase', data: po })} 
                            className="bg-white/50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-700/50 shadow-sm cursor-pointer active:scale-[0.98] transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <Avatar name={supplier?.name || 'Unknown'} size="sm" />
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white tracking-tight">{supplier?.name || 'Unknown'}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{new Date(po.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className="font-black text-lg text-slate-900 dark:text-white tracking-tighter">₹{po.totalCost.toLocaleString()}</p>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{po.items.length} items</p>
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-xl border ${po.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' : po.status === 'Draft' ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' : 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'}`}>
                                    {po.status}
                                </span>
                            </div>
                        </motion.div>
                        )
                    })}
                    {activePurchaseOrders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <Icon name="procurement" size={32} className="opacity-10 mb-3" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No recent purchase orders</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Procurement;
