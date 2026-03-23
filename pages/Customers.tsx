import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Customer, LedgerEntry, Transaction, CartItem, Action, EmployeeRole, Reward, Product, ProductVariant, AppSettings } from '../types';
import Avatar from '../components/Avatar';
import SlideOverPanel from '../components/SlideOverPanel';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';
import Icon from '../components/Icon';
import ConfirmationModal from '../components/ConfirmationModal';

type SortOption = 'activity-new' | 'activity-old' | 'balance-due' | 'balance-advance' | 'name-asc' | 'name-desc';

// #region Helper Components
const CustomerStatCard: React.FC<{label: string, value: string | number, className?: string}> = ({ label, value, className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 text-center ${className}`}>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
);

const CustomerPanel: React.FC<{
    customer: Partial<Customer> | null;
    onClose: () => void;
    onSave: (customerData: Partial<Customer>) => void;
    onDelete?: (customerId: number) => void;
}> = ({ customer, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        phone: customer?.phone || '',
        address: customer?.address || '',
        tier: customer?.tier || 'Retail',
        enableSms: customer?.enableSms ?? true,
    });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const isEditing = !!customer?.id;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: customer?.id, ...formData });
    };

    return (
        <>
        <SlideOverPanel
            title={isEditing ? 'Edit Customer' : 'Add New Customer'}
            onClose={onClose}
            footer={
                <div className="flex justify-between items-center w-full">
                    <div>
                        {isEditing && onDelete && (
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="px-4 py-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition text-sm font-semibold"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                        <button type="submit" form="customer-form" className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition">Save</button>
                    </div>
                </div>
            }
        >
            <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
                <input name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Customer's Full Name" className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-primary-500" required />
                <input name="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Customer's Phone (for receipts)" className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-primary-500" />
                <input name="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Customer's Address (optional)" className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-primary-500" />
                <select name="tier" value={formData.tier} onChange={e => setFormData({ ...formData, tier: e.target.value as 'Retail' | 'Wholesale' })} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600">
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                </select>
            </form>
        </SlideOverPanel>
        <ConfirmationModal 
            isOpen={isDeleteModalOpen}
            title="Delete Customer"
            message={`Are you sure you want to delete ${customer?.name}? This action cannot be undone.`}
            onConfirm={() => {
                onDelete!(customer!.id!);
                setIsDeleteModalOpen(false);
            }}
            onCancel={() => setIsDeleteModalOpen(false)}
        />
        </>
    );
};

const AddPaymentModal: React.FC<{
    customer: Customer;
    onClose: () => void;
    onAddPayment: (amount: number) => void;
    appSettings: AppSettings;
}> = ({ customer, onClose, onAddPayment, appSettings }) => {
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
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
                <h3 className="text-xl font-bold mb-2">Add Payment</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">For: <span className="font-semibold">{customer.name}</span></p>
                
                {appSettings.upiId && paymentAmount > 0 && (
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mb-4">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">Scan to Pay via UPI</p>
                        <div className="bg-white p-2 rounded-xl">
                            <QRCodeSVG 
                                value={`upi://pay?pa=${appSettings.upiId}&pn=${encodeURIComponent(appSettings.shopName)}&am=${paymentAmount.toFixed(2)}&cu=INR`} 
                                size={150} 
                                level="H"
                            />
                        </div>
                    </div>
                )}

                <label htmlFor="payment" className="block text-sm font-medium mb-1">Enter Amount Received</label>
                <input id="payment" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-primary-500" step="0.01" autoFocus required />
                <p className="text-xs text-slate-500 mt-1">Current Balance: ₹{customer.creditBalance.toFixed(2)}</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                    <button type="submit" className="px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition">Add Payment</button>
                </div>
            </form>
        </div>
    );
};
// #endregion

// #region Page Views
const CustomerListPage: React.FC<{
    customers: Customer[];
    onSelectCustomer: (id: number) => void;
    setModalState: (state: { type: string | null, data: any }) => void;
}> = ({ customers, onSelectCustomer, setModalState }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const sortedCustomers = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        return customers
            .filter(c => c && !c.isDeleted && (
                (c.name || '').toLowerCase().includes(lowerCaseSearch) || 
                (c.phone || '').includes(searchTerm) ||
                (c.address || '').toLowerCase().includes(lowerCaseSearch)
            ))
            .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    }, [customers, searchTerm]);

    return (
        <div className="h-full flex flex-col">
            <div className="p-3 border-b dark:border-slate-700 space-y-3">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Customers ({sortedCustomers.length})</h2>
                    <Tooltip content="Add New Customer" position="bottom">
                        <button onClick={() => setModalState({ type: 'add_customer', data: null })} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900 transition flex items-center gap-1">
                            <Icon name="plus" className="w-4 h-4"/> New
                        </button>
                    </Tooltip>
                 </div>
                <div className="relative">
                    <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search Customers"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-1.5 pl-9 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 text-sm text-slate-900 dark:text-white"
                    />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-2">
                {sortedCustomers.length === 0 ? (
                     <div className="text-center py-10 text-slate-500">
                        <Icon name="customers" className="mx-auto h-10 w-10 text-slate-400" />
                        <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No Customers</h3>
                        <p className="mt-1 text-xs text-slate-500">Add a new customer to get started.</p>
                     </div>
                ) : (
                    <ul className="space-y-1">
                        {sortedCustomers.map((customer, index) => {
                            const isDue = customer.creditBalance > 0;
                            const isAdvance = customer.creditBalance < 0;
                            const balanceColor = isDue ? 'text-red-500' : isAdvance ? 'text-green-500' : 'text-slate-500';

                            return (
                                <Tooltip key={`cust-list-${customer.id}-${index}`} content={`View details for ${customer.name}`} position="right">
                                    <li onClick={() => onSelectCustomer(customer.id)} className="p-2 rounded-lg cursor-pointer flex items-center gap-3 transition hover:bg-slate-100 dark:hover:bg-slate-700/50">
                                        <Avatar name={customer.name} />
                                        <div className="flex-grow min-w-0">
                                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{customer.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Last seen: {new Date(customer.lastActivity).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`font-bold text-sm ${balanceColor}`}>₹{Math.abs(customer.creditBalance).toFixed(2)}</p>
                                            <p className={`text-xs ${balanceColor}`}>{isDue ? 'Due' : isAdvance ? 'Adv' : 'Clear'}</p>
                                        </div>
                                    </li>
                                </Tooltip>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

const CustomerDetailPage: React.FC<{
    customer: Customer;
    transactions: Transaction[];
    products: Product[];
    onBack: () => void;
    setModalState: (state: { type: string, data: any }) => void;
    onAddPayment: (customerId: number, amount: number) => void;
    onCancelTransaction: (transactionId: string) => void;
    onExecuteAiAction: (action: Action) => Promise<string>;
}> = ({ customer, transactions, products, onBack, setModalState, onAddPayment, onCancelTransaction, onExecuteAiAction }) => {
    
    const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
    const { showToast } = useToast();
    const [isCancelling, setIsCancelling] = useState<string | null>(null);

    const handleCancel = async (txId: string) => {
        if (window.confirm('Are you sure you want to cancel this transaction? This will revert stock and credit.')) {
            setIsCancelling(txId);
            try {
                await onCancelTransaction(txId);
                showToast('Transaction cancelled successfully', 'success');
            } catch (error) {
                showToast('Failed to cancel transaction', 'error');
            } finally {
                setIsCancelling(null);
            }
        }
    };

    const ledgerWithBalance = useMemo(() => {
        const sorted = [...customer.creditLedger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const result = [];
        let balance = customer.creditBalance;
        for (const entry of sorted) {
            const balanceAfter = balance;
            if (entry.type === 'debit') {
                balance -= entry.amount;
            } else {
                balance += entry.amount;
            }
            result.push({ ...entry, balanceAfter });
        }
        return result;
    }, [customer.creditLedger, customer.creditBalance]);

    const getFullItemName = (cartItem: CartItem): string => {
        if (!('ingredients' in cartItem.item)) {
            const variant = cartItem.item as ProductVariant;
            const product = products.find(p => p.id === variant.productId);
            return product ? `${product.name} (${variant.name})` : variant.name;
        } else {
            return cartItem.item.name;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/80">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden">
                       <Icon name="arrow-left" className="w-5 h-5"/>
                    </button>
                    <Avatar name={customer.name} />
                    <div className='min-w-0'>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{customer.name}</h2>
                        <p className="text-xs text-slate-500">{customer.phone}</p>
                    </div>
                 </div>
                 <button onClick={() => setModalState({ type: 'edit_customer', data: customer })} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0">
                    <Icon name="edit" className="w-5 h-5"/>
                 </button>
            </div>
            
            {/* Balance Card */}
            <div className="p-3 border-b dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className={`p-3 rounded-lg text-center ${customer.creditBalance > 0 ? 'bg-red-50 dark:bg-red-900/40' : 'bg-green-50 dark:bg-green-900/40'}`}>
                    <p className={`text-sm font-semibold ${customer.creditBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {customer.creditBalance > 0 ? 'Credit Due' : 'Advance Balance'}
                    </p>
                    <p className={`text-3xl font-bold ${customer.creditBalance > 0 ? 'text-red-700 dark:text-red-500' : 'text-green-700 dark:text-green-500'}`}>
                        ₹{Math.abs(customer.creditBalance).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Ledger/History */}
            <div className="flex-grow overflow-y-auto p-3 space-y-3">
                 {ledgerWithBalance.map(entry => {
                    const transaction = entry.transactionId ? transactions.find(t => t.id === entry.transactionId) : null;
                    const isDebit = entry.type === 'debit';
                    const amountColor = isDebit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
                    const title = isDebit ? (transaction ? 'Purchase' : 'Debit Adjustment') : 'Payment Received';
                    const isExpanded = expandedTransactionId === transaction?.id;

                    return (
                        <div key={entry.id} className="p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                            <div 
                                className={`flex justify-between items-start ${transaction ? 'cursor-pointer' : ''}`}
                                onClick={() => transaction && setExpandedTransactionId(isExpanded ? null : transaction.id)}
                            >
                                <div>
                                    <p className={`font-semibold ${amountColor}`}>{title}</p>
                                    <p className="text-xs text-slate-500">{new Date(entry.date).toLocaleString()}</p>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <div>
                                        <p className={`text-lg font-bold ${amountColor}`}>₹{entry.amount.toFixed(2)}</p>
                                        <p className="text-xs text-slate-500">Balance: ₹{entry.balanceAfter.toFixed(2)}</p>
                                    </div>
                                    {isDebit && entry.transactionId && (
                                        <Tooltip content="Cancel Transaction" position="top">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleCancel(entry.transactionId!); }}
                                                disabled={isCancelling === entry.transactionId}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                title="Cancel Transaction"
                                            >
                                                <Icon name="close" className="w-4 h-4" />
                                            </button>
                                        </Tooltip>
                                    )}
                                     {transaction && (
                                        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} className="w-4 h-4 text-slate-400" />
                                    )}
                                </div>
                            </div>
                            {transaction && isExpanded && (
                                <div className="mt-2 pt-2 border-t dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                    <h4 className="font-semibold mb-1">Items Purchased:</h4>
                                    <ul className="space-y-1 pl-2">
                                        {transaction.items.map((item, index) => {
                                             const unit = ('unit' in item.item) ? item.item.unit : 'pcs';
                                             const unitDisplay = unit === 'pcs' ? 'pc/s' : unit;
                                             const lineTotal = item.quantity * item.appliedPrice;
                                             return <li key={index} className="flex justify-between text-xs">
                                                 <span>{getFullItemName(item)} ({item.quantity}{unitDisplay})</span>
                                                 <span className="font-mono">₹{lineTotal.toFixed(2)}</span>
                                             </li>
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )
                })}
                {ledgerWithBalance.length === 0 && <p className="text-center text-sm text-slate-500 py-8">No transaction history.</p>}
            </div>

            {/* Actions Footer */}
             <div className="p-3 border-t dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <Tooltip content={`Record a payment from ${customer.name}`} position="top">
                    <button onClick={() => setModalState({ type: 'add_payment', data: customer })} className="w-full p-3 font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700">Add Payment</button>
                </Tooltip>
             </div>
        </div>
    );
};
// #endregion

interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  onSaveCustomer: (customer: Partial<Customer>) => void;
  onDeleteCustomer: (customerId: number) => void;
  onAddPayment: (customerId: number, amount: number) => void;
  onCancelTransaction: (transactionId: string) => void;
  onExecuteAiAction: (action: Action) => Promise<string>;
  modalState: { type: string | null; data: any };
  setModalState: (state: { type: string | null; data: any }) => void;
  products: Product[];
  appSettings: AppSettings;
}

const Customers: React.FC<CustomersProps> = (props) => {
  const { customers, transactions, onSaveCustomer, onDeleteCustomer, onAddPayment, onCancelTransaction, onExecuteAiAction, modalState, setModalState, products, appSettings } = props;
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const selectedCustomer = useMemo(() => 
    selectedCustomerId !== null ? customers.find(c => c.id === selectedCustomerId) : null
  , [customers, selectedCustomerId]);
  const toast = useToast();
  
  const handleCloseModal = useCallback(() => {
    setModalState({type: null, data: null});
  }, [setModalState]);

  const handleDeleteAndBack = (customerId: number) => {
    onDeleteCustomer(customerId);
    toast.showToast('Delete operation queued.', 'info');
    handleCloseModal();
    setSelectedCustomerId(null);
  }
  
  const handleAddPaymentAndClose = (amount: number) => {
    if (selectedCustomer) {
        onAddPayment(selectedCustomer.id, amount);
        toast.showToast('Payment added successfully!', 'success');
        handleCloseModal();
    }
  };

  return (
    <>
      <div className="flex h-full bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className={`w-full lg:w-2/5 xl:w-1/3 h-full lg:border-r lg:dark:border-slate-700 ${selectedCustomer ? 'hidden lg:flex flex-col' : 'flex flex-col'}`}>
          <CustomerListPage customers={customers} onSelectCustomer={setSelectedCustomerId} setModalState={setModalState} />
        </div>
        <div className={`w-full h-full ${selectedCustomer ? 'block' : 'hidden lg:block'}`}>
          {selectedCustomer ? (
            <CustomerDetailPage 
              customer={selectedCustomer}
              transactions={transactions}
              products={products}
              onBack={() => setSelectedCustomerId(null)}
              setModalState={setModalState}
              onAddPayment={onAddPayment}
              onCancelTransaction={onCancelTransaction}
              onExecuteAiAction={onExecuteAiAction}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center text-slate-500 p-4">
              <div>
                <Icon name="customers" className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Select a customer</h3>
                <p className="mt-1 text-sm text-slate-500">Choose a customer to view their details and transaction history.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {(modalState.type === 'add_customer' || modalState.type === 'edit_customer') && (
        <CustomerPanel 
            customer={modalState.data} 
            onClose={handleCloseModal} 
            onSave={onSaveCustomer} 
            onDelete={handleDeleteAndBack} 
        />
      )}
       {modalState.type === 'add_payment' && selectedCustomer && (
        <AddPaymentModal
            customer={selectedCustomer}
            onClose={handleCloseModal}
            onAddPayment={handleAddPaymentAndClose}
            appSettings={appSettings}
        />
      )}
    </>
  );
};

export default Customers;