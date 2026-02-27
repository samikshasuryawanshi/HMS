import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, addDocument, deleteDocument } from '../firebase/firestore';
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
    IoWalletOutline,
    IoCheckmarkCircle,
    IoChevronForward
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
        if (!userData?.businessId) return;

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
                [where('businessId', '==', userData.businessId)]
            )
        );

        unsubs.push(
            listenToCollection(
                'orders', 
                setOrders, 
                [where('businessId', '==', userData.businessId)]
            )
        );

        return () => unsubs.forEach((u) => u());
    }, [userData]);

    const completedOrders = orders.filter((o) => {
        if (o.status !== 'Completed') return false;
        return !bills.some((b) => b.orderId === o.id);
    });

    const calculateBill = () => {
        if (!selectedOrder) return { subtotal: 0, gst: 0, total: 0 };
        const subtotal = selectedOrder.totalAmount || 0;
        const gst = (subtotal * gstPercent) / 100;
        const total = subtotal + gst;
        return { subtotal, gst, total };
    };

    const { subtotal, gst, total } = calculateBill();

    const handleGenerateBill = async () => {
        if (!selectedOrder) return toast.error('Please select an order');

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
            toast.success('Bill generated successfully');
            setModalOpen(false);
            setSelectedOrder(null);
        } catch (error) {
            toast.error('Error generating bill');
        }
    };

    const handlePrintReceipt = (bill) => {
        try {
            generateReceipt(bill);
            toast.success('Receipt ready');
        } catch (error) {
            toast.error('Print failed');
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
            {/* Header with Quick Stats */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-white tracking-tight">Billing Center</h1>
                    <div className="flex items-center gap-4 text-dark-400 text-sm">
                        <span className="flex items-center gap-1">
                            <IoReceiptOutline className="text-primary-500" /> {bills.length} Total Bills
                        </span>
                        <span className="flex items-center gap-1">
                            <IoWalletOutline className="text-emerald-500" /> ₹{bills.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()} Revenue
                        </span>
                    </div>
                </div>

                {(isManager || isCashier || userData?.role === 'owner') && (
                    <button
                        onClick={() => {
                            setSelectedOrder(null);
                            setGstPercent(5);
                            setModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-primary-600/20"
                    >
                        <IoAddOutline size={24} />
                        New Transaction
                    </button>
                )}
            </div>

            {/* Bills Grid */}
            {bills.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-dark-900/40 rounded-[2rem] border-2 border-dashed border-dark-800">
                    <div className="w-24 h-24 bg-dark-800 rounded-full flex items-center justify-center text-5xl mb-6">🧾</div>
                    <h3 className="text-2xl font-bold text-white">No Bills Found</h3>
                    <p className="text-dark-400 max-w-xs text-center mt-2">Generate bills from completed orders to see your history here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {bills.map((bill) => {
                        const billDate = bill.date?.toDate ? bill.date.toDate() : new Date(bill.date);
                        return (
                            <div key={bill.id} className="relative group bg-dark-900 border border-dark-800 rounded-[2rem] overflow-hidden hover:border-dark-700 transition-all duration-300">
                                {/* Receipt Header Styling */}
                                <div className="p-6 pb-4 border-b border-dashed border-dark-700">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-primary-500/10 text-primary-400 p-3 rounded-2xl">
                                            <IoReceiptOutline size={24} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest leading-none mb-1">Receipt ID</p>
                                            <p className="text-xs font-mono text-dark-300">#{bill.id?.slice(-8).toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">Table {bill.tableNumber}</h3>
                                    <div className="flex items-center gap-2 text-dark-400 text-xs font-medium">
                                        <IoCalendarOutline />
                                        {billDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="p-6 space-y-3">
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                        {bill.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="text-dark-300">
                                                    <span className="font-bold text-white">{item.quantity}x</span> {item.name}
                                                </span>
                                                <span className="font-mono text-dark-200">₹{item.price * item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pricing Breakdown */}
                                    <div className="pt-4 mt-4 border-t border-dark-800 space-y-2">
                                        <div className="flex justify-between text-xs text-dark-400">
                                            <span>Subtotal</span>
                                            <span>₹{bill.subtotal?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-dark-400">
                                            <span>Tax (GST {bill.gstPercent}%)</span>
                                            <span>₹{bill.gst?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-2">
                                            <span className="text-sm font-bold text-white">Total Amount</span>
                                            <span className="text-2xl font-black text-primary-400">₹{bill.total?.toFixed(0)}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-4">
                                        <button
                                            onClick={() => handlePrintReceipt(bill)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-dark-800 hover:bg-dark-700 text-white py-3 rounded-xl text-sm font-bold transition-all"
                                        >
                                            <IoDownloadOutline size={18} /> Receipt
                                        </button>
                                        {(isManager || isCashier) && (
                                            <button
                                                onClick={() => handleDelete(bill)}
                                                className="px-4 bg-dark-800 hover:bg-rose-500/20 text-dark-400 hover:text-rose-500 rounded-xl transition-all"
                                            >
                                                <IoTrashOutline size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal for Bill Generation */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Process Billing"
                size="lg"
            >
                <div className="space-y-8 py-2">
                    {/* Step 1: Select Order */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-dark-500 uppercase tracking-widest px-1">1. Select Completed Order</label>
                        {completedOrders.length === 0 ? (
                            <div className="bg-dark-900 border-2 border-dashed border-dark-800 rounded-3xl p-8 text-center">
                                <p className="text-dark-400 font-medium">No pending orders found for billing.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                                {completedOrders.map((order) => (
                                    <button
                                        key={order.id}
                                        onClick={() => handleSelectOrder(order)}
                                        className={`p-4 rounded-2xl text-left border-2 transition-all ${
                                            selectedOrder?.id === order.id
                                                ? 'bg-primary-500/10 border-primary-500 ring-4 ring-primary-500/10'
                                                : 'bg-dark-900 border-dark-800 hover:border-dark-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-lg font-bold text-white">Table {order.tableNumber}</span>
                                            {selectedOrder?.id === order.id && <IoCheckmarkCircle className="text-primary-500" size={20} />}
                                        </div>
                                        <p className="text-primary-400 font-black text-lg">₹{order.totalAmount?.toLocaleString()}</p>
                                        <p className="text-[10px] text-dark-500 mt-2 font-bold uppercase">{order.items?.length} items • Just now</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Step 2: GST Selector */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-dark-500 uppercase tracking-widest px-1">2. Tax Configuration</label>
                        <div className="flex bg-dark-900 p-1.5 rounded-2xl border border-dark-800">
                            {[5, 12, 18].map((rate) => (
                                <button
                                    key={rate}
                                    onClick={() => setGstPercent(rate)}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                                        gstPercent === rate
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                            : 'text-dark-400 hover:text-white'
                                    }`}
                                >
                                    GST {rate}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary Sidebar Preview */}
                    {selectedOrder && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h4 className="text-emerald-400 font-bold text-sm uppercase mb-1">Final Settlement</h4>
                                    <p className="text-white text-3xl font-black">₹{total.toFixed(0)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-dark-400 text-xs">GST Portion: ₹{gst.toFixed(2)}</p>
                                    <p className="text-dark-400 text-xs">Subtotal: ₹{subtotal.toFixed(2)}</p>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleGenerateBill}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                CONFIRM & GENERATE BILL <IoChevronForward />
                            </button>
                        </div>
                    )}

                    <div className="flex justify-center">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="text-dark-500 hover:text-white text-sm font-bold transition-all"
                        >
                            Nevermind, go back
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Bills;