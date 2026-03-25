import React, { useState, useRef, useEffect, useContext } from 'react';
import NotificationBell from './NotificationBell';
import { Page, User, AppNotification, SyncStatus, ThemeContext, ThemeContextType, BusinessInfo } from '../types';
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
    userBusinesses?: BusinessInfo[];
    currentBusinessId?: string;
    onSwitchBusiness?: (id: string) => void;
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
        <div className="flex items-center gap-1 bg-theme-main p-1 rounded-full">
            <Tooltip content={title} position="bottom">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${color} px-2 cursor-help`}>
                    <Icon name={iconName} className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{text}</span>
                </div>
            </Tooltip>
            <Tooltip content="Force Sync Data" position="bottom">
                <button onClick={onSync} disabled={isSyncing} className="p-1 rounded-full text-theme-muted hover:bg-theme-main disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                     <Icon name="sync-reload" className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
            </Tooltip>
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({ currentPage, currentUser, onLogout, notifications, setCurrentPage, syncStatus, onOpenNotifications, onForceSync, isTest, userBusinesses = [], currentBusinessId, onSwitchBusiness }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isBusinessMenuOpen, setIsBusinessMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const businessMenuRef = useRef<HTMLDivElement>(null);
    const { theme, toggleTheme } = useContext(ThemeContext) as ThemeContextType;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (businessMenuRef.current && !businessMenuRef.current.contains(event.target as Node)) {
                setIsBusinessMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuRef, businessMenuRef]);

    const currentBusiness = userBusinesses.find(b => b.id === currentBusinessId);
    
    return (
        <header className="bg-theme-surface/90 backdrop-blur-md border-b border-theme-main p-2 md:px-4 flex items-center justify-between sticky top-0 z-30 h-16 transition-all duration-300">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold text-theme-main hidden sm:block">{currentPage}</h1>
                
                {userBusinesses.length > 0 && (
                    <div className="relative" ref={businessMenuRef}>
                        <Tooltip content="Switch Business" position="bottom">
                            <button 
                                onClick={() => setIsBusinessMenuOpen(o => !o)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-theme-main border border-theme-main hover:bg-theme-main/80 transition-colors"
                            >
                                <Icon name="business" className="w-4 h-4 text-theme-accent" />
                                <span className="text-sm font-semibold text-theme-main max-w-[120px] truncate">
                                    {currentBusiness?.name || 'Select Business'}
                                </span>
                                <Icon name="chevron-down" className={`w-3 h-3 text-theme-muted transition-transform ${isBusinessMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </Tooltip>
                        
                        {isBusinessMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-theme-surface rounded-md shadow-lg border border-theme-main z-20 overflow-hidden">
                                <div className="px-4 py-2 border-b border-theme-main bg-theme-main/30">
                                    <p className="text-xs font-bold text-theme-muted uppercase tracking-wider">Your Businesses</p>
                                </div>
                                <ul className="py-1 max-h-[300px] overflow-y-auto">
                                    {userBusinesses.map(business => (
                                        <li key={business.id}>
                                            <button 
                                                onClick={() => {
                                                    onSwitchBusiness?.(business.id);
                                                    setIsBusinessMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-theme-main transition-colors ${business.id === currentBusinessId ? 'bg-theme-accent/10 text-theme-accent' : 'text-theme-main'}`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{business.name}</span>
                                                    <span className="text-[10px] opacity-60">{business.role}</span>
                                                </div>
                                                {business.id === currentBusinessId && <Icon name="check" className="w-4 h-4" />}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                 {isTest && (
                    <Tooltip content="You are currently in Test Mode. Data will not be synced to the main server." position="bottom">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-theme-main text-yellow-500 border border-theme-main cursor-help">
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
                                <p className="text-sm font-semibold text-theme-main">{currentUser.name}</p>
                                <p className="text-xs text-theme-muted">{currentUser.role}</p>
                            </div>
                        </button>
                    </Tooltip>
                    {isMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-theme-surface rounded-md shadow-lg border border-theme-main z-20 modal-content overflow-hidden">
                            <ul className="py-1 text-sm text-theme-main">
                                <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentPage('MyAccount'); setIsMenuOpen(false);}} className="block px-4 py-2 hover:bg-theme-main">My Account</a></li>
                                <li>
                                  <button onClick={toggleTheme} className="w-full text-left flex justify-between items-center px-4 py-2 hover:bg-theme-main">
                                    <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                                    <Icon name={theme === 'light' ? 'moon' : 'sun'} className="w-4 h-4" />
                                  </button>
                                </li>
                                <li className="border-t border-theme-main"><a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="block px-4 py-2 text-red-500 hover:bg-theme-main">Logout</a></li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
