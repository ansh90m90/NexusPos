import { createContext } from 'react';

export type Page = 'Dashboard' | 'POS' | 'Products' | 'Restaurant' | 'Purchases' | 'Customers' | 'Suppliers' | 'Reports' | 'Settings' | 'MyAccount' | 'Expenses' | 'Marketing';
export type EmployeeRole = 'Admin' | 'Cashier';
export type ProductsPageTab = 'store' | 'rashan';
export type RestaurantPageTab = 'dishes' | 'materials' | 'kds';
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';
export type ShopType = 'Retail' | 'Restaurant' | 'Rashan';
export type UiScale = 'small' | 'medium' | 'large';

// Promotion related types
export type PromotionType = 'PERCENTAGE_OFF' | 'FIXED_AMOUNT_OFF';
export type PromotionConditionTarget = 'ENTIRE_CART' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_CATEGORIES';

export interface Promotion {
    id: string;
    name: string;
    type: PromotionType;
    value: number; // percentage or fixed amount
    isActive: boolean;
    conditions: {
        minPurchase?: number;
        appliesTo: PromotionConditionTarget;
        applicableIds?: (number | string)[]; // product variant IDs or category names (subCategory)
    };
    createdAt: string;
    updatedAt: string;
    isDeleted?: boolean;
}

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: EmployeeRole;
    accountId: string;
    createdAt: string;
    updatedAt: string;
    isDeleted?: boolean;
}

export type Theme = 'light' | 'dim' | 'dark' | 'black' | 'luxury' | 'neon';
export type AccentColor = 'primary' | 'emerald' | 'indigo' | 'rose' | 'amber' | 'violet';

export interface ThemeContextType {
  theme: Theme;
  accentColor: AccentColor;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAccentColor: (color: AccentColor) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  accentColor: 'primary',
  setTheme: () => {},
  toggleTheme: () => {},
  setAccentColor: () => {},
});

export interface AppSettings {
  shopTypes: ShopType[];
  masterEnabled: boolean;
  shopName: string;
  upiId: string;
  showReceiptAfterSale: boolean;
  enableKitchenDisplay: boolean;
  enableRashanCategory: boolean;
  enableAdvancedInventory: boolean;
  enableStaffManagement: boolean;
  enableCreditSystem: boolean;
  enableWholesale: boolean;
  enableBarcodeScanner: boolean;
  enableQrScanner: boolean;
  receiptFooter: string;
  defaultGstRate: number;
  loyaltyPointsPerRupee: number;
  tutorialCompleted?: boolean;
  pinnedCustomerIds?: number[];
}

export interface AppNotification {
    id: string;
    type: 'low_stock' | 'expiring' | 'info';
    message: string;
    link?: { page: Page, context?: any };
    timestamp: string; // ISO String
    isRead: boolean;
}

export interface ActivityItem {
  id: string;
  timestamp: string; // ISO string
  type: 'sale' | 'new_customer' | 'low_stock' | 'purchase_received';
  description: string;
  value?: number; // e.g., sale amount, payment amount
  link?: { page: Page, context?: any };
}


export interface Batch {
    id: string;
    variantId: number;
    batchNumber?: string;
    expiryDate?: string; // ISO String
    quantity: number;
    receivedDate: string; // ISO String
    netPurchasePrice: number; // The actual net price paid for this batch unit
}

export interface ProductVariant {
  id: number;
  productId: number; 
  name: string; 
  mrp: number; 
  wholesalePrice?: number;
  // This is the *average* net purchase price across all batches. Specific cost is in the batch.
  netPurchasePrice: number;
  stock: number; // Total stock, calculated from batches if advanced inventory is on
  sku: string;
  unit?: 'kg' | 'g' | 'l' | 'ml' | 'pcs';
  rate?: number; // Price before tax (for reference)
  gstRate?: number; // GST percentage (for reference)
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface Product {
  id: number;
  name: string;
  category: 'General' | 'Rashan';
  subCategory?: string;
  supplier: string;
  hsnCode?: string;
  variants: ProductVariant[];
  minStock?: number;
  pricingType?: 'fixed' | 'per_unit';
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface RawMaterial {
  id: number;
  name:string;
  stock: number;
  unit: 'g' | 'ml' | 'pcs';
  purchasePrice: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface Ingredient {
  id: number;
  name: string;
  quantity: number;
}

export interface Dish {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  ingredients: Ingredient[];
  costOverhead?: number; // For non-ingredient costs like gas, electricity
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface LedgerEntry {
    id: number;
    date: string;
    details: string;
    amount: number;
    type: 'debit' | 'credit';
    transactionId?: string;
    lastPaymentDate?: string;
}

export interface Reward {
    id: number;
    name: string;
    pointsRequired: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  creditBalance: number;
  creditLedger: LedgerEntry[];
  enableSms: boolean;
  lastActivity: string;
  tier: 'Retail' | 'Wholesale';
  salesData?: {
      totalSpent: number;
      visitCount: number;
      avgPurchase: number;
      lastVisit: string;
  };
  loyaltyPoints?: number;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface Supplier {
    id: number;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    upiId?: string;
    creditBalance: number;
    creditLedger: LedgerEntry[];
    createdAt: string;
    updatedAt: string;
    isDeleted?: boolean;
}

export interface CartItem {
  item: ProductVariant | Dish;
  quantity: number;
  appliedPrice: number;
}

export interface HeldCart {
    id: string;
    name: string;
    cart: CartItem[];
    customer?: Customer;
    date: string;
}

export type PaymentMethod = 'Cash' | 'Credit' | 'Online';

export interface Payment {
    method: PaymentMethod;
    amount: number;
}

export interface Transaction {
    id: string;
    date: string;
    items: CartItem[];
    subtotal: number;
    extraCharges?: { description: string, amount: number }[];
    discount?: {
        promotionId: string;
        promotionName: string;
        amount: number;
    };
    total: number;
    profit?: number;
    payments: Payment[];
    customer?: Customer;
    status: 'Completed' | 'Open' | 'Cancelled';
}

export interface KitchenOrder {
    id: string;
    orderNumber: string;
    items: { dish: Dish, quantity: number }[];
    status: 'Pending' | 'Completed';
    timestamp: string;
}

export interface PurchaseOrderItem {
    variantId: number;
    productName: string;
    quantity: number;
    hsnCode?: string;
    isNew?: boolean;
    category?: 'General' | 'Rashan';
    subCategory?: string;
    mrp?: number;
    rate: number; // per unit, pre-tax
    gstRate: number; // percentage
    netRate: number; // per unit, post-tax
}

export interface PurchaseOrder {
    id: string;
    date: string;
    supplierId: number;
    items: PurchaseOrderItem[];
    totalCost: number;
    extraCharges?: { description: string, amount: number }[];
    invoiceNumber?: string;
    status: 'Pending' | 'Ordered' | 'Completed' | 'Draft';
}

export interface Expense {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    attachment?: {
        data: string; // Base64 encoded string
        mimeType: string;
    };
    createdAt: string;
    updatedAt: string;
    isDeleted?: boolean;
}

// Account System Types
export interface BusinessInfo {
  id: string;
  name: string;
}

export interface Operation {
    id?: number; // Server-assigned ID
    type: string;
    payload: any;
    clientId: string; // Unique ID for the client instance
    timestamp: number; // Client-side timestamp
}

export type ItemType = 'Product' | 'Customer' | 'Supplier' | 'Dish' | 'RawMaterial' | 'User' | 'Promotion' | 'Sale' | 'Purchase' | 'Expense' | 'Settings';
export type ActionType = 'create' | 'update' | 'delete' | 'restore';

export interface HistoryLog {
    id: string;
    timestamp: string;
    user: string;
    action: ActionType;
    itemType: ItemType;
    itemName: string;
    itemId: number | string;
    details?: string;
}

export type StockAdjustmentReason = 'Damaged' | 'Internal Consumption' | 'Correction' | 'Other';

export interface StockAdjustment {
    id: string;
    timestamp: string;
    user: string;
    variantId: number;
    productName: string;
    quantityChange: number; // Can be positive or negative
    reason: StockAdjustmentReason;
    notes?: string;
}

export interface AccountState {
  id: string;
  name: string;
  isTest?: boolean;
  users: (User & { password?: string })[];
  products: Product[];
  dishes: Dish[];
  rawMaterials: RawMaterial[];
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  purchaseOrders: PurchaseOrder[];
  kitchenOrders: KitchenOrder[];
  batches: Batch[];
  notifications: AppNotification[];
  appSettings: AppSettings;
  rewards: Reward[];
  promotions: Promotion[];
  allocatedRawMaterials: Record<number, number>; // Maps raw material ID to allocated quantity
  lastSyncId: number; // ID of the last operation synced from the server
  history: HistoryLog[];
  stockAdjustments: StockAdjustment[];
  expenses: Expense[];
  heldCarts: HeldCart[];
}