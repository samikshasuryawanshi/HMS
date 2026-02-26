// Staff Management Page — Admin-only: add staff by email, auto-generate empId
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, deleteDocument } from '../firebase/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoAddOutline,
    IoTrashOutline,
    IoMailOutline,
    IoShieldCheckmarkOutline,
} from 'react-icons/io5';

// Generate next employee ID based on existing count
const generateEmpId = (users) => {
    const staffCount = users.filter(u => u.empId).length;
    const nextNum = staffCount + 1;
    return `EMP-${String(nextNum).padStart(3, '0')}`;
};

const Staff = () => {
    const { isOwner, isManager, isCashier, userData } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({ email: '', role: 'staff' });

    useEffect(() => {
        if (!userData?.businessId) return;

        // Optionally, if the listener supports queries, query by businessId.
        // Assuming it fetches all, we filter below. A better approach is querying in Firebase.
        const unsub = listenToCollection('users', (data) => {
            const businessStaff = data.filter(u => u.businessId === userData.businessId);
            setUsers(businessStaff);
            setLoading(false);
        });
        return unsub;
    }, [userData]);

    const handleAddStaff = async (e) => {
        e.preventDefault();
        const { email, role } = formData;

        if (!email) {
            toast.error('Please enter the staff email');
            return;
        }

        // Check if email already exists
        if (users.some(u => u.email === email)) {
            toast.error('This email is already registered');
            return;
        }

        setCreating(true);
        try {
            const empId = generateEmpId(users);
            const staffDocId = `staff_${Date.now()}`;

            await setDoc(doc(db, 'users', staffDocId), {
                email,
                role,
                empId,
                name: '', // Will be auto-filled on first Google login
                photoURL: '',
                status: 'pending', // Becomes 'active' after first Google login
                businessId: userData?.businessId || '',
                createdBy: userData?.email || '',
                createdAt: new Date().toISOString(),
            });

            toast.success(`Staff added! Employee ID: ${empId}`);
            setModalOpen(false);
            setFormData({ email: '', role: 'staff' });
        } catch (error) {
            console.error('Error adding staff:', error);
            toast.error('Failed to add staff');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Remove "${user.name || user.email}"?`)) return;
        try {
            await deleteDocument('users', user.id);
            toast.success('Staff removed');
        } catch (error) {
            toast.error('Error removing staff');
        }
    };

    if (!isOwner && !isManager && !isCashier) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="glass-card p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">🚫</div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-dark-400">Only authorized roles can manage staff accounts.</p>
                </div>
            </div>
        );
    }

    if (loading) return <Loader />;

    const staffUsers = users.filter(u => u.role === 'staff' || u.role === 'chef');
    const managerUsers = users.filter(u => u.role === 'manager' || u.role === 'cashier');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Staff Management</h1>
                    <p className="page-subtitle">
                        {users.length} total • {managerUsers.length} managers/cashiers • {staffUsers.length} staff
                    </p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <IoAddOutline size={20} />
                    Add Staff
                </button>
            </div>

            {/* Users Grid */}
            {users.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Staff Yet</h3>
                    <p className="text-dark-400">Add your first staff member by email.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map(user => (
                        <div key={user.id} className="glass-card-hover p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    {/* Avatar — photo or initial */}
                                    {user.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            alt={user.name}
                                            className="w-10 h-10 rounded-xl object-cover"
                                        />
                                    ) : (
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${user.role === 'manager'
                                            ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                                            : user.role === 'cashier'
                                                ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                                                : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                                            }`}>
                                            {(user.name || user.email)?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-white font-semibold text-sm">
                                            {user.name || <span className="text-dark-400 italic">Pending login</span>}
                                        </h3>
                                        <p className="text-dark-400 text-xs">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={user.role === 'manager' ? 'badge-warning' : user.role === 'cashier' ? 'badge-info' : 'badge-success'}>
                                        {user.role}
                                    </span>
                                </div>
                            </div>

                            {/* Footer — empId, status, delete */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-dark-800">
                                <div className="flex items-center gap-2">
                                    {user.empId && (
                                        <span className="text-xs font-mono text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-md">
                                            {user.empId}
                                        </span>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded-md ${user.status === 'active'
                                        ? 'text-emerald-400 bg-emerald-500/10'
                                        : 'text-amber-400 bg-amber-500/10'
                                        }`}>
                                        {user.status === 'active' ? '● Active' : '○ Pending'}
                                    </span>
                                </div>
                                {/* Delete rules: Owner can delete any (except another owner/themself), Manager can delete cashier/chef/staff, Cashier can delete staff */}
                                {user.role !== 'owner' && (isOwner || (isManager && user.role !== 'manager') || (isCashier && user.role === 'staff')) && (
                                    <button
                                        onClick={() => handleDelete(user)}
                                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition-colors"
                                        title="Remove staff"
                                    >
                                        <IoTrashOutline size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Staff Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setFormData({ email: '', role: 'staff' }); }}
                title="Add Staff Member"
            >
                <form onSubmit={handleAddStaff} className="space-y-4">
                    <p className="text-dark-400 text-sm">
                        Enter the staff member's Google email. They'll sign in with Google and their name & photo will be auto-populated.
                    </p>

                    {/* Email */}
                    <div>
                        <label className="label-text">Google Email</label>
                        <div className="relative">
                            <IoMailOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="staff@gmail.com"
                                className="input-field pl-11"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Role */}
                    <div>
                        <label className="label-text">Role</label>
                        <div className="relative">
                            <IoShieldCheckmarkOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="select-field pl-11"
                            >
                                {/* Owner can create Managers. Managers can create Cashier, Chef, Staff. Cashiers create Staff. */}
                                {isOwner && <option value="manager">Manager</option>}
                                {(isOwner || isManager) && <option value="cashier">Cashier</option>}
                                {(isOwner || isManager) && <option value="chef">Chef</option>}
                                <option value="staff">Staff (Waiter)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={creating}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {creating ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <IoAddOutline size={18} />
                                    Add Staff
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setModalOpen(false); setFormData({ email: '', role: 'staff' }); }}
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Staff;
