// Bills Page - Billing system with GST calculation and receipt generation
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    listenToCollection,
    addDocument,
    deleteDocument,
} from '../firebase/firestore';
import { where } from 'firebase/firestore';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { generateReceipt } from '../utils/generateReceipt';
import { toast } from 'react-toastify';
import {
    IoAddOutline,
    IoDownloadOutline,
    IoTrashOutline,
    IoReceiptOutline,
    IoCalendarOutline,
} from 'react-icons/io5';

const Bills = () => {
    const { isManager, isCashier, userData } = useAuth();
    const [bills, setBills] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [gstPercent, setGstPercent] = useState(5);

    useEffect(() => {
        const unsubs = [];
        unsubs.push(
            listenToCollection(
                'bills',
                (data) => {
                    data.sort((a, b) => {
                        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
                        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
                        return dateB - dateA;
                    });
                    setBills(data);
                    setLoading(false);
                },
                [where('businessId', '==', userData?.businessId)]
            )
        );
        unsubs.push(listenToCollection('orders', setOrders, [where('businessId', '==', userData?.businessId)]));
        return () => unsubs.forEach((u) => u());
    }, [userData]);

    // Completed orders that haven't been billed yet
    const completedOrders = orders.filter((o) => {
        if (o.status !== 'Completed') return false;
        // Check if already billed
        const alreadyBilled = bills.some(
            (b) => b.orderId === o.id
        );
        return !alreadyBilled;
    });

    const handleSelectOrder = (order) => {
        setSelectedOrder(order);
    };

    const calculateBill = () => {
        if (!selectedOrder) return { subtotal: 0, gst: 0, total: 0 };
        const subtotal = selectedOrder.totalAmount || 0;
        const gst = (subtotal * gstPercent) / 100;
        const total = subtotal + gst;
        return { subtotal, gst, total };
    };

    const { subtotal, gst, total } = calculateBill();

    const handleGenerateBill = async () => {
        if (!selectedOrder) {
            toast.error('Please select an order');
            return;
        }

        try {
            const billData = {
                orderId: selectedOrder.id,
                tableNumber: selectedOrder.tableNumber,
                items: selectedOrder.items,
                subtotal,
                gstPercent,
                gst,
                total,
                date: new Date().toISOString(),
                businessId: userData?.businessId,
            };

            await addDocument('bills', billData);
            toast.success('Bill generated!');
            setModalOpen(false);
            setSelectedOrder(null);
        } catch (error) {
            toast.error('Error generating bill');
        }
    };

    const handlePrintReceipt = (bill) => {
        try {
            generateReceipt(bill);
            toast.success('Receipt downloaded!');
        } catch (error) {
            toast.error('Error generating receipt');
            console.error(error);
        }
    };

    const handleDelete = async (bill) => {
        if (!window.confirm('Delete this bill?')) return;
        try {
            await deleteDocument('bills', bill.id);
            toast.success('Bill deleted');
        } catch (error) {
            toast.error('Error deleting bill');
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Billing</h1>
                    <p className="page-subtitle">{bills.length} bills generated</p>
                </div>
                {(isManager || isCashier || userData?.role === 'owner') && (
                    <button
                        onClick={() => {
                            setSelectedOrder(null);
                            setGstPercent(5);
                            setModalOpen(true);
                        }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <IoAddOutline size={20} />
                        Generate Bill
                    </button>
                )}
            </div>

            {/* Bills List */}
            {bills.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-6xl mb-4">🧾</div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Bills Yet</h3>
                    <p className="text-dark-400">Generate your first bill from a completed order.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bills.map((bill) => {
                        const billDate = bill.date?.toDate
                            ? bill.date.toDate()
                            : new Date(bill.date);

                        return (
                            <div key={bill.id} className="glass-card-hover p-5">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-primary-500/20 text-primary-400">
                                            <IoReceiptOutline size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold">
                                                Table {bill.tableNumber}
                                            </h3>
                                            <p className="text-dark-400 text-xs flex items-center gap-1">
                                                <IoCalendarOutline size={12} />
                                                {billDate.toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-dark-500">
                                        #{bill.id?.slice(0, 6)}
                                    </span>
                                </div>

                                {/* Items summary */}
                                <div className="space-y-1.5 mb-4 text-sm">
                                    {bill.items?.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-dark-300">
                                            <span>
                                                {item.name} × {item.quantity}
                                            </span>
                                            <span>₹{(item.price * item.quantity).toFixed(0)}</span>
                                        </div>
                                    ))}
                                    {bill.items?.length > 3 && (
                                        <p className="text-dark-500 text-xs">
                                            +{bill.items.length - 3} more items...
                                        </p>
                                    )}
                                </div>

                                {/* Totals */}
                                <div className="space-y-1.5 pt-3 border-t border-dark-700/50 text-sm">
                                    <div className="flex justify-between text-dark-400">
                                        <span>Subtotal</span>
                                        <span>₹{bill.subtotal?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-dark-400">
                                        <span>GST ({bill.gstPercent || 5}%)</span>
                                        <span>₹{bill.gst?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold pt-1">
                                        <span className="text-white">Total</span>
                                        <span className="text-primary-400">₹{bill.total?.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-4 pt-3 border-t border-dark-700/50">
                                    <button
                                        onClick={() => handlePrintReceipt(bill)}
                                        className="flex-1 btn-secondary py-2 text-sm flex items-center justify-center gap-1.5"
                                    >
                                        <IoDownloadOutline size={16} />
                                        Receipt
                                    </button>
                                    {(isManager || isCashier) && (
                                        <button
                                            onClick={() => handleDelete(bill)}
                                            className="p-2 rounded-xl hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition-colors"
                                        >
                                            <IoTrashOutline size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Generate Bill Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Generate Bill"
                size="lg"
            >
                <div className="space-y-5">
                    {/* Select completed order */}
                    <div>
                        <label className="label-text">Select Completed Order</label>
                        {completedOrders.length === 0 ? (
                            <p className="text-dark-400 text-sm py-4 text-center bg-dark-800 rounded-xl">
                                No completed orders available for billing.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {completedOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        onClick={() => handleSelectOrder(order)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all ${selectedOrder?.id === order.id
                                            ? 'bg-primary-600/20 border border-primary-500/30'
                                            : 'bg-dark-800 hover:bg-dark-700 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex justify-between">
                                            <span className="text-white font-medium">
                                                Table {order.tableNumber}
                                            </span>
                                            <span className="text-primary-400 font-semibold">
                                                ₹{order.totalAmount?.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-dark-400 text-xs mt-1">
                                            {order.items?.length} items •{' '}
                                            {order.createdAt?.toDate
                                                ? order.createdAt.toDate().toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })
                                                : 'N/A'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* GST Selection */}
                    <div>
                        <label className="label-text">GST Rate</label>
                        <div className="flex gap-3">
                            {[5, 12, 18].map((rate) => (
                                <button
                                    key={rate}
                                    type="button"
                                    onClick={() => setGstPercent(rate)}
                                    className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${gstPercent === rate
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                        }`}
                                >
                                    {rate}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bill Preview */}
                    {selectedOrder && (
                        <div className="bg-dark-800/50 rounded-xl p-4 space-y-3">
                            <h4 className="text-white font-semibold">Bill Preview</h4>
                            {selectedOrder.items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm text-dark-300">
                                    <span>
                                        {item.name} × {item.quantity}
                                    </span>
                                    <span>₹{(item.price * item.quantity).toFixed(0)}</span>
                                </div>
                            ))}
                            <div className="border-t border-dark-700 pt-2 space-y-1">
                                <div className="flex justify-between text-sm text-dark-400">
                                    <span>Subtotal</span>
                                    <span>₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-dark-400">
                                    <span>GST ({gstPercent}%)</span>
                                    <span>₹{gst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold pt-1">
                                    <span className="text-white">Total</span>
                                    <span className="text-primary-400">₹{total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleGenerateBill}
                            disabled={!selectedOrder}
                            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate Bill
                        </button>
                        <button
                            onClick={() => setModalOpen(false)}
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Bills;
