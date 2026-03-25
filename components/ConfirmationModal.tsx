import React from 'react';
import Icon from './Icon';
import { Tooltip } from './Tooltip';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-amber-500 hover:bg-amber-600 text-white',
        info: 'bg-primary-600 hover:bg-primary-700 text-white'
    };

    const iconColors = {
        danger: 'text-red-600 bg-red-100 dark:bg-red-900/30',
        warning: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
        info: 'text-primary-600 bg-primary-100 dark:bg-primary-900/30'
    };

    const icons = {
        danger: 'alert-triangle',
        warning: 'alert-circle',
        info: 'info'
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div 
                    className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm transition-opacity" 
                    onClick={onCancel}
                />

                <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-neutral-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <div className="bg-white dark:bg-neutral-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${iconColors[type]}`}>
                                <Icon name={icons[type]} className="h-6 w-6" />
                            </div>
                            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                <h3 className="text-lg font-bold leading-6 text-neutral-900 dark:text-white">
                                    {title}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                        <Tooltip content={confirmText} position="top">
                            <button
                                type="button"
                                className={`inline-flex w-full justify-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm sm:w-auto transition-all ${colors[type]}`}
                                onClick={onConfirm}
                            >
                                {confirmText}
                            </button>
                        </Tooltip>
                        <Tooltip content={cancelText} position="top">
                            <button
                                type="button"
                                className="mt-3 inline-flex w-full justify-center rounded-xl bg-white dark:bg-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white shadow-sm ring-1 ring-inset ring-neutral-300 dark:ring-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600 sm:mt-0 sm:w-auto transition-all"
                                onClick={onCancel}
                            >
                                {cancelText}
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
