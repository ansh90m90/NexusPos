import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import type { Transaction, Product, Customer, EmployeeRole, Batch, AppSettings, PurchaseOrder, ActivityItem, Page, Expense } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import Icon from '../components/Icon';
import { Tooltip } from '../components/Tooltip';


const StatCard: React.FC<{ title: string; value: string; iconName: string; tooltip: string; index: number }> = ({ title, value, iconName, tooltip, index }) => (
  <Tooltip content={tooltip} position="bottom">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 p-3 rounded-full">
        <Icon name={iconName} className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </motion.div>
  </Tooltip>
);

const ProfitSummary: React.FC<{ transactions: Transaction[], expenses: Expense[] }> = ({ transactions, expenses }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { totalRevenue, grossProfit, totalExpenses, netProfit } = useMemo(() => {
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
        <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full">
            <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">30-Day Profit Summary</h2>
                <div className="mt-4 space-y-3">
                    <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Gross Profit</span>
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(grossProfit)}</span>
                    </div>
                     <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Expenses</span>
                        <span className="text-lg font-semibold text-red-500">-{formatCurrency(totalExpenses)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-baseline">
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">Net Profit</span>
                    <span className={`text-3xl font-extrabold ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(netProfit)}</span>
                </div>
                <div className="mt-3 space-y-2">
                    <Tooltip content={`Gross Profit: ${grossProfitPercentage.toFixed(1)}% of Revenue`} position="bottom">
                        <div>
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1"><span>Gross Margin</span><span>{grossProfitPercentage.toFixed(1)}%</span></div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, grossProfitPercentage)}%` }}></div></div>
                        </div>
                    </Tooltip>
                    <Tooltip content={`Net Profit: ${netProfitPercentage.toFixed(1)}% of Revenue`} position="bottom">
                        <div>
                             <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1"><span>Net Margin</span><span>{netProfitPercentage.toFixed(1)}%</span></div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full ${netProfitPercentage >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, Math.abs(netProfitPercentage))}%` }}></div></div>
                        </div>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

const QuickActions: React.FC<{ onNavigate: (page: Page) => void, onOpenModal: (type: string) => void }> = ({ onNavigate, onOpenModal }) => {
    const actions = [
        { label: 'New Sale', iconName: 'cart', action: () => onNavigate('POS') },
        { label: 'Add Product', iconName: 'plus', action: () => { onNavigate('Products'); onOpenModal('add_product'); } },
        { label: 'Receive Stock', iconName: 'receive-stock', action: () => { onNavigate('Purchases'); onOpenModal('add_purchase'); } },
        { label: 'Add Customer', iconName: 'customers', action: () => { onNavigate('Customers'); onOpenModal('add_customer'); } },
    ];
    return (
      <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-base font-semibold mb-3 text-slate-900 dark:text-white">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {actions.map(action => (
                <Tooltip key={action.label} content={`Go to ${action.label}`} position="bottom">
                    <button onClick={action.action} className="w-full flex flex-col items-center justify-center p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        <div className="mb-1"><Icon name={action.iconName} className="w-5 h-5" /></div>
                        <span className="text-xs font-semibold">{action.label}</span>
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
        <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-semibold mb-3 text-slate-900 dark:text-white">Top Selling Products</h2>
            {topProducts.length > 0 ? (
                <ul className="space-y-3">
                    {topProducts.map(p => (
                        <Tooltip key={p.name} content={`Sold ${p.quantity} units`} position="left">
                            <li className="flex justify-between items-center text-sm cursor-default">
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-4">{p.name}</span>
                                <span className="font-semibold text-slate-900 dark:text-white">₹{p.revenue.toFixed(2)}</span>
                            </li>
                        </Tooltip>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-slate-500 text-center py-8">No sales data available.</p>
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
    
    const COLORS = ['#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'];

    return (
        <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-semibold mb-3 text-slate-900 dark:text-white">Top Customers by Revenue</h2>
            {topCustomers.length > 0 ? (
                 <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={topCustomers} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} width={80} />
                        <RechartsTooltip formatter={(value: number) => `₹${value.toFixed(2)}`} cursor={{fill: 'rgba(20, 184, 166, 0.1)'}}/>
                        <Bar dataKey="revenue" fill="#14b8a6" barSize={20} radius={[0, 4, 4, 0]}>
                            {topCustomers.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-sm text-slate-500 text-center py-8">No customer sales data available.</p>
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
    const colors: Record<ActivityItem['type'], { bg: string, text: string }> = {
        sale: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-600 dark:text-green-400' },
        new_customer: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-600 dark:text-blue-400' },
        low_stock: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-600 dark:text-yellow-400' },
        purchase_received: { bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-600 dark:text-indigo-400' },
    };

    return (
        <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-semibold mb-3 text-slate-900 dark:text-white">Recent Activity</h2>
            <ul className="space-y-1 max-h-96 overflow-y-auto">
                {activities.map(activity => (
                    <Tooltip key={activity.id} content={`View details for ${activity.type.replace('_', ' ')}`} position="left">
                        <li onClick={() => onActivityClick(activity)} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${colors[activity.type].bg} ${colors[activity.type].text}`}>
                                <Icon name={icons[activity.type]} className="w-4 h-4" />
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm text-slate-800 dark:text-slate-200">{activity.description}</p>
                                <p className="text-xs text-slate-500">{formatRelativeTime(activity.timestamp)}</p>
                            </div>
                            {activity.value && <span className="text-sm font-semibold">{activity.type === 'low_stock' ? `${activity.value} left` : `₹${activity.value.toFixed(2)}`}</span>}
                        </li>
                    </Tooltip>
                ))}
                {activities.length === 0 && <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-8">No recent activity.</p>}
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
        <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-semibold mb-3 text-slate-900 dark:text-white">Sales Trend (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#14b8a6" strokeWidth={2} name="Sales (₹)" />
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
    appSettings: AppSettings;
    employeeRole: EmployeeRole;
    purchaseOrders: PurchaseOrder[];
    setCurrentPage: (page: Page) => void;
    setModalState: (state: { type: string | null, data: any }) => void;
    onActivityClick: (activity: ActivityItem) => void;
}


const Dashboard: React.FC<DashboardProps> = React.memo(({ transactions, products, customers, expenses, appSettings, employeeRole, purchaseOrders, setCurrentPage, setModalState, onActivityClick }) => {
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      </div>
      
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
                <ProfitSummary transactions={transactions} expenses={expenses} />
            </div>
            <div className={`md:col-span-2 grid grid-cols-2 gap-4 ${employeeRole !== 'Admin' ? 'grid-rows-1' : 'grid-rows-2'}`}>
                <StatCard title="Total Sales (All Time)" value={`₹${totalSales.toLocaleString('en-IN', {maximumFractionDigits: 0})}`} iconName="sales-chart" tooltip="Total revenue from all sales." index={0} />
                <StatCard title="Transactions (All Time)" value={transactions.length.toString()} iconName="receipt" tooltip="Total number of sales transactions." index={1} />
                {employeeRole === 'Admin' && (
                <>
                    <StatCard title="Credit Due" value={`₹${totalCreditDue.toLocaleString('en-IN', {maximumFractionDigits: 0})}`} iconName="credit-card" tooltip="Total outstanding credit balance across all customers." index={2} />
                    <StatCard title="Customers" value={customers.length.toString()} iconName="customers" tooltip="Total number of customers in the system." index={3} />
                </>
                )}
            </div>
        </div>
      
      <QuickActions onNavigate={setCurrentPage} onOpenModal={(type) => setModalState({ type, data: null })} />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
            <SalesTrendChart transactions={transactions} />
        </div>
        <div className="md:col-span-2">
            <ActivityFeed activities={activityFeedItems} onActivityClick={onActivityClick} />
        </div>
      </div>
      
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TopProducts transactions={transactions} products={products} />
            <TopCustomersChart transactions={transactions} customers={customers} />
      </div>
    </div>
  );
});

export default Dashboard;