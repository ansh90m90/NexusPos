import React from 'react';
import type { KitchenOrder } from '../types';
import Icon from '../components/Icon';
import { Tooltip } from '../components/Tooltip';

interface KDSProps {
    orders: KitchenOrder[];
    setOrders: React.Dispatch<React.SetStateAction<KitchenOrder[]>>;
}

const KDS: React.FC<KDSProps> = ({ orders, setOrders }) => {
    const pendingOrders = orders.filter(o => o.status === 'Pending').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const handleCompleteOrder = (orderId: string) => {
        setOrders(prevOrders => 
            prevOrders.map(order => 
                order.id === orderId ? { ...order, status: 'Completed' } : order
            )
        );
    };

    return (
        <div className="bg-theme-surface p-4 md:p-6 h-full overflow-y-auto rounded-2xl md:rounded-3xl border border-theme-main shadow-sm animate-page-fade-in">
            {pendingOrders.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[300px] md:min-h-[400px]">
                    <div className="text-center text-theme-muted">
                        <div className="bg-theme-main w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-theme-main shadow-sm">
                            <Icon name="check" className="h-8 w-8 md:h-10 md:w-10 text-primary-500" />
                        </div>
                        <h3 className="mt-2 text-lg md:text-xl font-bold text-theme-main">All Caught Up!</h3>
                        <p className="mt-2 text-xs md:text-sm font-medium">No pending orders in the kitchen.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {pendingOrders.map(order => (
                        <div key={order.id} className="bg-theme-main rounded-2xl md:rounded-3xl shadow-sm border border-theme-main p-4 md:p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex justify-between items-center border-b border-theme-main pb-2 md:pb-3 mb-3 md:mb-4">
                                    <h3 className="text-lg md:text-xl font-bold text-primary-500">Order #{order.orderNumber}</h3>
                                    <span className="text-[10px] md:text-xs font-bold text-theme-muted uppercase tracking-wider bg-theme-surface px-2 py-1 rounded-lg border border-theme-main">
                                        {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <ul className="space-y-2 md:space-y-3">
                                    {order.items.map((item, index) => (
                                        <li key={index} className="flex justify-between items-center bg-theme-surface p-2 md:p-3 rounded-xl border border-theme-main">
                                            <span className="font-bold text-theme-main text-sm md:text-base">{item.dish.name}</span>
                                            <span className="font-bold text-base md:text-lg text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-2 md:px-3 py-1 rounded-lg">x{item.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Tooltip content={`Mark Order #${order.orderNumber} as completed`} position="top">
                                <button
                                    onClick={() => handleCompleteOrder(order.id)}
                                    className="mt-4 md:mt-6 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 md:py-3 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm md:text-base"
                                >
                                    <Icon name="check" className="w-4 h-4 md:w-5 md:h-5" /> Complete Order
                                </button>
                            </Tooltip>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KDS;