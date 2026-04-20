import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import type { Transaction, Product, Customer, EmployeeRole, Batch, PurchaseOrder, ActivityItem, Page, Expense } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import Icon from '../components/Icon';
import { Tooltip } from '../components/Tooltip';


const StatCard: React.FC<{ title: string; value: string; iconName: string; tooltip: string; index: number; color?: string }> = ({ title, value, iconName, tooltip, index, color = 'indigo' }) => (
  <Tooltip content={tooltip} position="bottom">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative bg-theme-surface backdrop-blur-xl p-4 sm:p-6 rounded-2xl md:rounded-[2rem] border border-theme-main shadow-lg shadow-theme-main/5 flex flex-col gap-3 md:gap-4 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden"
    >
      <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-${color}-500/10 text-${color}-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-${color}-500/5`}>
        <Icon name={iconName} size={20} className="md:w-7 md:h-7" />
      </div>
      <div>
        <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.15em] mb-0.5">{title}</p>
        <p className="text-xl md:text-3xl font-black text-theme-main tracking-tighter">{value}</p>
      </div>
      {/* Decorative background element */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 md:w-32 md:h-32 rounded-full bg-${color}-500/5 blur-2xl md:blur-3xl group-hover:bg-${color}-500/10 transition-colors duration-700`} />
    </motion.div>
  </Tooltip>
);

const ProfitSummary: React.FC<{ transactions: Transaction[], expenses: Expense[] }> = ({ transactions, expenses }) => {
    const { totalRevenue, grossProfit, totalExpenses, netProfit } = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentTransactions = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
        const recentExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo);

        const totalRevenue = recentTransactions.reduce((sum, t) => sum + t.total, 0);
        const grossProfit = recentTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);
        const totalExpenses = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = grossProfit - totalExpenses;

        return { totalRevenue, grossProfit, totalExpenses, netProfit };
    }, [transactions, expenses]);

    const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const grossProfitPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfitPercentage = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return (
        <div className="bg-theme-surface text-theme-main p-5 md:p-8 rounded-2xl md:rounded-[2rem] shadow-xl shadow-theme-main/5 flex flex-col justify-between h-full relative overflow-hidden group border border-theme-main">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:bg-primary-500/20 transition-colors duration-700" />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <h2 className="text-base md:text-lg font-bold text-theme-main/90 tracking-tight">30-Day Performance</h2>
                    <div className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-theme-main/10 backdrop-blur-md border border-theme-main text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-theme-muted">
                        Live Stats
                    </div>
                </div>
                
                <div className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-[10px] md:text-xs font-bold text-theme-muted uppercase tracking-wider">Gross Profit</span>
                            <p className="text-2xl md:text-3xl font-black text-theme-main tracking-tighter">{formatCurrency(grossProfit)}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <span className="text-[10px] md:text-xs font-bold text-theme-muted uppercase tracking-wider">Expenses</span>
                            <p className="text-lg md:text-xl font-bold text-rose-500">-{formatCurrency(totalExpenses)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-theme-main relative z-10">
                <div className="flex justify-between items-end mb-4 md:mb-6">
                    <div className="space-y-1">
                        <span className="text-[10px] md:text-xs font-bold text-primary-500 uppercase tracking-wider">Net Profit</span>
                        <p className={`text-3xl md:text-4xl font-black tracking-tighter ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {formatCurrency(netProfit)}
                        </p>
                    </div>
                    <div className={`px-2 py-0.5 md:px-3 md:py-1 rounded-lg text-[10px] md:text-xs font-black ${netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        {netProfitPercentage.toFixed(1)}%
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-theme-muted uppercase tracking-widest">
                            <span>Gross Margin</span>
                            <span>{grossProfitPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-theme-main/10 rounded-full h-1.5 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, grossProfitPercentage)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="bg-primary-500 h-full rounded-full shadow-[0_0_10px_rgba(var(--primary-500-rgb),0.5)]" 
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-theme-muted uppercase tracking-widest">
                            <span>Net Margin</span>
                            <span>{netProfitPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-theme-main/10 rounded-full h-1.5 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, Math.abs(netProfitPercentage))}%` }}
                                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                className={`h-full rounded-full shadow-lg ${netProfitPercentage >= 0 ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-500 shadow-rose-500/30'}`} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuickActions: React.FC<{ onNavigate: (page: Page) => void, onOpenModal: (type: string) => void }> = ({ onNavigate, onOpenModal }) => {
    const actions = [
        { label: 'New Sale', iconName: 'cart', action: () => onNavigate('POS'), color: 'primary' },
        { label: 'Add Product', iconName: 'plus', action: () => { onNavigate('Products'); onOpenModal('add_product'); }, color: 'indigo' },
        { label: 'Receive Stock', iconName: 'receive-stock', action: () => { onNavigate('Purchases'); onOpenModal('add_purchase'); }, color: 'emerald' },
        { label: 'Add Customer', iconName: 'customers', action: () => { onNavigate('Customers'); onOpenModal('add_customer'); }, color: 'amber' },
    ];
    return (
      <div className="bg-theme-surface backdrop-blur-xl p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-theme-main shadow-xl shadow-theme-main/5">
        <h2 className="text-base md:text-lg font-black mb-4 md:mb-6 text-theme-main tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {actions.map(action => (
                <Tooltip key={action.label} content={`Go to ${action.label}`} position="bottom">
                    <button 
                        onClick={action.action} 
                        className="group w-full flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl md:rounded-3xl bg-theme-main/50 hover:bg-theme-surface border border-theme-main hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300"
                    >
                        <div className={`mb-2 md:mb-3 p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-theme-surface shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 text-theme-muted group-hover:text-primary-500`}>
                            <Icon name={action.iconName} size={20} className="md:w-6 md:h-6" />
                        </div>
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-theme-muted group-hover:text-theme-main transition-colors">{action.label}</span>
                    </button>
                </Tooltip>
            ))}
        </div>
      </div>
    );
};

const TopProducts: React.FC<{ transactions: Transaction[], products: Product[] }> = ({ transactions, products }) => {
    const topProducts = useMemo(() => {
        const productSales: { [key: string]: { name: string, quantity: number, revenue: number } } = {};

        transactions.forEach(t => {
            t.items.forEach(item => {
                if ('productId' in item.item) {
                    const variant = item.item;
                    const product = products.find(p => p.id === variant.productId);
                    const key = `${product?.name} (${variant.name})`;
                    if (!productSales[key]) {
                        productSales[key] = { name: key, quantity: 0, revenue: 0 };
                    }
                    productSales[key].quantity += item.quantity;
                    productSales[key].revenue += item.quantity * item.appliedPrice;
                }
            });
        });
        
        return Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }, [transactions, products]);

    return (
        <div className="bg-theme-surface backdrop-blur-xl p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-theme-main shadow-xl shadow-theme-main/5">
            <h2 className="text-base md:text-lg font-black mb-4 md:mb-6 text-theme-main tracking-tight">Top Selling Products</h2>
            {topProducts.length > 0 ? (
                <ul className="space-y-4">
                    {topProducts.map((p, idx) => (
                        <Tooltip key={p.name} content={`Sold ${p.quantity} units`} position="left">
                            <li className="flex justify-between items-center group cursor-default">
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-black text-theme-muted opacity-50 w-4">0{idx + 1}</span>
                                    <span className="text-sm font-bold text-theme-muted group-hover:text-primary-500 transition-colors truncate max-w-[180px]">{p.name}</span>
                                </div>
                                <span className="text-sm font-black text-theme-main">₹{p.revenue.toLocaleString()}</span>
                            </li>
                        </Tooltip>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-theme-muted">
                    <Icon name="cart" size={32} className="opacity-20 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No sales data</p>
                </div>
            )}
        </div>
    );
};

const TopCustomersChart: React.FC<{ transactions: Transaction[], customers: Customer[] }> = ({ transactions, customers }) => {
    const topCustomers = useMemo(() => {
        const customerRevenue: { [id: number]: number } = {};
        transactions.forEach(t => {
            if (t.customer?.id) {
                customerRevenue[t.customer.id] = (customerRevenue[t.customer.id] || 0) + t.total;
            }
        });

        return Object.entries(customerRevenue)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id, revenue]) => {
                const customer = customers.find(c => c.id === Number(id));
                const name = customer ? customer.name.split(' ')[0] : `ID ${id}`;
                return { name, revenue };
            });
    }, [transactions, customers]);
    
    const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

    return (
        <div className="bg-theme-surface backdrop-blur-xl p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-theme-main shadow-xl shadow-theme-main/5">
            <h2 className="text-base md:text-lg font-black mb-4 md:mb-6 text-theme-main tracking-tight">Top Customers</h2>
            {topCustomers.length > 0 ? (
                 <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topCustomers} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} width={80} />
                        <RechartsTooltip 
                            formatter={(value: number) => `₹${value.toLocaleString()}`} 
                            contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '1rem', color: 'var(--text-main)' }}
                            cursor={{fill: 'var(--bg-main)'}}
                        />
                        <Bar dataKey="revenue" fill="var(--primary-500)" barSize={12} radius={[0, 4, 4, 0]}>
                            {topCustomers.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-theme-muted">
                    <Icon name="customers" size={32} className="opacity-20 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No customer data</p>
                </div>
            )}
        </div>
    );
};

function formatRelativeTime(isoTimestamp: string): string {
    const now = new Date();
    const past = new Date(isoTimestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return past.toLocaleDateString();
}

const ActivityFeed: React.FC<{ activities: ActivityItem[], onActivityClick: (activity: ActivityItem) => void }> = ({ activities, onActivityClick }) => {
    const icons: Record<ActivityItem['type'], string> = {
        sale: 'activity-sale',
        new_customer: 'activity-customer',
        low_stock: 'activity-low-stock',
        purchase_received: 'activity-purchase',
    };
    const colors: Record<ActivityItem['type'], string> = {
        sale: 'emerald',
        new_customer: 'blue',
        low_stock: 'amber',
        purchase_received: 'indigo',
    };

    return (
        <div className="bg-theme-surface backdrop-blur-xl p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-theme-main shadow-xl shadow-theme-main/5 h-full">
            <h2 className="text-base md:text-lg font-black mb-4 md:mb-6 text-theme-main tracking-tight">Recent Activity</h2>
            <ul className="space-y-2 max-h-[350px] md:max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {activities.map(activity => (
                    <Tooltip key={activity.id} content={`View details for ${activity.type.replace('_', ' ')}`} position="left">
                        <li 
                            onClick={() => onActivityClick(activity)} 
                            className="group flex items-start gap-4 p-3 rounded-2xl hover:bg-theme-main/50 cursor-pointer transition-all border border-transparent hover:border-theme-main"
                        >
                            <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-${colors[activity.type]}-500/10 text-${colors[activity.type]}-500 group-hover:scale-110 transition-transform duration-500`}>
                                <Icon name={icons[activity.type]} size={18} />
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className="text-sm font-bold text-theme-main/80 group-hover:text-theme-main transition-colors line-clamp-1">{activity.description}</p>
                                <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest mt-0.5">{formatRelativeTime(activity.timestamp)}</p>
                            </div>
                            {activity.value && (
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-black text-theme-main">
                                        {activity.type === 'low_stock' ? activity.value : `₹${activity.value.toLocaleString()}`}
                                    </p>
                                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-tighter">
                                        {activity.type === 'low_stock' ? 'Left' : 'Value'}
                                    </p>
                                </div>
                            )}
                        </li>
                    </Tooltip>
                ))}
                {activities.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-theme-muted">
                        <Icon name="activity-sale" size={40} className="opacity-10 mb-4" />
                        <p className="text-xs font-bold uppercase tracking-[0.2em]">No recent activity</p>
                    </div>
                )}
            </ul>
        </div>
    )
}

const SalesTrendChart: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const salesData = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dailySales = last7Days.map(dateStr => {
            const salesForDay = transactions
                .filter(t => t.date.startsWith(dateStr) && t.status === 'Completed')
                .reduce((sum, t) => sum + t.total, 0);
            return {
                name: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
                sales: salesForDay,
            };
        });
        return dailySales;
    }, [transactions]);

    return (
        <div className="bg-theme-surface backdrop-blur-xl p-5 md:p-8 rounded-2xl md:rounded-[2rem] border border-theme-main shadow-xl shadow-theme-main/5 h-full">
            <h2 className="text-base md:text-lg font-black mb-6 md:mb-8 text-theme-main tracking-tight">Sales Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} stroke="var(--text-muted)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                        formatter={(value: number) => `₹${value.toLocaleString()}`} 
                        contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '1rem', color: 'var(--text-main)' }}
                    />
                    <Line type="monotone" dataKey="sales" stroke="var(--primary-500)" strokeWidth={4} dot={{ r: 4, fill: 'var(--primary-500)', strokeWidth: 2, stroke: 'var(--bg-surface)' }} activeDot={{ r: 6, strokeWidth: 0 }} name="Sales" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};


interface DashboardProps {
    transactions: Transaction[];
    products: Product[];
    customers: Customer[];
    expenses: Expense[];
    batches: Batch[];
    employeeRole: EmployeeRole;
    purchaseOrders: PurchaseOrder[];
    setCurrentPage: (page: Page) => void;
    setModalState: (state: { type: string | null, data: any }) => void;
    onActivityClick: (activity: ActivityItem) => void;
}


const Dashboard: React.FC<DashboardProps> = React.memo(({ transactions, products, customers, expenses, employeeRole, purchaseOrders, setCurrentPage, setModalState, onActivityClick }) => {
  const totalSales = useMemo(() => transactions.reduce((acc, t) => acc + t.total, 0), [transactions]);
  const totalCreditDue = useMemo(() => customers.reduce((acc, c) => (c.creditBalance > 0 ? acc + c.creditBalance : acc), 0), [customers]);
  
  const [now, setNow] = useState(0);
  React.useEffect(() => {
    setNow(Date.now());
  }, []);

  const activityFeedItems = useMemo(() => {
    if (!now) return [];
    const activities: ActivityItem[] = [];

    transactions.slice(-10).forEach(t => {
        activities.push({
            id: `sale-${t.id}`,
            timestamp: t.date,
            type: 'sale',
            description: t.customer ? `Sale to ${t.customer.name}` : 'Walk-in sale',
            value: t.total,
            link: { page: 'POS', context: { transactionId: t.id } }
        });
    });

    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    customers.filter(c => new Date(c.lastActivity) > weekAgo).slice(-5).forEach(c => {
         const customerTransactions = transactions.filter(t => t.customer?.id === c.id);
         if (customerTransactions.length < 3) {
            activities.push({
                id: `new-cust-${c.id}`,
                timestamp: c.lastActivity,
                type: 'new_customer',
                description: `New customer: ${c.name}`,
                link: { page: 'Customers', context: { customerId: c.id } }
            });
         }
    });

    products.forEach(p => {
        p.variants.forEach(v => {
            if (p.minStock && v.stock < p.minStock) {
                activities.push({
                    id: `low-stock-${v.id}`,
                    timestamp: new Date().toISOString(),
                    type: 'low_stock',
                    description: `${p.name} (${v.name}) is low`,
                    value: v.stock,
                    link: { page: 'Products', context: { productId: p.id, variantId: v.id } }
                });
            }
        });
    });

    purchaseOrders.filter(p => p.status === 'Completed').slice(-5).forEach(p => {
        activities.push({
            id: `po-${p.id}`,
            timestamp: p.date,
            type: 'purchase_received',
            description: `PO #${p.id.slice(-6)} received`,
            value: p.totalCost,
            link: { page: 'Purchases', context: { purchaseOrderId: p.id } }
        });
    });

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 15);
  }, [transactions, customers, products, purchaseOrders, now]);

  return (
    <div className="space-y-6 md:space-y-8 p-3 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 md:gap-6">
        <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Dashboard</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Business Overview & Insights</p>
        </div>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <ProfitSummary transactions={transactions} expenses={expenses} />
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-6 auto-rows-fr">
                <StatCard title="Total Sales" value={`₹${totalSales.toLocaleString('en-IN', {maximumFractionDigits: 0})}`} iconName="sales-chart" tooltip="Total revenue from all sales." index={0} color="emerald" />
                <StatCard title="Transactions" value={transactions.length.toString()} iconName="receipt" tooltip="Total number of sales transactions." index={1} color="indigo" />
                {employeeRole === 'Admin' && (
                <>
                    <StatCard title="Credit Due" value={`₹${totalCreditDue.toLocaleString('en-IN', {maximumFractionDigits: 0})}`} iconName="credit-card" tooltip="Total outstanding credit balance." index={2} color="rose" />
                    <StatCard title="Customers" value={customers.length.toString()} iconName="customers" tooltip="Total number of customers." index={3} color="amber" />
                </>
                )}
            </div>
        </div>
      
      <QuickActions onNavigate={setCurrentPage} onOpenModal={(type) => setModalState({ type, data: null })} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
            <SalesTrendChart transactions={transactions} />
        </div>
        <div className="lg:col-span-2">
            <ActivityFeed activities={activityFeedItems} onActivityClick={onActivityClick} />
        </div>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopProducts transactions={transactions} products={products} />
            <TopCustomersChart transactions={transactions} customers={customers} />
      </div>
    </div>
  );
});

export default Dashboard;