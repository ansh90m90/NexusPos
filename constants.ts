import { Page, EmployeeRole } from './types';

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
