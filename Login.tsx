import React, { useState } from 'react';
import { User, AccountState, AccountInfo, ShopType } from './types';
import { auth, db } from './firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    arrayUnion 
} from 'firebase/firestore';
import { createInitialAccountState, createTestAccountState } from './src/data/mockData';
import Icon from './components/Icon';

interface LoginProps {
    onLogin: (account: AccountState, user: User, accounts: AccountInfo[]) => void;
    onDeleteAccount?: (accountId: string) => Promise<boolean>;
}

const LeftPanel: React.FC = () => (
    <div className="hidden md:flex flex-col items-center justify-center w-2/5 bg-primary-600 text-white p-12">
        <div className="w-24 h-24 mb-6 text-white">
            <Icon name="logo" className="w-full h-full" />
        </div>
        <h1 className="text-3xl font-bold text-center">Retail & Restaurant Hub</h1>
        <p className="mt-4 text-center text-primary-200">The all-in-one solution to manage your business with ease.</p>
    </div>
);

const RightPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full md:w-3/5 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">{children}</div>
    </div>
);

const shopTypesData: { type: ShopType, title: string, description: string, icon: React.ReactNode }[] = [
    { type: 'Retail', title: 'Retail Store', description: 'General stores, boutiques. Manage products, sales, and customers.', icon: '🛍️' },
    { type: 'Restaurant', title: 'Restaurant / Cafe', description: 'Manage tables, kitchen orders (KDS), and dishes.', icon: '🍔' },
    { type: 'Rashan', title: 'Rashan / Grocery', description: 'Kirana stores, supermarkets. Sell items by weight.', icon: '🛒' },
];

enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
}

interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: {
        userId: string | undefined;
        email: string | null | undefined;
        emailVerified: boolean | undefined;
        isAnonymous: boolean | undefined;
        tenantId: string | null | undefined;
        providerInfo: {
            providerId: string;
            displayName: string | null;
            email: string | null;
            photoUrl: string | null;
        }[];
    }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified,
            isAnonymous: auth.currentUser?.isAnonymous,
            tenantId: auth.currentUser?.tenantId,
            providerInfo: auth.currentUser?.providerData.map(provider => ({
                providerId: provider.providerId,
                displayName: provider.displayName,
                email: provider.email,
                photoUrl: provider.photoURL
            })) || []
        },
        operationType,
        path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
};

const Login: React.FC<LoginProps> = ({ onLogin, onDeleteAccount }) => {
    type Step = 'auth' | 'select_business' | 'create_business';
    const [step, setStep] = useState<Step>('auth');
    const [isRegistering, setIsRegistering] = useState(false);
    
    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [shopName, setShopName] = useState('');
    const [shopTypes, setShopTypes] = useState<ShopType[]>(['Retail']);

    // State after login
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [userAccounts, setUserAccounts] = useState<AccountInfo[]>([]);
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setError('');
        setShopName('');
        setShopTypes(['Retail']);
    };
    
    const handleShopTypeToggle = (type: ShopType) => {
        setShopTypes(prev => {
            const isSelected = prev.includes(type);
            if (isSelected) {
                return prev.length === 1 ? prev : prev.filter(t => t !== type);
            } else {
                return [...prev, type];
            }
        });
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setIsLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            const user = userCredential.user;

            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                setLoggedInUser({
                    id: user.uid as any,
                    name: userData.name || user.displayName || 'User',
                    email: user.email || '',
                    role: 'Admin',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                setUserAccounts(userData.accounts || []);
                if (userData.accounts && userData.accounts.length > 0) {
                    setStep('select_business');
                } else {
                    setStep('create_business');
                }
            } else {
                // Create new user profile for Google user
                const name = user.displayName || 'User';
                const email = user.email || '';
                const userDoc = {
                    id: user.uid,
                    name: name,
                    email: email,
                    role: 'User',
                    accounts: []
                };
                try {
                    await setDoc(doc(db, 'users', user.uid), userDoc);
                } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
                }
                
                setLoggedInUser({
                    id: user.uid as any,
                    name: name,
                    email: email,
                    role: 'Admin',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                setUserAccounts([]);
                setStep('create_business');
            }
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            let userCredential;
            if (isRegistering) {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
                
                // Create user document in Firestore
                const userDoc = {
                    id: userCredential.user.uid,
                    name: name,
                    email: email,
                    role: 'User',
                    accounts: []
                };
                try {
                    await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
                } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, `users/${userCredential.user.uid}`);
                }
                
                setLoggedInUser({
                    id: userCredential.user.uid as any,
                    name: name,
                    email: email,
                    role: 'Admin',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                setUserAccounts([]);
                setStep('create_business');
            } else {
                userCredential = await signInWithEmailAndPassword(auth, email, password);
                const userDocSnap = await getDoc(doc(db, 'users', userCredential.user.uid));
                
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setLoggedInUser({
                        id: userCredential.user.uid as any,
                        name: userData.name,
                        email: userData.email,
                        role: 'Admin',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    setUserAccounts(userData.accounts || []);
                    if (userData.accounts && userData.accounts.length > 0) {
                        setStep('select_business');
                    } else {
                        setStep('create_business');
                    }
                } else {
                    setError('User profile not found.');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectBusiness = async (accountId: string) => {
        if (deletingAccountId) return;
        setIsLoading(true);
        setError('');
        try {
            const accountSnap = await getDoc(doc(db, 'accounts', accountId));
            if (accountSnap.exists() && loggedInUser) {
                const accountData = accountSnap.data();
                onLogin(accountData.data as AccountState, loggedInUser, userAccounts);
            } else {
                setError('Could not load the selected business.');
            }
        } catch (_err) {
             setError('Failed to fetch business data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemoLogin = () => {
        setIsLoading(true);
        setError('');
        setTimeout(() => {
            const testAccount = createTestAccountState();
            const demoUser = testAccount.users.find(u => u.role === 'Admin')!;
            const demoAccountInfo: AccountInfo = {
                id: testAccount.id,
                name: testAccount.name
            };
            onLogin(testAccount, demoUser as any, [demoAccountInfo]);
        }, 500);
    };

    const handleCreateBusinessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!loggedInUser) {
            setError("User session logged out. Please log in again.");
            setStep('auth');
            setIsLoading(false);
            return;
        }

        try {
            const accountId = `acc_${Date.now()}`;
            const initialState = createInitialAccountState(accountId, shopName, shopTypes);
            
            // Add the current user as an admin in the state
            initialState.users.push({
                id: loggedInUser.id as any,
                name: loggedInUser.name,
                email: loggedInUser.email,
                role: 'Admin',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            const accountDoc = {
                id: accountId,
                name: shopName,
                ownerId: loggedInUser.id,
                data: initialState,
                lastSyncId: 0
            };

            try {
                await setDoc(doc(db, 'accounts', accountId), accountDoc);
            } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `accounts/${accountId}`);
            }
            
            // Update user's accounts list
            const newAccountInfo = { id: accountId, name: shopName, role: 'Admin' };
            try {
                await updateDoc(doc(db, 'users', loggedInUser.id as any), {
                    accounts: arrayUnion(newAccountInfo)
                });
            } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, `users/${loggedInUser.id}`);
            }

            onLogin(initialState, loggedInUser, [...userAccounts, newAccountInfo]);
        } catch (err: any) {
            setError(err.message || 'Failed to create business.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        switch (step) {
            case 'auth':
                return (
                    <>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{isRegistering ? 'Create Your Account' : 'Sign In'}</h2>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{isRegistering ? 'One account for all your businesses.' : 'Enter your credentials to continue.'}</p>
                        </div>
                        <form className="space-y-4" onSubmit={handleAuthSubmit}>
                            {isRegistering && <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Full Name" required className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" />}
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" />
                            {error && <p className="text-sm text-center text-red-500">{error}</p>}
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                                {isLoading ? 'Please wait...' : (isRegistering ? 'Register' : 'Sign In')}
                            </button>
                        </form>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">Or continue with</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Continue with Google
                        </button>
                        <div className="mt-4 text-center">
                            <button onClick={handleDemoLogin} className="text-sm text-gray-500 hover:text-primary-600 underline">
                                Try Demo Session
                            </button>
                        </div>
                        <div className="mt-6 text-center text-sm">
                            <button onClick={() => { setIsRegistering(!isRegistering); resetForm(); }} className="font-semibold text-primary-600 hover:text-primary-500">
                                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                            </button>
                        </div>
                    </>
                );

            case 'select_business':
                return (
                    <>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Select Your Business</h2>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Welcome back, {loggedInUser?.name}!</p>
                        </div>
                        <div className="space-y-3">
                            {userAccounts.map(account => (
                                <div key={account.id} className="flex items-center gap-2 group">
                                    <button 
                                        onClick={() => handleSelectBusiness(account.id)} 
                                        className="flex-1 text-left p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:border-gray-700 font-semibold transition-colors"
                                    >
                                        {account.name}
                                    </button>
                                    {onDeleteAccount && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingAccountId(account.id);
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Business"
                                        >
                                            <Icon name="trash" className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {deletingAccountId && (
                            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
                                    <h3 className="text-lg font-bold text-red-600">Delete Business</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Are you sure you want to delete "{userAccounts.find(a => a.id === deletingAccountId)?.name}"? This action cannot be undone.</p>
                                    <div className="flex justify-center gap-4 mt-6">
                                        <button onClick={() => setDeletingAccountId(null)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition">Cancel</button>
                                        <button 
                                            onClick={async () => {
                                                if (onDeleteAccount && deletingAccountId) {
                                                    const success = await onDeleteAccount(deletingAccountId);
                                                    if (success) {
                                                        setUserAccounts(prev => prev.filter(a => a.id !== deletingAccountId));
                                                        setDeletingAccountId(null);
                                                    }
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-semibold"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="mt-6 text-center">
                            <button onClick={() => setStep('create_business')} className="font-semibold text-primary-600 hover:text-primary-500">
                                + Create a new business
                            </button>
                        </div>
                         <div className="mt-6 text-center text-sm">
                            <button onClick={() => { setStep('auth'); resetForm(); setLoggedInUser(null); }} className="text-gray-500 hover:underline">
                                Log out
                            </button>
                        </div>
                    </>
                );

            case 'create_business':
                return (
                    <>
                        <div className="text-center mb-6">
                             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{userAccounts.length > 0 ? 'Create a New Business' : 'Create Your First Business'}</h2>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">First, give your new shop a name.</p>
                        </div>
                        <form className="space-y-4" onSubmit={handleCreateBusinessSubmit}>
                             <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Shop Name" required className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white" />
                             
                             <div className="pt-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select your business type(s):</label>
                                <div className="mt-2 space-y-2">
                                    {shopTypesData.map(st => (
                                        <div 
                                            key={st.type} 
                                            onClick={() => handleShopTypeToggle(st.type)}
                                            className={`p-3 border-2 rounded-lg cursor-pointer transition-colors relative ${shopTypes.includes(st.type) ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                        >
                                            {shopTypes.includes(st.type) && (
                                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center">
                                                    <Icon name="check" className="w-3 h-3" />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{st.icon}</span>
                                                <div>
                                                    <p className="font-bold text-gray-800 dark:text-gray-200">{st.title}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{st.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>

                             {error && <p className="text-sm text-center text-red-500">{error}</p>}
                             <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
                                {isLoading ? 'Creating...' : 'Create & Open Business'}
                            </button>
                        </form>
                        {userAccounts.length > 0 && (
                             <div className="mt-6 text-center text-sm">
                                <button onClick={() => setStep('select_business')} className="text-gray-500 hover:underline">
                                    &larr; Back to business selection
                                </button>
                            </div>
                        )}
                    </>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
            <div className="flex justify-center items-center min-h-screen">
                <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex overflow-hidden mx-4 my-8">
                    <LeftPanel />
                    <RightPanel>{renderContent()}</RightPanel>
                </div>
            </div>
        </div>
    );
};

export default Login;
