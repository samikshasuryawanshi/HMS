// Auth Context - manages authentication state and user role
import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange } from '../firebase/auth';
import { getDocument } from '../firebase/firestore';

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            if (user) {
                setCurrentUser(user);
                // Fetch user role from Firestore
                try {
                    const userDoc = await getDocument('users', user.uid);
                    if (userDoc) {
                        setUserRole(userDoc.role);
                        setUserData(userDoc);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setUserData(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userRole,
        userData,
        loading,
        isAdmin: userRole === 'admin',
        isStaff: userRole === 'staff',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
