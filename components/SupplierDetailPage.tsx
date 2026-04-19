import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Supplier, PurchaseOrder } from '../types';
import Avatar from './Avatar';
import Icon from './Icon';

interface SupplierDetailPageProps {
    supplier: Supplier;
    purchaseOrders: PurchaseOrder[];
    onBack: () => void;
    setModalState: (state: { type: string | null, data: any }) => void;
}

const SupplierDetailPage: React.FC<SupplierDetailPageProps> = ({ supplier, purchaseOrders, onBack, setModalState }) => {
    
    const ledgerWithBalance = useMemo(() => {
        const sorted = [...(supplier.creditLedger || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const result = [];
        let balance = supplier.creditBalance;
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
    }, [supplier.creditLedger, supplier.creditBalance]);

    
    return (
        <div className="flex flex-col h-full bg-theme-main/50">
            <div className="flex items-center justify-between p-6 border-b border-theme-main bg-theme-surface backdrop-blur-2xl">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-theme-main text-theme-muted lg:hidden hover:bg-theme-main/80 transition-all">
                       <Icon name="arrow-left" size={20}/>
                    </button>
                    <Avatar name={supplier.name} size="lg" />
                    <div className='min-w-0'>
                        <h2 className="text-xl font-black text-theme-main tracking-tighter truncate">{supplier.name}</h2>
                        <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mt-0.5">{supplier.phone}</p>
                    </div>
                 </div>
                 <button onClick={() => setModalState({ type: 'edit_supplier', data: supplier })} className="p-4 rounded-2xl bg-theme-surface text-theme-muted hover:bg-primary-500 hover:text-white transition-all shadow-xl shadow-theme-main/10 border border-theme-main">
                    <Icon name="edit" size={20}/>
                 </button>
            </div>
            
            <div className="p-8">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-10 rounded-[2.5rem] text-center backdrop-blur-3xl border shadow-2xl transition-all ${supplier.creditBalance > 0 ? 'bg-rose-500/5 border-rose-500/20 shadow-rose-500/5' : 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5'}`}
                >
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 ${supplier.creditBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {supplier.creditBalance > 0 ? 'Amount Due' : 'Advance Paid'}
                    </p>
                    <p className={`text-6xl font-black tracking-tighter ${supplier.creditBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        ₹{Math.abs(supplier.creditBalance).toLocaleString()}
                    </p>
                </motion.div>
            </div>

            <div className="flex-grow overflow-y-auto p-8 pt-0 space-y-6 custom-scrollbar">
                 <h3 className="text-[10px] font-black text-theme-muted uppercase tracking-[0.3em] ml-4">Transaction History</h3>
                 <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {ledgerWithBalance.map((entry, idx) => {
                            const purchaseOrder = entry.transactionId ? purchaseOrders.find(po => po.id === entry.transactionId) : null;
                            const isDebit = entry.type === 'debit';
                            const color = isDebit ? 'rose' : 'emerald';
                            const title = isDebit ? (entry.details || 'Amount Due') : 'Payment Paid';

                            return (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={entry.id} 
                                    className="bg-theme-surface backdrop-blur-2xl rounded-[2rem] border border-theme-main shadow-sm hover:shadow-xl hover:shadow-theme-main/10 transition-all overflow-hidden p-6"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${color}-500/10 text-${color}-500 shadow-inner`}>
                                                <Icon name={isDebit ? 'procurement' : 'receive-stock'} size={20} />
                                            </div>
                                            <div>
                                                <p className="text-base font-black text-theme-main tracking-tight">{title}</p>
                                                <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest mt-1">{new Date(entry.date).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xl font-black text-${color}-500 tracking-tighter`}>₹{entry.amount.toLocaleString()}</p>
                                            <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mt-1">Balance: <span className="text-theme-main/80">₹{entry.balanceAfter.toLocaleString()}</span></p>
                                        </div>
                                    </div>
                                    {purchaseOrder && (
                                        <div className="mt-6 pt-6 border-t border-theme-main">
                                            <p className='text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4'>Items from PO #{purchaseOrder.id.slice(-6)}</p>
                                            <ul className="space-y-3">
                                                {purchaseOrder.items.map((item, index) => (
                                                    <li key={index} className="text-xs font-bold text-slate-600 dark:text-slate-400 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                                        <span className="tracking-tight">{item.productName}</span>
                                                        <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-lg">x{item.quantity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                 </div>
                {ledgerWithBalance.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800">
                            <Icon name="activity-sale" size={40} className="opacity-10" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.3em]">No transaction history</p>
                    </div>
                )}
            </div>

             <div className="p-8 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl flex gap-4">
                <button 
                    onClick={() => setModalState({ type: 'add_supplier_payment', data: supplier })} 
                    className="flex-1 py-5 rounded-2xl bg-primary-500 text-white font-black uppercase tracking-widest text-xs hover:bg-primary-600 transition-all shadow-2xl shadow-primary-500/25 hover:-translate-y-1 active:translate-y-0"
                >
                    Record Payment
                </button>
                <button 
                    onClick={() => setModalState({ type: 'add_supplier_payment', data: { ...supplier, _isLoan: true } })} 
                    className="flex-1 py-5 rounded-2xl bg-rose-500 text-white font-black uppercase tracking-widest text-xs hover:bg-rose-600 transition-all shadow-2xl shadow-rose-500/25 hover:-translate-y-1 active:translate-y-0"
                >
                    Take Loan
                </button>
             </div>
        </div>
    );
};

export default SupplierDetailPage;
