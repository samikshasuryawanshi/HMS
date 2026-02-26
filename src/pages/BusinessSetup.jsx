// Business Setup Page — First-time admin registration
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';
import {
    IoStorefrontOutline,
    IoBusinessOutline,
    IoLocationOutline,
    IoCallOutline,
} from 'react-icons/io5';

const businessTypes = [
    { value: 'restaurant', label: '🍽️ Restaurant', desc: 'Full-service dining' },
    { value: 'cafe', label: '☕ Café', desc: 'Coffee & light meals' },
    { value: 'hotel', label: '🏨 Hotel', desc: 'Accommodation & dining' },
    { value: 'bar', label: '🍸 Bar & Lounge', desc: 'Drinks & nightlife' },
    { value: 'cloud_kitchen', label: '🍳 Cloud Kitchen', desc: 'Delivery-only kitchen' },
    { value: 'food_truck', label: '🚚 Food Truck', desc: 'Mobile food service' },
];

const BusinessSetup = () => {
    const { currentUser, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        address: '',
        phone: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.type) {
            toast.error('Please enter your business name and select a type');
            return;
        }

        setLoading(true);
        try {
            // Create business document
            const businessId = `biz_${Date.now()}`;
            await setDoc(doc(db, 'businesses', businessId), {
                name: formData.name,
                type: formData.type,
                address: formData.address,
                phone: formData.phone,
                ownerId: currentUser.uid,
                createdAt: new Date().toISOString(),
            });

            // Link business to admin user
            await updateDoc(doc(db, 'users', currentUser.uid), {
                businessId: businessId,
            });

            // Refresh context so needsSetup becomes false
            await refreshUser();

            toast.success('Business registered successfully!');
            navigate('/');
        } catch (error) {
            console.error('Setup error:', error);
            toast.error('Failed to register business. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/8 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <IoStorefrontOutline size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Register Your Business</h1>
                    <p className="text-dark-400 mt-2">Set up your hospitality management system</p>
                </div>

                <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
                    {/* Business Type Selection */}
                    <div>
                        <label className="label-text mb-3 block">Business Type</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {businessTypes.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: type.value })}
                                    className={`p-3 rounded-xl border text-center transition-all duration-200 ${formData.type === type.value
                                            ? 'border-primary-500 bg-primary-500/10 text-white'
                                            : 'border-dark-700 bg-dark-800/50 text-dark-400 hover:border-dark-500 hover:text-white'
                                        }`}
                                >
                                    <div className="text-2xl mb-1">{type.label.split(' ')[0]}</div>
                                    <div className="text-xs font-medium">{type.label.split(' ').slice(1).join(' ')}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Business Name */}
                    <div>
                        <label className="label-text">Business Name</label>
                        <div className="relative">
                            <IoBusinessOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. The Grand Kitchen"
                                className="input-field pl-11"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="label-text">Address <span className="text-dark-500">(optional)</span></label>
                        <div className="relative">
                            <IoLocationOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="123 Food Street, City"
                                className="input-field pl-11"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="label-text">Phone <span className="text-dark-500">(optional)</span></label>
                        <div className="relative">
                            <IoCallOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+91 98765 43210"
                                className="input-field pl-11"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <IoStorefrontOutline size={20} />
                                Launch My Business
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BusinessSetup;
