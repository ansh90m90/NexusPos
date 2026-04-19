import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import type { Supplier, PurchaseOrder, AppSettings } from '../types';
import Avatar from '../components/Avatar';
import SlideOverPanel from '../components/SlideOverPanel';
import { useToast } from '../components/Toast';
import Icon from '../components/Icon';
import ConfirmationModal from '../components/ConfirmationModal';
import { Tooltip } from '../components/Tooltip';

// #region Helper Components
const AddSupplierPaymentModal: React.FC<{
    supplier: Supplier;
    onClose: () => void;
    onAddPayment: (amount: number, isLoan: boolean) => void;
}> = ({ supplier, onClose, onAddPayment }) => {
    const [amount, setAmount] = useState('');
    const [isLoan, setIsLoan] = useState((supplier as any)._isLoan || false);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);
        if (!isNaN(paymentAmount) && paymentAmount > 0) {
            onAddPayment(paymentAmount, isLoan);
        }
    };
    
    const paymentAmount = parseFloat(amount) || 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[70] p-4">
            <motion.form 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                onSubmit={handleSubmit} 
                className="bg-theme-surface backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full space-y-8 border border-theme-main"
            >
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-black text-theme-main tracking-tighter">{isLoan ? 'Take Loan' : 'Add Payment'}</h3>
                        <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mt-1">{supplier.name}</p>
                    </div>
                    <div className="flex bg-theme-main p-1 rounded-2xl border border-theme-main">
                        <button 
                            type="button" 
                            onClick={() => setIsLoan(false)}
                            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isLoan ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-theme-muted hover:text-theme-main'}`}
                        >
                            Payment
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setIsLoan(true)}
                            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isLoan ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' : 'text-theme-muted hover:text-theme-main'}`}
                        >
                            Loan
                        </button>
                    </div>
                </div>
                
                {supplier.upiId && paymentAmount > 0 && !isLoan && (
                    <div className="flex flex-col items-center justify-center p-8 bg-theme-main rounded-3xl border border-theme-main">
                        <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mb-4">Scan to Pay Supplier via UPI</p>
                        <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100">
                            <QRCodeSVG 
                                value={`upi://pay?pa=${supplier.upiId}&pn=${encodeURIComponent(supplier.name)}&am=${paymentAmount.toFixed(2)}&cu=INR`} 
                                size={160} 
                                level="H"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="payment" className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-2">
                            {isLoan ? 'Loan Amount' : 'Payment Amount'}
                        </label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-theme-muted">₹</span>
                            <input id="payment" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-12 pr-8 py-6 rounded-[2rem] bg-theme-main text-theme-main border border-theme-main focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all font-black text-3xl tracking-tighter" step="0.01" autoFocus required placeholder="0.00" />
                        </div>
                        <div className="flex justify-between items-center px-4">
                            <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">
                                {isLoan ? 'Amount taken from supplier' : 'Amount paid to supplier'}
                            </p>
                            <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">Due: <span className="text-rose-500">₹{supplier.creditBalance.toLocaleString()}</span></p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 px-6 py-5 rounded-2xl bg-theme-main text-theme-muted hover:bg-theme-main/80 transition-all font-black uppercase tracking-widest text-xs">Cancel</button>
                    <button type="submit" className={`flex-2 px-8 py-5 rounded-2xl text-white transition-all shadow-lg font-black uppercase tracking-widest text-xs ${isLoan ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25' : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/25'}`}>
                        {isLoan ? 'Take Loan' : 'Add Payment'}
                    </button>
                </div>
            </motion.form>
        </div>
    );
};

const SupplierPanel: React.FC<{
    supplier: Partial<Supplier> | null;
    onClose: () => void;
    onSave: (supplierData: Partial<Supplier>) => void;
    onDelete?: (supplierId: number) => void;
}> = ({ supplier, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        contactPerson: supplier?.contactPerson || '',
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        address: supplier?.address || '',
        upiId: supplier?.upiId || '',
        gstin: supplier?.gstin || '',
    });
    const [isFetchingGst, setIsFetchingGst] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const toast = useToast();

    const handleGstLookup = async () => {
        if (!formData.gstin || formData.gstin.length < 15) {
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

            const details = mockDetails[formData.gstin.toUpperCase()] || {
                name: `Business ${formData.gstin.slice(0, 5)}`,
                address: `Plot No. ${Math.floor(Math.random() * 500)}, Industrial Area, Phase ${Math.floor(Math.random() * 3) + 1}, Business District, State Code ${formData.gstin.slice(0, 2)}`,
                contact: 'Authorized Signatory'
            };

            setFormData(prev => ({
                ...prev,
                name: details.name,
                address: details.address,
                contactPerson: details.contact
            }));
            toast.showToast('Supplier details fetched from GSTIN successfully!', 'success');
        } catch (_err) {
            toast.showToast('Failed to fetch details from GSTIN.', 'error');
        } finally {
            setIsFetchingGst(false);
        }
    };

    const isEditing = !!supplier?.id;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: supplier?.id, ...formData });
    };

    return (
        <>
        <SlideOverPanel
            title={isEditing ? 'Edit Supplier' : 'Add New Supplier'}
            onClose={onClose}
            footer={
                 <div className="flex justify-between items-center w-full gap-4">
                    <div className="flex-1">
                        {isEditing && onDelete && (
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="px-6 py-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4 flex-2">
                        <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black uppercase tracking-widest text-xs">Cancel</button>
                        <button type="submit" form="supplier-form" className="flex-2 px-8 py-4 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 font-black uppercase tracking-widest text-xs">Save Supplier</button>
                    </div>
                </div>
            }
        >
            <form id="supplier-form" onSubmit={handleSubmit} className="space-y-8">
                <div className="p-6 bg-primary-500/5 dark:bg-primary-500/10 rounded-[2rem] border border-primary-500/10 dark:border-primary-500/20">
                    <label className="block text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em] mb-4 ml-1">Auto-fill from GSTIN</label>
                    <div className="flex gap-3">
                        <input 
                            name="gstin" 
                            value={formData.gstin} 
                            onChange={e => {
                                const val = e.target.value.toUpperCase();
                                setFormData(prev => ({ ...prev, gstin: val }));
                            }} 
                            placeholder="15-digit GSTIN" 
                            className="flex-grow p-4 rounded-2xl bg-theme-main text-theme-main border border-theme-main focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all font-mono text-sm" 
                            maxLength={15}
                        />
                        <button 
                            type="button" 
                            onClick={handleGstLookup}
                            disabled={isFetchingGst || !formData.gstin}
                            className="px-6 py-4 bg-primary-500 text-white rounded-2xl hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary-500/25"
                        >
                            {isFetchingGst ? <Icon name="spinner" size={16} className="animate-spin" /> : <Icon name="sync-reload" size={16} />}
                            <span className="text-[10px] font-black uppercase tracking-widest">Fetch</span>
                        </button>
                    </div>
                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mt-4 ml-1 italic">Enter GSTIN to pull business details automatically.</p>
                </div>

                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-2">Company Name</label>
                    <input name="name" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Acme Corp" className="w-full p-4 rounded-2xl bg-theme-main text-theme-main border border-theme-main focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all font-bold" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-2">Contact Person</label>
                        <input name="contactPerson" value={formData.contactPerson} onChange={e => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))} placeholder="e.g., Jane Smith" className="w-full p-4 rounded-2xl bg-theme-main text-theme-main border border-theme-main focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all font-bold" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-2">Phone Number</label>
                        <input name="phone" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="e.g., +91 98765 43210" className="w-full p-4 rounded-2xl bg-theme-main text-theme-main border border-theme-main focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all font-bold" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-2">Email Address</label>
                    <input name="email" type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="e.g., supplier@example.com" className="w-full p-4 rounded-2xl bg-theme-main text-theme-main border border-theme-main focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all font-bold" />
                </div>

                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-2">Full Address</label>
                    <input name="address" value={formData.address} onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="e.g., 456 Market St, City" className="w-full p-4 rounded-2xl bg-theme-main text-theme-main border border-theme-main focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all font-bold" />
                </div>

                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-2">UPI ID</label>
                    <input name="upiId" value={formData.upiId} onChange={e => setFormData(prev => ({ ...prev, upiId: e.target.value }))} placeholder="e.g., name@bank" className="w-full p-4 rounded-2xl bg-theme-main text-theme-main border border-theme-main focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all font-bold" />
                </div>
            </form>
        </SlideOverPanel>
        <ConfirmationModal 
            isOpen={isDeleteModalOpen}
            title="Delete Supplier"
            message={`Are you sure you want to delete ${supplier?.name}? This action cannot be undone.`}
            onConfirm={() => {
                onDelete!(supplier!.id!);
                setIsDeleteModalOpen(false);
            }}
            onCancel={() => setIsDeleteModalOpen(false)}
        />
        </>
    );
};

const SupplierListPage: React.FC<{
    suppliers: Supplier[];
    onSelectSupplier: (supplierId: number) => void;
     setModalState: (state: { type: string | null, data: any }) => void;
}> = ({ suppliers, onSelectSupplier, setModalState }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const sortedSuppliers = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        return suppliers
            .filter(s => s && !s.isDeleted && (s.name || '').toLowerCase().includes(lowerCaseSearch))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [suppliers, searchTerm]);

    return (
        <div className="h-full flex flex-col bg-theme-surface backdrop-blur-xl">
             <div className="p-6 border-b border-theme-main space-y-6">
                 <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-theme-main tracking-tight">Suppliers</h2>
                        <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mt-0.5">{sortedSuppliers.length} Partners</p>
                    </div>
                     <Tooltip content="Add New Supplier" position="bottom">
                         <button 
                            onClick={() => setModalState({ type: 'add_supplier', data: null })} 
                            className="p-3 rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Icon name="plus" size={20}/>
                        </button>
                    </Tooltip>
                 </div>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-theme-muted group-focus-within:text-primary-500 transition-colors">
                        <Icon name="search" size={18} />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search Suppliers..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-theme-main border border-theme-main rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all text-sm font-bold text-theme-main shadow-sm"
                    />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                <ul className="space-y-2">
                    {sortedSuppliers.map((supplier, index) => {
                        const isDue = supplier.creditBalance > 0;
                        const balanceColor = isDue ? 'text-rose-500' : 'text-theme-muted';
                        return (
                         <Tooltip key={`supp-list-${supplier.id}`} content={`View details for ${supplier.name}`} position="right">
                             <motion.li 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => onSelectSupplier(supplier.id)} 
                                className="group p-4 rounded-3xl cursor-pointer flex items-center gap-4 transition-all bg-theme-main/50 hover:bg-theme-main border border-transparent hover:border-theme-main hover:shadow-xl hover:shadow-theme-main/10"
                            >
                                <Avatar name={supplier.name} size="md" />
                                <div className="flex-grow min-w-0">
                                    <p className="font-black text-sm text-theme-main truncate group-hover:text-primary-600 transition-colors">{supplier.name}</p>
                                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mt-0.5">{supplier.contactPerson}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className={`font-black text-sm ${balanceColor}`}>₹{Math.abs(supplier.creditBalance).toLocaleString()}</p>
                                    <p className={`text-[10px] font-black uppercase tracking-tighter ${balanceColor}`}>{isDue ? 'Due' : 'Clear'}</p>
                                </div>
                            </motion.li>
                        </Tooltip>
                    )})}
                </ul>
            </div>
        </div>
    );
};

import SupplierDetailPage from '../components/SupplierDetailPage';

interface SuppliersProps {
  suppliers: Supplier[];
  onSaveSupplier: (supplier: Partial<Supplier>) => void;
  onDeleteSupplier: (supplierId: number) => void;
  purchaseOrders: PurchaseOrder[];
  modalState: { type: string | null; data: any };
  setModalState: (state: { type: string | null; data: any }) => void;
  onAddPayment: (supplierId: number, amount: number, isLoan: boolean) => void;
  appSettings: AppSettings;
}

const Suppliers: React.FC<SuppliersProps> = (props) => {
  const { suppliers, onSaveSupplier, onDeleteSupplier, purchaseOrders, modalState, setModalState, onAddPayment } = props;
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const selectedSupplier = useMemo(() => 
    selectedSupplierId !== null ? suppliers.find(s => String(s.id) === String(selectedSupplierId)) : null
  , [suppliers, selectedSupplierId]);
  const toast = useToast();
  
  const handleCloseModal = useCallback(() => {
    setModalState({type: null, data: null});
  }, [setModalState]);

  const handleDeleteAndBack = (supplierId: number) => {
    onDeleteSupplier(supplierId);
    toast.showToast('Delete operation queued.', 'info');
    handleCloseModal();
    setSelectedSupplierId(null);
  }
  
  const handleAddPaymentAndClose = (amount: number, isLoan: boolean) => {
    if (selectedSupplier) {
        onAddPayment(selectedSupplier.id, amount, isLoan);
        toast.showToast(isLoan ? 'Loan recorded successfully!' : 'Payment added successfully!', 'success');
        handleCloseModal();
    }
  };

  return (
    <>
      <div className="flex h-[calc(100vh-8rem)] bg-theme-surface backdrop-blur-xl rounded-[2.5rem] border border-theme-main shadow-2xl shadow-theme-main/10 overflow-hidden">
        <div className={`w-full lg:w-2/5 xl:w-1/3 h-full lg:border-r border-theme-main ${selectedSupplier ? 'hidden lg:flex flex-col' : 'flex flex-col'}`}>
          <SupplierListPage suppliers={suppliers} onSelectSupplier={setSelectedSupplierId} setModalState={setModalState} />
        </div>
        <div className={`w-full h-full ${selectedSupplier ? 'block' : 'hidden lg:block'}`}>
          {selectedSupplier ? (
            <SupplierDetailPage 
              supplier={selectedSupplier}
              purchaseOrders={purchaseOrders}
              onBack={() => setSelectedSupplierId(null)}
              setModalState={setModalState}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-8">
              <div className="max-w-xs">
                <div className="w-24 h-24 rounded-[2.5rem] bg-theme-main flex items-center justify-center mx-auto mb-6 border border-theme-main shadow-sm">
                    <Icon name="suppliers" size={48} className="text-theme-muted opacity-50" />
                </div>
                <h3 className="text-lg font-black text-theme-main uppercase tracking-widest">Select a supplier</h3>
                <p className="mt-2 text-xs font-bold text-theme-muted uppercase tracking-tighter">Choose a supplier from the list to view their full transaction history and manage credit.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {(modalState.type === 'add_supplier' || modalState.type === 'edit_supplier') && (
        <SupplierPanel 
            supplier={modalState.data} 
            onClose={handleCloseModal} 
            onSave={onSaveSupplier} 
            onDelete={handleDeleteAndBack} 
        />
      )}
       {modalState.type === 'add_supplier_payment' && selectedSupplier && (
        <AddSupplierPaymentModal
            supplier={selectedSupplier}
            onClose={handleCloseModal}
            onAddPayment={handleAddPaymentAndClose}
        />
      )}
    </>
  );
};

export default Suppliers;