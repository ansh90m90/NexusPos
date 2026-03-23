import React, { useMemo } from 'react';
import type { ActivityItem, AccountState } from '../types';
import Avatar from './Avatar';
import Icon from './Icon';
import { Tooltip } from './Tooltip';

interface ActivityDetailModalProps {
    activity: ActivityItem;
    accountState: AccountState;
    onClose: () => void;
}

const DetailRow: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between items-start py-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{value}</span>
    </div>
);

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({ activity, accountState, onClose }) => {
    const { transactions, customers, products, purchaseOrders, suppliers } = accountState;

    const modalContent = useMemo(() => {
        const { type, link } = activity;
        const context = link?.context || {};

        switch (type) {
            case 'sale': {
                const transaction = transactions.find(t => t.id === context.transactionId);
                if (!transaction) return <p>Sale details not found.</p>;
                return (
                    <div>
                        <h3 className="text-lg font-bold">Sale Receipt</h3>
                        <p className="text-xs text-gray-500 mb-4">ID: {transaction.id}</p>
                        {transaction.customer && (
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 mb-3">
                                <Avatar name={transaction.customer.name} />
                                <div>
                                    <p className="font-semibold text-sm">{transaction.customer.name}</p>
                                    <p className="text-xs text-gray-500">{transaction.customer.phone}</p>
                                </div>
                            </div>
                        )}
                        <ul className="space-y-1 text-sm border-y dark:border-gray-700 py-2 my-2">
                            {transaction.items.map((cartItem, index) => {
                                let name = 'Unknown Item';
                                const item = cartItem.item;
                                if ('ingredients' in item) { // This is a Dish
                                    name = item.name;
                                } else { // This is a ProductVariant
                                    const product = products.find(p => p.id === item.productId);
                                    name = product ? `${product.name} (${item.name})` : item.name;
                                }
                                return (
                                <li key={index} className="flex justify-between">
                                    <span>{name} x{cartItem.quantity}</span>
                                    <span className="font-mono">₹{(cartItem.appliedPrice * cartItem.quantity).toFixed(2)}</span>
                                </li>
                                )
                            })}
                        </ul>
                        <DetailRow label="Subtotal" value={`₹${transaction.subtotal.toFixed(2)}`} />
                        {transaction.discount && <DetailRow label="Discount" value={`-₹${transaction.discount.amount.toFixed(2)}`} />}
                        <DetailRow label="Total Paid" value={<span className="text-xl text-primary-600 dark:text-primary-400">₹{transaction.total.toFixed(2)}</span>} />
                    </div>
                );
            }
            case 'new_customer': {
                const customer = customers.find(c => c.id === context.customerId);
                if (!customer) return <p>Customer details not found.</p>;
                 return (
                    <div>
                        <h3 className="text-lg font-bold mb-4">New Customer Profile</h3>
                        <div className="flex items-center gap-4 mb-4">
                            <Avatar name={customer.name} className="w-16 h-16 text-2xl"/>
                            <div>
                                <p className="text-xl font-bold">{customer.name}</p>
                                <p className="text-gray-500">{customer.tier} Customer</p>
                            </div>
                        </div>
                        <DetailRow label="Phone" value={customer.phone} />
                        <DetailRow label="Address" value={customer.address} />
                        <DetailRow label="Credit Balance" value={`₹${customer.creditBalance.toFixed(2)}`} />
                    </div>
                );
            }
            case 'low_stock': {
                const product = products.find(p => p.id === context.productId);
                const variant = product?.variants.find(v => v.id === context.variantId);
                if (!product || !variant) return <p>Product details not found.</p>;
                return (
                    <div>
                        <h3 className="text-lg font-bold mb-4">Low Stock Alert</h3>
                        <DetailRow label="Product" value={`${product.name} (${variant.name})`} />
                        <DetailRow label="Current Stock" value={<span className="text-red-500">{variant.stock}</span>} />
                        <DetailRow label="Minimum Stock" value={product.minStock || 'N/A'} />
                        <p className="text-xs text-center mt-4 p-2 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 rounded-md">Consider creating a purchase order for this item.</p>
                    </div>
                );
            }
            case 'purchase_received': {
                const po = purchaseOrders.find(p => p.id === context.purchaseOrderId);
                const supplier = suppliers.find(s => s.id === po?.supplierId);
                if (!po) return <p>Purchase order not found.</p>;
                return (
                    <div>
                        <h3 className="text-lg font-bold">Purchase Received</h3>
                        <p className="text-xs text-gray-500 mb-4">PO ID: {po.id}</p>
                        <DetailRow label="Supplier" value={supplier?.name || 'Unknown'} />
                        <DetailRow label="Date Received" value={new Date(po.date).toLocaleDateString()} />
                        <ul className="space-y-1 text-sm border-y dark:border-gray-700 py-2 my-2">
                             {po.items.map((item, index) => (
                                <li key={index} className="flex justify-between">
                                    <span>{item.productName} x{item.quantity}</span>
                                    <span className="font-mono">@ ₹{item.netRate.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                        <DetailRow label="Total Cost" value={<span className="text-xl text-primary-600 dark:text-primary-400">₹{po.totalCost.toFixed(2)}</span>} />
                    </div>
                );
            }
            default:
                return <p>No details available for this event type.</p>;
        }
    }, [activity, transactions, customers, products, purchaseOrders, suppliers]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-md font-bold text-gray-900 dark:text-white">Activity Details</h2>
                    <Tooltip content="Close details" position="bottom">
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <Icon name="close" className="w-5 h-5" />
                        </button>
                    </Tooltip>
                </div>
                <div className="p-5">{modalContent}</div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-t dark:border-gray-700 text-right">
                    <Tooltip content="Close details" position="top">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition text-sm font-semibold">Close</button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

export default ActivityDetailModal;
