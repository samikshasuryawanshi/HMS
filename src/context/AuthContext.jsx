// Auth Context - manages authentication state, user role, and business data
import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange } from '../firebase/auth';
import { getDocument } from '../firebase/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);
    const [businessData, setBusinessData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Find user doc by UID first, then fallback to email query
    const findUserDoc = async (user) => {
        // 1. Try by Firebase UID (admin users stored with UID as doc id)
        const uidDoc = await getDocument('users', user.uid);
        if (uidDoc) return uidDoc;

        // 2. Fallback: query by email (staff/chef/manager created by admin with custom IDs)
        const q = query(
            collection(db, 'users'),
            where('email', '==', user.email)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const doc = snap.docs[0];
            return { id: doc.id, ...doc.data() };
        }

        return null;
    };

    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (user) {
                setCurrentUser(user);
                try {
                    const userDoc = await findUserDoc(user);
                    if (userDoc) {
                        setUserRole(userDoc.role);
                        setUserData(userDoc);

                        // Fetch business data if user has a businessId
                        if (userDoc.businessId) {
                            const business = await getDocument('businesses', userDoc.businessId);
                            setBusinessData(business);
                        } else {
                            setBusinessData(null);
                        }
                    } else {
                        // No user doc yet (new Google user)
                        setUserRole(null);
                        setUserData(null);
                        setBusinessData(null);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setUserData(null);
                setBusinessData(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Refresh user data (call after business setup or profile update)
    const refreshUser = async () => {
        if (!currentUser) return;
        try {
            const userDoc = await findUserDoc(currentUser);
            if (userDoc) {
                setUserRole(userDoc.role);
                setUserData(userDoc);
                if (userDoc.businessId) {
                    const business = await getDocument('businesses', userDoc.businessId);
                    setBusinessData(business);
                }
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    };

    const isOwner = userRole === 'owner';
    const isManager = userRole === 'manager';
    const isCashier = userRole === 'cashier';
    const isChef = userRole === 'chef';
    const isStaff = userRole === 'staff';
    const needsSetup = isOwner && userData && !userData.businessId;

    const value = {
        currentUser,
        userRole,
        userData,
        businessData,
        loading,
        isOwner,
        isManager,
        isCashier,
        isChef,
        isStaff,
        needsSetup,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
