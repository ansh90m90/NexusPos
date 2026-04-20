import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
        synced: { text: 'Synced', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', iconName: 'sync-check', title: 'Data is up to date' },
        syncing: { text: 'Syncing...', color: 'text-amber-500', bgColor: 'bg-amber-500/10', iconName: 'sync-spin', title: 'Syncing in progress...' },
        error: { text: 'Sync Error', color: 'text-rose-500', bgColor: 'bg-rose-500/10', iconName: 'sync-error', title: 'Sync failed. Click to retry.' },
        offline: { text: 'Offline', color: 'text-slate-500', bgColor: 'bg-slate-500/10', iconName: 'sync-offline', title: 'Offline mode' }
    };

    const currentStatus = statusInfo[status] || statusInfo.offline;
    const { text, color, bgColor, iconName, title } = currentStatus;
    const isSyncing = status === 'syncing';

    return (
        <div className="flex items-center gap-1 bg-theme-main/50 p-1 rounded-2xl border border-theme-main/30">
            <Tooltip content={title} position="bottom">
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${color} ${bgColor} px-2 md:px-3 py-1 rounded-xl cursor-help transition-all shadow-sm`}>
                    <Icon name={iconName} size={14} className={isSyncing ? 'animate-spin' : ''} />
                    <span className="hidden md:inline">{text}</span>
                </div>
            </Tooltip>
            <Tooltip content="Force Sync" position="bottom">
                <button 
                    onClick={onSync} 
                    disabled={isSyncing} 
                    className="p-1.5 rounded-xl text-slate-400 hover:text-primary-500 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm"
                >
                     <Icon name="sync-reload" size={14} className={isSyncing ? 'animate-spin' : ''} />
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
        <header className="bg-theme-surface/80 backdrop-blur-xl px-3 md:px-8 flex items-center justify-between sticky top-0 z-30 h-16 md:h-20 transition-all duration-300 border-b border-theme-main/10 shadow-sm shadow-black/5">
            <div className="flex items-center gap-3 md:gap-6">
                <div className="flex flex-col">
                    <h1 className="text-lg md:text-xl font-bold text-theme-main tracking-tight">{currentPage}</h1>
                    <p className="text-[10px] text-theme-muted font-medium uppercase tracking-[0.2em] hidden md:block">Nexus Management Suite</p>
                </div>
                
                <div className="h-8 w-px bg-theme-main hidden lg:block"></div>

                {userBusinesses.length > 0 && (
                    <div className="relative" ref={businessMenuRef}>
                        <button 
                            onClick={() => setIsBusinessMenuOpen(o => !o)}
                            className="flex items-center gap-2 p-1 md:px-4 md:py-2 rounded-2xl bg-theme-main/30 md:bg-theme-main/50 border border-theme-main hover:border-primary-500/50 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-600">
                                <Icon name="business" size={18} />
                            </div>
                            <div className="hidden md:flex flex-col items-start text-left">
                                <span className="text-xs font-bold text-theme-main truncate max-w-[140px]">
                                    {currentBusiness?.name || 'Select Business'}
                                </span>
                                <span className="text-[10px] text-theme-muted font-medium">{currentBusiness?.role || 'Switch'}</span>
                            </div>
                            <Icon name="chevron-down" size={14} className={`text-theme-muted transition-transform duration-300 ${isBusinessMenuOpen ? 'rotate-180' : ''} hidden sm:block`} />
                        </button>
                        
                        <AnimatePresence>
                            {isBusinessMenuOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full left-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden p-2"
                                >
                                    <div className="px-4 py-3 mb-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Organizations</p>
                                    </div>
                                    <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                                        {userBusinesses.map(business => (
                                            <button 
                                                key={business.id}
                                                onClick={() => {
                                                    onSwitchBusiness?.(business.id);
                                                    setIsBusinessMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all ${
                                                    business.id === currentBusinessId 
                                                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' 
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">{business.name}</span>
                                                    <span className="text-[10px] opacity-60">{business.role}</span>
                                                </div>
                                                {business.id === currentBusinessId && (
                                                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                                        <Icon name="check" size={12} className="text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                 {isTest && (
                    <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                        <Icon name="activity-low-stock" size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Sandbox Mode</span>
                    </div>
                )}
                
                {!isTest && <SyncControl status={syncStatus} onForceSync={onForceSync} />}
                
                <div className="h-8 w-px bg-theme-main hidden sm:block"></div>

                <div data-tutorial-id="notifications-button">
                    <NotificationBell notifications={notifications} onOpen={onOpenNotifications} />
                </div>

                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(o => !o)} 
                        className="flex items-center gap-2 md:gap-3 p-1 md:p-1.5 md:pr-4 rounded-2xl bg-theme-main/30 md:bg-theme-main/50 border border-theme-main hover:border-primary-500/50 transition-all"
                    >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                            <span className="text-sm font-bold">{currentUser.name.slice(0, 1).toUpperCase()}</span>
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-xs font-bold text-theme-main leading-tight">{currentUser.name}</p>
                            <p className="text-[10px] text-theme-muted font-medium">{currentUser.role}</p>
                        </div>
                        <Icon name="chevron-down" size={12} className={`text-theme-muted transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''} hidden md:block`} />
                    </button>
                    
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden p-2"
                            >
                                <div className="space-y-1">
                                    <button 
                                        onClick={() => {setCurrentPage('MyAccount'); setIsMenuOpen(false);}} 
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                    >
                                        <Icon name="user" size={18} />
                                        <span>My Account</span>
                                    </button>
                                    <button 
                                        onClick={toggleTheme} 
                                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
                                            <span>{theme === 'light' ? 'Dark Appearance' : 'Light Appearance'}</span>
                                        </div>
                                    </button>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2"></div>
                                    <button 
                                        onClick={onLogout} 
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all"
                                    >
                                        <Icon name="logout" size={18} />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};

export default Header;
