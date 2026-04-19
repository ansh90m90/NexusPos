import React from 'react';
import { 
  LayoutDashboard, 
  MonitorDot, 
  Package, 
  Utensils, 
  Truck, 
  Users, 
  Building2, 
  BarChart3, 
  Receipt, 
  Zap, 
  PieChart, 
  Settings, 
  MoreHorizontal, 
  ArrowRight, 
  ArrowLeft, 
  Moon, 
  Sun, 
  Plus, 
  ShoppingCart, 
  Trash2, 
  Search, 
  Bell, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Edit3, 
  Barcode, 
  Pause, 
  Layers, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  WifiOff, 
  RotateCcw, 
  TrendingUp, 
  FileText, 
  CreditCard, 
  Download, 
  DollarSign, 
  UserPlus, 
  AlertTriangle, 
  CloudDownload, 
  ShieldAlert, 
  Sparkles, 
  Send, 
  ExternalLink,
  Wallet,
  Globe,
  HelpCircle,
  Camera,
  Upload,
  Loader2,
  Check,
  Star,
  User,
  Hexagon
} from 'lucide-react';

export type IconName = 
  | 'logo' | 'dashboard' | 'pos' | 'products' | 'restaurant' | 'purchases' 
  | 'customers' | 'suppliers' | 'reports' | 'expenses' | 'strategy' 
  | 'marketing' | 'settings' | 'more' | 'arrow-right' | 'arrow-left' 
  | 'moon' | 'sun' | 'plus' | 'cart' | 'remove' | 'delete' | 'search' 
  | 'bell' | 'close' | 'chevron-up' | 'chevron-down' | 'edit' | 'barcode' 
  | 'hold-order' | 'categories' | 'sync-check' | 'sync-spin' | 'sync-error' 
  | 'sync-offline' | 'sync-reload' | 'sales-chart' | 'receipt' | 'credit-card' 
  | 'receive-stock' | 'activity-sale' | 'activity-customer' | 'activity-low-stock' 
  | 'activity-purchase' | 'access-denied' | 'send' | 'link-external'
  | 'cash' | 'online' | 'credit' | 'camera' | 'upload' | 'spinner' | 'check' | 'star' | 'user' | 'user-plus' | 'zap';

interface IconProps {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}

const CustomLogo = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={props.strokeWidth || 2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    {...props}
  >
    {/* Stylish geometric N */}
    <path 
      d="M6 19V5" 
      className="text-primary-500"
      strokeWidth={4.5}
    />
    <path 
      d="M6 5L18 19" 
      className="text-primary-600"
      strokeWidth={4.5}
    />
    <path 
      d="M18 19V5" 
      className="text-primary-500"
      strokeWidth={4.5}
    />
    <rect x="4" y="4" width="2" height="2" className="text-primary-300" fill="currentColor" rx="0.5" />
    <rect x="18" y="18" width="2" height="2" className="text-primary-300" fill="currentColor" rx="0.5" />
  </svg>
);

const iconMap: Record<IconName, React.ElementType> = {
  logo: CustomLogo,
  dashboard: LayoutDashboard,
  pos: MonitorDot,
  products: Package,
  restaurant: Utensils,
  purchases: Truck,
  customers: Users,
  suppliers: Building2,
  reports: BarChart3,
  expenses: Receipt,
  strategy: Zap,
  marketing: PieChart,
  settings: Settings,
  more: MoreHorizontal,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  moon: Moon,
  sun: Sun,
  plus: Plus,
  cart: ShoppingCart,
  remove: Trash2,
  delete: Trash2,
  search: Search,
  bell: Bell,
  close: X,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  edit: Edit3,
  barcode: Barcode,
  'hold-order': Pause,
  categories: Layers,
  'sync-check': CheckCircle2,
  'sync-spin': RefreshCw,
  'sync-error': AlertCircle,
  'sync-offline': WifiOff,
  'sync-reload': RotateCcw,
  'sales-chart': TrendingUp,
  receipt: FileText,
  'credit-card': CreditCard,
  'receive-stock': Download,
  'activity-sale': DollarSign,
  'activity-customer': UserPlus,
  'activity-low-stock': AlertTriangle,
  'activity-purchase': CloudDownload,
  'access-denied': ShieldAlert,
  send: Send,
  'link-external': ExternalLink,
  cash: DollarSign,
  online: Globe,
  credit: Wallet,
  camera: Camera,
  upload: Upload,
  spinner: Loader2,
  check: Check,
  star: Star,
  user: User,
  'user-plus': UserPlus,
  zap: Zap,
};

const Icon: React.FC<IconProps> = ({ name, className = "w-6 h-6", strokeWidth = 1.5 }) => {
  const LucideIcon = iconMap[name] || HelpCircle;
  
  return (
    <LucideIcon 
      className={className} 
      strokeWidth={strokeWidth}
    />
  );
};

export default Icon;
