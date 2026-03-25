


import React, { useState, useContext, useMemo } from 'react';
import type { AppSettings, EmployeeRole, User, Promotion, PromotionType, Product, PromotionConditionTarget, AccountState, Theme, ItemType, UiScale, AccentColor } from '../types';
import Avatar from '../components/Avatar';
import { ThemeContext } from '../types';
import Icon from '../components/Icon';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';

type SettingsTab = 'general' | 'appearance' | 'features' | 'staff' | 'promotions' | 'history' | 'adjustments' | 'data' | 'help';

const SettingRow: React.FC<{title: string, description: string, enabled: boolean, onToggle: () => void, disabled?: boolean}> = ({title, description, enabled, onToggle, disabled = false}) => (
  <div className="flex justify-between items-center bg-theme-main p-4 rounded-lg border border-theme-main">
    <div>
        <h3 className="font-semibold text-theme-main">{title}</h3>
        <p className="text-sm text-theme-muted">{description}</p>
    </div>
    <label htmlFor={`toggle-${title.replace(/\s+/g, '-')}`} className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <input 
        type="checkbox" 
        checked={enabled}
        onChange={onToggle}
        id={`toggle-${title.replace(/\s+/g, '-')}`} 
        className="sr-only peer"
        disabled={disabled}
      />
      <div className={`w-11 h-6 bg-theme-surface peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-500 ${disabled ? 'opacity-50' : ''}`}></div>
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
            <form onSubmit={handleSubmit} className="bg-theme-surface rounded-lg shadow-xl p-6 max-w-md w-full space-y-4 border border-theme-main">
                <h3 className="text-xl font-bold text-theme-main">{isEditing ? 'Edit Staff Member' : 'Add New Staff'}</h3>
                <input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" required />
                <input name="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email Address" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" required />
                <input name="password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={isEditing ? 'New Password (leave blank to keep current)' : 'Password'} className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" required={!isEditing} />
                <select name="role" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as EmployeeRole})} className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main">
                    <option value="Cashier">Cashier</option>
                    <option value="Admin">Admin</option>
                </select>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm">Save</button>
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
            <form onSubmit={handleSubmit} className="bg-theme-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-theme-main">
                <div className="p-4 border-b border-theme-main"><h3 className="text-xl font-bold text-theme-main">{isEditing ? 'Edit Promotion' : 'Add New Promotion'}</h3></div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Promotion Name (e.g., Weekend Sale)" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main" required />
                    <div className="grid grid-cols-2 gap-4">
                        <select name="type" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as PromotionType})} className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main"><option value="PERCENTAGE_OFF">Percentage Off</option><option value="FIXED_AMOUNT_OFF">Fixed Amount Off</option></select>
                        <input type="number" name="value" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})} placeholder={formData.type === 'PERCENTAGE_OFF' ? '% value' : '₹ value'} className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main" required />
                    </div>
                    <h4 className="font-semibold pt-2 text-sm border-t border-theme-main text-theme-main">Conditions</h4>
                    <div className="space-y-3">
                        <div><label className="text-xs font-medium text-theme-muted">Minimum Purchase (₹)</label><input type="number" value={formData.conditions?.minPurchase || ''} onChange={e => handleConditionChange('minPurchase', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main" placeholder="0 for no minimum" /></div>
                        <div>
                            <label className="text-xs font-medium text-theme-muted">Applies To</label>
                            <select value={formData.conditions?.appliesTo} onChange={e => handleConditionChange('appliesTo', e.target.value as PromotionConditionTarget)} className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main">
                                <option value="ENTIRE_CART">Entire Cart</option>
                                <option value="SPECIFIC_PRODUCTS">Specific Products</option>
                                <option value="SPECIFIC_CATEGORIES">Specific Categories</option>
                            </select>
                        </div>
                        {formData.conditions?.appliesTo === 'SPECIFIC_PRODUCTS' && (
                            <div className="max-h-40 overflow-y-auto p-2 border rounded border-theme-main">
                                {products.flatMap(p => p.variants).map(v => (
                                    <label key={v.id} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-theme-main text-theme-main">
                                        <input type="checkbox" checked={formData.conditions?.applicableIds?.includes(v.id)} onChange={() => handleApplicableIdChange(v.id)} />
                                        {products.find(p => p.id === v.productId)?.name} - {v.name}
                                    </label>
                                ))}
                            </div>
                        )}
                        {formData.conditions?.appliesTo === 'SPECIFIC_CATEGORIES' && (
                            <div className="max-h-40 overflow-y-auto p-2 border rounded border-theme-main">
                                {allSubCategories.map(cat => (
                                     <label key={cat} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-theme-main text-theme-main">
                                        <input type="checkbox" checked={formData.conditions?.applicableIds?.includes(cat)} onChange={() => handleApplicableIdChange(cat)} />
                                        {cat}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-theme-main mt-auto bg-theme-main flex justify-end gap-4">
                     <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-theme-surface text-theme-main hover:bg-theme-main border border-theme-main transition">Cancel</button>
                     <button type="submit" className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm">Save</button>
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
    const { products, users, promotions, history, stockAdjustments, expenses, appSettings } = accountState;
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const { theme, setTheme, accentColor, setAccentColor } = useContext(ThemeContext);

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
        { id: 'staff', label: 'Staff', icon: 'customers' },
        { id: 'promotions', label: 'Promotions', icon: 'marketing' },
        { id: 'history', label: 'Change History', icon: 'receipt' },
        { id: 'adjustments', label: 'Stock Adjustments', icon: 'pos' },
        { id: 'data', label: 'Data Management', icon: 'sync-reload' },
        { id: 'help', label: 'Help & Support', icon: 'more' },
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
                    <div className="space-y-4">
                        <input value={appSettings.shopName} onChange={e => handleAppSettingsChange('shopName', e.target.value)} placeholder="Shop Name" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" />
                        <input value={appSettings.upiId} onChange={e => handleAppSettingsChange('upiId', e.target.value)} placeholder="UPI ID (for QR codes)" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" />
                        <input value={appSettings.receiptFooter} onChange={e => handleAppSettingsChange('receiptFooter', e.target.value)} placeholder="Receipt Footer Message" className="w-full p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-primary-500" />
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
            case 'staff':
                return (
                    <div>
                        <Tooltip content="Add a new staff member" position="bottom">
                            <button onClick={() => setModalState({ type: 'add_user', data: null })} className="mb-4 px-4 py-2 text-sm font-semibold rounded-lg bg-theme-main text-primary-500 border border-theme-main hover:bg-theme-surface transition">Add Staff</button>
                        </Tooltip>
                        <div className="space-y-2">
                           {users.map(user => (
                               <div key={user.id} className="flex justify-between items-center p-3 bg-theme-main border border-theme-main rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={user.name} />
                                        <div>
                                            <p className="font-semibold text-theme-main">{user.name}</p>
                                            <p className="text-sm text-theme-muted">{user.role}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <Tooltip content="Edit staff member" position="bottom">
                                            <button onClick={() => setModalState({ type: 'edit_user', data: user })} className="text-sm font-medium text-primary-600 hover:underline mr-4">Edit</button>
                                        </Tooltip>
                                        <Tooltip content="Delete staff member" position="bottom">
                                            <button onClick={() => setUserToDelete(user)} className="text-sm font-medium text-red-600 hover:underline">Delete</button>
                                        </Tooltip>
                                    </div>
                               </div>
                           ))}
                        </div>
                    </div>
                );
            case 'promotions':
                 return (
                    <div>
                        <Tooltip content="Create a new promotion" position="bottom">
                            <button onClick={() => setModalState({ type: 'add_promo', data: null })} className="mb-4 px-4 py-2 text-sm font-semibold rounded-lg bg-theme-main text-primary-500 border border-theme-main hover:bg-theme-surface transition">Add Promotion</button>
                        </Tooltip>
                        <div className="space-y-2">
                            {promotions.map(promo => (
                                <div key={promo.id} className="flex justify-between items-center p-3 bg-theme-main border border-theme-main rounded-lg">
                                    <div>
                                        <p className="font-semibold text-theme-main">{promo.name}</p>
                                        <p className="text-sm text-theme-muted">{promo.type === 'PERCENTAGE_OFF' ? `${promo.value}% off` : `₹${promo.value} off`}</p>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <SettingRow title="" description="" enabled={promo.isActive} onToggle={() => onTogglePromotionStatus(promo.id)} />
                                        <Tooltip content="Edit promotion" position="bottom">
                                            <button onClick={() => setModalState({ type: 'edit_promo', data: promo })} className="text-sm font-medium text-primary-600 hover:underline">Edit</button>
                                        </Tooltip>
                                        <Tooltip content="Delete promotion" position="bottom">
                                            <button onClick={() => setPromotionToDelete(promo)} className="text-sm font-medium text-red-600 hover:underline">Delete</button>
                                        </Tooltip>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'history': return <div>{history.slice(-20).reverse().map(h => <div key={h.id} className="text-sm p-2 border-b border-theme-main text-theme-main">{h.timestamp}: {h.user} {h.action}d {h.itemType} "{h.itemName}"</div>)}</div>;
            case 'adjustments': return <div>{stockAdjustments.slice(-20).reverse().map(a => <div key={a.id} className="text-sm p-2 border-b border-theme-main text-theme-main">{a.timestamp}: {a.user} adjusted stock for {a.productName} by {a.quantityChange} ({a.reason})</div>)}</div>;
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
            case 'help': return (
                <div className="space-y-4">
                    <button onClick={isTutorialActive ? onEndTutorial : onStartTutorial} className="w-full text-left p-4 rounded-lg bg-theme-main hover:bg-theme-surface border border-theme-main text-theme-main">
                        <h3 className="font-semibold">{isTutorialActive ? 'End Tutorial' : 'Restart Welcome Tutorial'}</h3>
                        <p className="text-sm text-theme-muted">Get a guided tour of the application's main features.</p>
                    </button>
                </div>
            );
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-theme-main">Settings</h1>
            <div className="flex flex-col lg:flex-row gap-8">
                <nav className="lg:w-1/4 xl:w-1/5">
                    <ul className="space-y-1">
                        {TABS.map(tab => (
                            <li key={tab.id}>
                                <Tooltip content={`Go to ${tab.label} settings`} position="right">
                                    <button onClick={() => setActiveTab(tab.id)} className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md font-semibold text-sm transition-colors ${activeTab === tab.id ? 'bg-theme-surface text-primary-500 border border-theme-main shadow-sm' : 'text-theme-muted hover:bg-theme-main hover:text-theme-main'}`}>
                                        <Icon name={tab.icon} className="w-5 h-5"/>
                                        {tab.label}
                                    </button>
                                </Tooltip>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="flex-1">
                    {renderContent()}
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
                    <div className="bg-theme-surface rounded-lg shadow-xl max-w-md w-full border border-theme-main">
                         <div className="p-6 text-center">
                            <h3 className="text-lg font-bold text-red-500">Delete Business</h3>
                             <p className="text-sm text-theme-muted mt-2">This action is permanent and cannot be undone. All data associated with "{appSettings.shopName}" will be erased.</p>
                             <p className="text-sm text-theme-muted mt-4">To confirm, type the name of the business below:</p>
                            <input
                                type="text"
                                value={businessDeleteName}
                                onChange={e => setBusinessDeleteName(e.target.value)}
                                className="w-full mt-2 p-2 border rounded bg-theme-main text-theme-main border-theme-main focus:ring-1 focus:ring-red-500"
                                placeholder={appSettings.shopName}
                            />
                        </div>
                        <div className="p-4 bg-theme-main flex justify-end gap-4">
                            <button onClick={() => { setBusinessDeleteConfirm(false); setBusinessDeleteName(''); }} className="px-4 py-2 rounded-lg bg-theme-surface text-theme-main hover:bg-theme-main border border-theme-main transition">Cancel</button>
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
                                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition font-semibold disabled:opacity-50 shadow-sm"
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