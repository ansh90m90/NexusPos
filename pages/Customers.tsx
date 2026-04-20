import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import type { Customer, Transaction, Product, AppSettings } from '../types';
import Avatar from '../components/Avatar';
import SlideOverPanel from '../components/SlideOverPanel';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';
import Icon from '../components/Icon';
import ConfirmationModal from '../components/ConfirmationModal';

// #region Helper Components
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
                <div className="flex justify-between items-center w-full gap-4">
                    <div className="flex-1">
                        {isEditing && onDelete && (
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="px-6 py-4 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest h-full"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4 flex-2">
                        <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black uppercase tracking-widest text-xs">Cancel</button>
                        <button type="submit" form="customer-form" className="flex-2 px-8 py-4 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 font-black uppercase tracking-widest text-xs">Save Customer</button>
                    </div>
                </div>
            }
        >
            <form id="customer-form" onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Full Name *</label>
                    <input name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., John Doe" className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Phone Number</label>
                        <input name="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="e.g., +91 98765 43210" className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Customer Tier</label>
                        <select name="tier" value={formData.tier} onChange={e => setFormData({ ...formData, tier: e.target.value as 'Retail' | 'Wholesale' })} className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold">
                            <option value="Retail">Retail</option>
                            <option value="Wholesale">Wholesale</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Full Address</label>
                    <input name="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="e.g., 123 Main St, City" className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold" />
                </div>

                <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                        <input 
                            type="checkbox" 
                            id="enableSms"
                            checked={formData.enableSms} 
                            onChange={e => setFormData({ ...formData, enableSms: e.target.checked })}
                            className="absolute z-10 w-12 h-6 opacity-0 cursor-pointer peer"
                        />
                        <div className="w-12 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-primary-500 transition-colors duration-200" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-6" />
                    </div>
                    <label htmlFor="enableSms" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer">Enable SMS Notifications</label>
                </div>
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
    onAddPayment: (amount: number, isLoan: boolean) => void;
    appSettings: AppSettings;
}> = ({ customer, onClose, onAddPayment, appSettings }) => {
    const [amount, setAmount] = useState('');
    const [isLoan, setIsLoan] = useState((customer as any)._isLoan || false);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);
        if (!isNaN(paymentAmount) && paymentAmount > 0) {
            onAddPayment(paymentAmount, isLoan);
        }
    };
    
    const paymentAmount = parseFloat(amount) || 0;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4">
            <motion.form 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                onSubmit={handleSubmit} 
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full space-y-8 border border-white/20 dark:border-slate-800/50"
            >
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{isLoan ? 'Give Loan' : 'Add Payment'}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{customer.name}</p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <button 
                            type="button" 
                            onClick={() => setIsLoan(false)}
                            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!isLoan ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Payment
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setIsLoan(true)}
                            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isLoan ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            Loan
                        </button>
                    </div>
                </div>
                
                {appSettings.upiId && paymentAmount > 0 && !isLoan && (
                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Scan to Pay via UPI</p>
                        <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100">
                            <QRCodeSVG 
                                value={`upi://pay?pa=${appSettings.upiId}&pn=${encodeURIComponent(appSettings.shopName)}&am=${paymentAmount.toFixed(2)}&cu=INR`} 
                                size={160} 
                                level="H"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="payment" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                            {isLoan ? 'Loan Amount' : 'Payment Amount'}
                        </label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-300">₹</span>
                            <input id="payment" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-12 pr-8 py-6 rounded-[2rem] bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all font-black text-3xl tracking-tighter" step="0.01" autoFocus required placeholder="0.00" />
                        </div>
                        <div className="flex justify-between items-center px-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {isLoan ? 'Amount given as loan' : 'Amount received from customer'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance: <span className="text-primary-500">₹{customer.creditBalance.toLocaleString()}</span></p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 px-6 py-5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black uppercase tracking-widest text-xs">Cancel</button>
                    <button type="submit" className={`flex-2 px-8 py-5 rounded-2xl text-white transition-all shadow-lg font-black uppercase tracking-widest text-xs ${isLoan ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25' : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/25'}`}>
                        {isLoan ? 'Give Loan' : 'Add Payment'}
                    </button>
                </div>
            </motion.form>
        </div>
    );
};
// #endregion

// #region Page Views
const CustomerListPage: React.FC<{
    customers: Customer[];
    onSelectCustomer: (customerId: number) => void;
    setModalState: (state: { type: string | null, data: any }) => void;
}> = ({ customers, onSelectCustomer, setModalState }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const sortedCustomers = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        return customers
            .filter(c => c && !c.isDeleted && (
                (c.name || '').toLowerCase().includes(lowerCaseSearch) ||
                (c.phone || '').toLowerCase().includes(lowerCaseSearch) ||
                (c.address || '').toLowerCase().includes(lowerCaseSearch)
            ))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [customers, searchTerm]);

    return (
        <div className="h-full flex flex-col bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
            <div className="p-6 border-b border-slate-200/60 dark:border-slate-800/60 space-y-6">
                 <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Customers</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{sortedCustomers.length} Total Records</p>
                    </div>
                    <Tooltip content="Add New Customer" position="bottom">
                        <button 
                            data-tutorial-id="add-customer-button"
                            onClick={() => setModalState({ type: 'add_customer', data: null })} 
                            className="p-3 rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Icon name="plus" size={20}/>
                        </button>
                    </Tooltip>
                 </div>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                        <Icon name="search" size={18} />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search by name, phone or address..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 focus:outline-none transition-all text-sm font-bold text-slate-900 dark:text-white shadow-sm"
                    />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                {sortedCustomers.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="w-20 h-20 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700">
                            <Icon name="customers" size={40} className="opacity-20" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">No Customers Found</h3>
                        <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">Try adjusting your search terms</p>
                     </div>
                ) : (
                    <ul className="space-y-2">
                        {sortedCustomers.map((customer, index) => {
                            const isDue = customer.creditBalance > 0;
                            const isAdvance = customer.creditBalance < 0;
                            const balanceColor = isDue ? 'text-rose-500' : isAdvance ? 'text-emerald-500' : 'text-slate-400';

                            return (
                                <Tooltip key={`cust-list-${customer.id}-${index}`} content={`View details for ${customer.name}`} position="right">
                                    <motion.li 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => onSelectCustomer(customer.id)} 
                                        className="group p-4 rounded-3xl cursor-pointer flex items-center gap-4 transition-all bg-white/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none"
                                    >
                                        <div className="relative">
                                            <Avatar name={customer.name} size="md" />
                                            {isDue && <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="font-black text-sm text-slate-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">{customer.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Last seen: {new Date(customer.lastActivity).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`font-black text-sm ${balanceColor}`}>₹{Math.abs(customer.creditBalance).toLocaleString()}</p>
                                            <p className={`text-[10px] font-black uppercase tracking-tighter ${balanceColor}`}>{isDue ? 'Due' : isAdvance ? 'Adv' : 'Clear'}</p>
                                        </div>
                                    </motion.li>
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
    onCancelTransaction: (transactionId: string) => void;
}> = ({ customer, transactions, products, onBack, setModalState, onCancelTransaction }) => {
    
    const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
    const { showToast } = useToast();
    const [isCancelling, setIsCancelling] = useState<string | null>(null);
    
    const getFullItemName = (item: any) => {
        if ('productId' in item.item) {
            const product = products.find(p => p.id === item.item.productId);
            return (product?.name || 'Product') + ` (${item.item.name})`;
        }
        return item.item.name;
    };

    const handleCancel = async (txId: string) => {
        if (window.confirm('Are you sure you want to cancel this transaction? This will revert stock and credit.')) {
            setIsCancelling(txId);
            try {
                await onCancelTransaction(txId);
                showToast('Transaction cancelled successfully', 'success');
            } catch {
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

    return (
        <div className="flex flex-col h-full bg-theme-main/50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-theme-main bg-theme-surface backdrop-blur-xl">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={onBack} className="p-2.5 rounded-2xl bg-theme-main text-theme-muted lg:hidden">
                       <Icon name="arrow-left" size={20}/>
                    </button>
                    <Avatar name={customer.name} size="lg" />
                    <div className='min-w-0'>
                        <h2 className="text-xl font-black text-theme-main tracking-tight truncate">{customer.name}</h2>
                        <p className="text-xs font-bold text-theme-muted uppercase tracking-widest mt-0.5">{customer.phone}</p>
                    </div>
                 </div>
                 <button onClick={() => setModalState({ type: 'edit_customer', data: customer })} className="p-3 rounded-2xl bg-theme-main text-theme-muted hover:bg-primary-500 hover:text-white transition-all shadow-sm">
                    <Icon name="edit" size={20}/>
                 </button>
            </div>
            
            {/* Balance Card */}
            <div className="p-6">
                <div className={`p-8 rounded-[2rem] text-center backdrop-blur-xl border shadow-xl shadow-theme-main/10 ${customer.creditBalance > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                    <p className={`text-xs font-black uppercase tracking-[0.2em] mb-2 ${customer.creditBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {customer.creditBalance > 0 ? 'Credit Due' : 'Advance Balance'}
                    </p>
                    <p className={`text-5xl font-black tracking-tighter ${customer.creditBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        ₹{Math.abs(customer.creditBalance).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Ledger/History */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 <h3 className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] ml-2">Transaction History</h3>
                 {ledgerWithBalance.map((entry, idx) => {
                    const transaction = entry.transactionId ? transactions.find(t => t.id === entry.transactionId) : null;
                    const isDebit = entry.type === 'debit';
                    const color = isDebit ? 'rose' : 'emerald';
                    const title = isDebit ? (transaction ? 'Purchase' : 'Debit Adjustment') : 'Payment Received';
                    const isExpanded = expandedTransactionId === transaction?.id;

                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={entry.id} 
                            className="bg-theme-surface backdrop-blur-xl rounded-3xl border border-theme-main shadow-sm overflow-hidden"
                        >
                            <div 
                                className={`p-5 flex justify-between items-center group ${transaction ? 'cursor-pointer' : ''}`}
                                onClick={() => transaction && setExpandedTransactionId(isExpanded ? null : transaction.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-500/10 text-${color}-500 group-hover:scale-110 transition-transform duration-500`}>
                                        <Icon name={isDebit ? 'cart' : 'receive-stock'} size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-theme-main group-hover:text-primary-500 transition-colors">{title}</p>
                                        <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mt-0.5">{new Date(entry.date).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                    <div>
                                        <p className={`text-lg font-black text-${color}-500`}>₹{entry.amount.toLocaleString()}</p>
                                        <p className="text-[10px] font-bold text-theme-muted uppercase tracking-tighter">Balance: ₹{entry.balanceAfter.toLocaleString()}</p>
                                    </div>
                                    {isDebit && entry.transactionId && (
                                        <Tooltip content="Cancel Transaction" position="top">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleCancel(entry.transactionId!); }}
                                                disabled={isCancelling === entry.transactionId}
                                                className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                                            >
                                                <Icon name="close" size={14} />
                                            </button>
                                        </Tooltip>
                                    )}
                                     {transaction && (
                                        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} className="text-theme-muted group-hover:text-primary-500 transition-colors" />
                                    )}
                                </div>
                            </div>
                            <AnimatePresence>
                                {transaction && isExpanded && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="bg-theme-main border-t border-theme-main px-5 py-4"
                                    >
                                        <h4 className="text-[10px] font-black text-theme-muted uppercase tracking-widest mb-3">Items Purchased</h4>
                                        <ul className="space-y-2">
                                            {transaction.items.map((item, index) => {
                                                 const unit = ('unit' in item.item) ? item.item.unit : 'pcs';
                                                 const unitDisplay = unit === 'pcs' ? 'pc/s' : unit;
                                                 const lineTotal = item.quantity * item.appliedPrice;
                                                 return (
                                                    <li key={index} className="flex justify-between items-center text-xs">
                                                        <span className="font-bold text-slate-600 dark:text-slate-400">{getFullItemName(item)} <span className="text-slate-400 font-medium">({item.quantity} {unitDisplay})</span></span>
                                                        <span className="font-black text-slate-900 dark:text-white">₹{lineTotal.toLocaleString()}</span>
                                                    </li>
                                                 );
                                            })}
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )
                })}
                {ledgerWithBalance.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Icon name="activity-sale" size={40} className="opacity-10 mb-4" />
                        <p className="text-xs font-bold uppercase tracking-[0.2em]">No transaction history</p>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
             <div className="p-6 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex gap-4">
                <Tooltip content={`Record a payment from ${customer.name}`} position="top">
                    <button 
                        onClick={() => setModalState({ type: 'add_payment', data: customer })} 
                        className="flex-1 py-4 rounded-2xl bg-primary-500 text-white font-black uppercase tracking-widest text-xs hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        Add Payment
                    </button>
                </Tooltip>
                <Tooltip content={`Give a loan to ${customer.name}`} position="top">
                    <button 
                        onClick={() => setModalState({ type: 'add_payment', data: { ...customer, _isLoan: true } })} 
                        className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-black uppercase tracking-widest text-xs hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/25 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        Give Loan
                    </button>
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
  onAddPayment: (customerId: number, amount: number, isLoan: boolean) => void;
  onCancelTransaction: (transactionId: string) => void;
  modalState: { type: string | null; data: any };
  setModalState: (state: { type: string | null; data: any }) => void;
  products: Product[];
  appSettings: AppSettings;
}

const Customers: React.FC<CustomersProps> = (props) => {
  const { customers, transactions, onSaveCustomer, onDeleteCustomer, onAddPayment, onCancelTransaction, modalState, setModalState, products, appSettings } = props;
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
  
  const handleAddPaymentAndClose = (amount: number, isLoan: boolean) => {
    if (selectedCustomer) {
        onAddPayment(selectedCustomer.id, amount, isLoan);
        toast.showToast(isLoan ? 'Loan recorded successfully!' : 'Payment added successfully!', 'success');
        handleCloseModal();
    }
  };

  return (
    <>
      <div className="flex h-[calc(100vh-8rem)] bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className={`w-full lg:w-2/5 xl:w-1/3 h-full lg:border-r border-slate-200/60 dark:border-slate-800/60 ${selectedCustomer ? 'hidden lg:flex flex-col' : 'flex flex-col'}`}>
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
              onCancelTransaction={onCancelTransaction}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-8">
              <div className="max-w-xs">
                <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <Icon name="customers" size={48} className="text-slate-200 dark:text-slate-700" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Select a customer</h3>
                <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">Choose a customer from the list to view their full transaction history and manage credit.</p>
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