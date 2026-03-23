
import React, { useCallback } from 'react';
import type { Customer, Promotion, Product } from '../types';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';
import { Tooltip } from '../components/Tooltip';

interface MarketingProps {
    accountId: string;
    customers: Customer[];
    promotions: Promotion[];
    onSavePromotion: (promotion: Partial<Promotion>) => void;
    setModalState: (state: { type: string | null; data: any }) => void;
    products: Product[];
}

const Marketing: React.FC<MarketingProps> = ({ promotions, onSavePromotion, setModalState }) => {
    const toast = useToast();

    const handleCreatePromotion = useCallback((promotionData: Partial<Promotion>) => {
        onSavePromotion(promotionData);
        toast.showToast(`Promotion "${promotionData.name}" created successfully!`, 'success');
    }, [onSavePromotion, toast]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Marketing Hub</h1>
                <Tooltip content="Create a new promotional campaign" position="bottom">
                    <button 
                        onClick={() => setModalState({ type: 'PROMOTION_MODAL', data: null })}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
                    >
                        <Icon name="plus" className="w-5 h-5" />
                        New Promotion
                    </button>
                </Tooltip>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {promotions.length > 0 ? (
                    promotions.map((promotion) => (
                        <div key={promotion.id} className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-slate-900 dark:text-white">{promotion.name}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${promotion.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {promotion.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex-grow">
                                {promotion.type === 'PERCENTAGE_OFF' ? `${promotion.value}% off` : `₹${promotion.value} off`}
                                {promotion.minPurchaseAmount > 0 && ` on orders above ₹${promotion.minPurchaseAmount}`}
                            </p>
                            <div className="flex gap-2 mt-auto">
                                <Tooltip content={`Edit ${promotion.name}`} position="top">
                                    <button 
                                        onClick={() => setModalState({ type: 'PROMOTION_MODAL', data: promotion })}
                                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                                    >
                                        Edit
                                    </button>
                                </Tooltip>
                                <Tooltip content={`Duplicate ${promotion.name}`} position="top">
                                    <button 
                                        onClick={() => handleCreatePromotion({ ...promotion, id: `promo_${Date.now()}`, isActive: true })}
                                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900 transition"
                                    >
                                        Duplicate
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center p-10 bg-white dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <Icon name="marketing" className="w-12 h-12 mx-auto text-slate-400" />
                        <h3 className="mt-2 font-semibold text-slate-900 dark:text-white">No promotions yet</h3>
                        <p className="mt-1 text-sm text-slate-500">Create your first promotion to boost your sales.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Marketing;
