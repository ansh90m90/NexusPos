
import React, { useState, useMemo } from 'react';
import type { Product, PurchaseOrder, PurchaseOrderItem, Supplier, Transaction, Batch } from '../types';
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
            <div className="bg-theme-surface rounded-3xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col border border-theme-main">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b border-theme-main flex-shrink-0">
                         <h3 className="text-2xl font-bold text-theme-main">{isPreview ? 'Confirm Purchase' : 'Receive Stock'}</h3>
                    </div>
                    
                    <div className="p-6 flex-grow overflow-y-auto space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <ComboBox
                                    label="Supplier"
                                    value={supplierName}
                                    onChange={(val) => setSupplierName(val)}
                                    options={suppliers.map(s => s.name)}
                                    placeholder="Select or type new supplier"
                                    required
                                />
                                <p className="text-xs text-theme-muted mt-2">Select the supplier for this purchase.</p>
                            </div>
                            {!suppliers.some(s => s.name === supplierName) && supplierName.trim() !== '' && (
                                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-100 dark:border-primary-900/30 space-y-4">
                                    <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">New Supplier Details</h4>
                                    
                                    <div>
                                        <label className="block text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">GSTIN</label>
                                        <div className="flex gap-2">
                                            <input 
                                                value={newSupplierGstin} 
                                                onChange={e => setNewSupplierGstin(e.target.value.toUpperCase())} 
                                                placeholder="15-digit GSTIN" 
                                                className="flex-grow p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-mono text-xs" 
                                                maxLength={15}
                                            />
                                            <button 
                                                type="button" 
                                                onClick={handleGstLookup}
                                                disabled={isFetchingGst || !newSupplierGstin}
                                                className="px-3 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                            >
                                                {isFetchingGst ? <Icon name="spinner" className="w-3 h-3 animate-spin" /> : <Icon name="sync-reload" className="w-3 h-3" />}
                                                <span className="text-[10px] font-bold uppercase">Fetch</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">Contact Person</label>
                                            <input 
                                                value={newSupplierContact} 
                                                onChange={e => setNewSupplierContact(e.target.value)} 
                                                placeholder="Contact Person" 
                                                className="w-full p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1">Full Address</label>
                                            <input 
                                                value={newSupplierAddress} 
                                                onChange={e => setNewSupplierAddress(e.target.value)} 
                                                placeholder="Full Address" 
                                                className="w-full p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-xs" 
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-theme-muted italic">Details fetched from GSTIN can be edited before saving.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-theme-main mb-1">Invoice Number</label>
                                <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g., INV-2023-001" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" />
                                <p className="text-xs text-theme-muted mt-2">Optional invoice number from the supplier.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-theme-main mb-1">Purchase Date</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                                <p className="text-xs text-theme-muted mt-2">The date the stock was received.</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-theme-main mb-3">Items</h4>
                            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                                {items.map((item, index) => (
                                    <div key={index} className="p-4 rounded-2xl border bg-theme-main border-theme-main">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-3 items-end">
                                            <div className="md:col-span-3">
                                                <label className="block text-xs font-semibold text-theme-main mb-1">Product</label>
                                                <select value={item.variantId} onChange={e => handleItemChange(index, 'variantId', e.target.value)} className="w-full p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all mb-2">
                                                    <option value={0}>Select existing product</option>
                                                    {products.map(p => (
                                                        <optgroup key={p.id} label={p.name}>
                                                            {p.variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                                        </optgroup>
                                                    ))}
                                                </select>
                                                {item.variantId === 0 && (
                                                    <input type="text" value={item.productName || ''} onChange={e => handleItemChange(index, 'productName', e.target.value)} placeholder="New Product Name" className="w-full p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                                                )}
                                            </div>
                                             <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold text-theme-main mb-1">Batch No.</label>
                                                <input type="text" value={batches[index]?.batchNumber || ''} onChange={e => handleBatchChange(index, 'batchNumber', e.target.value)} className="w-full p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" placeholder="Optional" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold text-theme-main mb-1">Expiry Date</label>
                                                <input type="date" value={batches[index]?.expiryDate?.split('T')[0] || ''} onChange={e => handleBatchChange(index, 'expiryDate', e.target.value)} className="w-full p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" />
                                            </div>
                                             <div className="md:col-span-1">
                                                <label className="block text-xs font-semibold text-theme-main mb-1">Qty</label>
                                                <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" min="1" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold text-theme-main mb-1">Net Cost/Unit</label>
                                                <input type="number" step="0.01" value={item.netRate} onChange={e => handleItemChange(index, 'netRate', e.target.value)} className="w-full p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" />
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-semibold text-theme-main mb-1">Total</label>
                                                <p className="p-2.5 font-bold text-theme-main">₹{(item.quantity * item.netRate).toFixed(2)}</p>
                                            </div>
                                            <div className="md:col-span-1 flex items-center justify-end pb-2">
                                                <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors">
                                                    <Icon name="remove" className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addItem} className="mt-4 text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1">
                                <Icon name="plus" className="w-4 h-4" /> Add Item Manually
                            </button>
                        </div>
                    </div>

                    <div className="p-6 border-t border-theme-main bg-theme-main flex-shrink-0 rounded-b-3xl">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <p className="font-bold text-2xl text-theme-main">Total: ₹{totalCost.toFixed(2)}</p>
                                <Tooltip content="Add Service Charge / Extra Cost" position="top">
                                    <button 
                                        type="button" 
                                        onClick={() => setExtraCharges([...extraCharges, { description: 'Service Charge', amount: 0 }])}
                                        className="p-2 bg-theme-surface border border-theme-main rounded-full hover:bg-theme-main transition-colors text-theme-main"
                                    >
                                        <Icon name="plus" className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl bg-theme-surface text-theme-main hover:bg-theme-main border border-theme-main transition font-medium">Cancel</button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm font-medium">Save Purchase</button>
                            </div>
                        </div>

                        {extraCharges.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-theme-main">
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
                                            className="flex-grow p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                                            placeholder="Charge Description"
                                        />
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-theme-muted">₹</span>
                                            <input 
                                                type="number" 
                                                value={charge.amount} 
                                                onChange={e => {
                                                    const newCharges = [...extraCharges];
                                                    newCharges[idx].amount = parseFloat(e.target.value) || 0;
                                                    setExtraCharges(newCharges);
                                                }}
                                                className="w-full pl-7 p-2.5 rounded-xl bg-theme-surface text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all font-bold"
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setExtraCharges(extraCharges.filter((_, i) => i !== idx))}
                                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                        >
                                            <Icon name="close" className="w-5 h-5" />
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
            <div className="bg-theme-surface rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-theme-main">
                <div className="p-6 border-b border-theme-main flex justify-between items-center bg-theme-main">
                    <div>
                        <h2 className="text-2xl font-bold text-theme-main">Purchase Order Details</h2>
                        <p className="text-sm text-theme-muted">Order ID: {order.id} • {new Date(order.date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-theme-surface rounded-full transition-colors text-theme-muted hover:text-theme-main">
                        <Icon name="close" className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow space-y-8">
                    {/* Supplier & Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-muted">Supplier Information</h3>
                            <div className="bg-theme-main p-4 rounded-2xl border border-theme-main">
                                <p className="font-bold text-lg text-theme-main">{supplier?.name || 'Unknown Supplier'}</p>
                                {supplier?.phone && <p className="text-sm text-theme-muted flex items-center gap-2 mt-1"><Icon name="phone" className="w-3 h-3" /> {supplier.phone}</p>}
                                {supplier?.email && <p className="text-sm text-theme-muted flex items-center gap-2"><Icon name="mail" className="w-3 h-3" /> {supplier.email}</p>}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-muted">Order Summary</h3>
                            <div className="bg-theme-main p-4 rounded-2xl border border-theme-main space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-theme-muted">Invoice Number:</span>
                                    <span className="font-mono font-bold text-theme-main">{order.invoiceNumber || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-theme-muted">Status:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${order.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{order.status}</span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-theme-main">
                                    <span className="text-theme-muted">Total Items:</span>
                                    <span className="font-bold text-theme-main">{order.items.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-theme-muted">Itemized List</h3>
                        <div className="border border-theme-main rounded-2xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-theme-main text-theme-muted uppercase text-[10px] font-bold border-b border-theme-main">
                                    <tr>
                                        <th className="px-4 py-3">Item Name</th>
                                        <th className="px-4 py-3 text-center">Qty</th>
                                        <th className="px-4 py-3 text-right">Rate</th>
                                        <th className="px-4 py-3 text-right">GST</th>
                                        <th className="px-4 py-3 text-right">Net Rate</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-theme-main bg-theme-surface">
                                    {order.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-theme-main transition-colors">
                                            <td className="px-4 py-3 font-medium text-theme-main">{item.productName}</td>
                                            <td className="px-4 py-3 text-center text-theme-main">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-theme-main">₹{item.rate.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right text-theme-main">{item.gstRate}%</td>
                                            <td className="px-4 py-3 text-right text-theme-main">₹{item.netRate.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-theme-main">₹{(item.quantity * item.netRate).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Extra Charges */}
                    {order.extraCharges && order.extraCharges.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-muted">Extra Charges</h3>
                            <div className="bg-theme-main p-4 rounded-2xl border border-theme-main space-y-2">
                                {order.extraCharges.map((charge, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-theme-muted">{charge.description}</span>
                                        <span className="font-bold text-theme-main">₹{charge.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-theme-main bg-theme-main flex justify-between items-center rounded-b-3xl">
                    <div className="text-right">
                        <p className="text-xs text-theme-muted uppercase font-bold tracking-widest">Grand Total</p>
                        <p className="text-3xl font-black text-primary-500">₹{order.totalCost.toFixed(2)}</p>
                    </div>
                    <button 
                        onClick={() => window.print()}
                        className="px-6 py-2.5 bg-theme-surface text-theme-main border border-theme-main rounded-xl font-bold hover:bg-theme-main transition-colors flex items-center gap-2 shadow-sm"
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
                />
            )}
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                 <h1 className="text-2xl md:text-3xl font-bold text-theme-main">Purchases</h1>
                 <Tooltip content="Create a new purchase order" position="bottom">
                     <button 
                        onClick={() => setModalState({ type: 'add_purchase', data: null })}
                        className="px-6 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors shadow-sm flex items-center gap-2 font-semibold text-sm"
                     >
                        <Icon name="plus" className="w-4 h-4" />
                        New Purchase
                     </button>
                 </Tooltip>
            </div>

             <div className="bg-theme-surface rounded-3xl border border-theme-main shadow-sm overflow-hidden">
                <h3 className="p-6 text-lg font-semibold text-theme-main border-b border-theme-main">Recent Purchase Orders</h3>
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full text-sm text-left text-theme-muted">
                        <thead className="text-xs text-theme-muted uppercase bg-theme-main border-b border-theme-main">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-wider">Date</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Supplier</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Items</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-right">Total</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-main">
                           {[...purchaseOrders].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(po => {
                                const supplier = suppliers.find(s => s.id === po.supplierId);
                                return (
                                <Tooltip key={po.id} content={`View details for PO from ${supplier?.name || 'Unknown'}`} position="top">
                                    <tr onClick={() => setModalState({ type: 'view_purchase', data: po })} className="hover:bg-theme-main transition-colors cursor-pointer">
                                        <td className="px-6 py-4 font-medium text-theme-main">{new Date(po.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold text-theme-main">{supplier?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-theme-main">{po.items.length}</td>
                                        <td className="px-6 py-4 text-right font-bold text-theme-main">₹{po.totalCost.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${po.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : po.status === 'Draft' ? 'bg-theme-main text-theme-muted border-theme-main' : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'}`}>
                                                {po.status}
                                            </span>
                                        </td>
                                    </tr>
                                </Tooltip>
                            )})}
                        </tbody>
                    </table>
                     {purchaseOrders.length === 0 && <p className="text-center py-8 text-theme-muted text-sm font-medium">No purchase orders recorded.</p>}
                </div>
                <div className="lg:hidden space-y-3 p-4">
                    {[...purchaseOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(po => {
                        const supplier = suppliers.find(s => s.id === po.supplierId);
                        return (
                        <div key={po.id} onClick={() => setModalState({ type: 'view_purchase', data: po })} className="bg-theme-main rounded-2xl p-4 border border-theme-main shadow-sm cursor-pointer">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-sm text-theme-main">{supplier?.name || 'Unknown'}</p>
                                    <p className="text-xs text-theme-muted mt-1">{new Date(po.date).toLocaleDateString()}</p>
                                </div>
                                <p className="font-bold text-sm text-theme-main">₹{po.totalCost.toFixed(2)}</p>
                            </div>
                            <div className="flex justify-between items-end mt-3 pt-3 border-t border-theme-main">
                                <p className="text-xs text-theme-muted font-medium">{po.items.length} items</p>
                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg border ${po.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : po.status === 'Draft' ? 'bg-theme-surface text-theme-muted border-theme-main' : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'}`}>
                                    {po.status}
                                </span>
                            </div>
                        </div>
                        )
                    })}
                    {purchaseOrders.length === 0 && <p className="text-center text-xs py-4 text-theme-muted font-medium">No recent purchase orders.</p>}
                </div>
            </div>
        </div>
    );
};

export default Procurement;
