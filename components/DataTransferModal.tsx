import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { Tooltip } from './Tooltip';
import { db, auth, handleFirestoreError, OperationType, doc, setDoc, getDoc, collection, getDocs } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface DataTransferModalProps {
  mode: 'full' | 'import_only';
  onClose: () => void;
  onImport: (data: string) => Promise<boolean>;
  currentAccountData?: string;
}

const DataTransferModal: React.FC<DataTransferModalProps> = ({ mode, onClose, onImport, currentAccountData }) => {
    const [importData, setImportData] = useState('');
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [isWorking, setIsWorking] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [cloudSnapshots, setCloudSnapshots] = useState<any[]>([]);
    const exportTextRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (u) fetchCloudSnapshots(u.uid);
        });
        return () => unsubscribe();
    }, []);

    const fetchCloudSnapshots = async (uid: string) => {
        try {
            const snapshotsRef = collection(db, 'shops', uid, 'snapshots');
            const snapshot = await getDocs(snapshotsRef);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCloudSnapshots(list);
        } catch (error) {
            console.error('Error fetching snapshots:', error);
        }
    };

    const handleCloudSnapshot = async () => {
        if (!user || !currentAccountData) {
            setFeedback({type: 'error', message: 'Please log in to save cloud snapshots.'});
            return;
        }
        if (selectedCategories.length === 0 && !includeHistory) {
            setFeedback({type: 'error', message: 'Please select at least one category to save.'});
            return;
        }

        setIsWorking(true);
        try {
            const parsedData = JSON.parse(currentAccountData);
            const snapshotId = `snap_${Date.now()}`;
            const snapshotData: any = {
                id: snapshotId,
                name: `Snapshot ${new Date().toLocaleString()}`,
                timestamp: new Date(),
                categories: selectedCategories,
                includeHistory,
                data: {}
            };

            // Reuse the filtering logic from handleCustomExport
            if (selectedCategories.includes('products')) {
                snapshotData.data.products = parsedData.products;
                snapshotData.data.dishes = parsedData.dishes;
                snapshotData.data.rawMaterials = parsedData.rawMaterials;
                snapshotData.data.batches = parsedData.batches;
                snapshotData.data.allocatedRawMaterials = parsedData.allocatedRawMaterials;
            }
            if (selectedCategories.includes('customers')) snapshotData.data.customers = parsedData.customers;
            if (selectedCategories.includes('suppliers')) snapshotData.data.suppliers = parsedData.suppliers;
            if (selectedCategories.includes('transactions')) snapshotData.data.transactions = parsedData.transactions;
            if (selectedCategories.includes('expenses')) snapshotData.data.expenses = parsedData.expenses;
            if (selectedCategories.includes('promotions')) snapshotData.data.promotions = parsedData.promotions;
            if (selectedCategories.includes('settings')) snapshotData.data.appSettings = parsedData.appSettings;
            if (selectedCategories.includes('users')) snapshotData.data.users = parsedData.users;
            
            if (includeHistory) {
                snapshotData.data.history = parsedData.history;
                snapshotData.data.stockAdjustments = parsedData.stockAdjustments;
            }

            const shopRef = doc(db, 'shops', user.uid);
            const shopDoc = await getDoc(shopRef);
            if (!shopDoc.exists()) {
                await setDoc(shopRef, {
                    id: user.uid,
                    name: parsedData.appSettings.shopName,
                    ownerEmail: user.email,
                    createdAt: new Date()
                });
            }

            await setDoc(doc(db, 'shops', user.uid, 'snapshots', snapshotId), snapshotData);
            setFeedback({type: 'success', message: 'Snapshot saved to cloud!'});
            fetchCloudSnapshots(user.uid);
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `shops/${user.uid}/snapshots`);
            setFeedback({type: 'error', message: 'Failed to save cloud snapshot.'});
        } finally {
            setIsWorking(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleRestoreSnapshot = async (snapshot: any) => {
        setIsWorking(true);
        try {
            const success = await onImport(JSON.stringify(snapshot.data));
            if (success) {
                setFeedback({type: 'success', message: 'Snapshot restored successfully!'});
            }
        } catch (error) {
            setFeedback({type: 'error', message: 'Failed to restore snapshot.'});
        } finally {
            setIsWorking(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleCopy = () => {
        if (exportTextRef.current) {
            exportTextRef.current.select();
            document.execCommand('copy');
            setFeedback({type: 'success', message: 'Copied to clipboard!'});
            setTimeout(() => setFeedback(null), 2000);
        }
    };

    const [selectedCategories, setSelectedCategories] = useState<string[]>(['products', 'customers', 'suppliers', 'transactions', 'expenses', 'promotions', 'settings', 'users']);
    const [includeHistory, setIncludeHistory] = useState(false);

    const exportCategories = [
        { id: 'products', label: 'Products & Inventory', icon: 'products', description: 'Products, dishes, raw materials & batches' },
        { id: 'customers', label: 'Customers', icon: 'customers', description: 'Profiles, credit ledger & rewards' },
        { id: 'suppliers', label: 'Suppliers', icon: 'suppliers', description: 'Profiles & credit ledger' },
        { id: 'transactions', label: 'Sales & Orders', icon: 'pos', description: 'Transactions, kitchen orders & held carts' },
        { id: 'expenses', label: 'Expenses', icon: 'expenses', description: 'Expense records & categories' },
        { id: 'promotions', label: 'Marketing', icon: 'marketing', description: 'Promotions & loyalty settings' },
        { id: 'settings', label: 'App Settings', icon: 'settings', description: 'Shop config, UPI, & UI preferences' },
        { id: 'users', label: 'Staff Accounts', icon: 'users', description: 'User profiles & roles' },
    ];

    const toggleCategory = (id: string) => {
        setSelectedCategories(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleCustomExport = () => {
        if (!currentAccountData) return;
        if (selectedCategories.length === 0 && !includeHistory) {
            setFeedback({type: 'error', message: 'Please select at least one category to export.'});
            return;
        }

        try {
            const parsedData = JSON.parse(currentAccountData);
            const exportData: any = {
                id: parsedData.id,
                name: parsedData.name,
                exportDate: new Date().toISOString(),
                isPartialExport: true
            };

            if (selectedCategories.includes('products')) {
                exportData.products = parsedData.products;
                exportData.dishes = parsedData.dishes;
                exportData.rawMaterials = parsedData.rawMaterials;
                exportData.batches = parsedData.batches;
                exportData.allocatedRawMaterials = parsedData.allocatedRawMaterials;
            }
            if (selectedCategories.includes('customers')) {
                exportData.customers = parsedData.customers;
                exportData.rewards = parsedData.rewards;
            }
            if (selectedCategories.includes('suppliers')) {
                exportData.suppliers = parsedData.suppliers;
            }
            if (selectedCategories.includes('transactions')) {
                exportData.transactions = parsedData.transactions;
                exportData.kitchenOrders = parsedData.kitchenOrders;
                exportData.heldCarts = parsedData.heldCarts;
            }
            if (selectedCategories.includes('expenses')) {
                exportData.expenses = parsedData.expenses;
            }
            if (selectedCategories.includes('promotions')) {
                exportData.promotions = parsedData.promotions;
            }
            if (selectedCategories.includes('settings')) {
                exportData.appSettings = parsedData.appSettings;
            }
            if (selectedCategories.includes('users')) {
                exportData.users = parsedData.users;
            }
            
            if (includeHistory) {
                exportData.history = parsedData.history;
                exportData.stockAdjustments = parsedData.stockAdjustments;
            }

            const shopName = parsedData.appSettings.shopName.replace(/\s+/g, '_');
            const date = new Date().toISOString().split('T')[0];
            const filename = `retail_hub_custom_${shopName}_${date}.json`;

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setFeedback({type: 'success', message: 'Custom export successful!'});
            setTimeout(() => setFeedback(null), 3000);
        } catch {
            setFeedback({type: 'error', message: "Could not create export file."});
        }
    };

    const handleSpecificExport = (type: 'customers' | 'suppliers' | 'products' | 'full') => {
        if (!currentAccountData) return;
        try {
            const parsedData = JSON.parse(currentAccountData);
            let exportData: any = {};
            let filename = '';
            const shopName = parsedData.appSettings.shopName.replace(/\s+/g, '_');
            const date = new Date().toISOString().split('T')[0];

            switch (type) {
                case 'customers':
                    exportData = { 
                        shopName: parsedData.appSettings.shopName,
                        exportType: 'Customers',
                        date: new Date().toISOString(),
                        customers: parsedData.customers.filter((c: any) => !c.isDeleted) 
                    };
                    filename = `retail_hub_customers_${shopName}_${date}.json`;
                    break;
                case 'suppliers':
                    exportData = { 
                        shopName: parsedData.appSettings.shopName,
                        exportType: 'Suppliers',
                        date: new Date().toISOString(),
                        suppliers: parsedData.suppliers.filter((s: any) => !s.isDeleted) 
                    };
                    filename = `retail_hub_suppliers_${shopName}_${date}.json`;
                    break;
                case 'products':
                    exportData = { 
                        shopName: parsedData.appSettings.shopName,
                        exportType: 'Products',
                        date: new Date().toISOString(),
                        products: parsedData.products.filter((p: any) => !p.isDeleted) 
                    };
                    filename = `retail_hub_products_${shopName}_${date}.json`;
                    break;
                case 'full':
                    exportData = parsedData;
                    filename = `retail_hub_full_backup_${shopName}_${date}.json`;
                    break;
            }

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setFeedback({type: 'success', message: `${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully!`});
            setTimeout(() => setFeedback(null), 3000);
        } catch {
            setFeedback({type: 'error', message: "Could not create export file."});
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                setImportData(text);
            };
            reader.onerror = () => setFeedback({type: 'error', message: 'Error reading file.'});
            reader.readAsText(file);
        }
    };

    const handleImportClick = async () => {
        if (!importData) {
            setFeedback({type: 'error', message: 'Please paste or upload your account data.'});
            return;
        }
        setIsWorking(true);
        setFeedback(null);
        const success = await onImport(importData);
        if (success) {
            setFeedback({type: 'success', message: 'Import successful!'});
        } else {
             setFeedback({type: 'error', message: 'Import failed. Please check the data and try again.'});
        }
        setIsWorking(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 modal-content">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold">Account Data Transfer</h3>
                    <Tooltip content="Close modal" position="bottom">
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                            <Icon name="close" className="w-5 h-5" />
                        </button>
                    </Tooltip>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto">
                    {mode === 'full' && (
                        <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="font-bold text-lg flex items-center gap-2">
                                        <Icon name="send" className="w-5 h-5 text-primary-500" />
                                        Custom Export
                                    </h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Select categories to include in your export file.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setSelectedCategories(exportCategories.map(c => c.id))}
                                        className="text-[10px] font-bold text-primary-600 hover:underline"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button 
                                        onClick={() => setSelectedCategories([])}
                                        className="text-[10px] font-bold text-slate-500 hover:underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                {exportCategories.map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => toggleCategory(cat.id)} 
                                        className={`flex items-center gap-3 p-2 rounded-xl border transition-all text-left ${
                                            selectedCategories.includes(cat.id) 
                                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 ring-1 ring-primary-500' 
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                            selectedCategories.includes(cat.id)
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                        }`}>
                                            <Icon name={cat.icon as any} className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{cat.label}</p>
                                            <p className="text-[9px] text-slate-500 truncate">{cat.description}</p>
                                        </div>
                                        {selectedCategories.includes(cat.id) && (
                                            <Icon name="check" className="w-4 h-4 text-primary-500" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            checked={includeHistory} 
                                            onChange={e => setIncludeHistory(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-10 h-5 rounded-full transition-colors ${includeHistory ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${includeHistory ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold">Include Activity History</p>
                                        <p className="text-[10px] text-slate-500">History logs & stock adjustments (can make file large)</p>
                                    </div>
                                </label>

                                <button 
                                    onClick={handleCustomExport}
                                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all font-bold"
                                >
                                    <Icon name="download" className="w-4 h-4" />
                                    Download
                                </button>

                                <button 
                                    onClick={handleCloudSnapshot}
                                    disabled={isWorking}
                                    className="flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all font-bold shadow-sm disabled:opacity-50"
                                >
                                    <Icon name="cloud" className="w-4 h-4" />
                                    {isWorking ? 'Saving...' : 'Save to Cloud'}
                                </button>
                            </div>

                            {cloudSnapshots.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <h5 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
                                        <Icon name="history" className="w-3 h-3" />
                                        Recent Cloud Snapshots
                                    </h5>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                        {cloudSnapshots.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds).map(snap => (
                                            <div key={snap.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                <div>
                                                    <p className="text-[10px] font-bold">{snap.name}</p>
                                                    <p className="text-[9px] text-slate-500">
                                                        {snap.categories?.length || 0} categories • {snap.includeHistory ? 'With History' : 'No History'}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => handleRestoreSnapshot(snap)}
                                                    className="text-[10px] font-bold text-primary-500 hover:underline"
                                                >
                                                    Restore
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <details className="group mt-6">
                                <summary className="text-[10px] font-semibold text-slate-400 cursor-pointer hover:text-primary-500 transition-colors list-none flex items-center gap-1">
                                    <Icon name="arrow-right" className="w-3 h-3 group-open:rotate-90 transition-transform" />
                                    Advanced: Quick Presets & Raw Code
                                </summary>
                                <div className="pt-3 space-y-3">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleSpecificExport('full')} className="text-[10px] px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300">Full Backup Preset</button>
                                        <button onClick={handleCopy} className="text-[10px] px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300">Copy Raw JSON</button>
                                    </div>
                                    <textarea
                                        ref={exportTextRef}
                                        readOnly
                                        value={currentAccountData}
                                        className="w-full h-20 p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-[10px] font-mono"
                                    />
                                </div>
                            </details>
                        </div>
                    )}

                    <div>
                         <h4 className="font-semibold text-lg mb-2">Import Data</h4>
                         <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-700 mb-4">
                            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Warning: Importing data will overwrite any current shop data on this device. This action cannot be undone.</p>
                         </div>
                         <textarea
                            value={importData}
                            onChange={e => setImportData(e.target.value)}
                            className="w-full h-28 p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-xs font-mono"
                            placeholder="Paste your export code here..."
                        />
                        <div className="mt-2">
                            <label className="text-sm text-slate-600 dark:text-slate-400">Or upload a file: </label>
                            <input type="file" accept=".json, .txt" onChange={handleFileChange} className="text-sm" />
                        </div>
                    </div>

                    {feedback && (
                        <div className={`p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'}`}>
                            {feedback.message}
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t dark:border-slate-700 flex justify-end gap-4 mt-auto bg-slate-50 dark:bg-slate-900/50">
                    <Tooltip content="Cancel and close" position="top">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                    </Tooltip>
                    <Tooltip content="Import the provided data" position="top">
                        <button onClick={handleImportClick} disabled={isWorking} className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition font-semibold disabled:opacity-60">
                            {isWorking ? 'Importing...' : 'Import Data'}
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

export default DataTransferModal;