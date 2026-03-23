import React, { useState, useRef, useEffect } from 'react';
import type { Page, EmployeeRole, AppSettings } from '../types';
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
}> = ({ page, label, iconName, currentPage, onNavigate }) => {
    const isActive = currentPage === page;
    return (
        <Tooltip content={`Navigate to ${label}`} position="right">
            <a
                data-tutorial-id={`nav-${page}`}
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    onNavigate(page);
                }}
                className={`group relative flex items-center justify-center p-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 ${
                    isActive ? 'bg-primary-100 dark:bg-slate-800 text-primary-600 dark:text-primary-400' : ''
                }`}
            >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary-500 rounded-r-full hidden md:block"></div>}
                <Icon name={iconName} className="w-6 h-6" />
            </a>
        </Tooltip>
    )
};

export const navItems: { page: Page; label: string; roles: EmployeeRole[]; iconName: string }[] = [
  { page: 'Dashboard', label: 'Dashboard', roles: ['Admin', 'Cashier'], iconName: 'dashboard' },
  { page: 'POS', label: 'POS', roles: ['Admin', 'Cashier'], iconName: 'pos' },
  { page: 'Products', label: 'Products', roles: ['Admin'], iconName: 'products' },
  { page: 'Customers', label: 'Customers', roles: ['Admin', 'Cashier'], iconName: 'customers' },
  { page: 'Restaurant', label: 'Restaurant', roles: ['Admin'], iconName: 'restaurant' },
  { page: 'Purchases', label: 'Purchases', roles: ['Admin'], iconName: 'purchases' },
  { page: 'Suppliers', label: 'Suppliers', roles: ['Admin'], iconName: 'suppliers' },
  { page: 'Expenses', label: 'Expenses', roles: ['Admin'], iconName: 'expenses' },
  { page: 'Reports', label: 'Reports', roles: ['Admin'], iconName: 'reports' },
  { page: 'Settings', label: 'Settings', roles: ['Admin', 'Cashier'], iconName: 'settings' },
];

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

  const MAX_VISIBLE_ICONS_MOBILE = 4;
  const visibleItems = accessibleNavItems.slice(0, MAX_VISIBLE_ICONS_MOBILE);
  const hiddenItems = accessibleNavItems.slice(MAX_VISIBLE_ICONS_MOBILE);

  return (
      <nav id="sidebar" className="fixed bottom-0 left-0 z-40 w-full h-16 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 md:top-0 md:left-0 md:h-screen md:w-20 md:border-t-0 md:border-r transition-all duration-300" aria-label="Sidebar">
        <div className="flex flex-row items-center justify-around h-full md:flex-col md:justify-start md:py-4 md:gap-2">
            <a href="#" onClick={(e) => { e.preventDefault(); handleNavigation('Dashboard'); }} className="hidden md:block p-2 mb-4" title={appSettings.shopName}>
               <Icon name="logo" className="h-9 w-9 text-primary-500" />
            </a>
            <ul className="flex flex-row items-center justify-around w-full md:flex-col md:space-y-2">
                 {/* Desktop: Show all items */}
                 {accessibleNavItems.map((item) => (
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
                        />
                    </li>
                 ))}
                 
                 {/* Mobile: "More" menu button and panel */}
                 {hiddenItems.length > 0 && (
                     <li className="relative block md:hidden" ref={moreMenuRef}>
                        <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); setIsMoreMenuOpen(prev => !prev); }}
                            title="More"
                            className={`group flex items-center justify-center p-3 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all duration-200 ${isMoreMenuOpen ? 'bg-slate-200/60 dark:bg-slate-800' : ''}`}
                        >
                            <Icon name="more" className="w-6 h-6" />
                        </a>
                        {isMoreMenuOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 z-50">
                                <ul>
                                    {hiddenItems.map(item => (
                                        <li key={item.page}>
                                            <a href="#" onClick={(e) => { e.preventDefault(); handleNavigation(item.page); }} className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors ${currentPage === item.page ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/40 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                                <Icon name={item.iconName} className="w-5 h-5" />
                                                <span>{item.label}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                     </li>
                 )}
            </ul>
        </div>
      </nav>
  );
};

export default Sidebar;