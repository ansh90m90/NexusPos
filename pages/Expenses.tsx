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
                <>
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition font-medium">Cancel</button>
                    <button type="submit" form="expense-form" className="px-6 py-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm font-medium">Save Expense</button>
                </>
            }
        >
            <form id="expense-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-theme-main mb-1">Description</label>
                    <input name="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Office Supplies" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                    <p className="text-xs text-theme-muted mt-2">A brief description of the expense.</p>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-theme-main mb-1">Amount</label>
                    <input name="amount" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} placeholder="e.g., 150.00" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                    <p className="text-xs text-theme-muted mt-2">The total amount spent.</p>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-theme-main mb-1">Category</label>
                    <select name="category" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <p className="text-xs text-theme-muted mt-2">Categorize the expense for reporting.</p>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-theme-main mb-1">Date</label>
                    <input name="date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                    <p className="text-xs text-theme-muted mt-2">The date the expense occurred.</p>
                </div>
                
                 <div>
                    <label className="block text-sm font-semibold text-theme-main mb-1">Attachment (Optional)</label>
                    <p className="text-xs text-theme-muted mb-2">Upload a receipt or invoice image.</p>
                    {attachment ? (
                        <div className="flex items-center gap-3 p-3 border rounded-xl border-theme-main bg-theme-main">
                            <img src={`data:${attachment.mimeType};base64,${attachment.data}`} alt="Receipt thumbnail" className="w-16 h-16 object-cover rounded-lg shadow-sm" />
                            <div className="flex-grow">
                                <p className="text-sm font-semibold text-theme-main">Receipt Attached</p>
                                <p className="text-xs text-theme-muted">{attachment.mimeType}</p>
                            </div>
                            <button type="button" onClick={() => setAttachment(null)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors">
                                <Icon name="delete" className="w-5 h-5"/>
                            </button>
                        </div>
                    ) : (
                        <input type="file" onChange={handleFileChange} accept="image/*" className="w-full text-sm text-theme-muted file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-theme-main file:text-theme-main hover:file:bg-theme-surface border border-theme-main rounded-xl cursor-pointer transition-all" />
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
                                        <td className="px-6 py-4 font-medium text-theme-main">{new Date(exp.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold text-theme-main">{exp.description}</td>
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