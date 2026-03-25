import React, { useState, useRef } from 'react';
import Icon from './Icon';
import { Tooltip } from './Tooltip';

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
    const exportTextRef = useRef<HTMLTextAreaElement>(null);

    const handleCopy = () => {
        if (exportTextRef.current) {
            exportTextRef.current.select();
            document.execCommand('copy');
            setFeedback({type: 'success', message: 'Copied to clipboard!'});
            setTimeout(() => setFeedback(null), 2000);
        }
    };

    const handleDownload = () => {
        if (!currentAccountData) return;
        try {
            const parsedData = JSON.parse(currentAccountData);
            const shopName = parsedData.appSettings.shopName.replace(/\s+/g, '_');
            const date = new Date().toISOString().split('T')[0];
            const filename = `retail_hub_backup_${shopName}_${date}.json`;

            const blob = new Blob([currentAccountData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            setFeedback({type: 'error', message: "Could not create download file."});
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
                        <div>
                            <h4 className="font-semibold text-lg mb-2">Export Data</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Generate a code or file from this device to import on another. Keep this data safe.</p>
                            <textarea
                                ref={exportTextRef}
                                readOnly
                                value={currentAccountData}
                                className="w-full h-28 p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 text-xs font-mono"
                                placeholder="Your account data will appear here..."
                            />
                            <div className="flex gap-4 mt-2">
                                <Tooltip content="Copy data to clipboard" position="bottom">
                                    <button onClick={handleCopy} className="px-4 py-2 text-sm rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition">Copy Code</button>
                                </Tooltip>
                                <Tooltip content="Download data as a file" position="bottom">
                                    <button onClick={handleDownload} className="px-4 py-2 text-sm rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition">Download File</button>
                                </Tooltip>
                            </div>
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