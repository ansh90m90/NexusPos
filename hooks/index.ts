
import { useState, useEffect, useCallback, useRef } from 'react';
import { applyOperation } from '../reducer';
import type { AccountState, User, Page, Promotion, Dish, RawMaterial, Supplier, PurchaseOrder, Batch, StockAdjustmentReason, ItemType, Expense, AppSettings, HeldCart, Operation } from '../types';
import { saveAccountState, pushOperation, subscribeToOperations } from '../services/syncService';
import type { ToastContextType } from '../components/Toast';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

// --- useLocalStorage Hook ---
export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
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
        const value = item ? JSON.parse(item) : initialValue;
        setStoredValue(value);
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
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback((value) => {
    setStoredValue(prevStoredValue => {
      try {
        const valueToStore = value instanceof Function ? value(prevStoredValue) : value;
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

    const runSync = useCallback(async () => {
        const currentAccountState = accountStateRef.current;
        if (!currentAccountState || currentAccountState.isTest) return;

        setSyncStatus('syncing');
        try {
            await saveAccountState(currentAccountState.id, currentAccountState);
            setSyncStatus('synced');
        } catch (error) {
            console.error('Sync failed:', error);
            setSyncStatus('error');
        }
    }, []);

    const dispatchOperation = useCallback((type: string, payload: any, skipSync = false) => {
        const currentAccountState = accountStateRef.current;
        if (!currentAccountState) return;

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

        pushOperation(currentAccountState.id, operation).catch(err => {
            console.error("Failed to push operation:", err);
            setSyncStatus('error');
        });
        
        // Also update the full state periodically or after critical actions
        runSync();
    }, [runSync, clientId]);

    useEffect(() => {
        if (!accountState?.id || accountState.isTest) {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            return;
        }

        const accountId = accountState.id;
        const lastSyncId = accountState.lastSyncId || 0;

        unsubscribeRef.current = subscribeToOperations(accountId, lastSyncId, (newOps) => {
            setAccountStateRef.current(prevState => {
                if (!prevState || prevState.id !== accountId) return prevState;
                
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
    }, [accountState?.id, accountState?.isTest, accountState?.lastSyncId, clientId]);

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
    setCurrentPage: (page: Page) => void;
}

export const useAccountActions = ({ dispatchOperation, currentUser, setModalState, toast, accountState, setCurrentUser, setCurrentPage }: AccountActionsProps) => {
    
    const withUser = (payload: any) => ({ ...payload, user: currentUser?.name || 'Unknown' });

    // --- Transaction & POS Actions ---
    const handleNewTransaction = (transaction: any) => dispatchOperation('CREATE_TRANSACTION', withUser({ transaction }));
    const handleCancelTransaction = (transactionId: string) => dispatchOperation('CANCEL_TRANSACTION', withUser({ transactionId }));
    const handleUpdateHeldCarts = (updater: React.SetStateAction<HeldCart[]>) => {
        const newCarts = typeof updater === 'function' ? updater(accountState.heldCarts) : updater;
        dispatchOperation('UPDATE_HELD_CARTS', { carts: newCarts }, true); // Local only
    }

    // --- Product & Inventory Actions ---
    const handleSaveProduct = (product: any) => {
        dispatchOperation('SAVE_PRODUCT', withUser({ product }));
        setModalState({ type: null, data: null });
        toast.showToast('Product saved.', 'success');
    };
    const handleDeleteProduct = (productId: number) => dispatchOperation('DELETE_PRODUCT', withUser({ productId }));
    const handleNewPurchase = (order: PurchaseOrder, batches: (Omit<Batch, 'id' | 'receivedDate'> & { productName?: string })[], newSupplierName?: string) => {
        dispatchOperation('CREATE_PURCHASE', withUser({ order, batches, newSupplierName }));
    };
     const handleAdjustStock = (variantId: number, productName: string, quantityChange: number, reason: StockAdjustmentReason, notes?: string) => {
        dispatchOperation('ADJUST_STOCK', withUser({ variantId, productName, quantityChange, reason, notes }));
    };

    // --- Customer Actions ---
    const handleSaveCustomer = (customer: any) => {
        dispatchOperation('SAVE_CUSTOMER', withUser({ customer }));
        setModalState({ type: null, data: null });
        toast.showToast('Customer saved.', 'success');
    };
    const handleDeleteCustomer = (customerId: number) => dispatchOperation('DELETE_CUSTOMER', withUser({ customerId }));
    const handleAddCustomerPayment = (customerId: number, amount: number) => dispatchOperation('ADD_CUSTOMER_PAYMENT', withUser({ customerId, amount }));

    // --- Staff & User Actions ---
    const handleSaveUser = (user: any) => {
        dispatchOperation('SAVE_USER', { user }); // No user needed, system action
        toast.showToast('Staff member saved.', 'success');
    };
    const handleDeleteUser = (userId: number) => dispatchOperation('DELETE_USER', { userId });
    const handleUpdateCurrentUser = (updateData: any) => {
        const payload = { userId: currentUser!.id, updateData };
        // Check password validity locally before dispatching to avoid sending plain text old passwords
        if (updateData.oldPassword && updateData.newPassword) {
            // In a real app with bcrypt on client, you'd check here.
            // For this app, we let the reducer/backend handle it.
            dispatchOperation('UPDATE_CURRENT_USER', payload);
            return { success: true, message: "Profile update queued." };
        } else {
             dispatchOperation('UPDATE_CURRENT_USER', payload);
             setCurrentUser(prev => prev ? {...prev, name: updateData.name, email: updateData.email } : null);
             return { success: true, message: "Profile updated." };
        }
    }

    // --- Promotion Actions ---
    const handleSavePromotion = (promotion: Partial<Promotion>) => dispatchOperation('SAVE_PROMOTION', withUser({ promotion }));
    const handleDeletePromotion = (promotionId: string) => dispatchOperation('DELETE_PROMOTION', withUser({ promotionId }));
    const handleTogglePromotionStatus = (promotionId: string) => dispatchOperation('TOGGLE_PROMOTION_STATUS', withUser({ promotionId }));

    // --- Restaurant Actions ---
    const handleSaveDish = (dish: Partial<Dish>) => { dispatchOperation('SAVE_DISH', withUser({ dish })); setModalState({ type: null, data: null }); toast.showToast('Dish saved.', 'success'); };
    const handleDeleteDish = (dishId: number) => {
        const canDelete = !accountState.kitchenOrders.some(o => o.status === 'Pending' && o.items.some(i => i.dish.id === dishId));
        if (canDelete) {
            dispatchOperation('DELETE_DISH', withUser({ dishId }));
            return { success: true, message: "Delete operation queued." };
        }
        return { success: false, message: "Cannot delete a dish that is part of a pending kitchen order." };
    };
    const handleSaveRawMaterial = (material: Partial<RawMaterial>) => { dispatchOperation('SAVE_RAW_MATERIAL', withUser({ material })); setModalState({ type: null, data: null }); toast.showToast('Material saved.', 'success'); };
    const handleDeleteRawMaterial = (materialId: number) => {
         const canDelete = !accountState.dishes.some(d => !d.isDeleted && d.ingredients.some(i => i.id === materialId));
         if (canDelete) {
            dispatchOperation('DELETE_RAW_MATERIAL', withUser({ materialId }));
            return { success: true, message: "Delete operation queued." };
         }
         return { success: false, message: "Cannot delete a raw material that is used in an active dish." };
    };
     const handleUpdateKitchenOrders = (orders: any) => dispatchOperation('UPDATE_KITCHEN_ORDERS', { orders });

    // --- Supplier Actions ---
    const handleSaveSupplier = (supplier: Partial<Supplier>) => { dispatchOperation('SAVE_SUPPLIER', withUser({ supplier })); setModalState({ type: null, data: null }); toast.showToast('Supplier saved.', 'success'); };
    const handleDeleteSupplier = (supplierId: number) => dispatchOperation('DELETE_SUPPLIER', withUser({ supplierId }));
    const handleAddSupplierPayment = (supplierId: number, amount: number) => dispatchOperation('ADD_SUPPLIER_PAYMENT', withUser({ supplierId, amount }));

    // --- Expense Actions ---
    const handleSaveExpense = (expense: Partial<Expense>) => { dispatchOperation('SAVE_EXPENSE', withUser({ expense })); setModalState({ type: null, data: null }); toast.showToast('Expense saved.', 'success'); };
    const handleDeleteExpense = (expenseId: string) => {
        dispatchOperation('DELETE_EXPENSE', withUser({ expenseId }));
        return { success: true, message: "Delete operation queued." };
    };

    // --- App Settings & Misc Actions ---
    const handleUpdateAppSettings = (updater: (prev: AppSettings) => AppSettings) => {
        const newSettings = updater(accountState.appSettings);
        dispatchOperation('UPDATE_APP_SETTINGS', withUser({ settings: newSettings }));
    };
    const handleMarkNotificationsRead = () => dispatchOperation('MARK_NOTIFICATIONS_READ', {}, true); // Local only
    const handleRestoreItem = (itemType: ItemType, itemId: string | number) => dispatchOperation('RESTORE_ITEM', withUser({ itemType, itemId }));
    const handleAccountImport = async (data: string): Promise<boolean> => {
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
    };


    return {
        handleNewTransaction, handleSaveProduct, handleDeleteProduct, handleSaveCustomer, handleDeleteCustomer,
        handleAddCustomerPayment, handleNewPurchase, handleSaveUser, handleDeleteUser, handleSavePromotion,
        handleDeletePromotion, handleTogglePromotionStatus, handleSaveDish, handleDeleteDish, handleSaveRawMaterial,
        handleDeleteRawMaterial, handleSaveSupplier, handleDeleteSupplier, handleMarkNotificationsRead,
        handleRestoreItem, handleAdjustStock, handleSaveExpense, handleDeleteExpense, handleUpdateAppSettings,
        handleUpdateKitchenOrders, handleUpdateCurrentUser, handleAccountImport, handleCancelTransaction,
        handleUpdateHeldCarts, handleAddSupplierPayment,
    };
};
