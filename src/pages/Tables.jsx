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
    IoLayersOutline,
    IoEllipsisVertical
} from 'react-icons/io5';

const statusThemes = {
    Available: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
        shadow: 'shadow-emerald-500/10'
    },
    Occupied: {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        text: 'text-rose-400',
        dot: 'bg-rose-400',
        shadow: 'shadow-rose-500/10'
    },
    Reserved: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
        shadow: 'shadow-amber-500/10'
    },
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

    const floors = Array.from(new Set(tables.map(t => t.floor || 'Ground Floor'))).sort();

    useEffect(() => {
        if (!userData?.businessId) return;

        const unsub = listenToCollection(
            'tables',
            (data) => {
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

    const openAddModal = () => { resetForm(); setModalOpen(true); };

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
        if (!tableNumber || !capacity) return toast.error('Please fill in all fields');

        try {
            const payload = {
                tableNumber: Number(tableNumber),
                capacity: Number(capacity),
                status,
                floor,
                businessId: userData.businessId
            };

            if (editTable) {
                await updateDocument('tables', editTable.id, payload);
                toast.success('Table updated');
            } else {
                await addDocument('tables', payload);
                toast.success('Table added');
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
        } catch (error) {
            toast.error('Update failed');
        }
    };

    if (loading) return <Loader />;

    const filteredTables = activeFloor === 'All' 
        ? tables 
        : tables.filter(t => (t.floor || 'Ground Floor') === activeFloor);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Floor Plan</h1>
                    <p className="text-dark-400 flex items-center gap-2">
                        <IoLayersOutline className="text-primary-500" />
                        {tables.length} tables across {floors.length} levels
                    </p>
                </div>
                
                {(isManager || isCashier) && (
                    <button 
                        onClick={openAddModal} 
                        className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-primary-600/20 w-full sm:w-auto"
                    >
                        <IoAddOutline size={24} />
                        Add New Table
                    </button>
                )}
            </div>

            {/* Sticky Floor Navigation */}
            <div className="sticky top-0 z-10 -mx-4 px-4 bg-dark-950/80 backdrop-blur-md py-4 mb-6 border-b border-dark-800">
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {['All', ...floors].map(floorName => (
                        <button
                            key={floorName}
                            onClick={() => setActiveFloor(floorName)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border-2 ${
                                activeFloor === floorName
                                    ? 'bg-white text-dark-950 border-white'
                                    : 'bg-dark-800 text-dark-400 border-transparent hover:border-dark-700'
                            }`}
                        >
                            {floorName}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Grid */}
            {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-dark-900/50 rounded-3xl border-2 border-dashed border-dark-800">
                    <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center text-4xl mb-4">🪑</div>
                    <h3 className="text-xl font-bold text-white">No Tables Configured</h3>
                    <p className="text-dark-400 mt-1">Start by adding your restaurant layout.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTables.map((table) => {
                        const theme = statusThemes[table.status];
                        return (
                            <div
                                key={table.id}
                                className={`group relative overflow-hidden rounded-3xl border-2 transition-all duration-300 ${theme.bg} ${theme.border} ${theme.shadow} hover:shadow-xl`}
                            >
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-xs font-black uppercase tracking-widest text-dark-400 block mb-1">
                                                {table.floor}
                                            </span>
                                            <h2 className="text-4xl font-black text-white">#{table.tableNumber}</h2>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 ${theme.bg} ${theme.text} border ${theme.border}`}>
                                            <span className={`w-2 h-2 rounded-full ${theme.dot} animate-pulse`} />
                                            {table.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-dark-300 mb-6">
                                        <div className="flex items-center gap-1.5 bg-dark-950/40 px-3 py-1.5 rounded-lg">
                                            <IoPeopleOutline className="text-primary-400" size={18} />
                                            <span className="font-bold">{table.capacity} Seats</span>
                                        </div>
                                    </div>

                                    {/* Action Zone */}
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Available', 'Occupied', 'Reserved']
                                                .filter(s => s !== table.status)
                                                .map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => handleStatusChange(table, status)}
                                                        className="text-[11px] font-bold py-2 rounded-xl bg-dark-950/50 hover:bg-dark-950 text-dark-300 hover:text-white transition-all border border-transparent hover:border-dark-700"
                                                    >
                                                        Set {status}
                                                    </button>
                                                ))}
                                        </div>
                                        
                                        {(isManager || isCashier) && (
                                            <div className="flex gap-2 pt-3 border-t border-dark-800/50">
                                                <button
                                                    onClick={() => openEditModal(table)}
                                                    className="flex-1 flex justify-center py-2 rounded-xl bg-dark-800/50 text-dark-300 hover:bg-primary-600 hover:text-white transition-all"
                                                >
                                                    <IoCreateOutline size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(table)}
                                                    className="flex-1 flex justify-center py-2 rounded-xl bg-dark-800/50 text-dark-300 hover:bg-rose-600 hover:text-white transition-all"
                                                >
                                                    <IoTrashOutline size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Redesign */}
            <Modal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); resetForm(); }}
                title={editTable ? 'Edit Table Configuration' : 'Create New Table'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-dark-400 uppercase ml-1">Table #</label>
                            <input
                                type="number"
                                value={formData.tableNumber}
                                onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                                className="w-full bg-dark-900 border-2 border-dark-800 rounded-2xl px-4 py-3 focus:border-primary-500 outline-none text-white transition-all"
                                placeholder="101"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-dark-400 uppercase ml-1">Capacity</label>
                            <input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                className="w-full bg-dark-900 border-2 border-dark-800 rounded-2xl px-4 py-3 focus:border-primary-500 outline-none text-white transition-all"
                                placeholder="4"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-dark-400 uppercase ml-1">Location / Floor</label>
                        {!isCreatingFloor ? (
                            <div className="flex gap-2">
                                <select
                                    value={formData.floor}
                                    onChange={(e) => e.target.value === 'NEW_FLOOR' ? setIsCreatingFloor(true) : setFormData({ ...formData, floor: e.target.value })}
                                    className="flex-1 bg-dark-900 border-2 border-dark-800 rounded-2xl px-4 py-3 focus:border-primary-500 outline-none text-white"
                                >
                                    {floors.map(f => <option key={f} value={f}>{f}</option>)}
                                    <option value="NEW_FLOOR">+ Create New Floor...</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.floor}
                                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                                    placeholder="e.g., Rooftop"
                                    className="flex-1 bg-dark-900 border-2 border-primary-500/50 rounded-2xl px-4 py-3 outline-none text-white"
                                    autoFocus
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setIsCreatingFloor(false)}
                                    className="px-4 text-dark-400 hover:text-white font-bold"
                                >
                                    Back
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="submit" className="flex-[2] bg-primary-600 hover:bg-primary-500 py-4 rounded-2xl font-black text-white shadow-lg shadow-primary-600/20 transition-all active:scale-95">
                            {editTable ? 'SAVE CHANGES' : 'CREATE TABLE'}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => { setModalOpen(false); resetForm(); }}
                            className="flex-1 bg-dark-800 hover:bg-dark-700 py-4 rounded-2xl font-bold text-dark-300 transition-all"
                        >
                            CANCEL
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Tables;