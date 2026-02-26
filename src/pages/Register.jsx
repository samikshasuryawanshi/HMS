// Register Page
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, signInWithGoogle } from '../firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import {
    IoPersonOutline,
    IoMailOutline,
    IoLockClosedOutline,
    IoEyeOutline,
    IoEyeOffOutline,
    IoPeopleOutline,
} from 'react-icons/io5';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'staff',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, email, password, confirmPassword, role } = formData;

        if (!name || !email || !password || !confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const user = await registerUser(email, password);

            // Create user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name,
                email,
                role,
                createdAt: new Date().toISOString(),
            });

            toast.success('Account created successfully!');
            navigate('/');
        } catch (error) {
            const errorMessages = {
                'auth/email-already-in-use': 'Email is already registered',
                'auth/invalid-email': 'Invalid email address',
                'auth/weak-password': 'Password is too weak',
            };
            toast.error(errorMessages[error.code] || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In handler (popup — instant Firebase Google prompt)
    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        try {
            const result = await signInWithGoogle();
            // Create/merge user doc for Google sign-in
            const user = result.user;
            await setDoc(doc(db, 'users', user.uid), {
                name: user.displayName || 'Google User',
                email: user.email,
                role: 'staff',
                createdAt: new Date().toISOString(),
            }, { merge: true });
            toast.success('Account created successfully!');
            navigate('/');
        } catch (error) {
            if (error.code !== 'auth/popup-closed-by-user') {
                toast.error('Google sign-in failed. Please try again.');
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <span className="text-3xl">🍽️</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Create Account</h1>
                    <p className="text-dark-400 mt-2">Set up your restaurant staff account</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
                    {/* Google Sign-Up */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl border border-dark-600 bg-dark-800 hover:bg-dark-700 text-white font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {googleLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-dark-700" />
                        <span className="text-dark-500 text-xs uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-dark-700" />
                    </div>

                    {/* Name */}
                    <div>
                        <label className="label-text">Full Name</label>
                        <div className="relative">
                            <IoPersonOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                className="input-field pl-11"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="label-text">Email Address</label>
                        <div className="relative">
                            <IoMailOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                className="input-field pl-11"
                            />
                        </div>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="label-text">Role</label>
                        <div className="relative">
                            <IoPeopleOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="select-field pl-11"
                            >
                                <option value="staff">Staff (Waiter)</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="label-text">Password</label>
                        <div className="relative">
                            <IoLockClosedOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Min 6 characters"
                                className="input-field pl-11 pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                            >
                                {showPassword ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="label-text">Confirm Password</label>
                        <div className="relative">
                            <IoLockClosedOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Repeat your password"
                                className="input-field pl-11"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Create Account'
                        )}
                    </button>

                    {/* Login link */}
                    <p className="text-center text-dark-400 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;
