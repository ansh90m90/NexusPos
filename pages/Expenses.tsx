import React, { useState, useMemo, useCallback } from 'react';
import type { Expense } from '../types';
import SlideOverPanel from '../components/SlideOverPanel';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';
import { Tooltip } from '../components/Tooltip';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#6366f1', '#f59e0b', '#ef4444'];

const ExpensePanel: React.FC<{
    expense: Partial<Expense> | null;
    onClose: () => void;
    onSave: (expenseData: Partial<Expense>) => void;
}> = ({ expense, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        date: expense?.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
        description: expense?.description || '',
        category: expense?.category || 'Utilities',
        amount: expense?.amount || 0,
        frequency: expense?.frequency || 'one-time',
        isRecurring: expense?.isRecurring || false,
    });
    const [attachment, setAttachment] = useState<Expense['attachment'] | null>(expense?.attachment || null);
    const isEditing = !!expense?.id;

    const toast = useToast();
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.size < 5 * 1024 * 1024) { // 5MB limit
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                const base64Data = result.split(',')[1];
                setAttachment({ data: base64Data, mimeType: file.type });
            };
            reader.readAsDataURL(file);
        } else if (file) {
            toast.showToast('File is too large. Please select a file smaller than 5MB.', 'error');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: expense?.id, ...formData, attachment: attachment || undefined });
    };

    const categories = ['Rent', 'Salaries', 'Utilities', 'Supplies', 'Marketing', 'Maintenance', 'Other'];

    return (
        <SlideOverPanel
            title={isEditing ? 'Edit Expense' : 'Add New Expense'}
            onClose={onClose}
            footer={
                <div className="flex gap-3 md:gap-4 w-full">
                    <button type="button" onClick={onClose} className="flex-1 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black uppercase tracking-widest text-[10px] md:text-xs">Cancel</button>
                    <button type="submit" form="expense-form" className="flex-2 px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 font-black uppercase tracking-widest text-[10px] md:text-xs">Save Expense</button>
                </div>
            }
        >
            <form id="expense-form" onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Description *</label>
                    <input name="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Office Supplies" className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold text-sm md:text-base" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Amount (₹) *</label>
                        <input name="amount" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold text-sm md:text-base" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Category *</label>
                        <select name="category" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold text-sm md:text-base" required>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Date *</label>
                    <input name="date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold text-sm md:text-base" required />
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Recurrence Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Frequency</label>
                            <select name="frequency" value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value as any })} className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all font-bold">
                                <option value="one-time">One-time</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 self-end h-[60px]">
                            <input 
                                type="checkbox" 
                                id="isRecurring" 
                                checked={formData.isRecurring} 
                                onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                                className="w-5 h-5 rounded-lg border-slate-300 dark:border-slate-700 text-primary-500 focus:ring-primary-500 cursor-pointer"
                            />
                            <label htmlFor="isRecurring" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer">Recurring Expense</label>
                        </div>
                    </div>
                </div>
                
                 <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Attachment (Optional)</h4>
                    {attachment ? (
                        <div className="flex items-center gap-4 p-4 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all group">
                            <div className="relative overflow-hidden rounded-[1.5rem] w-20 h-20 shadow-md">
                                <img src={`data:${attachment.mimeType};base64,${attachment.data}`} alt="Receipt" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <button type="button" onClick={() => setAttachment(null)} className="p-2 bg-rose-500 text-white rounded-xl shadow-lg">
                                        <Icon name="delete" className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Receipt Attached</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{attachment.mimeType}</p>
                            </div>
                            <button type="button" onClick={() => setAttachment(null)} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-colors md:mr-2">
                                <Icon name="delete" className="w-5 h-5"/>
                            </button>
                        </div>
                    ) : (
                        <div className="relative group">
                            <input 
                                type="file" 
                                onChange={handleFileChange} 
                                accept="image/*" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                            />
                            <div className="w-full py-10 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-3 group-hover:border-primary-500/50 group-hover:bg-primary-500/[0.02] transition-all">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-primary-500 transition-colors">
                                    <Icon name="upload" className="w-6 h-6"/>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Click to upload receipt</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PNG, JPG up to 5MB</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </SlideOverPanel>
    );
};

interface ExpensesProps {
    expenses: Expense[];
    onSaveExpense: (expense: Partial<Expense>) => void;
    onDeleteExpense: (expenseId: string) => { success: boolean, message: string };
    modalState: { type: string | null; data: any };
    setModalState: (state: { type: string | null; data: any }) => void;
}

const Expenses: React.FC<ExpensesProps> = ({ expenses, onSaveExpense, onDeleteExpense, modalState, setModalState }) => {
    const [deleteConfirm, setDeleteConfirm] = useState<Expense | null>(null);
    const toast = useToast();

    const handleCloseModal = useCallback(() => {
        setModalState({ type: null, data: null });
    }, [setModalState]);

    const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
    
    const expensesByCategory = useMemo(() => {
        const byCategory: { [key: string]: number } = {};
        expenses.forEach(e => {
            byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
        });
        return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
    }, [expenses]);

    const handleDelete = () => {
        if (deleteConfirm) {
            const result = onDeleteExpense(deleteConfirm.id);
            if (result.success) {
                toast.showToast(result.message, 'success');
            } else {
                toast.showToast(result.message, 'error');
            }
            setDeleteConfirm(null);
        }
    };

    return (
        <div className="space-y-6">
             {(modalState.type === 'add_expense' || modalState.type === 'edit_expense') && (
                <ExpensePanel
                    expense={modalState.data}
                    onClose={handleCloseModal}
                    onSave={onSaveExpense}
                />
            )}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                 <h1 className="text-2xl md:text-3xl font-bold text-theme-main">Expenses</h1>
                 <Tooltip content="Record a new expense" position="bottom">
                     <button onClick={() => setModalState({ type: 'add_expense', data: null })} className="px-6 py-2.5 text-sm font-bold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm flex items-center gap-2">
                        <Icon name="plus" className="w-4 h-4"/>
                        Add Expense
                    </button>
                </Tooltip>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-theme-surface p-6 rounded-xl border border-theme-main shadow-sm text-center">
                        <p className="text-sm font-medium text-theme-muted">Total Expenses</p>
                        <p className="text-4xl font-extrabold text-theme-main mt-2">₹{totalExpenses.toLocaleString('en-IN')}</p>
                    </div>
                     <div className="bg-theme-surface p-4 rounded-xl border border-theme-main shadow-sm">
                         <h3 className="text-base font-semibold mb-2">By Category</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} fill="#8884d8" paddingAngle={5}>
                                    {expensesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-theme-surface rounded-3xl border border-theme-main shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-theme-muted">
                            <thead className="text-xs text-theme-muted uppercase bg-theme-main border-b border-theme-main">
                                <tr>
                                    <th className="px-6 py-4 font-bold tracking-wider">Date</th>
                                    <th className="px-6 py-4 font-bold tracking-wider">Description</th>
                                    <th className="px-6 py-4 font-bold tracking-wider">Category</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-right">Amount</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(exp => (
                                    <tr key={exp.id} className="border-b border-theme-main transition-colors hover:bg-theme-main">
                                        <td className="px-6 py-4 font-medium text-theme-main">
                                            {new Date(exp.date).toLocaleDateString()}
                                            {exp.isRecurring && (
                                                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 uppercase">
                                                    {exp.frequency}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-theme-main">{exp.description}</span>
                                                {exp.relatedType === 'purchase' && (
                                                    <span className="text-[10px] text-theme-muted flex items-center gap-1">
                                                        <Icon name="procurement" className="w-3 h-3" />
                                                        Linked to Purchase
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 text-xs font-bold rounded-lg bg-theme-main text-theme-main border border-theme-main">{exp.category}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-theme-main">₹{exp.amount.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <Tooltip content="Edit Expense" position="top">
                                                <button onClick={() => setModalState({ type: 'edit_expense', data: exp })} className="font-bold text-primary-500 hover:text-primary-600 transition-colors">Edit</button>
                                            </Tooltip>
                                            <Tooltip content="Delete Expense" position="top">
                                                <button onClick={() => setDeleteConfirm(exp)} className="font-bold text-red-500 hover:text-red-600 transition-colors">Delete</button>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {expenses.length === 0 && <p className="text-center py-8 text-sm text-theme-muted font-medium">No expenses recorded yet.</p>}
                </div>
            </div>
            <ConfirmationModal
                isOpen={!!deleteConfirm}
                title="Delete Expense"
                message={`Are you sure you want to delete the expense "${deleteConfirm?.description}"?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteConfirm(null)}
            />
        </div>
    );
};

export default Expenses;