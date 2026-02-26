// Owner Dashboard — Full overview with stats, charts, and business settings
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateDocument } from '../firebase/firestore';
import Loader from '../components/Loader';
import AdminDashboard from './AdminDashboard';
import { toast } from 'react-toastify';
import {
    IoBusinessOutline,
    IoLocationOutline,
    IoCallOutline,
    IoCheckmarkCircleOutline,
} from 'react-icons/io5';

const OwnerDashboard = () => {
    const { businessData, userData, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('overview'); // overview, settings

    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: businessData?.name || '',
        type: businessData?.type || '',
        address: businessData?.address || '',
        phone: businessData?.phone || '',
    });

    useEffect(() => {
        if (businessData) {
            setFormData({
                name: businessData.name || '',
                type: businessData.type || '',
                address: businessData.address || '',
                phone: businessData.phone || '',
            });
        }
    }, [businessData]);

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        if (!businessData?.id) return;

        setSaving(true);
        try {
            await updateDocument('businesses', businessData.id, formData);
            await refreshUser();
            toast.success('Business settings updated successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update business settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title">Owner Dashboard</h1>
                <p className="page-subtitle">Welcome back, {userData?.name || 'Owner'} 👋</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-dark-800 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'overview'
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-dark-400 hover:text-white hover:bg-dark-700'
                        }`}
                >
                    Business Overview
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'settings'
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-dark-400 hover:text-white hover:bg-dark-700'
                        }`}
                >
                    Business Settings
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' ? (
                <div className="pt-4 border-t border-dark-800">
                    <AdminDashboard />
                </div>
            ) : (
                <div className="pt-4 border-t border-dark-800 max-w-2xl">
                    <form onSubmit={handleSaveSettings} className="glass-card p-6 space-y-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Edit Business Details</h2>

                        {/* Business Name */}
                        <div>
                            <label className="label-text">Business Name</label>
                            <div className="relative">
                                <IoBusinessOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field pl-11"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Address */}
                            <div>
                                <label className="label-text">Address</label>
                                <div className="relative">
                                    <IoLocationOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="input-field pl-11"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="label-text">Contact Phone</label>
                                <div className="relative">
                                    <IoCallOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="input-field pl-11"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary w-full flex justify-center items-center gap-2 mt-4"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <IoCheckmarkCircleOutline size={20} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default OwnerDashboard;
