// Staff Login Page — Google popup, email-matched to pre-registered staff
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';

const StaffLogin = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const result = await signInWithGoogle();
            const user = result.user;

            // Search for a staff/chef/manager entry with this email
            const q = query(
                collection(db, 'users'),
                where('email', '==', user.email),
                where('role', 'in', ['staff', 'chef', 'manager'])
            );
            const snap = await getDocs(q);

            if (snap.empty) {
                toast.error('Your email is not registered. Contact your admin to add you.');
                return;
            }

            // Found staff entry — update with Google profile data
            const staffDoc = snap.docs[0];
            const staffData = staffDoc.data();

            await updateDoc(doc(db, 'users', staffDoc.id), {
                name: user.displayName || staffData.name || 'Staff',
                photoURL: user.photoURL || '',
                googleUid: user.uid,
                status: 'active',
                lastLogin: new Date().toISOString(),
            });

            toast.success(`Welcome, ${user.displayName || 'Staff'}!`);
            navigate('/');
        } catch (error) {
            if (error.code !== 'auth/popup-closed-by-user') {
                console.error('Staff login error:', error);
                toast.error('Sign-in failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                        <span className="text-3xl">👤</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Staff Login</h1>
                    <p className="text-dark-400 mt-2">Sign in with the Google account your admin registered</p>
                </div>

                {/* Google Sign-In */}
                <div className="glass-card p-8 space-y-5">
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-xl border border-emerald-500/30 bg-dark-800 hover:bg-dark-700 text-white font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in with Google
                            </>
                        )}
                    </button>

                    <p className="text-center text-dark-500 text-xs">
                        Your admin must have registered your email before you can sign in.
                    </p>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-dark-700" />
                        <span className="text-dark-500 text-xs uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-dark-700" />
                    </div>

                    {/* Admin link */}
                    <p className="text-center text-dark-400 text-sm">
                        Admin?{' '}
                        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                            Admin Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StaffLogin;
