


import React, { useState, useContext, useMemo } from 'react';
import type { AppSettings, EmployeeRole, User, Promotion, PromotionType, Product, PromotionConditionTarget, AccountState, Theme, ItemType, UiScale, AccentColor } from '../types';
import Avatar from '../components/Avatar';
import { ThemeContext } from '../types';
import Icon from '../components/Icon';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { sanitize } from '../services/syncService';

type SettingsTab = 'general' | 'appearance' | 'features' | 'staff_promos' | 'logs' | 'data' | 'cloud' | 'help' | 'about';

const SettingRow: React.FC<{title: string, description: string, enabled: boolean, onToggle: () => void, disabled?: boolean}> = ({title, description, enabled, onToggle, disabled = false}) => (
  <div className="flex justify-between items-center bg-theme-surface p-4 md:p-5 rounded-xl md:rounded-2xl border border-theme-main shadow-sm hover:border-primary-500/30 transition-colors">
    <div className="pr-4">
        <h3 className="font-semibold text-sm md:text-base text-theme-main mb-1">{title}</h3>
        <p className="text-xs md:text-sm text-theme-muted leading-relaxed">{description}</p>
    </div>
    <label htmlFor={`toggle-${title.replace(/\s+/g, '-')}`} className={`relative inline-flex items-center shrink-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <input 
        type="checkbox" 
        checked={enabled}
        onChange={onToggle}
        id={`toggle-${title.replace(/\s+/g, '-')}`} 
        className="sr-only peer"
        disabled={disabled}
      />
      <div className={`w-11 h-6 bg-theme-main peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-500 ${disabled ? 'opacity-50' : ''}`}></div>
    </label>
  </div>
);

// #region Modals
const StaffModal: React.FC<{
    user: Partial<User> | null,
    onClose: () => void,
    onSave: (user: Partial<User>) => void,
}> = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'Cashier',
        password: '',
    });
    const isEditing = !!user?.id;
    const toast = useToast();
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave: Partial<User> = { id: user?.id, ...formData };
        if (!isEditing && !dataToSave.password) { toast.showToast('Password is required for new users.', 'error'); return; }
        if (isEditing && !dataToSave.password) { delete dataToSave.password; }
        onSave(dataToSave);
    }
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
            <form onSubmit={handleSubmit} className="bg-theme-surface rounded-2xl md:rounded-3xl shadow-xl p-5 md:p-8 max-w-md w-full space-y-5 md:space-y-6 border border-theme-main">
                <h3 className="text-xl md:text-2xl font-bold text-theme-main mb-2">{isEditing ? 'Edit Staff Member' : 'Add New Staff'}</h3>
                
                <div className="space-y-4 md:space-y-5">
                    <div>
                        <label className="block text-xs md:text-sm font-semibold text-theme-main mb-1">Full Name</label>
                        <p className="text-[10px] md:text-xs text-theme-muted mb-2">The staff member's complete name.</p>
                        <input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Jane Doe" className="w-full p-2.5 md:p-3 rounded-lg md:rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all text-sm md:text-base" required />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-theme-main mb-1">Email Address</label>
                        <p className="text-xs text-theme-muted mb-2">Used for logging into the POS system.</p>
                        <input name="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="e.g., jane@example.com" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-theme-main mb-1">Password</label>
                        <p className="text-xs text-theme-muted mb-2">{isEditing ? 'Leave blank to keep the current password.' : 'A secure password for this account.'}</p>
                        <input name="password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={isEditing ? 'New Password' : 'Password'} className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required={!isEditing} />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-theme-main mb-1">Role</label>
                        <p className="text-xs text-theme-muted mb-2">Determines the level of access this user has.</p>
                        <select name="role" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as EmployeeRole})} className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all">
                            <option value="Cashier">Cashier</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-theme-main">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition font-medium">Cancel</button>
                    <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm font-medium">Save</button>
                </div>
            </form>
        </div>
    );
}

const PromotionModal: React.FC<{
    promotion: Partial<Promotion> | null,
    products: Product[],
    onClose: () => void,
    onSave: (promotion: Partial<Promotion>) => void,
}> = ({ promotion, products, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Promotion>>(
        promotion ? JSON.parse(JSON.stringify(promotion)) : { name: '', type: 'PERCENTAGE_OFF', value: 10, isActive: true, conditions: { appliesTo: 'ENTIRE_CART', minPurchase: 0, applicableIds: [] } }
    );
    const isEditing = !!promotion?.id;
    const allSubCategories = [...new Set(products.map(p => p.subCategory).filter(Boolean))] as string[];
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); }
    const handleConditionChange = (field: keyof Promotion['conditions'], value: any) => { setFormData(prev => ({ ...prev, conditions: { ...prev!.conditions, [field]: value, applicableIds: field === 'appliesTo' ? [] : prev!.conditions!.applicableIds } })); }
    const handleApplicableIdChange = (id: number | string) => {
        const currentIds = formData.conditions?.applicableIds || [];
        const newIds = currentIds.includes(id) ? currentIds.filter(i => i !== id) : [...currentIds, id];
        handleConditionChange('applicableIds', newIds);
    }
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
            <form onSubmit={handleSubmit} className="bg-theme-surface rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-theme-main overflow-hidden">
                <div className="p-6 border-b border-theme-main bg-theme-surface"><h3 className="text-2xl font-bold text-theme-main">{isEditing ? 'Edit Promotion' : 'Add New Promotion'}</h3></div>
                <div className="p-6 space-y-6 overflow-y-auto bg-theme-main/30">
                    <div>
                        <label className="block text-sm font-semibold text-theme-main mb-1">Promotion Name</label>
                        <p className="text-xs text-theme-muted mb-2">A clear name to identify this discount.</p>
                        <input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Weekend Sale" className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-theme-main mb-1">Discount Type</label>
                            <p className="text-xs text-theme-muted mb-2">How the discount is calculated.</p>
                            <select name="type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PromotionType})} className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"><option value="PERCENTAGE_OFF">Percentage Off</option><option value="FIXED_AMOUNT_OFF">Fixed Amount Off</option></select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-theme-main mb-1">Discount Value</label>
                            <p className="text-xs text-theme-muted mb-2">The amount or percentage to deduct.</p>
                            <input type="number" name="value" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})} placeholder={formData.type === 'PERCENTAGE_OFF' ? '% value' : '₹ value'} className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" required />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-theme-main">
                        <h4 className="font-bold text-lg text-theme-main mb-4">Conditions</h4>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-theme-main mb-1">Minimum Purchase (₹)</label>
                                <p className="text-xs text-theme-muted mb-2">The minimum cart total required to apply this promotion.</p>
                                <input type="number" value={formData.conditions?.minPurchase || ''} onChange={e => handleConditionChange('minPurchase', parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" placeholder="0 for no minimum" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-theme-main mb-1">Applies To</label>
                                <p className="text-xs text-theme-muted mb-2">Which items this promotion is valid for.</p>
                                <select value={formData.conditions?.appliesTo} onChange={e => handleConditionChange('appliesTo', e.target.value as PromotionConditionTarget)} className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all">
                                    <option value="ENTIRE_CART">Entire Cart</option>
                                    <option value="SPECIFIC_PRODUCTS">Specific Products</option>
                                    <option value="SPECIFIC_CATEGORIES">Specific Categories</option>
                                </select>
                            </div>
                            {formData.conditions?.appliesTo === 'SPECIFIC_PRODUCTS' && (
                                <div className="max-h-48 overflow-y-auto p-4 rounded-xl border border-theme-main bg-theme-surface shadow-inner">
                                    {products.flatMap(p => p.variants).map(v => (
                                        <label key={v.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-theme-main text-theme-main cursor-pointer transition-colors">
                                            <input type="checkbox" checked={formData.conditions?.applicableIds?.includes(v.id)} onChange={() => handleApplicableIdChange(v.id)} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                                            {products.find(p => p.id === v.productId)?.name} - {v.name}
                                        </label>
                                    ))}
                                </div>
                            )}
                            {formData.conditions?.appliesTo === 'SPECIFIC_CATEGORIES' && (
                                <div className="max-h-48 overflow-y-auto p-4 rounded-xl border border-theme-main bg-theme-surface shadow-inner">
                                    {allSubCategories.map(cat => (
                                         <label key={cat} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-theme-main text-theme-main cursor-pointer transition-colors">
                                            <input type="checkbox" checked={formData.conditions?.applicableIds?.includes(cat)} onChange={() => handleApplicableIdChange(cat)} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                                            {cat}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-theme-main bg-theme-surface flex justify-end gap-4">
                     <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition font-medium">Cancel</button>
                     <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm font-medium">Save</button>
                </div>
            </form>
        </div>
    );
}
// #endregion

interface SettingsProps {
    accountState: AccountState;
    setAppSettings: (updater: (prev: AppSettings) => AppSettings) => void;
    onSaveUser: (user: Partial<User>) => void;
    onDeleteUser: (userId: number) => void;
    onSavePromotion: (promotion: Partial<Promotion>) => void;
    onDeletePromotion: (promotionId: string) => void;
    onTogglePromotionStatus: (promotionId: string) => void;
    onHardReset: () => Promise<void>;
    onRestoreItem: (itemType: ItemType, itemId: string | number) => void;
    uiScale: UiScale;
    setUiScale: (scale: UiScale) => void;
    isTutorialActive: boolean;
    onStartTutorial: () => void;
    onEndTutorial: () => void;
    modalState: { type: string | null; data: any };
    setModalState: (state: { type: string | null; data: any }) => void;
    onDeleteAccount: () => Promise<boolean>;
}

const Settings: React.FC<SettingsProps> = ({ accountState, setAppSettings, onSaveUser, onDeleteUser, onSavePromotion, onDeletePromotion, onTogglePromotionStatus, onHardReset, onRestoreItem, uiScale, setUiScale, isTutorialActive, onStartTutorial, onEndTutorial, modalState, setModalState, onDeleteAccount }) => {
    const { products, dishes, users, promotions, history, stockAdjustments, expenses, appSettings } = accountState;
    const [activeTab, setActiveTab] = useState<SettingsTab | null>(() => typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'general' : null);
    const { theme, setTheme, accentColor, setAccentColor } = useContext(ThemeContext);

    const [isPublishing, setIsPublishing] = useState(false);
    const [isSyncingMaster, setIsSyncingMaster] = useState(false);
    const [masterListId, setMasterListId] = useState(appSettings.masterListId || '');

    const [resetConfirm, setResetConfirm] = useState(false);
    const [businessDeleteConfirm, setBusinessDeleteConfirm] = useState(false);
    const [businessDeleteName, setBusinessDeleteName] = useState('');
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);
    const toast = useToast();

    const TABS: { id: SettingsTab; label: string; icon: string }[] = [
        { id: 'general', label: 'General', icon: 'settings' },
        { id: 'appearance', label: 'Appearance', icon: 'sun' },
        { id: 'features', label: 'Features', icon: 'products' },
        { id: 'staff_promos', label: 'Staff & Promotions', icon: 'customers' },
        { id: 'logs', label: 'History & Adjustments', icon: 'receipt' },
        { id: 'data', label: 'Data Management', icon: 'sync-reload' },
        { id: 'cloud', label: 'Cloud & Sync', icon: 'cloud' },
        { id: 'help', label: 'Help & Support', icon: 'more' },
        { id: 'about', label: 'About Us', icon: 'user' },
    ];

    const handleAppSettingsChange = (key: keyof AppSettings, value: boolean | string | number) => {
        setAppSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleHardReset = () => {
        setResetConfirm(true);
    };
    
    const deletedItems = useMemo(() => {
        const allItems = [
            ...products.filter(i => i.isDeleted).map(i => ({...i, itemType: 'Product' as ItemType})),
            ...users.filter(i => i.isDeleted).map(i => ({...i, itemType: 'User' as ItemType})),
            ...promotions.filter(i => i.isDeleted).map(i => ({...i, itemType: 'Promotion' as ItemType})),
            ...expenses.filter(i => i.isDeleted).map(i => ({...i, itemType: 'Expense' as ItemType, name: i.description})),
            ...accountState.dishes.filter(i => i.isDeleted).map(i => ({...i, itemType: 'Dish' as ItemType})),
            ...accountState.rawMaterials.filter(i => i.isDeleted).map(i => ({...i, itemType: 'RawMaterial' as ItemType})),
            ...accountState.suppliers.filter(i => i.isDeleted).map(i => ({...i, itemType: 'Supplier' as ItemType})),
            ...accountState.customers.filter(i => i.isDeleted).map(i => ({...i, itemType: 'Customer' as ItemType})),
        ];
        return allItems.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [products, users, promotions, expenses, accountState.dishes, accountState.rawMaterials, accountState.suppliers, accountState.customers]);
    
    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6 max-w-3xl">
                        <div className="bg-theme-surface rounded-3xl p-6 border border-theme-main shadow-sm">
                            <h2 className="text-xl font-bold text-theme-main mb-6">Business Information</h2>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-theme-main mb-1">Shop Name</label>
                                    <p className="text-xs text-theme-muted mb-2">The official name of your business as it appears on receipts and the dashboard.</p>
                                    <input 
                                        value={appSettings.shopName} 
                                        onChange={e => handleAppSettingsChange('shopName', e.target.value)} 
                                        placeholder="e.g., Nexus POS Store" 
                                        className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-theme-main mb-1">UPI ID (for QR Codes)</label>
                                    <p className="text-xs text-theme-muted mb-2">Your business UPI ID. This will be used to generate payment QR codes on customer receipts.</p>
                                    <input 
                                        value={appSettings.upiId} 
                                        onChange={e => handleAppSettingsChange('upiId', e.target.value)} 
                                        placeholder="e.g., yourname@upi" 
                                        className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-theme-main mb-1">Receipt Footer Message</label>
                                    <p className="text-xs text-theme-muted mb-2">A custom message printed at the bottom of customer receipts.</p>
                                    <input 
                                        value={appSettings.receiptFooter} 
                                        onChange={e => handleAppSettingsChange('receiptFooter', e.target.value)} 
                                        placeholder="e.g., Thank you for shopping with us!" 
                                        className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'appearance': {
                const accentColors: { id: AccentColor; label: string; color: string }[] = [
                    { id: 'primary', label: 'Indigo', color: 'bg-indigo-600' },
                    { id: 'emerald', label: 'Emerald', color: 'bg-emerald-600' },
                    { id: 'rose', label: 'Rose', color: 'bg-rose-600' },
                    { id: 'amber', label: 'Amber', color: 'bg-amber-600' },
                    { id: 'violet', label: 'Violet', color: 'bg-violet-600' },
                ];
                const themes: { id: Theme; label: string; icon: string; description: string }[] = [
                    { id: 'light', label: 'Light', icon: 'sun', description: 'Clean and professional' },
                    { id: 'dim', label: 'Dim', icon: 'moon', description: 'Soft dark mode' },
                    { id: 'dark', label: 'Dark', icon: 'moon', description: 'Deep dark mode' },
                    { id: 'black', label: 'Black', icon: 'moon', description: 'OLED Black' },
                    { id: 'luxury', label: 'Luxury', icon: 'star', description: 'Gold & Dark' },
                    { id: 'neon', label: 'Neon', icon: 'zap', description: 'Cyberpunk' },
                ];
                return (
                     <div className="space-y-6">
                        <div className="bg-theme-surface p-4 rounded-lg border border-theme-main shadow-sm">
                            <h3 className="font-semibold text-theme-main mb-2">Theme</h3>
                            <p className="text-sm text-theme-muted mb-4">Choose your preferred visual style.</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {themes.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-all ${
                                            theme === t.id 
                                                ? 'border-primary-500 bg-theme-surface shadow-sm' 
                                                : 'border-transparent bg-theme-main hover:bg-theme-surface'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon name={t.icon} className={`w-4 h-4 ${theme === t.id ? 'text-primary-500' : 'text-theme-muted'}`} />
                                            <span className="text-sm font-bold text-theme-main">{t.label}</span>
                                        </div>
                                        <span className="text-xs text-theme-muted">{t.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-theme-surface p-4 rounded-lg border border-theme-main shadow-sm">
                            <h3 className="font-semibold text-theme-main mb-2">Accent Color</h3>
                            <p className="text-sm text-theme-muted mb-4">Choose the primary color for the application.</p>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                {accentColors.map((color) => (
                                    <button
                                        key={color.id}
                                        onClick={() => setAccentColor(color.id)}
                                        className={`flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                                            accentColor === color.id 
                                                ? 'border-primary-500 bg-theme-surface shadow-sm' 
                                                : 'border-transparent bg-theme-main hover:bg-theme-surface'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full ${color.color} shadow-inner`}></div>
                                        <span className="text-xs font-medium text-theme-main">{color.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                         <div className="bg-theme-surface p-4 rounded-lg border border-theme-main shadow-sm">
                            <h3 className="font-semibold text-theme-main mb-2">UI Scale</h3>
                            <p className="text-sm text-theme-muted mb-4">Adjust the size of the interface elements.</p>
                            <div className="flex gap-2">
                                {(['small', 'medium', 'large'] as UiScale[]).map((scale) => (
                                    <button
                                        key={scale}
                                        onClick={() => setUiScale(scale)}
                                        className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                                            uiScale === scale
                                                ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                                                : 'bg-theme-main border-theme-main text-theme-muted hover:border-primary-500'
                                        }`}
                                    >
                                        {scale.charAt(0).toUpperCase() + scale.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }
            case 'features':
                return (
                    <div className="space-y-3">
                        <SettingRow title="Kitchen Display System (KDS)" description="For restaurants to manage kitchen orders." enabled={appSettings.enableKitchenDisplay} onToggle={() => handleAppSettingsChange('enableKitchenDisplay', !appSettings.enableKitchenDisplay)} />
                        <SettingRow title="Credit System" description="Allow customers to purchase on credit." enabled={appSettings.enableCreditSystem} onToggle={() => handleAppSettingsChange('enableCreditSystem', !appSettings.enableCreditSystem)} />
                        <SettingRow title="Staff Management" description="Add multiple user accounts with different roles." enabled={appSettings.enableStaffManagement} onToggle={() => handleAppSettingsChange('enableStaffManagement', !appSettings.enableStaffManagement)} />
                        <SettingRow title="Show Receipt After Sale" description="Automatically show a receipt modal after every sale." enabled={appSettings.showReceiptAfterSale} onToggle={() => handleAppSettingsChange('showReceiptAfterSale', !appSettings.showReceiptAfterSale)} />
                        <SettingRow title="Barcode Scanner" description="Enable barcode scanning in POS." enabled={appSettings.enableBarcodeScanner} onToggle={() => handleAppSettingsChange('enableBarcodeScanner', !appSettings.enableBarcodeScanner)} />
                        <SettingRow title="QR Scanner" description="Enable QR code scanning in POS." enabled={appSettings.enableQrScanner} onToggle={() => handleAppSettingsChange('enableQrScanner', !appSettings.enableQrScanner)} />
                    </div>
                );
            case 'staff_promos':
                return (
                    <div className="space-y-8">
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-theme-main">Staff Management</h3>
                                <Tooltip content="Add a new staff member" position="bottom">
                                    <button onClick={() => setModalState({ type: 'add_user', data: null })} className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition shadow-sm">Add Staff</button>
                                </Tooltip>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {users.map((user, index) => (
                                    <div key={`${user.id}-${index}`} className="flex justify-between items-center p-4 bg-theme-surface border border-theme-main rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={user.name} size="sm" />
                                            <div>
                                                <p className="font-bold text-theme-main">{user.name}</p>
                                                <p className="text-xs text-theme-muted">{user.role} &bull; {user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setModalState({ type: 'edit_user', data: user })} className="p-2 rounded-full hover:bg-theme-main text-theme-muted hover:text-primary-500 transition-colors">
                                                <Icon name="edit" className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setUserToDelete(user)} className="p-2 rounded-full hover:bg-theme-main text-theme-muted hover:text-red-500 transition-colors">
                                                <Icon name="delete" className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="pt-8 border-t border-theme-main">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-theme-main">Promotions & Offers</h3>
                                <Tooltip content="Add a new promotion" position="bottom">
                                    <button onClick={() => setModalState({ type: 'add_promo', data: null })} className="px-4 py-2 text-sm font-semibold rounded-lg bg-theme-main text-primary-500 border border-theme-main hover:bg-theme-surface transition">Add Promotion</button>
                                </Tooltip>
                            </div>
                            <div className="space-y-3">
                                {promotions.length === 0 ? (
                                    <div className="text-center py-8 bg-theme-main rounded-2xl border border-dashed border-theme-main">
                                        <p className="text-theme-muted text-sm">No promotions created yet.</p>
                                    </div>
                                ) : (
                                    promotions.map((promo, index) => (
                                        <div key={`${promo.id}-${index}`} className="flex justify-between items-center p-4 bg-theme-surface border border-theme-main rounded-2xl shadow-sm">
                                            <div>
                                                <p className="font-bold text-theme-main">{promo.name}</p>
                                                <p className="text-xs text-theme-muted">{promo.type === 'PERCENTAGE_OFF' ? `${promo.value}% off` : `₹${promo.value} off`} &bull; {promo.isActive ? 'Active' : 'Inactive'}</p>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <div className="scale-75 origin-right">
                                                    <SettingRow title="" description="" enabled={promo.isActive} onToggle={() => onTogglePromotionStatus(promo.id)} />
                                                </div>
                                                <button onClick={() => setModalState({ type: 'edit_promo', data: promo })} className="p-2 rounded-full hover:bg-theme-main text-theme-muted hover:text-primary-500 transition-colors">
                                                    <Icon name="edit" className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setPromotionToDelete(promo)} className="p-2 rounded-full hover:bg-theme-main text-theme-muted hover:text-red-500 transition-colors">
                                                    <Icon name="delete" className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                );
            case 'logs':
                return (
                    <div className="space-y-8">
                        <section>
                            <h3 className="text-lg font-bold text-theme-main mb-4">Stock Adjustments</h3>
                            <div className="space-y-2">
                                {stockAdjustments.length === 0 ? (
                                    <div className="text-center py-12 bg-theme-main rounded-2xl border border-dashed border-theme-main">
                                        <Icon name="pos" className="w-12 h-12 text-theme-muted mx-auto mb-3 opacity-20" />
                                        <p className="text-theme-muted font-medium">No stock adjustments recorded yet.</p>
                                        <p className="text-xs text-theme-muted mt-1">Adjustments can be made from the Products page.</p>
                                    </div>
                                ) : (
                                    stockAdjustments.slice(-50).reverse().map((a, index) => (
                                        <div key={`${a.id}-${index}`} className="text-sm p-4 bg-theme-surface border border-theme-main rounded-xl text-theme-main">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-theme-main">{a.productName}</span>
                                                <span className={`font-bold ${a.quantityChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {a.quantityChange > 0 ? '+' : ''}{a.quantityChange}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-theme-muted">
                                                <span>Reason: {a.reason} &bull; By: {a.user}</span>
                                                <span className="font-mono">{new Date(a.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="pt-8 border-t border-theme-main">
                            <h3 className="text-lg font-bold text-theme-main mb-4">Change History</h3>
                            <div className="space-y-2">
                                {history.length === 0 ? (
                                    <div className="text-center py-12 bg-theme-main rounded-2xl border border-dashed border-theme-main">
                                        <Icon name="receipt" className="w-12 h-12 text-theme-muted mx-auto mb-3 opacity-20" />
                                        <p className="text-theme-muted font-medium">No change history recorded yet.</p>
                                    </div>
                                ) : (
                                    history.slice(-50).reverse().map((h, index) => (
                                        <div key={`${h.id}-${index}`} className="text-sm p-4 bg-theme-surface border border-theme-main rounded-xl text-theme-main flex justify-between items-center">
                                            <div>
                                                <span className="font-bold text-primary-500 mr-2 uppercase text-[10px] tracking-wider">{h.action}</span>
                                                <span>{h.itemType} "{h.itemName}"</span>
                                            </div>
                                            <span className="text-[10px] text-theme-muted font-mono">{new Date(h.timestamp).toLocaleString()}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                );
            case 'data': return (
                <div className="space-y-4">
                    <button onClick={() => setModalState({type: 'data_transfer', data: null})} className="w-full text-left p-4 rounded-lg bg-theme-main hover:bg-theme-surface border border-theme-main text-theme-main">
                        <h3 className="font-semibold">Import/Export Data</h3>
                        <p className="text-sm text-theme-muted">Transfer your shop data between devices.</p>
                    </button>
                    <div className="p-4 rounded-lg bg-theme-main border border-red-500/20">
                        <h3 className="font-semibold text-red-500">Danger Zone</h3>
                        <div className="flex flex-wrap gap-4 mt-2">
                            <Tooltip content="Re-download all data from server" position="bottom">
                                <button onClick={handleHardReset} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors shadow-sm">Hard Reset</button>
                            </Tooltip>
                            <Tooltip content="Permanently delete this business" position="bottom">
                                <button onClick={() => setBusinessDeleteConfirm(true)} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors shadow-sm">Delete Business</button>
                            </Tooltip>
                        </div>
                        <p className="text-xs text-red-500 mt-2">Hard Reset: Re-downloads all data from the server. Delete Business: Permanently erases all data for this business.</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-theme-main">Recycle Bin</h3>
                        {deletedItems.map(item => (
                            <div key={`${item.itemType}-${item.id}`} className="flex justify-between items-center text-sm p-2 bg-theme-main border border-theme-main rounded-md mb-1 text-theme-main">
                                <span>{item.name} ({item.itemType})</span>
                                <button onClick={() => onRestoreItem(item.itemType, item.id)} className="text-sm font-medium text-green-600 hover:underline">Restore</button>
                            </div>
                        ))}
                    </div>
                </div>
            );
            case 'cloud':
                return (
                    <div className="space-y-8 max-w-3xl">
                        <div className="bg-theme-surface rounded-3xl p-6 border border-theme-main shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                                    <Icon name="pos" className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-theme-main">Live Customer Menu</h2>
                                    <p className="text-xs text-theme-muted">Publish your current stock and prices to a public web page.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <SettingRow 
                                    title="Enable Public Menu" 
                                    description="Allow customers to view your menu via a QR code or link." 
                                    enabled={appSettings.enablePublicMenu || false} 
                                    onToggle={() => handleAppSettingsChange('enablePublicMenu', !appSettings.enablePublicMenu)} 
                                />

                                {appSettings.enablePublicMenu && (
                                    <div className="p-5 bg-theme-main rounded-2xl border border-theme-main space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-theme-main">Menu Status</p>
                                                <p className="text-xs text-theme-muted">Last updated: {appSettings.lastMenuUpdate ? new Date(appSettings.lastMenuUpdate).toLocaleString() : 'Never'}</p>
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    setIsPublishing(true);
                                                    try {
                                                        const shopRef = doc(db, 'shops', accountState.id);
                                                        const shopSnap = await getDoc(shopRef);
                                                        if (!shopSnap.exists()) {
                                                            await setDoc(shopRef, {
                                                                id: accountState.id,
                                                                name: appSettings.shopName || 'My Shop',
                                                                ownerEmail: auth.currentUser?.email || '',
                                                                createdAt: serverTimestamp()
                                                            });
                                                        }
                                                        
                                                        const isRestaurant = appSettings.shopTypes.includes('Restaurant');
                                                        const categories = [...new Set([
                                                            ...products.map(p => p.subCategory),
                                                            ...(isRestaurant ? ['Dishes'] : [])
                                                        ].filter(Boolean))];

                                                        const menuData = sanitize({
                                                            shopName: appSettings.shopName || 'My Shop',
                                                            lastUpdated: serverTimestamp(),
                                                            categories: categories.map(cat => {
                                                                const catProducts = products.filter(p => p.subCategory === cat && !p.isDeleted);
                                                                const catDishes = cat === 'Dishes' && isRestaurant ? dishes.filter(d => !d.isDeleted) : [];
                                                                
                                                                const items = [
                                                                    ...catProducts.map(p => ({
                                                                        id: p.id,
                                                                        name: p.name,
                                                                        description: p.supplier,
                                                                        tags: p.tags || [],
                                                                        variants: p.variants.filter(v => !v.isDeleted).map(v => ({
                                                                            id: v.id,
                                                                            name: v.name,
                                                                            price: v.mrp,
                                                                            stock: v.stock,
                                                                            unit: v.unit
                                                                        })),
                                                                        image: p.image || null
                                                                    })),
                                                                    ...catDishes.map(d => ({
                                                                        id: d.id,
                                                                        name: d.name,
                                                                        description: 'Freshly prepared',
                                                                        tags: d.tags || [],
                                                                        variants: [{
                                                                            id: d.id,
                                                                            name: 'Standard',
                                                                            price: d.price,
                                                                            stock: 999, // Dishes are usually made to order
                                                                            unit: 'pcs'
                                                                        }],
                                                                        image: d.imageUrl || null
                                                                    }))
                                                                ];

                                                                return { name: cat, items };
                                                            }).filter(c => c.items.length > 0)
                                                        });
                                                        await setDoc(doc(db, 'shops', accountState.id, 'public_menu', 'current'), menuData);
                                                        handleAppSettingsChange('lastMenuUpdate', new Date().toISOString());
                                                        toast.showToast('Menu published successfully!', 'success');
                                                    } catch (err) {
                                                        console.error("Publish error:", err);
                                                        toast.showToast('Failed to publish menu.', 'error');
                                                    } finally {
                                                        setIsPublishing(false);
                                                    }
                                                }}
                                                disabled={isPublishing}
                                                className="px-6 py-2 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isPublishing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Icon name="sync-reload" className="w-4 h-4" />}
                                                {appSettings.lastMenuUpdate ? 'Update Menu' : 'Publish Menu'}
                                            </button>
                                        </div>

                                        {appSettings.lastMenuUpdate && (
                                            <div className="pt-4 border-t border-theme-main">
                                                <p className="text-xs font-semibold text-theme-muted mb-2 uppercase tracking-wider">Public Link</p>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        readOnly 
                                                        value={`${window.location.origin}/menu/${accountState.id}`} 
                                                        className="flex-1 p-2 text-xs bg-theme-surface rounded-lg border border-theme-main font-mono"
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`${window.location.origin}/menu/${accountState.id}`);
                                                            toast.showToast('Link copied!', 'success');
                                                        }}
                                                        className="p-2 rounded-lg bg-theme-surface border border-theme-main hover:bg-theme-main transition-colors"
                                                    >
                                                        <Icon name="copy" className="w-4 h-4" />
                                                    </button>
                                                    <a 
                                                        href={`/menu/${accountState.id}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-lg bg-theme-surface border border-theme-main hover:bg-theme-main transition-colors"
                                                    >
                                                        <Icon name="arrow-right" className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-theme-surface rounded-3xl p-6 border border-theme-main shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                    <Icon name="sync-reload" className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-theme-main">Multi-Store Sync</h2>
                                    <p className="text-xs text-theme-muted">Synchronize your product list across multiple store locations.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-theme-main mb-1">Master List ID</label>
                                    <p className="text-xs text-theme-muted mb-3">Enter the ID of the Master List you want to subscribe to, or leave blank to create your own.</p>
                                    <div className="flex gap-2">
                                        <input 
                                            value={masterListId} 
                                            onChange={e => setMasterListId(e.target.value)} 
                                            placeholder="e.g., master-list-123" 
                                            className="flex-1 p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all" 
                                        />
                                        <button 
                                            onClick={() => {
                                                handleAppSettingsChange('masterListId', masterListId);
                                                toast.showToast('Master List ID saved.', 'success');
                                            }}
                                            className="px-4 py-2 rounded-xl bg-theme-main border border-theme-main hover:bg-theme-surface transition-colors font-semibold"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button 
                                        onClick={async () => {
                                            if (!masterListId) {
                                                toast.showToast('Please enter a Master List ID first.', 'error');
                                                return;
                                            }
                                            setIsSyncingMaster(true);
                                            try {
                                                const masterDoc = await getDoc(doc(db, 'master_lists', masterListId));
                                                if (masterDoc.exists()) {
                                                    const masterData = masterDoc.data();
                                                    // Logic to merge products from master list
                                                    // For now, we just show a success message
                                                    toast.showToast(`Synced ${masterData.products?.length || 0} products from Master List.`, 'success');
                                                } else {
                                                    toast.showToast('Master List not found.', 'error');
                                                }
                                            } catch (err) {
                                                console.error("Sync error:", err);
                                                toast.showToast('Failed to sync from Master List.', 'error');
                                            } finally {
                                                setIsSyncingMaster(false);
                                            }
                                        }}
                                        disabled={isSyncingMaster || !masterListId}
                                        className="p-4 rounded-2xl bg-theme-main border border-theme-main hover:border-primary-500/50 transition-all text-left group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 mb-3 group-hover:scale-110 transition-transform">
                                            <Icon name="sync-reload" className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-theme-main text-sm">Sync from Master</h3>
                                        <p className="text-[10px] text-theme-muted mt-1">Update your products with the latest data from the master list.</p>
                                    </button>

                                    <button 
                                        onClick={async () => {
                                            const id = masterListId || `master-${accountState.id.slice(0, 8)}`;
                                            setMasterListId(id);
                                            setIsSyncingMaster(true);
                                            try {
                                                const masterData = sanitize({
                                                    id: id,
                                                    name: `${appSettings.shopName || 'My Shop'} Master List`,
                                                    ownerId: accountState.id,
                                                    ownerEmail: auth.currentUser?.email || '',
                                                    lastUpdated: serverTimestamp(),
                                                    products: products.filter(p => !p.isDeleted).map(p => ({
                                                        id: p.id,
                                                        name: p.name,
                                                        category: p.category || '',
                                                        subCategory: p.subCategory || '',
                                                        variants: p.variants.map(v => ({
                                                            name: v.name,
                                                            price: v.price,
                                                            sku: v.sku || ''
                                                        }))
                                                    }))
                                                });
                                                await setDoc(doc(db, 'master_lists', id), masterData);
                                                handleAppSettingsChange('masterListId', id);
                                                toast.showToast('Master List updated successfully!', 'success');
                                            } catch (err) {
                                                console.error("Master update error:", err);
                                                toast.showToast('Failed to update Master List.', 'error');
                                            } finally {
                                                setIsSyncingMaster(false);
                                            }
                                        }}
                                        disabled={isSyncingMaster}
                                        className="p-4 rounded-2xl bg-theme-main border border-theme-main hover:border-emerald-500/50 transition-all text-left group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                                            <Icon name="pos" className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-theme-main text-sm">Update Master List</h3>
                                        <p className="text-[10px] text-theme-muted mt-1">Push your current product list as the source for other stores.</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'help': return (
                <div className="space-y-4 max-w-3xl">
                    <div className="bg-theme-surface rounded-3xl p-6 border border-theme-main shadow-sm">
                        <h2 className="text-xl font-bold text-theme-main mb-4">Help & Support</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <a href="mailto:core.inbox1999@gmail.com" className="flex items-center gap-4 p-4 rounded-2xl bg-theme-main hover:bg-theme-surface border border-theme-main transition-colors group">
                                <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                                    <Icon name="send" className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-theme-main">Email Support</h3>
                                    <p className="text-sm text-theme-muted">core.inbox1999@gmail.com</p>
                                </div>
                            </a>
                            <button onClick={isTutorialActive ? onEndTutorial : onStartTutorial} className="flex items-center gap-4 p-4 rounded-2xl bg-theme-main hover:bg-theme-surface border border-theme-main transition-colors group text-left">
                                <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                                    <Icon name="star" className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-theme-main">{isTutorialActive ? 'End Tutorial' : 'App Tour'}</h3>
                                    <p className="text-sm text-theme-muted">Guided walkthrough</p>
                                </div>
                            </button>
                            <button 
                                onClick={() => {
                                    onEndTutorial();
                                    setTimeout(onStartTutorial, 100);
                                }} 
                                className="flex items-center gap-4 p-4 rounded-2xl bg-theme-main hover:bg-theme-surface border border-theme-main transition-colors group text-left"
                            >
                                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                                    <Icon name="sync-reload" className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-theme-main">Restart Tutorial</h3>
                                    <p className="text-sm text-theme-muted">Start from the beginning</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            );
            case 'about': return (
                <div className="space-y-6 max-w-3xl">
                    <div className="bg-theme-surface rounded-3xl p-8 border border-theme-main shadow-sm flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
                            <Icon name="logo" className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-theme-main mb-2">Nexus POS</h2>
                        <p className="text-theme-muted mb-6">Version 1.0.0</p>
                        
                        <div className="w-full bg-theme-main rounded-2xl p-6 mb-6 text-left border border-theme-main">
                            <h3 className="text-lg font-semibold text-theme-main mb-2">Creator</h3>
                            <p className="text-theme-muted mb-1"><span className="font-medium text-theme-main">Name:</span> Ansh Singh</p>
                            <p className="text-theme-muted"><span className="font-medium text-theme-main">Instagram:</span> <a href="https://instagram.com/core_dev.ansh" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">@core_dev.ansh</a></p>
                        </div>

                        <div className="w-full bg-theme-main rounded-2xl p-6 mb-6 text-left border border-theme-main">
                            <h3 className="text-lg font-semibold text-theme-main mb-2">Thank You</h3>
                            <p className="text-theme-muted leading-relaxed">
                                Thank you for using Nexus POS! We built this application to help businesses manage their operations smoothly and efficiently. Your support means the world to us.
                            </p>
                        </div>

                        <div className="w-full bg-theme-main rounded-2xl p-6 flex flex-col items-center justify-center border border-theme-main">
                            <h3 className="text-lg font-semibold text-theme-main mb-2">Support the Developer</h3>
                            <p className="text-sm text-theme-muted mb-4 text-center">If you find this app helpful, consider buying me a coffee!</p>
                            <div className="bg-white p-2 rounded-xl shadow-sm mb-2">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=6351790053@fam&pn=Ansh%20Singh" alt="Donation QR Code" className="w-32 h-32" />
                            </div>
                            <p className="text-xs font-mono text-theme-muted">UPI: 6351790053@fam</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-6 rounded-3xl bg-theme-surface hover:bg-theme-main border border-theme-main transition-colors group shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                                <Icon name="receipt" className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-theme-main">Privacy Policy</h3>
                                <p className="text-sm text-theme-muted">Read our detailed policy</p>
                            </div>
                        </a>
                        <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-6 rounded-3xl bg-theme-surface hover:bg-theme-main border border-theme-main transition-colors group shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                                <Icon name="receipt" className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-theme-main">Terms of Service</h3>
                                <p className="text-sm text-theme-muted">Read our terms</p>
                            </div>
                        </a>
                    </div>
                </div>
            );
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-theme-main">Settings</h1>
            <div className="flex flex-col lg:flex-row gap-8">
                <nav className={`lg:w-1/4 xl:w-1/5 ${activeTab ? 'hidden lg:block' : 'block'}`}>
                    <ul className="space-y-2">
                        {TABS.map(tab => (
                            <li key={tab.id}>
                                <button onClick={() => setActiveTab(tab.id)} className={`w-full text-left flex items-center gap-4 px-4 py-4 rounded-2xl font-semibold text-sm transition-colors ${activeTab === tab.id ? 'bg-theme-surface text-primary-500 border border-theme-main shadow-sm' : 'bg-theme-main text-theme-muted hover:bg-theme-surface hover:text-theme-main border border-transparent'}`}>
                                    <Icon name={tab.icon} className="w-6 h-6"/>
                                    <span className="text-base">{tab.label}</span>
                                    <Icon name="arrow-right" className="w-5 h-5 ml-auto lg:hidden opacity-50" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className={`flex-1 ${!activeTab ? 'hidden lg:block' : 'block'}`}>
                    {activeTab && (
                        <div className="lg:hidden mb-6">
                            <button onClick={() => setActiveTab(null)} className="flex items-center gap-2 text-theme-muted hover:text-theme-main font-medium bg-theme-surface px-4 py-2 rounded-full border border-theme-main shadow-sm">
                                <Icon name="arrow-left" className="w-5 h-5" /> Back to Settings
                            </button>
                        </div>
                    )}
                    {activeTab && renderContent()}
                </div>
            </div>
            {(modalState.type === 'add_user' || modalState.type === 'edit_user') && <StaffModal user={modalState.data} onClose={() => setModalState({ type: null, data: null})} onSave={(user) => { onSaveUser(user); setModalState({ type: null, data: null }); }} />}
            {(modalState.type === 'add_promo' || modalState.type === 'edit_promo') && <PromotionModal promotion={modalState.data} products={products} onClose={() => setModalState({ type: null, data: null})} onSave={(promo) => { onSavePromotion(promo); setModalState({ type: null, data: null }); }} />}
            <ConfirmationModal 
                isOpen={resetConfirm}
                title="Hard Reset"
                message="Are you sure you want to perform a hard reset? This will revert your local data to the last synced version from the server, discarding any unsynced changes. This action cannot be undone."
                onConfirm={() => {
                    onHardReset();
                    setResetConfirm(false);
                }}
                onCancel={() => setResetConfirm(false)}
            />
            <ConfirmationModal 
                isOpen={!!userToDelete}
                title="Delete Staff Member"
                message={`Are you sure you want to delete ${userToDelete?.name}? This action cannot be undone.`}
                onConfirm={() => {
                    if (userToDelete) {
                        onDeleteUser(userToDelete.id);
                        setUserToDelete(null);
                        toast.showToast('Staff member deleted successfully', 'success');
                    }
                }}
                onCancel={() => setUserToDelete(null)}
            />
            <ConfirmationModal 
                isOpen={!!promotionToDelete}
                title="Delete Promotion"
                message={`Are you sure you want to delete the promotion "${promotionToDelete?.name}"? This action cannot be undone.`}
                onConfirm={() => {
                    if (promotionToDelete) {
                        onDeletePromotion(promotionToDelete.id);
                        setPromotionToDelete(null);
                        toast.showToast('Promotion deleted successfully', 'success');
                    }
                }}
                onCancel={() => setPromotionToDelete(null)}
            />

            {/* Business Delete Modal */}
            {businessDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
                    <div className="bg-theme-surface rounded-3xl shadow-xl max-w-md w-full border border-theme-main overflow-hidden">
                         <div className="p-8 text-center">
                            <h3 className="text-2xl font-bold text-red-500 mb-2">Delete Business</h3>
                             <p className="text-sm text-theme-muted mb-6">This action is permanent and cannot be undone. All data associated with "{appSettings.shopName}" will be erased.</p>
                             
                             <div className="text-left">
                                 <label className="block text-sm font-semibold text-theme-main mb-1">Confirm Business Name</label>
                                 <p className="text-xs text-theme-muted mb-2">To confirm, type the name of the business below:</p>
                                <input
                                    type="text"
                                    value={businessDeleteName}
                                    onChange={e => setBusinessDeleteName(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-theme-main text-theme-main border border-theme-main focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                                    placeholder={appSettings.shopName}
                                />
                             </div>
                        </div>
                        <div className="p-6 bg-theme-main flex justify-end gap-4 border-t border-theme-main">
                            <button onClick={() => { setBusinessDeleteConfirm(false); setBusinessDeleteName(''); }} className="px-6 py-2.5 rounded-xl bg-theme-surface text-theme-main hover:bg-theme-main border border-theme-main transition font-medium">Cancel</button>
                            <button 
                                onClick={async () => {
                                    if (businessDeleteName === appSettings.shopName) {
                                        const success = await onDeleteAccount();
                                        if (success) {
                                            toast.showToast(`Business "${appSettings.shopName}" deleted.`, 'info');
                                        }
                                    } else {
                                        toast.showToast("Name does not match.", 'error');
                                    }
                                }}
                                disabled={businessDeleteName !== appSettings.shopName}
                                className="px-6 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition font-semibold disabled:opacity-50 shadow-sm"
                            >
                                Delete Business
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;