
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import Sidebar from '../components/Sidebar';
import { navItems as sidebarNavItems } from '../constants';
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
import { Page, Theme, ThemeContext, User, AccountState, ActivityItem, BusinessInfo, UiScale, ProductsPageTab, RestaurantPageTab, AccentColor } from '../types';
import { useLocalStorage, useAccountActions, useSync, SyncStatus } from '../hooks';
import { deleteBusiness as serverDeleteBusiness, deleteUserAccount as serverDeleteUserAccount } from '../services/syncService';

import PrivacyPolicy from '../pages/PrivacyPolicy';
import TermsOfService from '../pages/TermsOfService';
import LiveMenu from '../LiveMenu';

import ErrorBoundary from '../components/ErrorBoundary';

const tutorialSteps: TutorialStep[] = [
    { elementSelector: null, title: 'Welcome to the Shop Hub!', content: "Let's take a quick tour of how to manage your business effectively. We'll start by setting up your ecosystem.", page: 'Dashboard' },
    { elementSelector: '[data-tutorial-id="nav-Suppliers"]', title: 'Managing Suppliers', content: 'First, let\'s manage the people you buy from. Click here to go to the Suppliers section.', page: 'Dashboard' },
    { elementSelector: '[data-tutorial-id="add-supplier-button"]', title: 'Add a Supplier', content: 'Use this button to add a new supplier. You can even pull business details automatically using their GSTIN!', page: 'Suppliers' },
    { elementSelector: '[data-tutorial-id="nav-Customers"]', title: 'Managing Customers', content: 'Now, let\'s look at your customers. Navigate here to maintain your client base and their credit logs.', page: 'Suppliers' },
    { elementSelector: '[data-tutorial-id="add-customer-button"]', title: 'Add a Customer', content: 'Register your regular customers here to track their purchases and send them automated SMS receipts.', page: 'Customers' },
    { elementSelector: '[data-tutorial-id="nav-Purchases"]', title: 'Inventory Inward', content: 'Stocking up is easy. Go to the Purchases section to receive new inventory from your suppliers.', page: 'Customers' },
    { elementSelector: '[data-tutorial-id="new-purchase-button"]', title: 'Receive Stock', content: 'Click here to record a new purchase. This will automatically update your inventory counts and batch details.', page: 'Purchases' },
    { elementSelector: '[data-tutorial-id="nav-POS"]', title: 'Selling (POS)', content: 'The heart of your shop! Let\'s go to the Point of Sale to make your first sale.', page: 'Purchases' },
    { elementSelector: '[data-tutorial-id="pos-product-grid"]', title: 'Quick Selling', content: 'Just click on a product to add it to the cart. You can search by name or scan barcodes too.', page: 'POS' },
    { elementSelector: '[data-tutorial-id="pos-cart"]', title: 'Checkout', content: 'Finalize the sale here. You can apply discounts, select customers for credit, and print professional receipts.', page: 'POS' },
    { elementSelector: null, title: 'All Done!', content: "Tutorial completed! All data used during this tour will now be reset so you can start fresh with your real business data.", page: 'Dashboard' }
];


const AccountApp: React.FC<{
  accountId: string,
  businessId: string,
  accountState: AccountState,
  dispatchOperation: (type: string, payload: any, skipSync?: boolean) => void,
  onLogout: () => void,
  initialUser: User,
  syncStatus: SyncStatus,
  onForceSync: () => Promise<void>,
  onHardReset: () => Promise<void>,
  userBusinesses: BusinessInfo[],
  onDeleteBusiness: (accountId: string, businessId: string) => Promise<boolean>,
  onDeleteUserAccount: () => Promise<boolean>,
  onSwitchBusiness: (businessId: string) => Promise<void>,
}> = ({ accountId, businessId, accountState, dispatchOperation, onLogout, initialUser, syncStatus, onForceSync, onHardReset, userBusinesses, onDeleteBusiness, onDeleteUserAccount, onSwitchBusiness }) => {

  const { products, dishes, rawMaterials, customers, suppliers, transactions, purchaseOrders, kitchenOrders, batches, notifications, appSettings, promotions, allocatedRawMaterials, expenses = [], heldCarts = [], isTest = false } = accountState;

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
  const tutorialSnapshotRef = useRef<AccountState | null>(null);

  useEffect(() => {
    if (isTutorialActive && !tutorialSnapshotRef.current) {
        tutorialSnapshotRef.current = JSON.parse(JSON.stringify(accountState));
    }
  }, [isTutorialActive, accountState]);

  const handleTutorialComplete = () => {
    setTutorialActive(false);
    handleUpdateAppSettings(s => ({...s, tutorialCompleted: true}));
    if (tutorialSnapshotRef.current) {
        // We use the existing IMPORT_ACCOUNT_STATE to revert everything back to the snapshot
        dispatchOperation('IMPORT_ACCOUNT_STATE', { newState: tutorialSnapshotRef.current });
        tutorialSnapshotRef.current = null;
        toast.showToast("Tutorial data has been cleared.", "info");
    }
    setCurrentPage('Dashboard');
  };

  const mainContentRef = useRef<HTMLElement>(null);
  const toast = useToast();
  const accentColorClasses: Record<AccentColor, string> = {
    primary: 'accent-primary',
    emerald: 'accent-emerald',
    indigo: 'accent-indigo',
    rose: 'accent-rose',
    amber: 'accent-amber',
    violet: 'accent-violet',
  };

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
  const visiblePromotions = useMemo(() => promotions.filter(p => !p.isDeleted), [promotions]);
  const visibleExpenses = useMemo(() => expenses.filter(e => !e.isDeleted), [expenses]);
  const heldCartsState = useMemo(() => heldCarts || [], [heldCarts]);

  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);
  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  const {
    handleNewTransaction, handleSaveProduct, handleDeleteProduct, handleSaveCustomer, handleDeleteCustomer,
    handleAddCustomerPayment, handleNewPurchase, handleDeletePurchase, handleSaveUser, handleDeleteUser, handleSavePromotion,
    handleDeletePromotion, handleTogglePromotionStatus, handleSaveDish, handleDeleteDish, handleSaveRawMaterial,
    handleDeleteRawMaterial, handleSaveSupplier, handleDeleteSupplier, handleMarkNotificationsRead,
    handleRestoreItem, handleAdjustStock, handleSaveExpense, handleDeleteExpense, handleUpdateAppSettings,
    handleUpdateKitchenOrders, handleUpdateCurrentUser, handleAccountImport, handleCancelTransaction,
    handleUpdateHeldCarts, handleAddSupplierPayment, handleGenerateRecurringExpenses,
  } = useAccountActions({ dispatchOperation, currentUser, setModalState, toast, accountState, setCurrentUser });

  useEffect(() => {
    // Check for recurring expenses on load
    handleGenerateRecurringExpenses();
  }, [handleGenerateRecurringExpenses]); // Run once on mount

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme !== 'light');
    document.documentElement.setAttribute('data-theme', theme);
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
    setTheme,
    toggleTheme, 
    setAccentColor 
  }), [theme, accentColor, setTheme, toggleTheme, setAccentColor]);
  
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
  }, [visibleProducts, visibleCustomers, currentUser]);
  
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
        case 'Restaurant': return <Restaurant dishes={visibleDishes} onSaveDish={handleSaveDish} onDeleteDish={handleDeleteDish} rawMaterials={visibleRawMaterials} onSaveRawMaterial={handleSaveRawMaterial} onDeleteRawMaterial={handleDeleteRawMaterial} activeTab={restaurantPageTab} setActiveTab={setRestaurantPageTab} modalState={modalState} setModalState={setModalState} orders={kitchenOrders} setOrders={handleUpdateKitchenOrders} setCurrentPage={setCurrentPage} />;
        case 'Customers': return <Customers customers={visibleCustomers} transactions={transactions} onSaveCustomer={handleSaveCustomer} onDeleteCustomer={handleDeleteCustomer} onAddPayment={handleAddCustomerPayment} onCancelTransaction={handleCancelTransaction} modalState={modalState} setModalState={setModalState} products={visibleProducts} appSettings={appSettings} onExecuteAiAction={async () => ''} />;
        case 'Purchases': return <Purchases accountId={accountId} products={visibleProducts} suppliers={visibleSuppliers} purchaseOrders={purchaseOrders} onNewPurchase={handleNewPurchase} onDeletePurchase={handleDeletePurchase} transactions={transactions} modalState={modalState} setModalState={setModalState} />;
        case 'Suppliers': return <Suppliers suppliers={visibleSuppliers} onSaveSupplier={handleSaveSupplier} onDeleteSupplier={handleDeleteSupplier} purchaseOrders={purchaseOrders} modalState={modalState} setModalState={setModalState} onAddPayment={handleAddSupplierPayment} appSettings={appSettings} />;
        case 'Expenses': return <Expenses expenses={visibleExpenses} onSaveExpense={handleSaveExpense} onDeleteExpense={handleDeleteExpense} modalState={modalState} setModalState={setModalState} />;
        case 'Reports': return <Reports accountState={accountState} />;
        case 'Marketing': return <Marketing accountId={accountId} customers={visibleCustomers} promotions={visiblePromotions} onSavePromotion={handleSavePromotion} setModalState={setModalState} products={visibleProducts} />;
        case 'Settings': return <Settings accountState={accountState} setAppSettings={handleUpdateAppSettings} onSaveUser={handleSaveUser} onDeleteUser={handleDeleteUser} onSavePromotion={handleSavePromotion} onDeletePromotion={handleDeletePromotion} onTogglePromotionStatus={handleTogglePromotionStatus} onHardReset={onHardReset} onRestoreItem={handleRestoreItem} uiScale={uiScale} setUiScale={setUiScale} isTutorialActive={isTutorialActive} onStartTutorial={() => { setTutorialActive(true); setTutorialStep(0); }} onEndTutorial={() => setTutorialActive(false)} modalState={modalState} setModalState={setModalState} onDeleteAccount={() => onDeleteBusiness(accountId, businessId)} />;
        case 'MyAccount': return <MyAccountPage user={currentUser} onSave={handleUpdateCurrentUser} userAccounts={userBusinesses as any} currentAccountId={businessId} onDeleteAccount={(id) => onDeleteBusiness(accountId, id)} onDeleteUserAccount={onDeleteUserAccount} />;
        default: return <AccessDenied />;
    }
   };
   
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <div 
        data-theme={theme} 
        className={`flex bg-theme-main min-h-screen text-theme-main transition-colors duration-300 ${theme !== 'light' ? 'dark' : ''} ${accentColorClasses[accentColor]}`}
      >
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} employeeRole={currentUser!.role} appSettings={appSettings} />
        <main ref={mainContentRef} className="flex-1 md:ml-20 pb-16 md:pb-0 flex flex-col h-screen overflow-hidden">
            <Header 
              currentPage={currentPage} 
              currentUser={currentUser!} 
              onLogout={onLogout} 
              notifications={notifications} 
              setCurrentPage={setCurrentPage} 
              syncStatus={syncStatus} 
              onOpenNotifications={handleMarkNotificationsRead} 
              onForceSync={onForceSync} 
              isTest={isTest}
              userBusinesses={userBusinesses}
              currentBusinessId={businessId}
              onSwitchBusiness={onSwitchBusiness}
            />
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
        <Tutorial steps={tutorialSteps} isTutorialActive={isTutorialActive} onClose={handleTutorialComplete} currentStep={tutorialStep} onNext={handleNextTutorialStep} onPrev={() => setTutorialStep(s => s - 1)} mainScrollTop={mainScrollTop} />
      </div>
    </ThemeContext.Provider>
  );
};

const App: React.FC = () => {
    console.log('App component is rendering...');
    const path = window.location.pathname;
    if (path.startsWith('/menu/')) {
        return <LiveMenu />;
    }
    if (path === '/privacy-policy') {
        return <PrivacyPolicy />;
    }
    if (path === '/terms-of-service') {
        return <TermsOfService />;
    }

    return (
        <ErrorBoundary>
            <ToastProvider>
                <AppContent />
            </ToastProvider>
        </ErrorBoundary>
    )
};


const AppContent: React.FC = () => {
    console.log('AppContent component is rendering...');
    const [userBusinesses, setUserBusinesses] = useLocalStorage<BusinessInfo[]>('user_businesses', []);
    const [currentAccountId, setCurrentAccountId] = useLocalStorage<string | null>('current_account_id', null);
    const [currentBusinessId, setCurrentBusinessId] = useLocalStorage<string | null>('current_business_id', null);
    const [accountState, setAccountState] = useLocalStorage<AccountState | null>(`business_${currentBusinessId}`, null);
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>(`user_${currentAccountId}`, null);
    const { syncStatus, runSync, dispatchOperation } = useSync(currentAccountId, currentBusinessId, accountState, setAccountState);
    const toast = useToast();
    const [isAuthReady, setIsAuthReady] = useState(false);
    const currentUserRef = useRef<User | null>(currentUser);

    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    useEffect(() => {
        let profileUnsubscribe: (() => void) | null = null;
        
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (profileUnsubscribe) {
                profileUnsubscribe();
                profileUnsubscribe = null;
            }

            if (firebaseUser) {
                // User is signed in, listen to profile changes
                profileUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setCurrentUser(prev => {
                            const newUser = {
                                id: firebaseUser.uid,
                                name: userData.name,
                                email: userData.email,
                                role: 'Admin',
                                accountId: userData.accountId,
                                createdAt: userData.createdAt || new Date().toISOString(),
                                updatedAt: userData.updatedAt || new Date().toISOString()
                            };
                            // Only update if data actually changed
                            if (prev && JSON.stringify(prev) === JSON.stringify(newUser)) {
                                return prev;
                            }
                            return newUser;
                        });
                        setCurrentAccountId(userData.accountId);
                    }
                    setIsAuthReady(true);
                }, (error) => {
                    console.error("Error listening to user profile:", error);
                    setIsAuthReady(true);
                });
            } else {
                // User is signed out, clear state
                setCurrentUser(null);
                setCurrentAccountId(null);
                setCurrentBusinessId(null);
                setAccountState(null);
                setIsAuthReady(true);
            }
        });

        return () => {
            unsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, [setCurrentUser, setCurrentAccountId, setCurrentBusinessId, setAccountState]);

    const handleLogin = (business: AccountState, user: User, businesses: BusinessInfo[]) => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('current_account_id', JSON.stringify(user.accountId));
            window.localStorage.setItem('current_business_id', JSON.stringify(business.id));
            window.localStorage.setItem(`business_${business.id}`, JSON.stringify(business));
            window.localStorage.setItem(`user_${user.accountId}`, JSON.stringify(user));
            window.localStorage.setItem('user_businesses', JSON.stringify(businesses));
            window.localStorage.setItem('fresh_login', 'true');
        }

        setUserBusinesses(businesses);
        setCurrentAccountId(user.accountId);
        setCurrentBusinessId(business.id);
        setAccountState(business);
        setCurrentUser(user);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setCurrentAccountId(null);
            setCurrentBusinessId(null);
            setAccountState(null);
            setCurrentUser(null);
            localStorage.clear();
        } catch (error) {
            console.error("Logout error:", error);
            toast.showToast("Failed to log out.", "error");
        }
    };

    const handleHardReset = async () => {
        if (!currentBusinessId || accountState?.isTest) {
            toast.showToast("Hard reset is not available for this account.", "error");
            return;
        }
        try {
            const item = window.localStorage.getItem(`business_${currentBusinessId}`);
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
    
     const handleDeleteBusiness = async (accountId: string, businessId: string): Promise<boolean> => {
        if (!auth.currentUser) return false;
        try {
            await serverDeleteBusiness(accountId, businessId);
            
            if (businessId === currentBusinessId) {
                setCurrentBusinessId(null);
                setAccountState(null);
            }
            return true;
        } catch (error) {
            console.error("Failed to delete business on server:", error);
            toast.showToast("Failed to delete the business. Please ensure you are connected to the server and try again.", "error");
            return false;
        }
    };

    const handleDeleteUserAccount = async (): Promise<boolean> => {
        if (!auth.currentUser) return false;
        try {
            const userId = auth.currentUser.uid;
            await serverDeleteUserAccount(userId);
            await auth.currentUser.delete();
            handleLogout();
            toast.showToast("Your account has been deleted.", "info");
            return true;
        } catch (error) {
            console.error("Failed to delete user account:", error);
            toast.showToast("Failed to delete your account. You may need to re-authenticate first.", "error");
            return false;
        }
    };

    const handleSwitchBusiness = async (businessId: string) => {
        if (!currentAccountId) return;
        
        const businessInfo = userBusinesses.find(b => b.id === businessId);
        if (!businessInfo) return;

        try {
            const businessDoc = await getDoc(doc(db, 'accounts', currentAccountId, 'businesses', businessId));
            if (businessDoc.exists()) {
                const newState = businessDoc.data() as AccountState;
                setCurrentBusinessId(businessId);
                setAccountState(newState);
                toast.showToast(`Switched to ${businessInfo.name}`, "success");
            }
        } catch (error) {
            console.error("Failed to switch business:", error);
            toast.showToast("Failed to switch business. Please check your connection.", "error");
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

    if (!accountState || !currentUser || !currentAccountId || !currentBusinessId) {
        return (
            <ErrorBoundary>
                <Login onLogin={handleLogin} onDeleteBusiness={handleDeleteBusiness} />
            </ErrorBoundary>
        );
    }
    
    return (
      <AccountApp 
          accountId={currentAccountId}
          businessId={currentBusinessId}
          accountState={accountState} 
          dispatchOperation={dispatchOperation}
          onLogout={handleLogout}
          initialUser={currentUser}
          syncStatus={syncStatus}
          onForceSync={runSync}
          onHardReset={handleHardReset}
          userBusinesses={userBusinesses}
          onDeleteBusiness={handleDeleteBusiness}
          onDeleteUserAccount={handleDeleteUserAccount}
          onSwitchBusiness={handleSwitchBusiness}
      />
    );
}

export default App;
