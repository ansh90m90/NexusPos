
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
                <h1 className="text-3xl font-bold text-theme-main">Marketing Hub</h1>
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
                        <div key={promotion.id} className="bg-theme-surface rounded-xl border border-theme-main shadow-sm p-4 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-theme-main">{promotion.name}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${promotion.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-theme-main text-theme-muted'}`}>
                                    {promotion.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-sm text-theme-muted mb-4 flex-grow">
                                {promotion.type === 'PERCENTAGE_OFF' ? `${promotion.value}% off` : `₹${promotion.value} off`}
                                {promotion.minPurchaseAmount > 0 && ` on orders above ₹${promotion.minPurchaseAmount}`}
                            </p>
                            <div className="flex gap-2 mt-auto">
                                <Tooltip content={`Edit ${promotion.name}`} position="top">
                                    <button 
                                        onClick={() => setModalState({ type: 'PROMOTION_MODAL', data: promotion })}
                                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-theme-main text-theme-main hover:bg-theme-surface border border-theme-main transition"
                                    >
                                        Edit
                                    </button>
                                </Tooltip>
                                <Tooltip content={`Duplicate ${promotion.name}`} position="top">
                                    <button 
                                        onClick={() => handleCreatePromotion({ ...promotion, id: `promo_${Date.now()}`, isActive: true })}
                                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-theme-accent/10 text-theme-accent hover:bg-theme-accent/20 transition"
                                    >
                                        Duplicate
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center p-10 bg-theme-surface rounded-xl border border-dashed border-theme-main">
                        <Icon name="marketing" className="w-12 h-12 mx-auto text-theme-muted" />
                        <h3 className="mt-2 font-semibold text-theme-main">No promotions yet</h3>
                        <p className="mt-1 text-sm text-theme-muted">Create your first promotion to boost your sales.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Marketing;
