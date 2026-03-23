import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    delay?: number;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, delay = 500, position = 'top', className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<any>(null);
    const triggerRef = useRef<any>(null);

    const handleMouseEnter = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                let x = rect.left + rect.width / 2;
                let y = rect.top;

                if (position === 'bottom') {
                    y = rect.bottom;
                } else if (position === 'left') {
                    x = rect.left;
                    y = rect.top + rect.height / 2;
                } else if (position === 'right') {
                    x = rect.right;
                    y = rect.top + rect.height / 2;
                }

                setCoords({ x, y });
                setIsVisible(true);
            }
        }, delay);
    }, [delay, position]);

    const handleMouseLeave = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const child = React.Children.only(children) as React.ReactElement<any>;
    
    const setRefs = useCallback((node: HTMLElement | null) => {
        triggerRef.current = node;
        const { ref } = child as any;
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref && 'current' in ref) {
            // eslint-disable-next-line react-hooks/immutability
            ref.current = node;
        }
    }, [child]);

    const clonedChild = React.cloneElement(child, {
        ref: setRefs,
        onMouseEnter: (e: React.MouseEvent) => {
            handleMouseEnter();
            if (child.props.onMouseEnter) child.props.onMouseEnter(e);
        },
        onMouseLeave: (e: React.MouseEvent) => {
            handleMouseLeave();
            if (child.props.onMouseLeave) child.props.onMouseLeave(e);
        },
        onFocus: (e: React.FocusEvent) => {
            handleMouseEnter();
            if (child.props.onFocus) child.props.onFocus(e);
        },
        onBlur: (e: React.FocusEvent) => {
            handleMouseLeave();
            if (child.props.onBlur) child.props.onBlur(e);
        }
    });

    return (
        <>
            {clonedChild}
            {typeof window !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isVisible && content && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            style={{
                                position: 'fixed',
                                left: coords.x,
                                top: coords.y,
                                transform: `translate(${position === 'left' ? 'calc(-100% - 8px)' : position === 'right' ? '8px' : '-50%'}, ${position === 'top' ? 'calc(-100% - 8px)' : position === 'bottom' ? '8px' : '-50%'})`,
                                zIndex: 99999,
                                pointerEvents: 'none',
                            }}
                            className={`px-3 py-2 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-sm text-white text-xs rounded-lg shadow-xl border border-slate-700/50 max-w-xs whitespace-normal font-medium ${className}`}
                        >
                            {content}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

export default Tooltip;
