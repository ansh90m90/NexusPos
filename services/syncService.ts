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
    limit,
    getDocs,
    deleteDoc,
    getDoc
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
 * Updates the account state in Firestore.
 */
export const saveAccountState = async (accountId: string, state: AccountState) => {
    const path = `accounts/${accountId}`;
    try {
        const accountRef = doc(db, 'accounts', accountId);
        await updateDoc(accountRef, {
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
export const pushOperation = async (accountId: string, operation: Operation) => {
    const path = `accounts/${accountId}/operations`;
    try {
        const opsRef = collection(db, 'accounts', accountId, 'operations');
        await addDoc(opsRef, sanitize(operation));
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
};

/**
 * Subscribes to real-time updates for an account's operations.
 */
export const subscribeToOperations = (accountId: string, lastSyncId: number, onNewOperations: (ops: Operation[]) => void) => {
    const path = `accounts/${accountId}/operations`;
    const opsRef = collection(db, 'accounts', accountId, 'operations');
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
 * Fetches the latest account state from Firestore.
 */
export const fetchAccountState = async (accountId: string): Promise<AccountState | null> => {
    const path = `accounts/${accountId}`;
    try {
        const accountRef = doc(db, 'accounts', accountId);
        const snap = await getDoc(accountRef);
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
 * Deletes an account from Firestore.
 */
export const deleteAccount = async (accountId: string): Promise<void> => {
    const path = `accounts/${accountId}`;
    try {
        const accountRef = doc(db, 'accounts', accountId);
        await deleteDoc(accountRef);
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
    }
};
