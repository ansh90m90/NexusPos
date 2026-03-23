
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import Sidebar, { navItems as sidebarNavItems } from '../components/Sidebar';
import Header from '../components/Header';
import Dashboard from '../pages/Dashboard';
import POS from '../pages/POS';
// FIX: Module '"file:///pages/Products"' has no default export. This is fixed by completing the Products.tsx file and adding the default export.
import Products from '../pages/Products';
import Restaurant from '../pages/Restaurant';
import Customers from '../pages/Customers';
import Reports from '../pages/Analytics';
import Settings from '../pages/Settings';
import Purchases from '../pages/Procurement';
import Suppliers from '../pages/Suppliers';
import Expenses from '../pages/Expenses';
import Marketing from '../pages/Marketing';
import CommandPalette from '../components/CommandPalette';
import AccessDenied from '../components/AccessDenied';
import Login from '../Login';
import MyAccountPage from '../pages/MyAccount';
import DataTransferModal from '../components/DataTransferModal';
import ActivityDetailModal from '../components/ActivityDetailModal';
import Tutorial, { TutorialStep } from '../components/Tutorial';
import { ToastProvider, useToast } from '../components/Toast';
import { Page, Theme, ThemeContext, User, AccountState, ActivityItem, AccountInfo, UiScale, ProductsPageTab, RestaurantPageTab, AccentColor } from '../types';
import { useLocalStorage, useAccountActions, useSync, SyncStatus } from '../hooks';
import { deleteAccount as serverDeleteAccount } from '../services/syncService';
import Icon from '../components/Icon';

const tutorialSteps: TutorialStep[] = [
    { elementSelector: null, title: 'Welcome to the Hub!', content: "Let's take a quick tour of the main features to get you started.", page: 'Dashboard' },
    { elementSelector: '#sidebar', title: 'Navigation Sidebar', content: 'This is your main navigation menu. You can access all major sections of the app from here.', page: 'Dashboard' },
    { elementSelector: '[data-tutorial-id="nav-POS"]', title: 'Point of Sale (POS)', content: 'This is where you will conduct most of your sales. Let\'s go there now.', page: 'Dashboard' },
    { elementSelector: '[data-tutorial-id="pos-product-grid"]', title: 'Product Grid', content: 'Click on any product or dish here to add it to the cart on the right.', page: 'POS' },
    { elementSelector: '[data-tutorial-id="pos-cart"]', title: 'The Cart', content: 'Items you select will appear in the cart. On mobile, tap this summary bar to open it. On desktop, the cart is on the right. Here you can adjust quantities and see the total bill.', page: 'POS' },
    { elementSelector: '[data-tutorial-id="notifications-button"]', title: 'Notifications', content: 'Check here for important alerts like low stock or expiring items.', page: 'Dashboard' },
    { elementSelector: '[data-tutorial-id="nav-Settings"]', title: 'Settings', content: 'You can configure all aspects of your shop, manage staff, and access this tutorial again from the Settings page.', page: 'Dashboard' },
    { elementSelector: null, title: 'Tour Complete!', content: "You're all set! Feel free to explore. You can restart this tutorial anytime from Settings > Help & Support.", page: 'Settings' }
];


const AccountApp: React.FC<{
  accountState: AccountState,
  dispatchOperation: (type: string, payload: any, skipSync?: boolean) => void,
  onLogout: () => void,
  initialUser: User,
  syncStatus: SyncStatus,
  onForceSync: () => Promise<void>,
  onHardReset: () => Promise<void>,
  userAccounts: AccountInfo[],
  onDeleteAccount: (accountId: string) => Promise<boolean>,
}> = ({ accountState, dispatchOperation, onLogout, initialUser, syncStatus, onForceSync, onHardReset, userAccounts, onDeleteAccount }) => {

  const { id: accountId, users, products, dishes, rawMaterials, customers, suppliers, transactions, purchaseOrders, kitchenOrders, batches, notifications, appSettings, rewards, promotions, allocatedRawMaterials, stockAdjustments = [], expenses = [], heldCarts = [], isTest = false } = accountState;

  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [theme, setTheme] = useLocalStorage<Theme>(`${accountId}_theme`, 'light');
  const [accentColor, setAccentColor] = useLocalStorage<AccentColor>(`${accountId}_accentColor`, 'primary');
  const [uiScale, setUiScale] = useLocalStorage<UiScale>(`${accountId}_uiScale`, 'medium');
  const [currentPage, setCurrentPage] = useLocalStorage<Page>(`${accountId}_currentPage`, 'Dashboard');
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [productsPageTab, setProductsPageTab] = useState<ProductsPageTab>('store');
  const [restaurantPageTab, setRestaurantPageTab] = useState<RestaurantPageTab>('dishes');
  const [modalState, setModalState] = useState<{ type: string | null, data: any }>({ type: null, data: null });
  const [activeActivity, setActiveActivity] = useState<ActivityItem | null>(null);
  const [isTutorialActive, setTutorialActive] = useState(!appSettings.tutorialCompleted);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [mainScrollTop, setMainScrollTop] = useState(0);
  const mainContentRef = useRef<HTMLElement>(null);
  const toast = useToast();

  useEffect(() => {
    const isFreshLogin = localStorage.getItem('fresh_login');
    if (isFreshLogin === 'true') {
        setCurrentPage('Dashboard');
        localStorage.removeItem('fresh_login');
    } else {
        // On any subsequent app start, default to POS page if no page is set
        const storedPage = localStorage.getItem(`${accountId}_currentPage`);
        if (!storedPage) {
            setCurrentPage('POS');
        }
    }
  }, [accountId, setCurrentPage]); // Intentionally run only when account changes to set initial page

  // --- Filter out soft-deleted items for the entire app ---
  const visibleProducts = useMemo(() => products.filter(p => !p.isDeleted), [products]);
  const visibleDishes = useMemo(() => dishes.filter(d => !d.isDeleted), [dishes]);
  const visibleRawMaterials = useMemo(() => rawMaterials.filter(rm => !rm.isDeleted), [rawMaterials]);
  const visibleCustomers = useMemo(() => customers.filter(c => !c.isDeleted), [customers]);
  const visibleSuppliers = useMemo(() => suppliers.filter(s => !s.isDeleted), [suppliers]);
  const visibleUsers = useMemo(() => users.filter(u => !u.isDeleted), [users]);
  const visiblePromotions = useMemo(() => promotions.filter(p => !p.isDeleted), [promotions]);
  const visibleExpenses = useMemo(() => expenses.filter(e => !e.isDeleted), [expenses]);
  const heldCartsState = useMemo(() => heldCarts || [], [heldCarts]);

  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);
  const toggleTheme = useCallback(() => setTheme(prev => (prev === 'light' ? 'dark' : 'light')), [setTheme]);

  const {
    handleNewTransaction, handleSaveProduct, handleDeleteProduct, handleSaveCustomer, handleDeleteCustomer,
    handleAddCustomerPayment, handleNewPurchase, handleSaveUser, handleDeleteUser, handleSavePromotion,
    handleDeletePromotion, handleTogglePromotionStatus, handleSaveDish, handleDeleteDish, handleSaveRawMaterial,
    handleDeleteRawMaterial, handleSaveSupplier, handleDeleteSupplier, handleMarkNotificationsRead,
    handleRestoreItem, handleAdjustStock, handleSaveExpense, handleDeleteExpense, handleUpdateAppSettings,
    handleUpdateKitchenOrders, handleUpdateCurrentUser, handleAccountImport, handleCancelTransaction,
    handleUpdateHeldCarts, handleAddSupplierPayment,
  } = useAccountActions({ dispatchOperation, currentUser, setModalState, toast, accountState, setCurrentUser, setCurrentPage });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-accent', accentColor);
    document.title = appSettings.shopName || 'NexusPOS';
    const root = document.documentElement;
    if (uiScale === 'small') root.style.fontSize = '14px';
    else if (uiScale === 'large') root.style.fontSize = '18px';
    else root.style.fontSize = '16px'; // medium
  }, [theme, appSettings.shopName, uiScale, accentColor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            setCommandPaletteOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const themeContextValue = useMemo(() => ({ 
    theme, 
    accentColor, 
    toggleTheme, 
    setAccentColor 
  }), [theme, accentColor, toggleTheme, setAccentColor]);
  
   const handleNextTutorialStep = () => {
    const nextStepIndex = tutorialStep + 1;
    if (nextStepIndex < tutorialSteps.length) {
        const nextPage = tutorialSteps[nextStepIndex]?.page;
        if (nextPage && nextPage !== currentPage) {
          setCurrentPage(nextPage);
        }
        setTutorialStep(s => s + 1);
    } else {
        setTutorialActive(false);
        handleUpdateAppSettings(s => ({...s, tutorialCompleted: true}));
    }
  };

  const commandPaletteItems = useMemo(() => {
    const pageItems = sidebarNavItems
        .filter(item => currentUser && item.roles.includes(currentUser.role))
        .map(item => ({ id: `page-${item.page}`, name: `Go to ${item.label}`, type: 'Page' as const, action: { type: 'navigate' as const, payload: item.page } }));
    
    const productItems = visibleProducts.map(p => ({ id: `prod-${p.id}`, name: p.name, type: 'Product' as const, action: { type: 'navigate' as const, payload: 'Products' as Page } }));
    const customerItems = visibleCustomers.map(c => ({ id: `cust-${c.id}`, name: c.name, type: 'Customer' as const, action: { type: 'navigate' as const, payload: 'Customers' as Page } }));
    
    return [...pageItems, ...productItems, ...customerItems];
  }, [sidebarNavItems, visibleProducts, visibleCustomers, currentUser]);
  
   const renderPage = () => {
    if (!currentUser) return <Login onLogin={() => {}} />;

    const hasAccess = (page: Page) => {
        const item = sidebarNavItems.find(i => i.page === page);
        return item ? item.roles.includes(currentUser.role) : true;
    };

    const targetPage = hasAccess(currentPage) ? currentPage : 'Dashboard';

    switch (targetPage) {
        case 'Dashboard': return <Dashboard transactions={transactions} products={visibleProducts} customers={visibleCustomers} expenses={visibleExpenses} batches={batches} appSettings={appSettings} employeeRole={currentUser.role} purchaseOrders={purchaseOrders} setCurrentPage={setCurrentPage} setModalState={setModalState} onActivityClick={setActiveActivity} />;
        case 'POS': return <POS products={visibleProducts} dishes={visibleDishes} rawMaterials={visibleRawMaterials} customers={visibleCustomers} onTransaction={handleNewTransaction} appSettings={appSettings} promotions={visiblePromotions} allocatedRawMaterials={allocatedRawMaterials} heldCarts={heldCartsState} setHeldCarts={handleUpdateHeldCarts} transactions={transactions} onUpdateAppSettings={handleUpdateAppSettings} onSaveCustomer={handleSaveCustomer} />;
        case 'Products': return <Products products={visibleProducts} suppliers={visibleSuppliers} setProducts={handleSaveProduct} onDeleteProduct={handleDeleteProduct} appSettings={appSettings} batches={batches} activeTab={productsPageTab} setActiveTab={setProductsPageTab} modalState={modalState} setModalState={setModalState} onAdjustStock={handleAdjustStock} />;
        case 'Restaurant': return <Restaurant dishes={visibleDishes} onSaveDish={handleSaveDish} onDeleteDish={handleDeleteDish} rawMaterials={visibleRawMaterials} onSaveRawMaterial={handleSaveRawMaterial} onDeleteRawMaterial={handleDeleteRawMaterial} activeTab={restaurantPageTab} setActiveTab={setRestaurantPageTab} modalState={modalState} setModalState={setModalState} orders={kitchenOrders} setOrders={handleUpdateKitchenOrders} />;
        case 'Customers': return <Customers customers={visibleCustomers} transactions={transactions} onSaveCustomer={handleSaveCustomer} onDeleteCustomer={handleDeleteCustomer} onAddPayment={handleAddCustomerPayment} onCancelTransaction={handleCancelTransaction} modalState={modalState} setModalState={setModalState} products={visibleProducts} appSettings={appSettings} onExecuteAiAction={async () => ''} />;
        case 'Purchases': return <Purchases accountId={accountId} products={visibleProducts} suppliers={visibleSuppliers} purchaseOrders={purchaseOrders} onNewPurchase={handleNewPurchase} transactions={transactions} modalState={modalState} setModalState={setModalState} />;
        case 'Suppliers': return <Suppliers suppliers={visibleSuppliers} onSaveSupplier={handleSaveSupplier} onDeleteSupplier={handleDeleteSupplier} purchaseOrders={purchaseOrders} modalState={modalState} setModalState={setModalState} onAddPayment={handleAddSupplierPayment} appSettings={appSettings} />;
        case 'Expenses': return <Expenses expenses={visibleExpenses} onSaveExpense={handleSaveExpense} onDeleteExpense={handleDeleteExpense} modalState={modalState} setModalState={setModalState} />;
        case 'Reports': return <Reports accountState={accountState} />;
        case 'Marketing': return <Marketing accountId={accountId} customers={visibleCustomers} promotions={visiblePromotions} onSavePromotion={handleSavePromotion} setModalState={setModalState} products={visibleProducts} />;
        case 'Settings': return <Settings accountState={accountState} setAppSettings={handleUpdateAppSettings} onSaveUser={handleSaveUser} onDeleteUser={handleDeleteUser} onSavePromotion={handleSavePromotion} onDeletePromotion={handleDeletePromotion} onTogglePromotionStatus={handleTogglePromotionStatus} onHardReset={onHardReset} onRestoreItem={handleRestoreItem} uiScale={uiScale} setUiScale={setUiScale} isTutorialActive={isTutorialActive} onStartTutorial={() => { setTutorialActive(true); setTutorialStep(0); }} onEndTutorial={() => setTutorialActive(false)} modalState={modalState} setModalState={setModalState} />;
        case 'MyAccount': return <MyAccountPage user={currentUser} onSave={handleUpdateCurrentUser} userAccounts={userAccounts} currentAccountId={accountId} onDeleteAccount={onDeleteAccount} />;
        default: return <AccessDenied />;
    }
   };
   
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <div className="flex bg-slate-50 dark:bg-transparent min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} employeeRole={currentUser!.role} appSettings={appSettings} />
        <main ref={mainContentRef} className="flex-1 md:ml-20 pb-16 md:pb-0 flex flex-col h-screen overflow-hidden">
            <Header currentPage={currentPage} currentUser={currentUser!} onLogout={onLogout} notifications={notifications} setCurrentPage={setCurrentPage} syncStatus={syncStatus} onOpenNotifications={handleMarkNotificationsRead} onForceSync={onForceSync} isTest={isTest} />
            <div onScroll={e => setMainScrollTop(e.currentTarget.scrollTop)} className="flex-1 p-4 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {renderPage()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </main>

        {isCommandPaletteOpen && <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} items={commandPaletteItems} setCurrentPage={setCurrentPage} />}
        {modalState.type === 'data_transfer' && <DataTransferModal mode="full" onClose={() => setModalState({ type: null, data: null })} onImport={handleAccountImport} currentAccountData={JSON.stringify(accountState)} />}
        {activeActivity && <ActivityDetailModal activity={activeActivity} accountState={accountState} onClose={() => setActiveActivity(null)} />}
        <Tutorial steps={tutorialSteps} isTutorialActive={isTutorialActive} onClose={() => { setTutorialActive(false); handleUpdateAppSettings(s => ({...s, tutorialCompleted: true})); }} currentStep={tutorialStep} onNext={handleNextTutorialStep} onPrev={() => setTutorialStep(s => s - 1)} mainScrollTop={mainScrollTop} />
      </div>
    </ThemeContext.Provider>
  );
};

const App: React.FC = () => {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    )
};


const AppContent: React.FC = () => {
    const [allAccounts, setAllAccounts] = useLocalStorage<AccountInfo[]>('all_accounts', []);
    const [currentAccountId, setCurrentAccountId] = useLocalStorage<string | null>('current_account_id', null);
    const [accountState, setAccountState] = useLocalStorage<AccountState | null>(`account_${currentAccountId}`, null);
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>(`user_${currentAccountId}`, null);
    const { syncStatus, runSync, dispatchOperation } = useSync(accountState, setAccountState);
    const toast = useToast();
    const [isAuthReady, setIsAuthReady] = useState(false);
    const currentUserRef = useRef<User | null>(currentUser);

    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            const current = currentUserRef.current;
            if (firebaseUser) {
                // User is signed in, fetch profile if not in local storage
                if (!current || current.id !== firebaseUser.uid) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            setCurrentUser({
                                id: firebaseUser.uid as any,
                                name: userData.name,
                                email: userData.email,
                                role: 'Admin',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            });
                            setAllAccounts(userData.accounts || []);
                        }
                    } catch (error) {
                        console.error("Error fetching user profile:", error);
                    }
                }
            } else if (current) {
                // User is signed out, clear state only if we had a user
                setCurrentUser(null);
                setCurrentAccountId(null);
                setAccountState(null);
            }
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, [setCurrentUser, setAllAccounts, setCurrentAccountId, setAccountState]);

    const handleLogin = (account: AccountState, user: User, accounts: AccountInfo[]) => {
        // Manually set localStorage to ensure the new keys are populated before state updates trigger re-renders
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('current_account_id', JSON.stringify(account.id));
            window.localStorage.setItem(`account_${account.id}`, JSON.stringify(account));
            window.localStorage.setItem(`user_${account.id}`, JSON.stringify(user));
            window.localStorage.setItem('all_accounts', JSON.stringify(accounts));
            window.localStorage.setItem('fresh_login', 'true');
        }

        setAllAccounts(accounts);
        setCurrentAccountId(account.id);
        setAccountState(account);
        setCurrentUser(user);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setCurrentAccountId(null);
            setAccountState(null);
            setCurrentUser(null);
            localStorage.clear(); // Clear all local storage on logout for security
        } catch (error) {
            console.error("Logout error:", error);
            toast.showToast("Failed to log out.", "error");
        }
    };

    const handleHardReset = async () => {
        if (!currentAccountId || accountState?.isTest) {
            toast.showToast("Hard reset is not available for this account.", "error");
            return;
        }
        try {
            // This is a placeholder for a server call that would fetch the pristine state.
            // For now, it re-fetches from local storage which simulates a reset if the in-memory state is corrupt.
            const item = window.localStorage.getItem(`account_${currentAccountId}`);
            const freshState = item ? JSON.parse(item) : null;
            if(freshState) {
                setAccountState(freshState);
                toast.showToast("Local data has been reset to the last saved state.", "success");
            } else {
                 toast.showToast("Could not find a saved state to reset to.", "error");
            }
        } catch(e) {
            console.error("An error occurred during reset:", e);
            toast.showToast("Reset failed. Your data remains unchanged.", "error");
        }
    };
    
     const handleDeleteAccount = async (accountId: string): Promise<boolean> => {
        try {
            await serverDeleteAccount(accountId);
            
            const newAccounts = allAccounts.filter(acc => acc.id !== accountId);
            setAllAccounts(newAccounts);

            // If the deleted account was the current one, log out.
            if (accountId === currentAccountId) {
                handleLogout();
            }
            return true;
        } catch (error) {
            console.error("Failed to delete account on server:", error);
            toast.showToast("Failed to delete the business. Please ensure you are connected to the server and try again.", "error");
            return false;
        }
    };


    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Initializing session...</p>
                </div>
            </div>
        );
    }

    if (!accountState || !currentUser) {
        return <Login onLogin={handleLogin} />;
    }
    
    return (
      <AccountApp 
          accountState={accountState} 
          dispatchOperation={dispatchOperation}
          onLogout={handleLogout}
          initialUser={currentUser}
          syncStatus={syncStatus}
          onForceSync={runSync}
          onHardReset={handleHardReset}
          userAccounts={allAccounts}
          onDeleteAccount={handleDeleteAccount}
      />
    );
}

export default App;
