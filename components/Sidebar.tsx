import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Page, EmployeeRole, AppSettings } from '../types';
import { navItems } from '../constants';
import Icon from './Icon';
import { Tooltip } from './Tooltip';


interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  employeeRole: EmployeeRole;
  appSettings: AppSettings;
}

const NavItem: React.FC<{
  page: Page;
  label: string;
  iconName: string;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isMobile?: boolean;
}> = ({ page, label, iconName, currentPage, onNavigate, isMobile }) => {
    const isActive = currentPage === page;
    return (
        <Tooltip content={label} position={isMobile ? "top" : "right"}>
            <button
                data-tutorial-id={!isMobile ? `nav-${page}` : `mobile-nav-${page}`}
                onClick={(e) => {
                    e.preventDefault();
                    onNavigate(page);
                }}
                className={`group relative flex items-center justify-center p-3 rounded-2xl transition-all duration-300 ${
                    isActive 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-110' 
                    : 'text-theme-muted hover:text-primary-500 hover:bg-theme-main'
                }`}
            >
                <Icon name={iconName} size={24} />
                {isActive && !isMobile && (
                    <motion.div 
                        layoutId="activeNav"
                        className="absolute -left-4 top-1/2 -translate-y-1/2 h-8 w-1.5 bg-primary-500 rounded-r-full hidden md:block"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                )}
            </button>
        </Tooltip>
    )
};

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, employeeRole, appSettings }) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
            setIsMoreMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (page: Page) => {
    setCurrentPage(page);
    setIsMoreMenuOpen(false);
  }

  const accessibleNavItems = navItems.filter(item => 
    item.roles.includes(employeeRole) &&
    (item.page !== 'Restaurant' || appSettings.enableKitchenDisplay) &&
    (item.page !== 'Customers' || appSettings.enableCreditSystem)
  );

  const dashboardItem = accessibleNavItems.find(item => item.page === 'Dashboard');
  const otherNavItems = accessibleNavItems.filter(item => item.page !== 'Dashboard');

  const MAX_VISIBLE_ICONS_MOBILE = 4;
  const visibleItems = accessibleNavItems.slice(0, MAX_VISIBLE_ICONS_MOBILE);
  const hiddenItems = accessibleNavItems.slice(MAX_VISIBLE_ICONS_MOBILE);

  return (
      <nav id="sidebar" className="fixed bottom-0 left-0 z-40 w-full h-20 bg-theme-surface/80 backdrop-blur-xl border-t border-theme-main md:top-0 md:left-0 md:h-screen md:w-24 md:border-t-0 md:border-r-0 transition-all duration-300" aria-label="Sidebar">
        <div className="flex flex-row items-center justify-around h-full md:flex-col md:justify-start md:py-6 md:gap-4">
            
            {/* Logo and Dashboard Combined Container (Desktop) */}
            <div className="hidden md:flex flex-col items-center gap-4 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                <button 
                    onClick={(e) => { e.preventDefault(); handleNavigation('Dashboard'); }} 
                    className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-xl shadow-primary-500/20 hover:scale-105 transition-transform" 
                    title={appSettings.shopName}
                >
                    <Icon name="logo" size={32} className="text-white" />
                </button>
                
                {dashboardItem && (
                    <NavItem
                        page={dashboardItem.page}
                        label={dashboardItem.label}
                        iconName={dashboardItem.iconName}
                        currentPage={currentPage}
                        onNavigate={handleNavigation}
                    />
                )}
            </div>

            <div className="h-px w-12 bg-slate-100 dark:bg-slate-800 hidden md:block my-2" />
            
            <ul className="flex flex-row items-center justify-around w-full md:flex-col md:gap-4">
                 {/* Desktop: Show other items */}
                 {otherNavItems.map((item) => (
                    <li key={item.page} className="hidden md:block">
                        <NavItem
                            page={item.page}
                            label={item.label}
                            iconName={item.iconName}
                            currentPage={currentPage}
                            onNavigate={handleNavigation}
                        />
                    </li>
                 ))}

                 {/* Mobile: Show only visible items */}
                 {visibleItems.map((item) => (
                      <li key={item.page} className="block md:hidden">
                        <NavItem
                            page={item.page}
                            label={item.label}
                            iconName={item.iconName}
                            currentPage={currentPage}
                            onNavigate={handleNavigation}
                            isMobile
                        />
                    </li>
                 ))}
                 
                 {/* Mobile: "More" menu button and panel */}
                 {hiddenItems.length > 0 && (
                      <li className="relative block md:hidden" ref={moreMenuRef}>
                        <button
                            onClick={(e) => { e.preventDefault(); setIsMoreMenuOpen(prev => !prev); }}
                            title="More"
                            className={`group flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${isMoreMenuOpen ? 'bg-theme-main text-primary-500' : 'text-theme-muted hover:bg-theme-main/50'}`}
                        >
                            <Icon name="more" size={24} />
                        </button>
                        <AnimatePresence>
                            {isMoreMenuOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full right-0 mb-4 w-56 bg-theme-surface rounded-3xl shadow-2xl border border-theme-main z-50 overflow-hidden p-2"
                                >
                                    <div className="space-y-1">
                                        {hiddenItems.map(item => (
                                            <button 
                                                key={item.page}
                                                onClick={(e) => { e.preventDefault(); handleNavigation(item.page); }} 
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all ${
                                                    currentPage === item.page 
                                                    ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-500/10' 
                                                    : 'text-theme-muted hover:bg-theme-main'
                                                }`}
                                            >
                                                <Icon name={item.iconName} size={20} />
                                                <span>{item.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                     </li>
                 )}
            </ul>
        </div>
      </nav>
  );
};

export default Sidebar;