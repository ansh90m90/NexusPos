import React, { useLayoutEffect, useState, useRef } from 'react';
import type { Page } from '../types';
import Icon from './Icon';
import { Tooltip } from './Tooltip';

export interface TutorialStep {
    elementSelector: string | null;
    title: string;
    content: string;
    page?: Page; 
}

interface TutorialProps {
    steps: TutorialStep[];
    isTutorialActive: boolean;
    onClose: () => void;
    currentStep: number;
    onNext: () => void;
    onPrev: () => void;
    mainScrollTop: number;
}

const Tutorial: React.FC<TutorialProps> = ({ steps, isTutorialActive, onClose, currentStep, onNext, onPrev, mainScrollTop }) => {
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const popoverRef = useRef<HTMLDivElement>(null);
    const step = steps[currentStep];

    useLayoutEffect(() => {
        if (!isTutorialActive || !step) return;

        let rafId: number;

        const updatePositions = () => {
            let targetElement = step.elementSelector ? document.querySelector(step.elementSelector) : null;
            
            // On mobile, if a nav item is not found, try the mobile-nav- prefix
            if (!targetElement && step.elementSelector?.includes('nav-')) {
                const mobileSelector = step.elementSelector.replace('nav-', 'mobile-nav-');
                targetElement = document.querySelector(mobileSelector);
            }

            if (targetElement) {
                const targetRect = targetElement.getBoundingClientRect();
                setHighlightStyle({
                    top: `${targetRect.top - 5}px`,
                    left: `${targetRect.left - 5}px`,
                    width: `${targetRect.width + 10}px`,
                    height: `${targetRect.height + 10}px`,
                    opacity: 1,
                    transform: 'scale(1)',
                });

                if (popoverRef.current) {
                    const popoverRect = popoverRef.current.getBoundingClientRect();
                    let popoverTop = targetRect.bottom + 15;
                    let popoverLeft = targetRect.left;

                    // Check vertical space
                    if (popoverTop + popoverRect.height > window.innerHeight) {
                        popoverTop = targetRect.top - popoverRect.height - 15;
                    }

                    // Check horizontal space
                    if (popoverLeft + popoverRect.width > window.innerWidth) {
                        popoverLeft = targetRect.right - popoverRect.width;
                    }
                    
                    // Clamp to be within viewport
                    popoverTop = Math.max(10, Math.min(popoverTop, window.innerHeight - popoverRect.height - 10));
                    popoverLeft = Math.max(10, Math.min(popoverLeft, window.innerWidth - popoverRect.width - 10));

                    setPopoverStyle({
                        top: `${popoverTop}px`,
                        left: `${popoverLeft}px`,
                        opacity: 1,
                    });
                }
            } else {
                // Centered modal for steps without a selector
                setHighlightStyle({ opacity: 0, transform: 'scale(0.9)' });
                setPopoverStyle({
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: 1,
                });
            }
        };

        // Wait for the next browser paint to ensure layout is stable after potential scroll/page change
        rafId = requestAnimationFrame(() => {
            setPopoverStyle({ opacity: 0 });
            setHighlightStyle({ opacity: 0, transform: 'scale(0.9)' });
            updatePositions();
        });

        window.addEventListener('resize', updatePositions);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', updatePositions);
        };
    }, [currentStep, isTutorialActive, step, mainScrollTop]);

    if (!isTutorialActive) return null;
    
    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            onNext();
        } else {
            onClose();
        }
    };
    
    const handlePrev = () => {
        if (currentStep > 0) {
            onPrev();
        }
    };

    return (
        <div className="fixed inset-0 z-[100]">
            {step.elementSelector && <div className="tutorial-highlight" style={highlightStyle} />}
            {!step.elementSelector && <div className="fixed inset-0 bg-black/60" />}
            
            <div ref={popoverRef} className="tutorial-popover" style={popoverStyle}>
                <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{step.title}</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{step.content}</p>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500">{`Step ${currentStep + 1} of ${steps.length}`}</span>
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <Tooltip content="Go to previous step" position="top">
                                <button onClick={handlePrev} className="px-3 py-1 text-sm rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Previous</button>
                            </Tooltip>
                        )}
                        <Tooltip content={currentStep === steps.length - 1 ? 'Finish tutorial' : 'Go to next step'} position="top">
                            <button onClick={handleNext} className="px-3 py-1 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700">
                                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                            </button>
                        </Tooltip>
                    </div>
                </div>
                <Tooltip content="Skip tutorial" position="bottom">
                    <button onClick={onClose} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
};

export default Tutorial;
