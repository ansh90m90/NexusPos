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

    const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isVisible) return;
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        
        setCoords({ x: clientX, y: clientY });
    }, [isVisible]);

    const handleMouseEnter = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        timeoutRef.current = setTimeout(() => {
            setCoords({ x: clientX, y: clientY });
            setIsVisible(true);
        }, delay);
    }, [delay]);

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
            handleMouseEnter(e);
            if (child.props.onMouseEnter) child.props.onMouseEnter(e);
        },
        onMouseMove: (e: React.MouseEvent) => {
            handleMouseMove(e);
            if (child.props.onMouseMove) child.props.onMouseMove(e);
        },
        onMouseLeave: (e: React.MouseEvent) => {
            handleMouseLeave();
            if (child.props.onMouseLeave) child.props.onMouseLeave(e);
        },
        onTouchStart: (e: React.TouchEvent) => {
            handleMouseEnter(e);
            if (child.props.onTouchStart) child.props.onTouchStart(e);
        },
        onTouchMove: (e: React.TouchEvent) => {
            handleMouseMove(e);
            if (child.props.onTouchMove) child.props.onTouchMove(e);
        },
        onTouchEnd: (e: React.TouchEvent) => {
            handleMouseLeave();
            if (child.props.onTouchEnd) child.props.onTouchEnd(e);
        },
        onFocus: (e: React.FocusEvent) => {
            // For focus, we don't have mouse coords, so we fallback to element rect if needed
            // But user specifically asked for pointer, so we'll just ignore focus-based positioning for now
            // or use the center of the element.
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({ x: rect.left + rect.width / 2, y: rect.top });
                setIsVisible(true);
            }
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
                            transition={{ duration: 0.1 }}
                            style={{
                                position: 'fixed',
                                left: coords.x,
                                top: coords.y,
                                transform: `translate(${position === 'left' ? 'calc(-100% - 12px)' : position === 'right' ? '12px' : '-50%'}, ${position === 'top' ? 'calc(-100% - 12px)' : position === 'bottom' ? '12px' : '-50%'})`,
                                zIndex: 99999,
                                pointerEvents: 'none',
                            }}
                            className={`px-3 py-2 bg-theme-surface backdrop-blur-md text-theme-main dark:text-white text-xs rounded-lg shadow-2xl border border-theme-main max-w-xs whitespace-normal font-medium z-[99999] ${className}`}
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
