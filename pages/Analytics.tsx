
import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, Cell, LineChart, Line, CartesianGrid, PieChart, Pie } from 'recharts';
import type { Product, Transaction, Dish, Customer, Expense, AccountState } from '../types';
import { Tooltip } from '../components/Tooltip';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#6366f1'];
type DateRange = 'today' | '7d' | '30d' | 'all';

// #region Helper Components
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const formatText = (inputText: string) => {
    let html = inputText
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/### (.*?)(?:\n|$)/g, '<h3 class="text-lg font-semibold my-2">$1</h3>')
      .replace(/[\r\n]+/g, '\n');

    const listRegex = /(^\* .+$)/gm;
    html = html.replace(listRegex, (match) => {
        return '<ul>' + match.replace(/^\* (.*)$/gm, '<li class="ml-5 list-disc">$1</li>') + '</ul>';
    });
    html = html.replace(/<\/ul>\n<ul>/g, '');
    
    return html.replace(/\n/g, '<br />');
  };

  return <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formatText(text) }} />;
};

const ReportCard: React.FC<{title: string, children: React.ReactNode, className?: string}> = ({title, children, className}) => (
    <div className={`bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 ${className}`}>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
        {children}
    </div>
);

const Stat: React.FC<{ label: string, value: string }> = ({ label, value }) => (
    <div className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
);


const SkeletonLoader: React.FC = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
        <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
        </div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mt-4"></div>
         <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
             <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
        </div>
    </div>
);

const DateRangePicker: React.FC<{ value: DateRange, onChange: (value: DateRange) => void }> = ({ value, onChange }) => {
    const ranges: { id: DateRange, label: string }[] = [
        { id: 'today', label: 'Today' },
        { id: '7d', label: 'Last 7 Days' },
        { id: '30d', label: 'Last 30 Days' },
        { id: 'all', label: 'All Time' },
    ];
    return (
        <div className="flex items-center bg-white dark:bg-slate-800/50 rounded-lg shadow-sm p-1 border border-slate-200 dark:border-slate-800 self-start">
            {ranges.map(range => (
                <Tooltip key={range.id} content={`View data for ${range.label.toLowerCase()}`} position="bottom">
                    <button 
                        onClick={() => onChange(range.id)} 
                        className={`px-3 py-1 text-sm font-semibold rounded-md flex-1 transition-colors ${value === range.id ? 'bg-primary-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                        {range.label}
                    </button>
                </Tooltip>
            ))}
        </div>
    );
};
// #endregion

// #region Chart Components
const SalesOverTimeChart: React.FC<{ transactions: Transaction[], dateRange: DateRange }> = ({ transactions, dateRange }) => {
    const data = useMemo(() => {
        const formatters: { [key in DateRange]: { group: (d: Date) => string, label: (d: Date) => string } } = {
            today: {
                group: (d) => d.getHours().toString().padStart(2, '0') + ':00',
                label: (d) => d.toLocaleTimeString([], { hour: '2-digit' })
            },
            '7d': {
                group: (d) => d.toISOString().split('T')[0],
                label: (d) => d.toLocaleDateString('en-US', { weekday: 'short' })
            },
            '30d': {
                group: (d) => d.toISOString().split('T')[0],
                label: (d) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
            },
            all: {
                group: (d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`,
                label: (d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            }
        };

        const salesByPeriod: { [key: string]: { name: string, sales: number, date: Date } } = {};
        transactions.forEach(t => {
            const date = new Date(t.date);
            const key = formatters[dateRange].group(date);
            if (!salesByPeriod[key]) {
                salesByPeriod[key] = { name: formatters[dateRange].label(date), sales: 0, date: date };
            }
            salesByPeriod[key].sales += t.total;
        });

        return Object.values(salesByPeriod).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [transactions, dateRange]);

    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name="Sales" />
            </LineChart>
        </ResponsiveContainer>
    );
};

const TopItemsChart: React.FC<{ transactions: Transaction[], products: Product[] }> = ({ transactions, products }) => {
    const topItems = useMemo(() => {
        const itemSales: { [key: string]: { name: string, revenue: number } } = {};
        transactions.forEach(t => {
            t.items.forEach(cartItem => {
                const item = cartItem.item;
                let name = 'Unknown';
                if ('productId' in item) {
                    const product = products.find(p => p.id === item.productId);
                    name = product ? `${product.name} (${item.name})` : item.name;
                } else {
                    name = item.name;
                }
                if (!itemSales[name]) itemSales[name] = { name, revenue: 0 };
                itemSales[name].revenue += cartItem.appliedPrice * cartItem.quantity;
            });
        });
        return Object.values(itemSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }, [transactions, products]);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topItems} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <RechartsTooltip formatter={(value: number) => `₹${value.toFixed(2)}`} cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }} />
                <Bar dataKey="revenue" barSize={20}>
                    {topItems.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

const CategoryPerformanceChart: React.FC<{ transactions: Transaction[], products: Product[] }> = ({ transactions, products }) => {
    const categoryData = useMemo(() => {
        const salesByCategory: { [key: string]: number } = {};
        transactions.forEach(t => {
            t.items.forEach(cartItem => {
                const item = cartItem.item;
                if ('productId' in item) {
                    const product = products.find(p => p.id === item.productId);
                    const category = product?.subCategory || 'Uncategorized';
                    salesByCategory[category] = (salesByCategory[category] || 0) + (cartItem.appliedPrice * cartItem.quantity);
                }
            });
        });
        return Object.entries(salesByCategory).map(([name, value]) => ({ name, value }));
    }, [transactions, products]);

    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

const PaymentMethodsChart: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const paymentData = useMemo(() => {
        const salesByMethod: { [key: string]: number } = {};
        transactions.forEach(t => {
            t.payments.forEach(p => {
                salesByMethod[p.method] = (salesByMethod[p.method] || 0) + p.amount;
            });
        });
        return Object.entries(salesByMethod).map(([name, value]) => ({ name, value }));
    }, [transactions]);
    
    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                     {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};
// #endregion

const Reports: React.FC<{ accountState: AccountState }> = ({ accountState }) => {
  const { products, transactions, expenses } = accountState;
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  const { filteredTransactions, filteredExpenses } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate: Date;
    switch(dateRange) {
        case 'today': startDate = today; break;
        case '7d': startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000); break;
        case '30d': startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000); break;
        default: startDate = new Date(0);
    }
    
    return {
        filteredTransactions: transactions.filter(t => new Date(t.date) >= startDate),
        filteredExpenses: expenses.filter(e => new Date(e.date) >= startDate),
    }
  }, [transactions, expenses, dateRange]);
  
  const kpis = useMemo(() => {
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const grossProfit = filteredTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const transactionCount = filteredTransactions.length;
    const avgTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
    
    return { totalRevenue, grossProfit, totalExpenses, netProfit, transactionCount, avgTransactionValue };
  }, [filteredTransactions, filteredExpenses]);

  return (
    <div className="space-y-4">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Reports</h1>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
       </div>
      
       <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Total Revenue" value={`₹${kpis.totalRevenue.toLocaleString('en-IN', {maximumFractionDigits: 0})}`} />
            <Stat label="Gross Profit" value={`₹${kpis.grossProfit.toLocaleString('en-IN', {maximumFractionDigits: 0})}`} />
            <Stat label="Expenses" value={`₹${kpis.totalExpenses.toLocaleString('en-IN', {maximumFractionDigits: 0})}`} />
            <Stat label="Net Profit" value={`₹${kpis.netProfit.toLocaleString('en-IN', {maximumFractionDigits: 0})}`} />
            <Stat label="Transactions" value={kpis.transactionCount.toLocaleString('en-IN')} />
       </div>

        <ReportCard title="Sales Over Time">
            <SalesOverTimeChart transactions={filteredTransactions} dateRange={dateRange} />
        </ReportCard>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ReportCard title="Top Selling Items">
              <TopItemsChart transactions={filteredTransactions} products={products} />
            </ReportCard>
            <ReportCard title="Revenue by Category">
              <CategoryPerformanceChart transactions={filteredTransactions} products={products} />
            </ReportCard>
            <ReportCard title="Payment Methods" className="lg:col-span-2">
                <PaymentMethodsChart transactions={filteredTransactions} />
            </ReportCard>
        </div>
    </div>
  );
};

export default Reports;
