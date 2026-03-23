import React, { useState, useRef, useEffect, useContext } from 'react';
import NotificationBell from './NotificationBell';
import { Page, User, AppNotification, SyncStatus, ThemeContext, ThemeContextType } from '../types';
import Icon from './Icon';
import { Tooltip } from './Tooltip';

interface HeaderProps {
    currentPage: Page;
    currentUser: User;
    onLogout: () => void;
    notifications: AppNotification[];
    setCurrentPage: (page: Page) => void;
    syncStatus: SyncStatus;
    onOpenNotifications: () => void;
    onForceSync: () => void;
    isTest?: boolean;
}

const SyncControl: React.FC<{ status: SyncStatus, onSync: () => void }> = ({ status, onSync }) => {
    const statusInfo = {
        synced: { text: 'Synced', color: 'text-green-500', iconName: 'sync-check', title: 'Data is up to date' },
        syncing: { text: 'Syncing...', color: 'text-yellow-500', iconName: 'sync-spin', title: 'Syncing in progress...' },
        error: { text: 'Sync Error', color: 'text-red-500', iconName: 'sync-error', title: 'Sync failed. Click to retry.' },
        offline: { text: 'Offline', color: 'text-slate-500', iconName: 'sync-offline', title: 'Offline mode' }
    };

    const currentStatus = statusInfo[status] || statusInfo.offline;
    const { text, color, iconName, title } = currentStatus;
    const isSyncing = status === 'syncing';

    return (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-full">
            <Tooltip content={title} position="bottom">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${color} px-2 cursor-help`}>
                    <Icon name={iconName} className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{text}</span>
                </div>
            </Tooltip>
            <Tooltip content="Force Sync Data" position="bottom">
                <button onClick={onSync} disabled={isSyncing} className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                     <Icon name="sync-reload" className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
            </Tooltip>
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({ currentPage, currentUser, onLogout, notifications, setCurrentPage, syncStatus, onOpenNotifications, onForceSync, isTest }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { theme, toggleTheme } = useContext(ThemeContext) as ThemeContextType;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuRef]);
    
    return (
        <header className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-2 md:px-4 flex items-center justify-between sticky top-0 z-30 h-16 transition-all duration-300">
            <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:block">{currentPage}</h1>
            </div>

            <div className="flex items-center gap-3">
                 {isTest && (
                    <Tooltip content="You are currently in Test Mode. Data will not be synced to the main server." position="bottom">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 cursor-help">
                            <Icon name="activity-low-stock" className="w-4 h-4" />
                            <span className="text-xs font-bold">Test Mode</span>
                        </div>
                    </Tooltip>
                )}
                {!isTest && <SyncControl status={syncStatus} onSync={onForceSync} />}
                
                <div data-tutorial-id="notifications-button">
                    <Tooltip content="Notifications" position="bottom">
                        <div>
                            <NotificationBell notifications={notifications} onOpen={onOpenNotifications} />
                        </div>
                    </Tooltip>
                </div>

                <div className="relative" ref={menuRef}>
                    <Tooltip content="User Menu" position="bottom">
                        <button onClick={() => setIsMenuOpen(o => !o)} className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm">
                                {currentUser.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{currentUser.name}</p>
                                <p className="text-xs text-slate-500">{currentUser.role}</p>
                            </div>
                        </button>
                    </Tooltip>
                    {isMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 z-20 modal-content overflow-hidden">
                            <ul className="py-1 text-sm text-slate-700 dark:text-slate-300">
                                <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentPage('MyAccount'); setIsMenuOpen(false);}} className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">My Account</a></li>
                                <li>
                                  <button onClick={toggleTheme} className="w-full text-left flex justify-between items-center px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                                    <Icon name={theme === 'light' ? 'moon' : 'sun'} className="w-4 h-4" />
                                  </button>
                                </li>
                                <li className="border-t dark:border-slate-700"><a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="block px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40">Logout</a></li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
