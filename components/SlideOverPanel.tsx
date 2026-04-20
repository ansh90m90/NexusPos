import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from './Icon';

interface SlideOverPanelProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footer: React.ReactNode;
    position?: 'right' | 'bottom';
    isOpen?: boolean;
}

export const SlideOverPanel: React.FC<SlideOverPanelProps> = ({ 
    title, 
    onClose, 
    children, 
    footer, 
    position = 'right',
    isOpen = true 
}) => {
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

    // Use motion for backdrop and panel
    const variants = {
        backdrop: {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 }
        },
        panel: {
            initial: position === 'right' ? { x: '100%' } : { y: '100%' },
            animate: position === 'right' ? { x: 0 } : { y: 0 },
            exit: position === 'right' ? { x: '100%' } : { y: '100%' }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] overflow-hidden">
                    <motion.div 
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={variants.backdrop}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
                        onClick={handleBackdropClick}
                    />
                    
                    <div className={`absolute inset-0 flex pointer-events-none ${position === 'right' ? 'justify-end' : 'justify-center items-end'}`}>
                        <motion.div 
                            ref={panelRef}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            variants={variants.panel}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={`
                                pointer-events-auto
                                bg-white dark:bg-slate-900
                                shadow-2xl flex flex-col
                                ${position === 'right' 
                                    ? 'w-full md:max-w-xl h-full' 
                                    : 'w-full max-h-[90vh] rounded-t-3xl md:rounded-t-[2.5rem]'
                                }
                            `}
                        >
                            <div className="flex-shrink-0 px-5 py-4 md:px-8 md:py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
                                    <div className="w-10 h-1 bg-primary-500 rounded-full mt-1.5" />
                                </div>
                                <button 
                                    onClick={onClose} 
                                    className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all shadow-sm"
                                >
                                    <Icon name="close" className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex-grow p-4 md:p-8 overflow-y-auto custom-scrollbar">
                                {children}
                            </div>

                            <div className="flex-shrink-0 px-5 py-4 md:px-8 md:py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl">
                                <div className="flex justify-end gap-4">
                                    {footer}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SlideOverPanel;
