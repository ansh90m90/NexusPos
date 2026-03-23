import React, { useState } from 'react';
import type { User, AccountInfo } from '../types';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';

interface MyAccountPageProps {
    user: User;
    onSave: (updateData: { name: string, email: string, oldPassword?: string, newPassword?: string }) => { success: boolean, message: string };
    userAccounts: AccountInfo[];
    currentAccountId: string;
    onDeleteAccount: (accountId: string) => Promise<boolean>;
    onDeleteUserAccount: () => Promise<boolean>;
}

const MyAccountPage: React.FC<MyAccountPageProps> = ({ user, onSave, userAccounts, currentAccountId, onDeleteAccount, onDeleteUserAccount }) => {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();
    
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [userDeleteConfirmText, setUserDeleteConfirmText] = useState('');

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if ((newPassword || oldPassword) && newPassword !== confirmPassword) {
            toast.showToast('New passwords do not match.', 'error');
            return;
        }

        setIsSaving(true);
        const result = onSave({
            name,
            email,
            oldPassword: oldPassword || undefined,
            newPassword: newPassword || undefined,
        });

        toast.showToast(result.message, result.success ? 'success' : 'error');
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!deletingAccountId) return;
        const accountToDelete = userAccounts.find(acc => acc.id === deletingAccountId);
        if (accountToDelete && deleteConfirmText === accountToDelete.name) {
            const success = await onDeleteAccount(deletingAccountId);
            if (success) {
                toast.showToast(`Business "${accountToDelete.name}" has been deleted.`, 'info');
                setDeletingAccountId(null);
                setDeleteConfirmText('');
            } else {
                toast.showToast('Failed to delete business.', 'error');
            }
        } else {
            toast.showToast("The name you entered does not match.", 'error');
        }
    };

    const handleDeleteUser = async () => {
        if (userDeleteConfirmText === user.email) {
            const success = await onDeleteUserAccount();
            if (success) {
                // App will redirect to login
            }
        } else {
            toast.showToast("The email you entered does not match.", 'error');
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Account</h1>

            {/* Profile Information Card */}
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <form onSubmit={handleProfileSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Profile Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Side */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Full Name</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-primary-500" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email Address</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-primary-500" required />
                                </div>
                            </div>
                            {/* Right Side */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Current Password</label>
                                    <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Required to change password" className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-primary-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">New Password</label>
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-primary-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Confirm New</label>
                                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-primary-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end">
                        <Tooltip content="Save profile changes" position="top">
                            <button type="submit" disabled={isSaving} className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition font-semibold disabled:opacity-60">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </Tooltip>
                    </div>
                </form>
            </div>

            {/* My Businesses Card */}
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">My Businesses</h2>
                    <div className="space-y-3">
                        {userAccounts.map(account => (
                            <div key={account.id} className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/50 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{account.name}</p>
                                    <p className="text-xs text-slate-500">{account.id === currentAccountId ? 'Currently Active' : 'Inactive'}</p>
                                </div>
                                {account.id !== currentAccountId && (
                                    <Tooltip content={`Delete business ${account.name}`} position="top">
                                        <button onClick={() => setDeletingAccountId(account.id)} className="text-sm font-medium text-red-600 dark:text-red-500 hover:underline">
                                            Delete
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-red-200 dark:border-red-900 shadow-sm overflow-hidden">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-500 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Danger Zone
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Deleting your account will permanently erase your profile and all associated data. This action cannot be undone.</p>
                    <button 
                        onClick={() => setIsDeletingUser(true)}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-semibold"
                    >
                        Delete My Account
                    </button>
                </div>
            </div>

            {/* Delete Business Confirmation Modal */}
            {deletingAccountId && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
                         <div className="p-6 text-center">
                            <h3 className="text-lg font-bold text-red-600">Delete Business</h3>
                             <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">This action is permanent and cannot be undone. All data associated with "{userAccounts.find(a => a.id === deletingAccountId)?.name}" will be erased.</p>
                             <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">To confirm, type the name of the business below:</p>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={e => setDeleteConfirmText(e.target.value)}
                                className="w-full mt-2 p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-red-500"
                            />
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-4">
                            <button onClick={() => setDeletingAccountId(null)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                            <button 
                                onClick={handleDelete}
                                disabled={deleteConfirmText !== userAccounts.find(a => a.id === deletingAccountId)?.name}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-semibold disabled:opacity-50"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Account Confirmation Modal */}
            {isDeletingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
                         <div className="p-6 text-center">
                            <h3 className="text-lg font-bold text-red-600">Delete Your Account</h3>
                             <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">This is a permanent action. You will lose access to all your businesses and data.</p>
                             <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">To confirm, type your email address (<b>{user.email}</b>) below:</p>
                            <input
                                type="text"
                                value={userDeleteConfirmText}
                                onChange={e => setUserDeleteConfirmText(e.target.value)}
                                className="w-full mt-2 p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-red-500"
                                placeholder={user.email}
                            />
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-4">
                            <button onClick={() => { setIsDeletingUser(false); setUserDeleteConfirmText(''); }} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                            <button 
                                onClick={handleDeleteUser}
                                disabled={userDeleteConfirmText !== user.email}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-semibold disabled:opacity-50"
                            >
                                Permanently Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyAccountPage;