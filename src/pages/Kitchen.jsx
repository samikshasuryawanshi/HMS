// Kitchen Dashboard — Chef's view of incoming and cooking orders (Premium UI)
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, updateDocument } from '../firebase/firestore';
import { where } from 'firebase/firestore';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoFlameOutline,
    IoCheckmarkCircleOutline,
    IoTimeOutline,
    IoRestaurantOutline,
    IoPersonOutline,
    IoPulseOutline
} from 'react-icons/io5';

const Kitchen = () => {
    const { userData } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userData?.businessId) return;
        const unsub = listenToCollection(
            'orders',
            (data) => {
                // Only show orders relevant to kitchen
                const kitchenOrders = data
                    .filter(o => ['Confirmed', 'Preparing'].includes(o.status))
                    .sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                        return dateA - dateB; // Oldest first (FIFO)
                    });
                setOrders(kitchenOrders);
                setLoading(false);
            },
            [where('businessId', '==', userData.businessId)]
        );
        return unsub;
    }, [userData]);

    const startPreparing = async (order) => {
        try {
            await updateDocument('orders', order.id, { status: 'Preparing' });
            toast.success(`Table ${order.tableNumber} — Started cooking`);
        } catch (error) {
            toast.error('Error updating order');
        }
    };

    const markReady = async (order) => {
        try {
            await updateDocument('orders', order.id, { status: 'Ready' });
            toast.success(`Table ${order.tableNumber} — Food ready!`);
        } catch (error) {
            toast.error('Error updating order');
        }
    };

    const confirmedOrders = orders.filter(o => o.status === 'Confirmed');
    const preparingOrders = orders.filter(o => o.status === 'Preparing');

    if (loading) return <Loader />;

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in relative z-10 w-full pb-10">
            {/* Header section with live counting */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2 lg:gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.2)]">
                            <IoFlameOutline className="animate-pulse" />
                        </div>
                        Kitchen Display
                    </h1>
                    <p className="text-dark-400 text-xs md:text-sm font-medium flex items-center gap-2">
                        <span className="text-amber-400 font-bold">{confirmedOrders.length}</span> incoming orders •
                        <span className="text-orange-400 font-bold">{preparingOrders.length}</span> items currently cooking
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-dark-900/60 backdrop-blur-xl border border-dark-700/50 px-4 py-2 rounded-full shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] md:text-xs font-bold text-dark-200 uppercase tracking-widest">Live Kitchen Queue</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                {/* INCOMING ORDERS — Confirmed, waiting to be started */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-base md:text-lg font-bold text-amber-400 flex items-center gap-2">
                            <IoTimeOutline className="text-xl" />
                            Incoming Queue ({confirmedOrders.length})
                        </h2>
                        <span className="text-[10px] text-dark-500 font-bold uppercase tracking-tighter">FIFO ORDERING</span>
                    </div>

                    {confirmedOrders.length === 0 ? (
                        <div className="glass-card p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-dark-800/50 rounded-full flex items-center justify-center mb-4 border border-dark-700 shadow-inner">
                                <IoTimeOutline className="text-2xl text-dark-500" />
                            </div>
                            <p className="text-dark-400 text-sm italic">Queue is currently clear...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {confirmedOrders.map(order => (
                                <div key={order.id} className="glass-card-hover p-5 border-l-4 border-amber-500 relative overflow-hidden group/card">
                                    <div className="absolute top-0 right-0 p-3">
                                        <span className="text-[10px] font-mono text-dark-500 tabular-nums">
                                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                        </span>
                                    </div>

                                    <div className="mb-4">
                                        <h3 className="text-white font-black text-xl tracking-tight mb-1 flex items-center gap-2">
                                            <IoRestaurantOutline className="text-dark-400 text-sm" />
                                            Table {order.tableNumber}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-[11px] text-dark-500">
                                            <IoPersonOutline />
                                            Steward: <span className="text-dark-300 truncate max-w-[120px]">{order.createdBy || 'Unknown'}</span>
                                        </div>
                                    </div>

                                    <div className="bg-dark-900/40 rounded-xl p-4 border border-dark-700/30 mb-5">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-3 py-1.5 first:pt-0 last:pb-0 border-b last:border-0 border-dark-800/40">
                                                <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-[11px] font-bold min-w-[28px] text-center border border-amber-500/20">
                                                    {item.quantity}×
                                                </span>
                                                <span className="text-dark-100 font-medium text-sm leading-tight pt-0.5">{item.name}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => startPreparing(order)}
                                        className="w-full py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-400 border border-amber-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.1)] group-hover/card:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                                    >
                                        <IoFlameOutline className="text-lg" />
                                        Start Cooking
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* COOKING ORDERS — Preparing, in progress */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-base md:text-lg font-bold text-orange-400 flex items-center gap-2">
                            <IoPulseOutline className="text-xl animate-pulse" />
                            Active Cooking ({preparingOrders.length})
                        </h2>
                    </div>

                    {preparingOrders.length === 0 ? (
                        <div className="glass-card p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-dark-800/50 rounded-full flex items-center justify-center mb-4 border border-dark-700 shadow-inner">
                                <IoFlameOutline className="text-2xl text-dark-500" />
                            </div>
                            <p className="text-dark-400 text-sm italic">Nothing on the burners...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {preparingOrders.map(order => (
                                <div key={order.id} className="glass-card-hover p-5 border-l-4 border-orange-500 relative overflow-hidden group/card shadow-[inset_0_0_20px_rgba(251,146,60,0.02)]">
                                    <div className="absolute top-0 right-0 p-3">
                                        <div className="flex items-center gap-1.5 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                            <span className="w-1 h-1 rounded-full bg-orange-500 animate-ping" />
                                            <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">Cooking</span>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <h3 className="text-white font-black text-xl tracking-tight mb-1 flex items-center gap-2">
                                            <IoRestaurantOutline className="text-dark-400 text-sm" />
                                            Table {order.tableNumber}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-[11px] text-dark-500">
                                            <IoPersonOutline />
                                            Steward: <span className="text-dark-300 truncate max-w-[120px]">{order.createdBy || 'Unknown'}</span>
                                        </div>
                                    </div>

                                    <div className="bg-dark-900/40 rounded-xl p-4 border border-dark-700/30 mb-5">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-3 py-1.5 first:pt-0 last:pb-0 border-b last:border-0 border-dark-800/40">
                                                <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded text-[11px] font-bold min-w-[28px] text-center border border-orange-500/20">
                                                    {item.quantity}×
                                                </span>
                                                <span className="text-dark-100 font-medium text-sm leading-tight pt-0.5">{item.name}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => markReady(order)}
                                        className="w-full py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover/card:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                    >
                                        <IoCheckmarkCircleOutline className="text-lg" />
                                        Order Ready
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Global Empty State — Only shows if literally nothing is in the kitchen */}
            {orders.length === 0 && (
                <div className="glass-card p-12 md:p-20 text-center flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="text-6xl md:text-8xl mb-6 transform group-hover:scale-110 transition-transform duration-500 group-hover:rotate-12">👨‍🍳</div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">The Kitchen is Quiet</h3>
                    <p className="text-dark-400 text-sm md:text-base max-w-sm">No orders currently in the pipeline. Take a breather or prep for the next rush!</p>
                </div>
            )}

            <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Kitchen;
