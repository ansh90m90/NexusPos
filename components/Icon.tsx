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
  Store,
  Wallet,
  Globe,
  HelpCircle,
  Camera,
  Upload,
  Loader2,
  Check,
  Star,
  User
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
  | 'activity-purchase' | 'access-denied' | 'ai-sparkle' | 'ai' | 'send' | 'link-external'
  | 'cash' | 'online' | 'credit' | 'camera' | 'upload' | 'spinner' | 'check' | 'star' | 'user' | 'user-plus';

interface IconProps {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}

const iconMap: Record<IconName, React.ElementType> = {
  logo: Zap,
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
  'ai-sparkle': Sparkles,
  ai: Sparkles,
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
