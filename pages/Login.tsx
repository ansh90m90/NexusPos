
import React, { useState } from 'react';
import { User, AccountState, AccountInfo } from '../types';
import { createTestAccountState } from '../data/mockData';
import Icon from '../components/Icon';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Tooltip } from '../components/Tooltip';

interface LoginProps {
    onLogin: (account: AccountState, user: User, accounts: AccountInfo[]) => void;
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

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const firebaseUser = result.user;

            // Fetch user profile from Firestore
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const user: User = {
                    id: firebaseUser.uid as any,
                    name: userData.name || firebaseUser.displayName || 'User',
                    email: userData.email || firebaseUser.email || '',
                    role: 'Admin',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                // For demo purposes, if no account state exists, we use mock data
                // In a real app, we would fetch the account state from Firestore
                const testAccount = createTestAccountState();
                const accounts: AccountInfo[] = userData.accounts || [{ id: testAccount.id, name: testAccount.name }];
                
                onLogin(testAccount, user, accounts);
            } else {
                // New user, create a demo account for them
                const testAccount = createTestAccountState();
                const user: User = {
                    id: firebaseUser.uid as any,
                    name: firebaseUser.displayName || 'User',
                    email: firebaseUser.email || '',
                    role: 'Admin',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                onLogin(testAccount, user, [{ id: testAccount.id, name: testAccount.name }]);
            }
        } catch (err: any) {
            console.error("Google Sign-In failed:", err);
            setError("Google Sign-In failed. Please check your connection and try again.");
            setIsLoading(false);
        }
    };

    const handleDemoLogin = () => {
        setIsLoading(true);
        setError('');
        try {
            // Use a timeout to simulate a brief loading period for better UX
            setTimeout(() => {
                const testAccount = createTestAccountState();
                const demoUser = testAccount.users.find(u => u.role === 'Admin')!;
                const demoAccountInfo: AccountInfo = {
                    id: testAccount.id,
                    name: testAccount.name
                };
                onLogin(testAccount, demoUser, [demoAccountInfo]);
            }, 500);
        } catch (err) {
            console.error("Failed to load demo account. Details:", err);
            setError("Failed to load demo account. Something went wrong with the mock data generator.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
            <div className="flex justify-center items-center min-h-screen">
                <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex overflow-hidden mx-4 my-8">
                    <LeftPanel />
                    <RightPanel>
                        <>
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome!</h2>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Manage your retail and restaurant business efficiently.</p>
                            </div>
                            
                            {error && <p className="text-sm text-center text-red-500 mb-4">{error}</p>}
                            
                            <div className="space-y-4">
                                <Tooltip content="Sign in securely using your Google account" position="top">
                                    <button
                                        type="button"
                                        onClick={handleGoogleLogin}
                                        disabled={isLoading}
                                        className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                    >
                                        <Icon name="google" className="w-5 h-5" />
                                        {isLoading ? 'Loading...' : 'Continue with Google'}
                                    </button>
                                </Tooltip>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-300 dark:border-slate-700"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">Or</span>
                                    </div>
                                </div>

                                <Tooltip content="Try out the app with a pre-populated demo account" position="bottom">
                                    <button
                                        type="button"
                                        onClick={handleDemoLogin}
                                        disabled={isLoading}
                                        className="w-full flex justify-center py-3 px-4 text-lg font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isLoading ? 'Loading...' : 'Start Demo Session'}
                                    </button>
                                </Tooltip>
                            </div>
                            
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 text-center">
                                Use the demo session to explore features without an account.
                            </p>
                        </>
                    </RightPanel>
                </div>
            </div>
        </div>
    );
};

export default Login;
