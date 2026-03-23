import React from 'react';
import type { Page } from '../types';
import Icon from './Icon';
import { Tooltip } from './Tooltip';

export type FabPageAction = 'add_product' | 'add_customer' | 'add_custom_item' | 'add_expense' | 'add_supplier';

interface FABProps {
    currentPage: Page;
    onAction: (action: FabPageAction) => void;
}

const pageToActionMap: Partial<Record<Page, { action: FabPageAction; icon: string; title: string }>> = {
    'Products': { action: 'add_product', icon: 'plus', title: 'Add New Product' },
    'Customers': { action: 'add_customer', icon: 'plus', title: 'Add New Customer' },
    'Expenses': { action: 'add_expense', icon: 'plus', title: 'Add New Expense' },
    'Suppliers': { action: 'add_supplier', icon: 'plus', title: 'Add New Supplier' },
};

const FAB: React.FC<FABProps> = ({ currentPage, onAction }) => {
    const mapping = pageToActionMap[currentPage];

    if (!mapping) {
        return null;
    }
    
    return (
        <Tooltip content={mapping.title} position="left">
            <button
                onClick={() => onAction(mapping.action)}
                className={'fixed bottom-20 md:bottom-6 right-6 z-40 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 transition-transform transform hover:scale-110 active:scale-100'}
            >
                <Icon name={mapping.icon} className="w-7 h-7" />
            </button>
        </Tooltip>
    );
};

export default FAB;