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
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition">Cancel</button>
                    <button type="submit" form="expense-form" className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm">Save Expense</button>
                </>
            }
        >
            <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
                <input name="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Expense Description" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" required />
                <input name="amount" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} placeholder="Amount" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" required />
                <select name="category" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" required>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <input name="date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" required />
                
                 <div>
                    <label className="block text-sm font-medium mb-1">Attachment (Optional)</label>
                    {attachment ? (
                        <div className="flex items-center gap-3 p-2 border rounded-lg border-theme-main">
                            <img src={`data:${attachment.mimeType};base64,${attachment.data}`} alt="Receipt thumbnail" className="w-16 h-16 object-cover rounded-md" />
                            <div className="flex-grow">
                                <p className="text-xs font-semibold text-theme-main">Receipt Attached</p>
                                <p className="text-xs text-theme-muted">{attachment.mimeType}</p>
                            </div>
                            <button type="button" onClick={() => setAttachment(null)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                                <Icon name="delete" className="w-4 h-4"/>
                            </button>
                        </div>
                    ) : (
                        <input type="file" onChange={handleFileChange} accept="image/*" className="w-full text-sm text-theme-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-theme-main file:text-theme-main hover:file:bg-theme-surface border border-theme-main rounded-lg" />
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
                     <button onClick={() => setModalState({ type: 'add_expense', data: null })} className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition flex items-center gap-1.5 shadow-sm">
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

                <div className="lg:col-span-2 bg-theme-surface rounded-xl border border-theme-main shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-theme-muted">
                            <thead className="text-xs text-theme-main uppercase bg-theme-main">
                                <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Description</th>
                                    <th className="px-4 py-2">Category</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                    <th className="px-4 py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(exp => (
                                    <tr key={exp.id} className="border-b border-theme-main">
                                        <td className="px-4 py-2">{new Date(exp.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 font-medium text-theme-main">{exp.description}</td>
                                        <td className="px-4 py-2">
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-theme-main text-theme-main">{exp.category}</span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold">₹{exp.amount.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-right space-x-2">
                                            <Tooltip content="Edit Expense" position="top">
                                                <button onClick={() => setModalState({ type: 'edit_expense', data: exp })} className="font-medium text-primary-500 hover:underline text-xs">Edit</button>
                                            </Tooltip>
                                            <Tooltip content="Delete Expense" position="top">
                                                <button onClick={() => setDeleteConfirm(exp)} className="font-medium text-red-500 hover:underline text-xs">Delete</button>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {expenses.length === 0 && <p className="text-center py-8 text-sm text-theme-muted">No expenses recorded yet.</p>}
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