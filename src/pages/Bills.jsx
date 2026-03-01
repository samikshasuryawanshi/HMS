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
    IoChevronForward,
    IoTrendingUpOutline,
    IoStatsChartOutline
} from 'react-icons/io5';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const Bills = () => {
    const { isManager, isCashier, userData } = useAuth();
    const [bills, setBills] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [gstPercent, setGstPercent] = useState(5);
    const [expandedBillId, setExpandedBillId] = useState(null);

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
        } catch {
            toast.error('Error generating bill');
        }
    };

    const handlePrintReceipt = (bill) => {
        try {
            generateReceipt(bill);
            toast.success('Receipt ready');
        } catch {
            toast.error('Print failed');
        }
    };

    const handleDelete = async (bill) => {
        if (!window.confirm('Are you sure you want to delete this bill?')) return;
        try {
            await deleteDocument('bills', bill.id);
            toast.success('Bill deleted');
        } catch {
            toast.error('Error deleting bill');
        }
    };

    const toggleExpand = (id) => {
        setExpandedBillId(expandedBillId === id ? null : id);
    };

    const handleSelectOrder = (order) => {
        setSelectedOrder(order);
    };

    if (loading) return <Loader />;

    const totalRevenue = bills.reduce((acc, curr) => acc + curr.total, 0);
    const avgBillValue = bills.length > 0 ? totalRevenue / bills.length : 0;

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in pb-12">
            {/* Header matched to Orders.jsx */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        Billing Center
                    </h1>
                    <p className="text-dark-400 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                        {bills.length} TOTAL SERVICE RECORDS
                    </p>
                </div>
                {(isManager || isCashier || userData?.role === 'owner') && (
                    <button
                        onClick={() => {
                            setSelectedOrder(null);
                            setGstPercent(5);
                            setModalOpen(true);
                        }}
                        className="btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs"
                    >
                        <IoAddOutline size={20} />
                        New Transaction
                    </button>
                )}
            </div>

            {/* Performance Stats Bar (Glassy style from Orders.jsx filter bar) */}
            <div className="bg-dark-900/40 backdrop-blur-xl border border-dark-700/50 p-4 rounded-2xl md:rounded-3xl shadow-lg relative overflow-hidden">
                <div className="flex flex-wrap items-center gap-6 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-3 px-4 py-2 bg-dark-800/40 rounded-xl border border-transparent">
                        <IoReceiptOutline className="text-primary-500" size={18} />
                        <div className="flex flex-col">
                            <span className="text-[9px] text-dark-500 font-black uppercase tracking-widest leading-none mb-1">Total Invoices</span>
                            <span className="text-sm font-black text-white leading-none">{bills.length}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-2 bg-dark-800/40 rounded-xl border border-transparent">
                        <IoWalletOutline className="text-emerald-500" size={18} />
                        <div className="flex flex-col">
                            <span className="text-[9px] text-dark-500 font-black uppercase tracking-widest leading-none mb-1">Gross Revenue</span>
                            <span className="text-sm font-black text-white leading-none">₹{totalRevenue.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-2 bg-dark-800/40 rounded-xl border border-transparent">
                        <IoStatsChartOutline className="text-amber-500" size={18} />
                        <div className="flex flex-col">
                            <span className="text-[9px] text-dark-500 font-black uppercase tracking-widest leading-none mb-1">Avg Ticket</span>
                            <span className="text-sm font-black text-white leading-none">₹{avgBillValue.toFixed(0)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bills List (Accordion) - Matched to Orders.jsx */}
            {bills.length === 0 ? (
                <div className="glass-card p-24 text-center rounded-[2.5rem]">
                    <div className="text-8xl mb-8 opacity-20 filter grayscale">🧾</div>
                    <h3 className="text-xl font-black text-white mb-2 tracking-tighter uppercase">No Records</h3>
                    <p className="text-dark-400 text-[10px] font-black uppercase tracking-[0.3em]">
                        LEDGER IS CURRENTLY EMPTY
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bills.map((bill) => {
                        const isExpanded = expandedBillId === bill.id;
                        const billDate = bill.date?.toDate ? bill.date.toDate() : new Date(bill.date);

                        return (
                            <div key={bill.id} className="glass-card overflow-hidden transition-all duration-300 border-dark-700 hover:border-primary-500/30 shadow-none">
                                {/* Collapsed Header */}
                                <div
                                    onClick={() => toggleExpand(bill.id)}
                                    className="p-4 md:p-5 flex items-center justify-between cursor-pointer group hover:bg-white/5 active:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-4 md:gap-8 flex-1">
                                        <div className="flex flex-col items-center justify-center min-w-[70px] border-r border-dark-700/50 pr-4 md:pr-8">
                                            <span className="text-[10px] text-dark-500 uppercase tracking-widest leading-none mb-1">Table</span>
                                            <span className="text-2xl text-white tracking-tighter">#{bill.tableNumber}</span>
                                        </div>

                                        <div className="hidden sm:flex flex-col min-w-[100px]">
                                            <span className="text-[10px] text-dark-500 uppercase tracking-widest leading-none mb-1">Total Amount</span>
                                            <span className="text-lg text-primary-400 tabular-nums">₹{bill.total?.toFixed(0)}</span>
                                        </div>

                                        <div className="flex flex-col min-w-[120px]">
                                            <span className="text-[10px] text-dark-500 uppercase tracking-widest leading-none mb-1">Transaction Date</span>
                                            <div className="flex items-center gap-1.5 text-[10px] text-dark-400 uppercase tracking-tight mt-0.5">
                                                <IoCalendarOutline size={14} className="text-primary-500/60" />
                                                {billDate.toLocaleString('en-IN', {
                                                    dateStyle: 'medium',
                                                })}
                                            </div>
                                        </div>

                                        <div className="hidden md:flex flex-col">
                                            <span className="text-[10px] text-dark-500 uppercase tracking-widest leading-none mb-1">Service ID</span>
                                            <div className="px-3 py-1 bg-dark-900 border border-dark-800 rounded-lg">
                                                <p className="text-[10px] text-dark-300 tracking-widest uppercase">#{bill.id?.slice(-8).toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-dark-500 group-hover:text-primary-400 transition-colors">
                                            <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest font-black">{isExpanded ? 'CLOSE' : 'VIEW'}</span>
                                            {isExpanded ? <IoChevronForward size={20} className="rotate-90" /> : <IoChevronForward size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-dark-700/60 bg-dark-950/20 overflow-hidden"
                                        >
                                            <div className="p-6 md:p-8 space-y-8 animate-slide-down">
                                                {/* Items Section */}
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] text-dark-500 uppercase tracking-[0.3em] pl-1 flex items-center gap-3">
                                                        <IoReceiptOutline className="text-primary-500" /> TRANSACTION PAYLOAD
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {bill.items?.map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-4 p-4 bg-dark-900/60 rounded-2xl border border-dark-800/50 hover:bg-dark-800/60 transition-all group/item">
                                                                <div className="w-12 h-12 rounded-xl bg-dark-800 flex items-center justify-center text-xs font-black text-white ring-1 ring-dark-700 shrink-0">
                                                                    {item.quantity}x
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-white text-sm tracking-tight leading-tight uppercase truncate">{item.name}</p>
                                                                    <p className="text-[10px] font-bold text-primary-500/60 mt-1 tabular-nums">₹{item.price} UNIT</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-sm text-white group-hover/item:text-primary-400 transition-colors tabular-nums">₹{item.price * item.quantity}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Meta & Financial Summary */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-dark-700/40">
                                                    <div className="space-y-6">
                                                        <div className="space-y-3">
                                                            <span className="text-[9px] font-black text-dark-500 uppercase tracking-widest block">Operational Metadata</span>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="p-4 bg-dark-900/60 border border-dark-800 rounded-2xl">
                                                                    <p className="text-[8px] text-dark-500 uppercase tracking-[0.2em] mb-1">Timestamp</p>
                                                                    <p className="text-xs text-white font-black">{billDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                </div>
                                                                <div className="p-4 bg-dark-900/60 border border-dark-800 rounded-2xl">
                                                                    <p className="text-[8px] text-dark-500 uppercase tracking-[0.2em] mb-1">Fiscal ID</p>
                                                                    <p className="text-xs text-white font-black">#{bill.id?.slice(-8).toUpperCase()}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-4">
                                                            <button
                                                                onClick={() => handlePrintReceipt(bill)}
                                                                className="flex-1 py-4 rounded-xl bg-white text-dark-950 font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-dark-100 flex items-center justify-center gap-2"
                                                            >
                                                                <IoDownloadOutline size={18} /> PRINT INVOICE
                                                            </button>
                                                            {(isManager || isCashier) && (
                                                                <button
                                                                    onClick={() => handleDelete(bill)}
                                                                    className="w-14 h-14 flex items-center justify-center text-dark-500 hover:text-rose-500 bg-dark-800/50 rounded-xl transition-all border border-dark-700/50"
                                                                >
                                                                    <IoTrashOutline size={22} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="bg-dark-950/40 rounded-[2rem] p-8 border border-dark-800 relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                                            <IoWalletOutline size={120} className="rotate-12 text-primary-500" />
                                                        </div>
                                                        <div className="space-y-4 relative z-10">
                                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-dark-500">
                                                                <span>Subtotal</span>
                                                                <span className="text-white">₹{bill.subtotal?.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-dark-500">
                                                                <span>Tax (GST {bill.gstPercent}%)</span>
                                                                <span className="text-amber-500/80">₹{bill.gst?.toFixed(2)}</span>
                                                            </div>
                                                            <div className="pt-4 border-t border-dark-800 flex justify-between items-end">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black text-primary-500 uppercase tracking-[0.4em] mb-1">Final Total</span>
                                                                    <span className="text-4xl font-black text-white tracking-tighter tabular-nums">₹{bill.total?.toFixed(0)}</span>
                                                                </div>
                                                                <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg text-[10px] font-black border border-emerald-500/20">
                                                                    SETTLED
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal for Bill Generation - Already updated to match premium style, keep as is but refine text */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Service Settlement"
                size="lg"
            >
                <div className="space-y-10 py-4">
                    {/* Step 1: Select Order */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                            <span className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary-500/20">1</span>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Select Target Payload</h4>
                        </div>

                        {completedOrders.length === 0 ? (
                            <div className="bg-dark-950 border-2 border-dashed border-dark-800 rounded-[2rem] p-12 text-center">
                                <p className="text-dark-400 font-bold uppercase text-[10px] tracking-widest">No terminal orders found.</p>
                                <p className="text-dark-600 text-[9px] mt-2 uppercase tracking-widest">Records must be served and completed before billing.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[18rem] overflow-y-auto p-2 custom-scrollbar-v2">
                                {completedOrders.map((order) => (
                                    <motion.button
                                        key={order.id}
                                        whileHover={{ y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleSelectOrder(order)}
                                        className={`group p-6 rounded-[2rem] text-left border-2 transition-all duration-300 relative overflow-hidden ${selectedOrder?.id === order.id
                                            ? 'bg-primary-500/10 border-primary-500 ring-8 ring-primary-500/5'
                                            : 'bg-dark-900 border-dark-800 hover:border-dark-700'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-dark-500 text-[8px] font-black uppercase mb-1 tracking-widest">Station ID</p>
                                                <span className="text-2xl font-black text-white tracking-tighter">Table #{order.tableNumber.toString().padStart(2, '0')}</span>
                                            </div>
                                            {selectedOrder?.id === order.id && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-primary-500">
                                                    <IoCheckmarkCircle size={28} />
                                                </motion.div>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-primary-400 font-mono text-xl font-black">₹{order.totalAmount?.toLocaleString()}</p>
                                            <p className="text-[9px] text-dark-500 font-black uppercase tracking-widest">
                                                {order.items?.length} UNITS • RECORDED {new Date(order.timestamp?.toDate ? order.timestamp.toDate() : order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </p>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Step 2: GST Selector */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                            <span className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary-500/20">2</span>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Apply Fiscal Protocol</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-3 bg-dark-950 p-2 rounded-[1.5rem] border border-dark-800">
                            {[5, 12, 18].map((rate) => (
                                <button
                                    key={rate}
                                    onClick={() => setGstPercent(rate)}
                                    className={`py-4 rounded-xl font-black text-[10px] transition-all tracking-[0.2em] uppercase ${gstPercent === rate
                                        ? 'bg-primary-600 text-white shadow-[0_10px_20px_-5px_rgba(234,85,69,0.3)]'
                                        : 'text-dark-500 hover:text-white hover:bg-dark-800'
                                        }`}
                                >
                                    GST {rate}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Final Preview with Animation */}
                    <AnimatePresence>
                        {selectedOrder && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-8 mt-4 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <IoWalletOutline size={80} className="rotate-12 text-emerald-400" />
                                </div>
                                <div className="flex justify-between items-end mb-8 relative z-10">
                                    <div className="space-y-1">
                                        <h4 className="text-emerald-400 font-black text-[9px] uppercase tracking-[0.3em]">Final Settlement</h4>
                                        <p className="text-white text-5xl font-black tracking-tighter">₹{total.toFixed(0)}</p>
                                    </div>
                                    <div className="text-right font-black text-[9px] uppercase tracking-widest leading-loose">
                                        <p className="text-dark-400">Tax Portion: <span className="text-white">₹{gst.toFixed(2)}</span></p>
                                        <p className="text-dark-400">Base Subtotal: <span className="text-white">₹{subtotal.toFixed(2)}</span></p>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: '#10b981' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleGenerateBill}
                                    className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all relative z-10 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3"
                                >
                                    AUTHORIZE FISCAL RECORD <IoChevronForward size={20} />
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-center flex-col items-center gap-4 pt-2">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="group flex items-center gap-2 text-dark-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                            Abort Procedure
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Aesthetic Overrides from Orders.jsx */}
            <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-slide-down {
                    animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-5px) scaleY(0.98); }
                    to { opacity: 1; transform: translateY(0) scaleY(1); }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar-v2::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar-v2::-webkit-scrollbar-thumb { background: rgba(234, 85, 69, 0.2); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default Bills;