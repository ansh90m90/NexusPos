import React, { useEffect, useRef } from 'react';
import Icon from './Icon';

interface SlideOverPanelProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footer: React.ReactNode;
    position?: 'right' | 'bottom';
}

export const SlideOverPanel: React.FC<SlideOverPanelProps> = ({ title, onClose, children, footer, position = 'right' }) => {
    const panelRef = useRef<HTMLDivElement>(null);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const backdropClasses = position === 'right' ? 'justify-end' : 'justify-center items-end';
    const panelClasses = position === 'right' 
        ? 'w-full max-w-2xl h-full panel-content-right'
        : 'w-full max-h-[80vh] rounded-t-2xl panel-content-bottom';

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-60 flex z-[70] panel-backdrop ${backdropClasses}`} onClick={handleBackdropClick}>
            <div ref={panelRef} className={`bg-theme-surface shadow-xl flex flex-col ${panelClasses}`}>
                <div className="flex-shrink-0 px-4 py-3 border-b border-theme-main flex items-center justify-between">
                    <h3 className="text-xl font-bold text-theme-main">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-theme-main text-theme-muted transition-colors">
                        <Icon name="close" className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-grow p-6 overflow-y-auto">{children}</div>
                <div className="flex-shrink-0 px-4 py-3 border-t border-theme-main flex justify-end gap-4 bg-theme-main/30">
                    {footer}
                </div>
            </div>
        </div>
    );
};

export default SlideOverPanel;