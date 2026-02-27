// Segmented Login Page
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import {
    IoArrowForwardOutline,
    IoPeopleOutline,
    IoBriefcaseOutline,
    IoStorefrontOutline,
    IoAddCircleOutline,
} from 'react-icons/io5';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [activeAction, setActiveAction] = useState(null);
    const navigate = useNavigate();

    const handleRoleLogin = async (allowedRoles, actionName) => {
        setLoading(true);
        setActiveAction(actionName);
        try {
            const result = await signInWithGoogle();
            const user = result.user;

            if (allowedRoles.includes('owner')) {
                // Owner logs in by UID directly
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const data = userSnap.data();
                    if (data.role !== 'owner') {
                        toast.error('Access Denied. You are not registered as an Owner.');
                        return;
                    }

                    if (!data.businessId) {
                        toast.info('Continue configuring your business.');
                        navigate('/setup');
                    } else {
                        toast.success('Welcome back, Owner!');
                        navigate('/');
                    }
                } else {
                    toast.error('Owner account not found. Please use "Setup Business" to register.');
                }
                return;
            }

            // For Staff / Manager, we search by email
            const q = query(
                collection(db, 'users'),
                where('email', '==', user.email)
            );
            const snap = await getDocs(q);

            if (!snap.empty) {
                const staffDoc = snap.docs[0];
                const staffData = staffDoc.data();

                if (!allowedRoles.includes(staffData.role)) {
                    toast.error(`Access Denied. This login is for ${actionName} only.`);
                    return;
                }

                if (!staffData.businessId) {
                    toast.error('Not authorized. Your account is not linked to an active business.');
                    return;
                }

                // First time login optimization for staff: update their profile fields
                await updateDoc(doc(db, 'users', staffDoc.id), {
                    name: user.displayName || staffData.name || 'Staff',
                    photoURL: user.photoURL || '',
                    googleUid: user.uid,
                    status: 'active',
                    lastLogin: new Date().toISOString(),
                });

                toast.success(`Welcome, ${user.displayName || 'Staff'}!`);
                navigate('/');
            } else {
                toast.error(`Your email is not registered for ${actionName}. Contact your manager.`);
            }
        } catch (error) {
            if (error.code !== 'auth/popup-closed-by-user') {
                console.error(error);
                toast.error('Sign-in failed. Please try again.');
            }
        } finally {
            setLoading(false);
            setActiveAction(null);
        }
    };

    const handleSetupBusiness = async () => {
        setLoading(true);
        setActiveAction('Setup');
        try {
            const result = await signInWithGoogle();
            const user = result.user;

            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.businessId) {
                    toast.info('You already have a business set up.');
                    navigate('/');
                } else if (data.role === 'owner') {
                    navigate('/setup');
                } else {
                    toast.error('This account is already registered as staff.');
                }
            } else {
                // New owner — create user doc, redirect to setup
                await setDoc(userRef, {
                    name: user.displayName || 'Owner',
                    email: user.email,
                    photoURL: user.photoURL || '',
                    role: 'owner',
                    createdAt: new Date().toISOString(),
                });
                toast.success('Welcome! Let\'s set up your business.');
                navigate('/setup');
            }
        } catch (error) {
            if (error.code !== 'auth/popup-closed-by-user') {
                console.error(error);
                toast.error('Sign-in failed. Please try again.');
            }
        } finally {
            setLoading(false);
            setActiveAction(null);
        }
    };

    return (
        <div className="min-h-screen bg-custom-gradient flex shadow-2xl items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-50" />
            </div>

            <div className="relative w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <span className="text-3xl">🍽️</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">RestaurantPro</h1>
                    <p className="text-dark-400 mt-2">Select your role to sign in</p>
                </div>

                <div className="glass-card p-6 sm:p-8 space-y-4">
                    <ActionButton
                        onClick={() => handleRoleLogin(['staff', 'chef', 'cashier'], 'Staff')}
                        disabled={loading}
                        loading={activeAction === 'Staff'}
                        icon={<IoPeopleOutline size={22} className="text-emerald-400" />}
                        title="Staff Login"
                        subtitle="Waiters, Chefs, and Cashiers"
                        borderColor="hover:border-emerald-500/50"
                    />

                    <ActionButton
                        onClick={() => handleRoleLogin(['manager'], 'Manager')}
                        disabled={loading}
                        loading={activeAction === 'Manager'}
                        icon={<IoBriefcaseOutline size={22} className="text-blue-400" />}
                        title="Manager Login"
                        subtitle="Restaurant Managers"
                        borderColor="hover:border-blue-500/50"
                    />

                    <ActionButton
                        onClick={() => handleRoleLogin(['owner'], 'Owner')}
                        disabled={loading}
                        loading={activeAction === 'Owner'}
                        icon={<IoStorefrontOutline size={22} className="text-primary-400" />}
                        title="Owner Login"
                        subtitle="Business Owners"
                        borderColor="hover:border-primary-500/50"
                    />

                    {/* Divider */}
                    <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-dark-700" />
                        <span className="text-dark-500 text-xs text-center uppercase tracking-wider font-semibold">New Business?</span>
                        <div className="flex-1 h-px bg-dark-700" />
                    </div>

                    <button
                        type="button"
                        onClick={handleSetupBusiness}
                        disabled={loading}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-primary-500/30 bg-primary-500/10 hover:bg-primary-500/20 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary-500/20 rounded-lg group-hover:bg-primary-500/30 transition-colors">
                                <IoAddCircleOutline size={22} className="text-primary-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-white font-semibold">Setup Your Business</h3>
                                <p className="text-primary-300/70 text-sm mt-0.5">Register a new restaurant</p>
                            </div>
                        </div>
                        {activeAction === 'Setup' ? (
                            <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                        ) : (
                            <IoArrowForwardOutline className="text-primary-400 group-hover:translate-x-1 transition-transform" size={20} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper component for the role buttons
const ActionButton = ({ onClick, disabled, loading, icon, title, subtitle, borderColor }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-4 rounded-xl border border-dark-600 bg-dark-800 hover:bg-dark-700 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group ${borderColor}`}
    >
        <div className="flex items-center gap-4">
            <div className="p-2 bg-dark-700 rounded-lg group-hover:bg-dark-600 transition-colors">
                {icon}
            </div>
            <div className="text-left">
                <h3 className="text-white font-semibold">{title}</h3>
                <p className="text-dark-400 text-sm mt-0.5">{subtitle}</p>
            </div>
        </div>
        {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
            <IoArrowForwardOutline className="text-dark-400 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
        )}
    </button>
);

export default Login;
