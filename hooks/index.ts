
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { applyOperation } from '../reducer';
import type { AccountState, User, Promotion, Dish, RawMaterial, Supplier, PurchaseOrder, Batch, StockAdjustmentReason, ItemType, Expense, AppSettings, HeldCart, Operation } from '../types';
import { saveBusinessState, pushOperation, subscribeToOperations } from '../services/syncService';
import type { ToastContextType } from '../components/ToastContext';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

// --- useLocalStorage Hook ---
export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item === 'undefined') return initialValue;
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error parsing localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const [prevKey, setPrevKey] = useState(key);

  // Sync with localStorage when key changes during render to avoid one-frame lag
  if (key !== prevKey) {
    setPrevKey(key);
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if (item === 'undefined') {
          setStoredValue(initialValue);
        } else {
          const value = item ? JSON.parse(item) : initialValue;
          setStoredValue(value);
        }
      } catch (error) {
        console.error(`Error syncing localStorage key "${key}":`, error);
      }
    }
  }

  // Listen for storage events from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = (e: any) => {
      if (e.key === key && e.newValue !== null) {
        try {
          if (e.newValue === 'undefined') {
            setStoredValue(initialValue);
          } else {
            setStoredValue(JSON.parse(e.newValue));
          }
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback((value) => {
    setStoredValue(prevStoredValue => {
      try {
        const valueToStore = value instanceof Function ? value(prevStoredValue) : value;
        
        // Optimization: Don't update if value is the same
        if (JSON.stringify(valueToStore) === JSON.stringify(prevStoredValue)) {
          return prevStoredValue;
        }

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        return valueToStore;
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
        return prevStoredValue;
      }
    });
  }, [key]);

  return [storedValue, setValue];
}

// --- useSync Hook ---
export const useSync = (
    accountId: string | null,
    businessId: string | null,
    accountState: AccountState | null,
    setAccountState: React.Dispatch<React.SetStateAction<AccountState | null>>
) => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
    const [clientId] = useState(() => `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    const accountStateRef = useRef(accountState);
    useEffect(() => {
        accountStateRef.current = accountState;
    }, [accountState]);

    const setAccountStateRef = useRef(setAccountState);
    useEffect(() => {
        setAccountStateRef.current = setAccountState;
    }, [setAccountState]);

    const syncTimeoutRef = useRef<any>(null);

    const runSync = useCallback(async () => {
        const currentAccountState = accountStateRef.current;
        if (!currentAccountState || currentAccountState.isTest || !accountId || !businessId) return;

        // Debounce sync to prevent exhausting Firestore write quota
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        
        syncTimeoutRef.current = setTimeout(async () => {
            setSyncStatus('syncing');
            try {
                await saveBusinessState(accountId, businessId, currentAccountState);
                setSyncStatus('synced');
            } catch (error) {
                console.error('Sync failed:', error);
                setSyncStatus('error');
            }
        }, 2000); // 2 second debounce
    }, [accountId, businessId]);

    const dispatchOperation = useCallback((type: string, payload: any, skipSync = false) => {
        const currentAccountState = accountStateRef.current;
        if (!currentAccountState || !accountId || !businessId) return;

        const operation: Operation = {
            id: Date.now(), // In a real app, use a more robust ID system
            clientId: clientId,
            timestamp: Date.now(),
            type,
            payload,
        };
        
        setAccountStateRef.current(prevState => {
            if (!prevState) return null;
            const newState = applyOperation(prevState, operation);
            return { ...newState, lastSyncId: operation.id };
        });
        
        if (currentAccountState.isTest || skipSync) return;

        pushOperation(accountId, businessId, operation).catch(err => {
            console.error("Failed to push operation:", err);
            setSyncStatus('error');
        });
        
        // Also update the full state periodically or after critical actions
        runSync();
    }, [runSync, clientId, accountId, businessId]);

    useEffect(() => {
        if (!accountId || !businessId || accountState?.isTest) {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            return;
        }

        // Only subscribe once per businessId
        if (unsubscribeRef.current) return;

        const lastSyncId = accountState?.lastSyncId || 0;

        unsubscribeRef.current = subscribeToOperations(accountId, businessId, lastSyncId, (newOps) => {
            setAccountStateRef.current(prevState => {
                if (!prevState || prevState.id !== businessId) return prevState;
                
                let nextState = { ...prevState };
                let maxId = prevState.lastSyncId || 0;

                newOps.forEach(op => {
                    if (op.clientId !== clientId) {
                        nextState = applyOperation(nextState, op);
                        if (op.id > maxId) maxId = op.id;
                    }
                });

                return { ...nextState, lastSyncId: maxId };
            });
        });

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId, businessId, accountState?.isTest, clientId]);

    return { syncStatus, runSync, dispatchOperation };
};


// --- useAccountActions Hook ---
interface AccountActionsProps {
    dispatchOperation: (type: string, payload: any, skipSync?: boolean) => void;
    currentUser: User | null;
    setModalState: React.Dispatch<React.SetStateAction<{ type: string | null; data: any; }>>;
    toast: ToastContextType;
    accountState: AccountState;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export const useAccountActions = ({ dispatchOperation, currentUser, setModalState, toast, accountState, setCurrentUser }: AccountActionsProps) => {
    
    const withUser = useCallback((payload: any) => ({ ...payload, user: currentUser?.name || 'Unknown' }), [currentUser?.name]);

    // --- Transaction & POS Actions ---
    const handleNewTransaction = useCallback((transaction: any) => dispatchOperation('CREATE_TRANSACTION', withUser({ transaction })), [dispatchOperation, withUser]);
    const handleCancelTransaction = useCallback((transactionId: string) => dispatchOperation('CANCEL_TRANSACTION', withUser({ transactionId })), [dispatchOperation, withUser]);
    const handleUpdateHeldCarts = useCallback((updater: React.SetStateAction<HeldCart[]>) => {
        const newCarts = typeof updater === 'function' ? updater(accountState.heldCarts) : updater;
        dispatchOperation('UPDATE_HELD_CARTS', { carts: newCarts }, true); // Local only
    }, [dispatchOperation, accountState.heldCarts]);

    // --- Product & Inventory Actions ---
    const handleSaveProduct = useCallback((product: any) => {
        dispatchOperation('SAVE_PRODUCT', withUser({ product }));
        setModalState({ type: null, data: null });
        toast.showToast('Product saved.', 'success');
    }, [dispatchOperation, withUser, setModalState, toast]);
    const handleDeleteProduct = useCallback((productId: number) => dispatchOperation('DELETE_PRODUCT', withUser({ productId })), [dispatchOperation, withUser]);
    const handleDeletePurchase = useCallback((purchaseId: string) => dispatchOperation('DELETE_PURCHASE', withUser({ purchaseId })), [dispatchOperation, withUser]);
    const handleNewPurchase = useCallback((
        order: PurchaseOrder, 
        batches: (Omit<Batch, 'id' | 'receivedDate'> & { productName?: string })[], 
        newSupplierName?: string,
        newSupplierGstin?: string,
        newSupplierAddress?: string,
        newSupplierContact?: string
    ) => {
        dispatchOperation('CREATE_PURCHASE', withUser({ 
            order, 
            batches, 
            newSupplierName, 
            newSupplierGstin,
            newSupplierAddress,
            newSupplierContact
        }));
    }, [dispatchOperation, withUser]);
    const handleAdjustStock = useCallback((variantId: number, productName: string, quantityChange: number, reason: StockAdjustmentReason, notes?: string) => {
        dispatchOperation('ADJUST_STOCK', withUser({ variantId, productName, quantityChange, reason, notes }));
    }, [dispatchOperation, withUser]);

    // --- Customer Actions ---
    const handleSaveCustomer = useCallback((customer: any) => {
        dispatchOperation('SAVE_CUSTOMER', withUser({ customer }));
        setModalState({ type: null, data: null });
        toast.showToast('Customer saved.', 'success');
    }, [dispatchOperation, withUser, setModalState, toast]);
    const handleDeleteCustomer = useCallback((customerId: number) => dispatchOperation('DELETE_CUSTOMER', withUser({ customerId })), [dispatchOperation, withUser]);
    const handleAddCustomerPayment = useCallback((customerId: number, amount: number, isLoan: boolean) => dispatchOperation('ADD_CUSTOMER_PAYMENT', withUser({ customerId, amount, isLoan })), [dispatchOperation, withUser]);

    // --- Staff & User Actions ---
    const handleSaveUser = useCallback((user: any) => {
        dispatchOperation('SAVE_USER', { user }); // No user needed, system action
        toast.showToast('Staff member saved.', 'success');
    }, [dispatchOperation, toast]);
    const handleDeleteUser = useCallback((userId: number) => dispatchOperation('DELETE_USER', { userId }), [dispatchOperation]);
    const handleUpdateCurrentUser = useCallback((updateData: any) => {
        const payload = { userId: currentUser!.id, updateData };
        if (updateData.oldPassword && updateData.newPassword) {
            dispatchOperation('UPDATE_CURRENT_USER', payload);
            return { success: true, message: "Profile update queued." };
        } else {
             dispatchOperation('UPDATE_CURRENT_USER', payload);
             setCurrentUser(prev => prev ? {...prev, name: updateData.name, email: updateData.email } : null);
             return { success: true, message: "Profile updated." };
        }
    }, [dispatchOperation, currentUser, setCurrentUser]);

    // --- Promotion Actions ---
    const handleSavePromotion = useCallback((promotion: Partial<Promotion>) => dispatchOperation('SAVE_PROMOTION', withUser({ promotion })), [dispatchOperation, withUser]);
    const handleDeletePromotion = useCallback((promotionId: string) => dispatchOperation('DELETE_PROMOTION', withUser({ promotionId })), [dispatchOperation, withUser]);
    const handleTogglePromotionStatus = useCallback((promotionId: string) => dispatchOperation('TOGGLE_PROMOTION_STATUS', withUser({ promotionId })), [dispatchOperation, withUser]);

    // --- Restaurant Actions ---
    const handleSaveDish = useCallback((dish: Partial<Dish>) => { dispatchOperation('SAVE_DISH', withUser({ dish })); setModalState({ type: null, data: null }); toast.showToast('Dish saved.', 'success'); }, [dispatchOperation, withUser, setModalState, toast]);
    const handleDeleteDish = useCallback((dishId: number) => {
        const canDelete = !accountState.kitchenOrders.some(o => o.status === 'Pending' && o.items.some(i => i.dish.id === dishId));
        if (canDelete) {
            dispatchOperation('DELETE_DISH', withUser({ dishId }));
            return { success: true, message: "Delete operation queued." };
        }
        return { success: false, message: "Cannot delete a dish that is part of a pending kitchen order." };
    }, [dispatchOperation, withUser, accountState.kitchenOrders]);
    const handleSaveRawMaterial = useCallback((material: Partial<RawMaterial>) => { dispatchOperation('SAVE_RAW_MATERIAL', withUser({ material })); setModalState({ type: null, data: null }); toast.showToast('Material saved.', 'success'); }, [dispatchOperation, withUser, setModalState, toast]);
    const handleDeleteRawMaterial = useCallback((materialId: number) => {
         const canDelete = !accountState.dishes.some(d => !d.isDeleted && d.ingredients.some(i => i.id === materialId));
         if (canDelete) {
            dispatchOperation('DELETE_RAW_MATERIAL', withUser({ materialId }));
            return { success: true, message: "Delete operation queued." };
         }
         return { success: false, message: "Cannot delete a raw material that is used in an active dish." };
    }, [dispatchOperation, withUser, accountState.dishes]);
    const handleUpdateKitchenOrders = useCallback((orders: any) => dispatchOperation('UPDATE_KITCHEN_ORDERS', { orders }), [dispatchOperation]);

    // --- Supplier Actions ---
    const handleSaveSupplier = useCallback((supplier: Partial<Supplier>) => { dispatchOperation('SAVE_SUPPLIER', withUser({ supplier })); setModalState({ type: null, data: null }); toast.showToast('Supplier saved.', 'success'); }, [dispatchOperation, withUser, setModalState, toast]);
    const handleDeleteSupplier = useCallback((supplierId: number) => dispatchOperation('DELETE_SUPPLIER', withUser({ supplierId })), [dispatchOperation, withUser]);
    const handleAddSupplierPayment = useCallback((supplierId: number, amount: number, isLoan: boolean) => dispatchOperation('ADD_SUPPLIER_PAYMENT', withUser({ supplierId, amount, isLoan })), [dispatchOperation, withUser]);

    // --- Expense Actions ---
    const handleSaveExpense = useCallback((expense: Partial<Expense>) => { dispatchOperation('SAVE_EXPENSE', withUser({ expense })); setModalState({ type: null, data: null }); toast.showToast('Expense saved.', 'success'); }, [dispatchOperation, withUser, setModalState, toast]);
    const handleDeleteExpense = useCallback((expenseId: string) => {
        dispatchOperation('DELETE_EXPENSE', withUser({ expenseId }));
        return { success: true, message: "Delete operation queued." };
    }, [dispatchOperation, withUser]);
    const handleGenerateRecurringExpenses = useCallback(() => dispatchOperation('GENERATE_RECURRING_EXPENSES', withUser({})), [dispatchOperation, withUser]);

    // --- App Settings & Misc Actions ---
    const handleUpdateAppSettings = useCallback((updater: (prev: AppSettings) => AppSettings) => {
        const newSettings = updater(accountState.appSettings);
        dispatchOperation('UPDATE_APP_SETTINGS', withUser({ settings: newSettings }));
    }, [dispatchOperation, withUser, accountState.appSettings]);
    const handleMarkNotificationsRead = useCallback(() => dispatchOperation('MARK_NOTIFICATIONS_READ', {}, true), [dispatchOperation]);
    const handleRestoreItem = useCallback((itemType: ItemType, itemId: string | number) => dispatchOperation('RESTORE_ITEM', withUser({ itemType, itemId })), [dispatchOperation, withUser]);
    const handleAccountImport = useCallback(async (data: string): Promise<boolean> => {
        try {
            const newState = JSON.parse(data);
            if (newState.id && newState.products && newState.appSettings) {
                dispatchOperation('IMPORT_ACCOUNT_STATE', { newState }, true);
                toast.showToast("Data imported successfully!", 'success');
                return true;
            }
        } catch (e) {
            console.error("Import error:", e);
        }
        return false;
    }, [dispatchOperation, toast]);


    return useMemo(() => ({
        handleNewTransaction, handleSaveProduct, handleDeleteProduct, handleSaveCustomer, handleDeleteCustomer,
        handleAddCustomerPayment, handleNewPurchase, handleSaveUser, handleDeleteUser, handleSavePromotion,
        handleDeletePromotion, handleTogglePromotionStatus, handleSaveDish, handleDeleteDish, handleSaveRawMaterial,
        handleDeleteRawMaterial, handleSaveSupplier, handleDeleteSupplier, handleMarkNotificationsRead,
        handleRestoreItem, handleAdjustStock, handleSaveExpense, handleDeleteExpense, handleUpdateAppSettings,
        handleUpdateKitchenOrders, handleUpdateCurrentUser, handleAccountImport, handleCancelTransaction,
        handleUpdateHeldCarts, handleAddSupplierPayment, handleDeletePurchase, handleGenerateRecurringExpenses,
    }), [
        handleNewTransaction, handleSaveProduct, handleDeleteProduct, handleSaveCustomer, handleDeleteCustomer,
        handleAddCustomerPayment, handleNewPurchase, handleSaveUser, handleDeleteUser, handleSavePromotion,
        handleDeletePromotion, handleTogglePromotionStatus, handleSaveDish, handleDeleteDish, handleSaveRawMaterial,
        handleDeleteRawMaterial, handleSaveSupplier, handleDeleteSupplier, handleMarkNotificationsRead,
        handleRestoreItem, handleAdjustStock, handleSaveExpense, handleDeleteExpense, handleUpdateAppSettings,
        handleUpdateKitchenOrders, handleUpdateCurrentUser, handleAccountImport, handleCancelTransaction,
        handleUpdateHeldCarts, handleAddSupplierPayment, handleDeletePurchase, handleGenerateRecurringExpenses,
    ]);
};
