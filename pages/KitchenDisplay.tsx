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
        <div className="bg-gray-100 dark:bg-gray-900 p-4 h-full overflow-y-auto rounded-lg">
            {pendingOrders.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                        <Icon name="check" className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">All Caught Up!</h3>
                        <p className="mt-1 text-sm">No pending orders in the kitchen.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {pendingOrders.map(order => (
                        <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col justify-between modal-content">
                            <div>
                                <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2 mb-2">
                                    <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400">Order #{order.orderNumber}</h3>
                                    <span className="text-xs text-gray-500">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <ul className="space-y-2">
                                    {order.items.map((item, index) => (
                                        <li key={index} className="flex justify-between items-center">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{item.dish.name}</span>
                                            <span className="font-bold text-lg">x{item.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Tooltip content={`Mark Order #${order.orderNumber} as completed`} position="top">
                                <button
                                    onClick={() => handleCompleteOrder(order.id)}
                                    className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
                                >
                                    Complete
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