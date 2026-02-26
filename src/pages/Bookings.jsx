// Bookings Page - Table reservations management
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    listenToCollection,
    addDocument,
    updateDocument,
    deleteDocument,
} from '../firebase/firestore';
import { where } from 'firebase/firestore';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoAddOutline,
    IoCheckmarkCircleOutline,
    IoCloseCircleOutline,
    IoTrashOutline,
    IoCallOutline,
    IoPersonOutline,
    IoCalendarOutline,
    IoTimeOutline,
    IoPeopleOutline,
} from 'react-icons/io5';

const Bookings = () => {
    const { isManager, isCashier, userData } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [filter, setFilter] = useState('All');

    const [formData, setFormData] = useState({
        customerName: '',
        phone: '',
        date: '',
        time: '',
        numberOfPeople: '',
        tableNumber: '',
        status: 'Reserved',
    });

    useEffect(() => {
        const unsubs = [];
        unsubs.push(
            listenToCollection(
                'bookings',
                (data) => {
                    data.sort((a, b) => {
                        const dateA = new Date(`${a.date}T${a.time}`);
                        const dateB = new Date(`${b.date}T${b.time}`);
                        return dateB - dateA;
                    });
                    setBookings(data);
                    setLoading(false);
                },
                [where('businessId', '==', userData?.businessId)]
            )
        );
        unsubs.push(listenToCollection('tables', setTables, [where('businessId', '==', userData?.businessId)]));
        return () => unsubs.forEach((u) => u());
    }, [userData]);

    const resetForm = () => {
        setFormData({
            customerName: '',
            phone: '',
            date: '',
            time: '',
            numberOfPeople: '',
            tableNumber: '',
            status: 'Reserved',
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { customerName, phone, date, time, numberOfPeople, tableNumber } = formData;

        if (!customerName || !phone || !date || !time || !numberOfPeople || !tableNumber) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            await addDocument('bookings', {
                customerName,
                phone,
                date,
                time,
                numberOfPeople: Number(numberOfPeople),
                tableNumber: Number(tableNumber),
                status: 'Reserved',
                businessId: userData?.businessId,
            });

            // Update table status to Reserved
            const table = tables.find((t) => t.tableNumber === Number(tableNumber));
            if (table) {
                await updateDocument('tables', table.id, { status: 'Reserved' });
            }

            toast.success('Booking created!');
            setModalOpen(false);
            resetForm();
        } catch (error) {
            toast.error('Error creating booking');
        }
    };

    const updateStatus = async (booking, newStatus) => {
        try {
            await updateDocument('bookings', booking.id, { status: newStatus });

            // Free the table if cancelled or completed
            if (newStatus === 'Cancelled' || newStatus === 'Completed') {
                const table = tables.find((t) => t.tableNumber === booking.tableNumber);
                if (table) {
                    await updateDocument('tables', table.id, { status: 'Available' });
                }
            }

            toast.success(`Booking ${newStatus.toLowerCase()}`);
        } catch (error) {
            toast.error('Error updating booking');
        }
    };

    const handleDelete = async (booking) => {
        if (!window.confirm('Delete this booking?')) return;
        try {
            await deleteDocument('bookings', booking.id);
            toast.success('Booking deleted');
        } catch (error) {
            toast.error('Error deleting booking');
        }
    };

    const filteredBookings =
        filter === 'All' ? bookings : bookings.filter((b) => b.status === filter);

    const statusBadge = (status) => {
        const map = {
            Reserved: 'badge-warning',
            Completed: 'badge-success',
            Cancelled: 'badge-danger',
        };
        return map[status] || 'badge-info';
    };

    const availableTables = tables.filter(
        (t) => t.status === 'Available'
    );

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Table Bookings</h1>
                    <p className="page-subtitle">{bookings.length} total bookings</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setModalOpen(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <IoAddOutline size={20} />
                    New Booking
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {['All', 'Reserved', 'Completed', 'Cancelled'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${filter === f
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700'
                            }`}
                    >
                        {f}{' '}
                        {f !== 'All' && (
                            <span className="ml-1 opacity-60">
                                ({bookings.filter((b) => b.status === f).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-6xl mb-4">📅</div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Bookings</h3>
                    <p className="text-dark-400">No bookings found for the selected filter.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBookings.map((booking) => (
                        <div key={booking.id} className="glass-card-hover p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        <IoPersonOutline size={16} />
                                        {booking.customerName}
                                    </h3>
                                    <p className="text-dark-400 text-sm flex items-center gap-1 mt-1">
                                        <IoCallOutline size={14} />
                                        {booking.phone}
                                    </p>
                                </div>
                                <span className={statusBadge(booking.status)}>{booking.status}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                <div className="flex items-center gap-2 text-dark-300">
                                    <IoCalendarOutline size={14} className="text-dark-500" />
                                    {booking.date}
                                </div>
                                <div className="flex items-center gap-2 text-dark-300">
                                    <IoTimeOutline size={14} className="text-dark-500" />
                                    {booking.time}
                                </div>
                                <div className="flex items-center gap-2 text-dark-300">
                                    <IoPeopleOutline size={14} className="text-dark-500" />
                                    {booking.numberOfPeople} guests
                                </div>
                                <div className="flex items-center gap-2 text-dark-300">
                                    🪑 Table {booking.tableNumber}
                                </div>
                            </div>

                            {/* Actions */}
                            {booking.status === 'Reserved' && (
                                <div className="flex gap-2 pt-3 border-t border-dark-700/50">
                                    <button
                                        onClick={() => updateStatus(booking, 'Completed')}
                                        className="flex-1 btn-success py-2 text-sm flex items-center justify-center gap-1"
                                    >
                                        <IoCheckmarkCircleOutline size={16} />
                                        Complete
                                    </button>
                                    <button
                                        onClick={() => updateStatus(booking, 'Cancelled')}
                                        className="flex-1 btn-danger py-2 text-sm flex items-center justify-center gap-1"
                                    >
                                        <IoCloseCircleOutline size={16} />
                                        Cancel
                                    </button>
                                </div>
                            )}
                            {booking.status !== 'Reserved' && (isManager || isCashier) && (
                                <div className="flex justify-end pt-3 border-t border-dark-700/50">
                                    <button
                                        onClick={() => handleDelete(booking)}
                                        className="text-dark-400 hover:text-red-400 transition-colors p-1"
                                    >
                                        <IoTrashOutline size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* New Booking Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    resetForm();
                }}
                title="New Booking"
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label-text">Customer Name</label>
                            <input
                                type="text"
                                value={formData.customerName}
                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                placeholder="Full name"
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="label-text">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+91 XXXXX XXXXX"
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label-text">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="label-text">Time</label>
                            <input
                                type="time"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label-text">Number of Guests</label>
                            <input
                                type="number"
                                value={formData.numberOfPeople}
                                onChange={(e) => setFormData({ ...formData, numberOfPeople: e.target.value })}
                                placeholder="e.g. 4"
                                className="input-field"
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="label-text">Table</label>
                            <select
                                value={formData.tableNumber}
                                onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                                className="select-field"
                            >
                                <option value="">Select a table</option>
                                {availableTables.map((t) => (
                                    <option key={t.id} value={t.tableNumber}>
                                        Table {t.tableNumber} ({t.capacity} seats)
                                    </option>
                                ))}
                                {availableTables.length === 0 && (
                                    <option disabled>No tables available</option>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" className="btn-primary flex-1">
                            Create Booking
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setModalOpen(false);
                                resetForm();
                            }}
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

export default Bookings;
