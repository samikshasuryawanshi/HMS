// Firestore CRUD helpers
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { getCached, setCached, invalidateCache, invalidateCacheByPrefix } from '../utils/firestoreCache';

// ============ GENERIC HELPERS ============

// Add a document to a collection
export const addDocument = async (collectionName, data) => {
    const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp()
    });
    // Invalidate collection cache so next read fetches fresh data
    invalidateCacheByPrefix(`collection:${collectionName}`);
    return docRef.id;
};

// Get a single document by ID (with in-memory cache)
export const getDocument = async (collectionName, docId) => {
    const cacheKey = `doc:${collectionName}/${docId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setCached(cacheKey, data);
        return data;
    }
    return null;
};

// Get all documents from a collection (with in-memory cache)
export const getDocuments = async (collectionName) => {
    const cacheKey = `collection:${collectionName}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const querySnapshot = await getDocs(collection(db, collectionName));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCached(cacheKey, data);
    return data;
};

// Update a document
export const updateDocument = async (collectionName, docId, data) => {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
    // Invalidate both single doc and collection caches
    invalidateCache(`doc:${collectionName}/${docId}`);
    invalidateCacheByPrefix(`collection:${collectionName}`);
};

// Delete a document
export const deleteDocument = async (collectionName, docId) => {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    // Invalidate both single doc and collection caches
    invalidateCache(`doc:${collectionName}/${docId}`);
    invalidateCacheByPrefix(`collection:${collectionName}`);
};

// ============ REAL-TIME LISTENERS ============

// Listen to a collection in real-time
export const listenToCollection = (collectionName, callback, queryConstraints = []) => {
    const q = query(collection(db, collectionName), ...queryConstraints);
    return onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(docs);
    });
};

// Listen to a single document
export const listenToDocument = (collectionName, docId, callback) => {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() });
        }
    });
};

// ============ QUERY HELPERS ============

// Get documents with filters
export const getFilteredDocuments = async (collectionName, field, operator, value) => {
    const q = query(collection(db, collectionName), where(field, operator, value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get documents ordered by a field
export const getOrderedDocuments = async (collectionName, field, direction = 'desc') => {
    const q = query(collection(db, collectionName), orderBy(field, direction));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ============ TIMESTAMP HELPERS ============

export const createTimestamp = (date) => {
    return Timestamp.fromDate(new Date(date));
};

export const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

// Export Firestore utilities for direct use
export { collection, doc, query, where, orderBy, serverTimestamp, Timestamp };
