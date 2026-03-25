import React, { useState, useRef, useEffect } from 'react';
import { AppNotification } from '../types';
import Icon from './Icon';

interface NotificationBellProps {
    notifications: AppNotification[];
    onOpen: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onOpen }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [ref]);

    const getIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'ai_suggestion':
                return <span className="text-blue-500">💡</span>;
            case 'low_stock':
                return <span className="text-red-500">📦</span>;
            case 'expiring':
                 return <span className="text-orange-500">⏳</span>;
            default:
                return <span className="text-neutral-500">ℹ️</span>;
        }
    }

    const handleToggle = () => {
        if (!isOpen) {
            onOpen();
        }
        setIsOpen(o => !o);
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={handleToggle}
                className="relative text-neutral-600 dark:text-neutral-300 rounded-full p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                aria-label="Notifications"
                title="Notifications"
            >
                <Icon name="bell" className="w-5 h-5" />

                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] items-center justify-center">{unreadCount}</span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-md shadow-lg border dark:border-neutral-700 z-20 modal-content overflow-hidden">
                    <div className="p-3 font-semibold border-b dark:border-neutral-700 text-sm">Notifications</div>
                    {notifications.length > 0 ? (
                        <ul className="py-1 max-h-80 overflow-y-auto">
                            {notifications.map((item) => (
                                <li key={item.id} className="text-sm flex items-start gap-3 p-3 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700/50 mt-0.5">
                                        {getIcon(item.type)}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-neutral-800 dark:text-neutral-200">{item.message}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                                    </div>
                                    {!item.isRead && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5"></div>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <p className="p-4 text-sm text-center text-neutral-500">No new notifications.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;