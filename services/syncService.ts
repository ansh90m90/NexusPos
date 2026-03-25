import { db, auth } from '../firebase';
import { 
    doc, 
    updateDoc, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    getDocs,
    deleteDoc,
    getDoc,
    arrayRemove
} from 'firebase/firestore';
import { AccountState, Operation } from '../types';

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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sanitizes an object for Firestore by removing undefined values.
 */
const sanitize = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(sanitize);
    } else if (obj !== null && typeof obj === 'object') {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = sanitize(value);
            }
            return acc;
        }, {} as any);
    }
    return obj;
};

/**
 * Updates the business state in Firestore.
 */
export const saveBusinessState = async (accountId: string, businessId: string, state: AccountState) => {
    const path = `accounts/${accountId}/businesses/${businessId}`;
    try {
        const businessRef = doc(db, 'accounts', accountId, 'businesses', businessId);
        await updateDoc(businessRef, {
            data: sanitize(state),
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
};

/**
 * Pushes a new operation to Firestore for synchronization.
 */
export const pushOperation = async (accountId: string, businessId: string, operation: Operation) => {
    const path = `accounts/${accountId}/businesses/${businessId}/operations`;
    try {
        const opsRef = collection(db, 'accounts', accountId, 'businesses', businessId, 'operations');
        await addDoc(opsRef, sanitize(operation));
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

/**
 * Subscribes to real-time updates for a business's operations.
 */
export const subscribeToOperations = (accountId: string, businessId: string, lastSyncId: number, onNewOperations: (ops: Operation[]) => void) => {
    const path = `accounts/${accountId}/businesses/${businessId}/operations`;
    const opsRef = collection(db, 'accounts', accountId, 'businesses', businessId, 'operations');
    const q = query(
        opsRef, 
        where('id', '>', lastSyncId),
        orderBy('id', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const ops: Operation[] = [];
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                ops.push(change.doc.data() as Operation);
            }
        });
        if (ops.length > 0) {
            onNewOperations(ops);
        }
    }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
    });
};

/**
 * Fetches the latest business state from Firestore.
 */
export const fetchBusinessState = async (accountId: string, businessId: string): Promise<AccountState | null> => {
    const path = `accounts/${accountId}/businesses/${businessId}`;
    try {
        const businessRef = doc(db, 'accounts', accountId, 'businesses', businessId);
        const snap = await getDoc(businessRef);
        if (snap.exists()) {
            return snap.data().data as AccountState;
        }
        return null;
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return null;
    }
};

/**
 * Deletes a business from Firestore.
 */
export const deleteBusiness = async (accountId: string, businessId: string): Promise<void> => {
    const path = `accounts/${accountId}/businesses/${businessId}`;
    try {
        // Delete operations subcollection first (best effort)
        const opsRef = collection(db, 'accounts', accountId, 'businesses', businessId, 'operations');
        const opsSnap = await getDocs(opsRef);
        const deletePromises = opsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // Delete the business document
        const businessRef = doc(db, 'accounts', accountId, 'businesses', businessId);
        await deleteDoc(businessRef);
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

/**
 * Deletes an account and all its businesses from Firestore.
 */
export const deleteAccount = async (accountId: string): Promise<void> => {
    const path = `accounts/${accountId}`;
    try {
        // Delete all businesses first
        const businessesRef = collection(db, 'accounts', accountId, 'businesses');
        const businessesSnap = await getDocs(businessesRef);
        const deletePromises = businessesSnap.docs.map(doc => deleteBusiness(accountId, doc.id));
        await Promise.all(deletePromises);

        // Delete the main account document
        const accountRef = doc(db, 'accounts', accountId);
        await deleteDoc(accountRef);
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

/**
 * Deletes a user's entire profile and associated data references from Firestore.
 */
export const deleteUserAccount = async (userId: string): Promise<void> => {
    const path = `users/${userId}`;
    try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};

/**
 * Removes an account reference from a user's profile.
 */
export const removeAccountFromUser = async (userId: string, accountId: string) => {
    const path = `users/${userId}`;
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const accountToRemove = userData.accounts?.find((acc: any) => acc.id === accountId);
            if (accountToRemove) {
                await updateDoc(userRef, {
                    accounts: arrayRemove(accountToRemove)
                });
            }
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
};
