// Firebase Authentication helpers — Google popup only
import {
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth';
import { auth } from './config';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Sign in with Google popup (used for both admin and staff)
export const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
};

// Logout
export const logoutUser = async () => {
    await signOut(auth);
};

// Auth state observer
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};
