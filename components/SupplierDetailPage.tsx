
import React, { useMemo } from 'react';
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
        <div className="flex flex-col h-full bg-theme-main">
            <div className="flex items-center justify-between p-3 border-b border-theme-main bg-theme-surface">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onBack} className="p-1 rounded-full hover:bg-theme-main lg:hidden">
                       <Icon name="arrow-left" className="w-5 h-5"/>
                    </button>
                    <Avatar name={supplier.name} />
                    <div className='min-w-0'>
                        <h2 className="text-base font-bold text-theme-main truncate">{supplier.name}</h2>
                        <p className="text-xs text-theme-muted">{supplier.phone}</p>
                    </div>
                 </div>
                 <button onClick={() => setModalState({ type: 'edit_supplier', data: supplier })} className="p-2 rounded-full hover:bg-theme-main flex-shrink-0">
                    <Icon name="edit" className="w-5 h-5 text-theme-main"/>
                 </button>
            </div>
            
            <div className="p-3 border-b border-theme-main bg-theme-surface">
                <div className={`p-3 rounded-lg text-center bg-theme-main border ${supplier.creditBalance > 0 ? 'border-red-500/20' : 'border-green-500/20'}`}>
                    <p className={`text-sm font-semibold ${supplier.creditBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {supplier.creditBalance > 0 ? 'Amount Due' : 'Advance Paid'}
                    </p>
                    <p className={`text-3xl font-bold ${supplier.creditBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        ₹{Math.abs(supplier.creditBalance).toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-3 space-y-3">
                 {ledgerWithBalance.map(entry => {
                    const purchaseOrder = entry.transactionId ? purchaseOrders.find(po => po.id === entry.transactionId) : null;
                    const isDebit = entry.type === 'debit';
                    const amountColor = isDebit ? 'text-red-500' : 'text-green-500';
                    const title = isDebit ? 'Amount Due' : 'Payment Paid';

                    return (
                        <div key={entry.id} className="p-3 bg-theme-surface rounded-lg border border-theme-main">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={`font-semibold ${amountColor}`}>{title}</p>
                                    <p className="text-xs text-theme-muted">{new Date(entry.date).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-bold ${amountColor}`}>₹{entry.amount.toFixed(2)}</p>
                                    <p className="text-xs text-theme-muted">Balance: ₹{entry.balanceAfter.toFixed(2)}</p>
                                </div>
                            </div>
                            {purchaseOrder && (
                                <div className="mt-2 pt-2 border-t border-theme-main text-xs text-theme-main">
                                    <p className='font-semibold'>Items from PO #{purchaseOrder.id.slice(-6)}:</p>
                                    <ul className="list-disc list-inside">
                                        {purchaseOrder.items.map((item, index) => <li key={index}>{item.quantity} x {item.productName}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )
                })}
                {ledgerWithBalance.length === 0 && <p className="text-center text-sm text-theme-muted py-8">No transaction history.</p>}
            </div>

             <div className="p-3 border-t border-theme-main bg-theme-surface">
                <button onClick={() => setModalState({ type: 'add_supplier_payment', data: supplier })} className="w-full p-3 font-bold text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors shadow-sm">Record Payment</button>
             </div>
        </div>
    );
};

export default SupplierDetailPage;
