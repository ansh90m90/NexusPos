import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import { ToastContext, ToastType } from './ToastContext';

export { useToast } from './ToastContext';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

const Toast: React.FC<{ toast: ToastMessage; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
            const removeTimer = setTimeout(() => onRemove(toast.id), 300);
            return () => clearTimeout(removeTimer);
        }, 4000);

        return () => clearTimeout(exitTimer);
    }, [toast.id, onRemove]);
    
    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
    };

    const baseClasses = 'w-full p-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-semibold transition-all duration-300';
    const typeClasses = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
    };
    
    const animationClass = isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100';

    return (
        <div className={`${baseClasses} ${typeClasses[toast.type]} ${animationClass} modal-content`}>
            <span className="flex-grow">{toast.message}</span>
            <button onClick={handleRemove} className="p-1 rounded-full hover:bg-white/20 flex-shrink-0">
                <Icon name="close" className="h-4 w-4" />
            </button>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    toastIdRef.current += 1;
    const newToast: ToastMessage = { id: toastIdRef.current, message, type };
    setToasts(prev => [newToast, ...prev]);
  }, []);
  
  const removeToast = useCallback((id: number) => {
    setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[200] space-y-2 w-full max-w-xs">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};