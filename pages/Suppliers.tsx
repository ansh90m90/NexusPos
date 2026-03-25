import React, { useState, useMemo, useCallback } from 'react';
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
    onAddPayment: (amount: number) => void;
}> = ({ supplier, onClose, onAddPayment }) => {
    const [amount, setAmount] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);
        if (!isNaN(paymentAmount) && paymentAmount > 0) {
            onAddPayment(paymentAmount);
        }
    };
    
    const paymentAmount = parseFloat(amount) || 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
            <form onSubmit={handleSubmit} className="bg-theme-surface rounded-lg shadow-xl p-6 max-w-sm w-full border border-theme-main">
                <h3 className="text-xl font-bold mb-2 text-theme-main">Add Payment</h3>
                <p className="text-theme-muted mb-4">To: <span className="font-semibold text-theme-main">{supplier.name}</span></p>
                
                {supplier.upiId && paymentAmount > 0 && (
                    <div className="flex flex-col items-center justify-center p-4 bg-theme-main rounded-xl border border-theme-main mb-4">
                        <p className="text-sm font-bold text-theme-muted mb-2">Scan to Pay Supplier via UPI</p>
                        <div className="bg-white p-2 rounded-xl">
                            <QRCodeSVG 
                                value={`upi://pay?pa=${supplier.upiId}&pn=${encodeURIComponent(supplier.name)}&am=${paymentAmount.toFixed(2)}&cu=INR`} 
                                size={150} 
                                level="H"
                            />
                        </div>
                    </div>
                )}

                <label htmlFor="payment" className="block text-sm font-medium mb-1 text-theme-main">Enter Amount Paid</label>
                <input id="payment" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" step="0.01" autoFocus required />
                <p className="text-xs text-theme-muted mt-1">Current Due: ₹{supplier.creditBalance.toFixed(2)}</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition">Cancel</button>
                    <button type="submit" className="px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm">Add Payment</button>
                </div>
            </form>
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
    });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
                 <div className="flex justify-between items-center w-full">
                    <div>
                        {isEditing && onDelete && (
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="px-4 py-2 rounded-lg bg-theme-main text-red-500 hover:bg-theme-surface border border-theme-main transition text-sm font-semibold"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition">Cancel</button>
                        <button type="submit" form="supplier-form" className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm">Save</button>
                    </div>
                </div>
            }
        >
            <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4">
                <input name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Company or Business Name" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" required />
                <input name="contactPerson" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} placeholder="Contact Person's Name (optional)" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" />
                <input name="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Supplier's Phone Number" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" />
                <input name="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Supplier's Email Address" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" />
                <input name="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Supplier's Full Address" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" />
                <input name="upiId" value={formData.upiId} onChange={e => setFormData({ ...formData, upiId: e.target.value })} placeholder="Supplier's UPI ID (e.g. name@bank)" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" />
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
        <div className="h-full flex flex-col">
             <div className="p-3 border-b border-theme-main space-y-3">
                 <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold text-theme-main">Suppliers ({sortedSuppliers.length})</h2>
                     <Tooltip content="Add New Supplier" position="bottom">
                         <button onClick={() => setModalState({ type: 'add_supplier', data: null })} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-theme-main text-primary-500 border border-theme-main hover:bg-theme-surface transition flex items-center gap-1">
                            <Icon name="plus" className="w-4 h-4"/> New
                        </button>
                    </Tooltip>
                 </div>
                <div className="relative">
                    <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
                    <input 
                        type="text"
                        placeholder="Search Suppliers"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-1.5 pl-9 bg-theme-main border-theme-main rounded-lg focus:ring-1 focus:ring-primary-500 text-sm text-theme-main"
                    />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-2">
                <ul className="space-y-1">
                    {sortedSuppliers.map(supplier => {
                        const isDue = supplier.creditBalance > 0;
                        const balanceColor = isDue ? 'text-red-500' : 'text-theme-muted';
                        return (
                         <Tooltip key={`supp-list-${supplier.id}`} content={`View details for ${supplier.name}`} position="right">
                             <li onClick={() => onSelectSupplier(supplier.id)} className="p-2 rounded-lg cursor-pointer flex items-center gap-3 transition hover:bg-theme-main">
                                <Avatar name={supplier.name} />
                                <div className="flex-grow min-w-0">
                                    <p className="font-semibold text-sm text-theme-main truncate">{supplier.name}</p>
                                    <p className="text-xs text-theme-muted">{supplier.contactPerson}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className={`font-bold text-sm ${balanceColor}`}>₹{Math.abs(supplier.creditBalance).toFixed(2)}</p>
                                    <p className={`text-xs ${balanceColor}`}>{isDue ? 'Due' : 'Clear'}</p>
                                </div>
                            </li>
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
  onAddPayment: (supplierId: number, amount: number) => void;
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
  
  const handleAddPaymentAndClose = (amount: number) => {
    if (selectedSupplier) {
        onAddPayment(selectedSupplier.id, amount);
        toast.showToast('Payment added successfully!', 'success');
        handleCloseModal();
    }
  };

  return (
    <>
      <div className="flex h-full bg-theme-surface rounded-xl border border-theme-main shadow-sm overflow-hidden">
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
            <div className="flex items-center justify-center h-full text-center text-theme-muted p-4">
              <div>
                <Icon name="suppliers" className="mx-auto h-12 w-12 text-theme-muted" />
                <h3 className="mt-2 text-sm font-medium text-theme-main">Select a supplier</h3>
                <p className="mt-1 text-sm text-theme-muted">Choose a supplier to view their details.</p>
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