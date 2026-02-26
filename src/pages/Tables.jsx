// Tables Management Page - Grid view with CRUD operations
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, addDocument, updateDocument, deleteDocument } from '../firebase/firestore';
import { where } from 'firebase/firestore';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoAddOutline,
    IoCreateOutline,
    IoTrashOutline,
    IoPeopleOutline,
} from 'react-icons/io5';

const statusColors = {
    Available: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    Occupied: 'bg-red-500/20 border-red-500/30 text-red-400',
    Reserved: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
};

const statusDots = {
    Available: 'bg-emerald-400',
    Occupied: 'bg-red-400',
    Reserved: 'bg-amber-400',
};

const Tables = () => {
    const { isManager, isCashier, userData } = useAuth();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTable, setEditTable] = useState(null);
    const [formData, setFormData] = useState({
        tableNumber: '',
        capacity: '',
        status: 'Available',
        floor: 'Ground Floor',
    });
    const [activeFloor, setActiveFloor] = useState('All');
    const [isCreatingFloor, setIsCreatingFloor] = useState(false);

    // Derive unique floors from tables
    const floors = Array.from(new Set(tables.map(t => t.floor || 'Ground Floor'))).sort();

    useEffect(() => {
        if (!userData?.businessId) return;

        const unsub = listenToCollection(
            'tables',
            (data) => {
                // Sort by table number
                data.sort((a, b) => a.tableNumber - b.tableNumber);
                setTables(data);
                setLoading(false);
            },
            [where('businessId', '==', userData.businessId)]
        );
        return unsub;
    }, [userData]);

    const resetForm = () => {
        setFormData({ tableNumber: '', capacity: '', status: 'Available', floor: floors[0] || 'Ground Floor' });
        setEditTable(null);
        setIsCreatingFloor(false);
    };

    const openAddModal = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEditModal = (table) => {
        setEditTable(table);
        setFormData({
            tableNumber: table.tableNumber,
            capacity: table.capacity,
            status: table.status,
            floor: table.floor || 'Ground Floor',
        });
        setIsCreatingFloor(false);
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { tableNumber, capacity, status, floor } = formData;

        if (!tableNumber || !capacity) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            if (editTable) {
                await updateDocument('tables', editTable.id, {
                    tableNumber: Number(tableNumber),
                    capacity: Number(capacity),
                    status,
                    floor,
                });
                toast.success('Table updated successfully');
            } else {
                await addDocument('tables', {
                    tableNumber: Number(tableNumber),
                    capacity: Number(capacity),
                    status,
                    floor,
                    businessId: userData.businessId,
                });
                toast.success('Table added successfully');
            }
            setModalOpen(false);
            resetForm();
        } catch (error) {
            toast.error('Error saving table');
        }
    };

    const handleDelete = async (table) => {
        if (!window.confirm(`Delete Table ${table.tableNumber}?`)) return;
        try {
            await deleteDocument('tables', table.id);
            toast.success('Table deleted');
        } catch (error) {
            toast.error('Error deleting table');
        }
    };

    const handleStatusChange = async (table, newStatus) => {
        try {
            await updateDocument('tables', table.id, { status: newStatus });
            toast.success(`Table ${table.tableNumber} → ${newStatus}`);
        } catch (error) {
            toast.error('Error updating status');
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Table Management</h1>
                    <p className="page-subtitle">{tables.length} tables configured</p>
                </div>
                {(isManager || isCashier) && (
                    <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
                        <IoAddOutline size={20} />
                        Add Table
                    </button>
                )}
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap gap-4">
                {Object.entries(statusDots).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-2 text-sm text-dark-300">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        {status} ({tables.filter(t => t.status === status).length})
                    </div>
                ))}
            </div>

            {/* Floor Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['All', ...floors].map(floorName => (
                    <button
                        key={floorName}
                        onClick={() => setActiveFloor(floorName)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeFloor === floorName
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700'
                            }`}
                    >
                        {floorName}
                    </button>
                ))}
            </div>

            {/* Tables Grid */}
            {tables.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-6xl mb-4">🪑</div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Tables Found</h3>
                    <p className="text-dark-400">Add your first table to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {(activeFloor === 'All' ? tables : tables.filter(t => (t.floor || 'Ground Floor') === activeFloor)).map((table) => (
                        <div
                            key={table.id}
                            className={`border rounded-2xl p-5 text-center transition-all duration-300 hover:scale-[1.03] ${statusColors[table.status]}`}
                        >
                            <div className="text-3xl font-bold text-white mb-1">
                                {table.tableNumber}
                            </div>
                            <div className="text-xs font-semibold text-primary-400 opacity-90 mb-3 uppercase tracking-wider">
                                {table.floor || 'Ground Floor'}
                            </div>

                            <div className="flex items-center justify-center gap-1 text-sm mb-3">
                                <IoPeopleOutline size={14} />
                                <span>{table.capacity} seats</span>
                            </div>

                            {/* Status badge */}
                            <div className="flex items-center justify-center gap-1.5 mb-4">
                                <div className={`w-2 h-2 rounded-full ${statusDots[table.status]} animate-pulse`} />
                                <span className="text-xs font-medium">{table.status}</span>
                            </div>

                            {/* Quick status toggle */}
                            <div className="flex gap-1 justify-center flex-wrap">
                                {['Available', 'Occupied', 'Reserved'].map(status => (
                                    status !== table.status && (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(table, status)}
                                            className="text-[10px] px-2 py-1 rounded-lg bg-dark-900/50 hover:bg-dark-900 text-dark-300 hover:text-white transition-colors"
                                        >
                                            {status}
                                        </button>
                                    )
                                ))}
                            </div>

                            {/* Manager actions */}
                            {(isManager || isCashier) && (
                                <div className="flex justify-center gap-2 mt-3 pt-3 border-t border-current/20">
                                    <button
                                        onClick={() => openEditModal(table)}
                                        className="p-1.5 rounded-lg hover:bg-dark-900/50 text-dark-300 hover:text-white transition-colors"
                                    >
                                        <IoCreateOutline size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(table)}
                                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-dark-300 hover:text-red-400 transition-colors"
                                    >
                                        <IoTrashOutline size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); resetForm(); }}
                title={editTable ? 'Edit Table' : 'Add New Table'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label-text">Table Number</label>
                        <input
                            type="number"
                            value={formData.tableNumber}
                            onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                            placeholder="e.g. 1, 2, 3..."
                            className="input-field"
                            min="1"
                        />
                    </div>
                    <div>
                        <label className="label-text">Capacity (Seats)</label>
                        <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                            placeholder="e.g. 2, 4, 6..."
                            className="input-field"
                            min="1"
                        />
                    </div>
                    <div>
                        <label className="label-text">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="select-field"
                        >
                            <option value="Available">Available</option>
                            <option value="Occupied">Occupied</option>
                            <option value="Reserved">Reserved</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-text">Floor</label>
                        {!isCreatingFloor ? (
                            <div className="flex gap-2">
                                <select
                                    value={formData.floor}
                                    onChange={(e) => {
                                        if (e.target.value === 'NEW_FLOOR') {
                                            setIsCreatingFloor(true);
                                            setFormData({ ...formData, floor: '' });
                                        } else {
                                            setFormData({ ...formData, floor: e.target.value });
                                        }
                                    }}
                                    className="select-field flex-1"
                                >
                                    {floors.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                    <option value="NEW_FLOOR" className="text-primary-400 font-medium">+ Add New Floor...</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.floor}
                                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                                    placeholder="Enter new floor name..."
                                    className="input-field flex-1"
                                    autoFocus
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreatingFloor(false);
                                        setFormData({ ...formData, floor: floors[0] || 'Ground Floor' });
                                    }}
                                    className="px-4 rounded-xl bg-dark-800 text-dark-300 hover:text-white transition-colors"
                                    title="Cancel new floor"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="submit" className="btn-primary flex-1">
                            {editTable ? 'Update Table' : 'Add Table'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setModalOpen(false); resetForm(); }}
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

export default Tables;
