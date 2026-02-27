// Waiter Dashboard — Active orders, quick create, and status overview (Premium UI)
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, updateDocument } from '../firebase/firestore';
import { where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoCartOutline,
    IoAddOutline,
    IoCheckmarkCircleOutline,
    IoRestaurantOutline,
    IoTimeOutline,
    IoPersonOutline,
    IoCheckmarkDoneCircleOutline
} from 'react-icons/io5';

const statusFlow = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Served', 'Completed'];

const WaiterDashboard = () => {
    const { userData } = useAuth();
    const [orders, setOrders] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!userData?.businessId) return;
        const unsubs = [];
        unsubs.push(listenToCollection('orders', (data) => {
            data.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });
            setOrders(data);
            setLoading(false);
        }, [where('businessId', '==', userData.businessId)]));
        unsubs.push(listenToCollection('tables', setTables, [where('businessId', '==', userData.businessId)]));
        return () => unsubs.forEach(u => u());
    }, [userData]);

    const activeOrders = orders.filter(o => !['Completed'].includes(o.status));
    const myOrders = activeOrders.filter(o => o.createdBy === userData?.email);
    const readyOrders = orders.filter(o => o.status === 'Ready');
    const servedOrders = orders.filter(o => o.status === 'Served');
    const occupiedTables = tables.filter(t => t.status === 'Occupied').length;

    const advanceStatus = async (order) => {
        const waiterTransitions = { Ready: 'Served', Served: 'Completed' };
        const next = waiterTransitions[order.status];
        if (!next) return;
        try {
            await updateDocument('orders', order.id, {
                status: next,
                [`${next.toLowerCase()}At`]: new Date().toISOString(),
                [`${next.toLowerCase()}By`]: userData?.email || '',
            });

            if (next === 'Completed') {
                const otherActive = orders.filter(
                    o => o.id !== order.id && o.tableNumber === order.tableNumber && !['Completed'].includes(o.status)
                );
                if (otherActive.length === 0) {
                    const table = tables.find(t => t.tableNumber === order.tableNumber);
                    if (table) await updateDocument('tables', table.id, { status: 'Available' });
                }
            }

            toast.success(`Order → ${next}`);
        } catch (error) {
            toast.error('Error updating order');
        }
    };

    const statusBadge = (status) => {
        const map = {
            Pending: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
            Confirmed: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]',
            Preparing: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.15)]',
            Ready: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
            Served: 'text-violet-400 bg-violet-500/10 border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.15)]',
            Completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
        };
        return `px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-bold border tracking-wider uppercase whitespace-nowrap ${map[status] || map.Pending}`;
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in relative z-10 w-full pb-10 xl:px-4">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
                        Hey, {userData?.name || 'Steward'} <span className="inline-block origin-bottom-right animate-wave">👋</span>
                    </h1>
                    <p className="text-dark-400 text-xs md:text-sm font-medium">
                        Your active orders and tasks overview
                    </p>
                </div>
                <button
                    onClick={() => navigate('/orders')}
                    className="w-full sm:w-auto py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,85,69,0.3)] hover:shadow-[0_0_25px_rgba(234,85,69,0.4)] relative overflow-hidden group"
                >
                    <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out skew-x-12" />
                    <IoAddOutline className="text-xl" />
                    New Order
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                {[
                    { label: 'My Active Orders', value: myOrders.length, color: 'text-primary-400', bgBorder: 'hover:border-primary-500/30' },
                    { label: 'Ready to Serve', value: readyOrders.length, color: 'text-amber-400', bgBorder: 'hover:border-amber-500/30' },
                    { label: 'Awaiting Completion', value: servedOrders.length, color: 'text-violet-400', bgBorder: 'hover:border-violet-500/30' },
                    { label: 'Occupied Tables', value: occupiedTables, color: 'text-emerald-400', bgBorder: 'hover:border-emerald-500/30' }
                ].map((stat, idx) => (
                    <div key={idx} className={`glass-card p-4 md:p-6 text-center border-dark-700/50 transition-colors duration-300 ${stat.bgBorder} group relative overflow-hidden flex flex-col items-center justify-center`}>
                        <div className={`text-3xl md:text-4xl font-black mb-1 ${stat.color} tracking-tight`}>{stat.value}</div>
                        <div className="text-dark-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Ready to Serve — Priority Section */}
            {readyOrders.length > 0 && (
                <div className="glass-card shadow-xl shadow-black/10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
                    <div className="p-4 md:p-6 border-b border-dark-700/50 bg-dark-900/40 relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 md:p-2.5 bg-amber-500/10 rounded-xl text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                <IoRestaurantOutline className="text-lg md:text-xl" />
                            </div>
                            <div>
                                <h2 className="text-base md:text-lg font-bold text-white tracking-wide">Ready to Serve</h2>
                                <p className="text-[10px] md:text-xs text-dark-400 mt-0.5">{readyOrders.length} orders waiting at the kitchen</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 md:p-6 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                            {readyOrders.map(order => (
                                <div key={order.id} className="bg-dark-800/40 border border-dark-700/50 rounded-2xl p-5 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 flex flex-col group/card text-left relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />

                                    <div className="flex items-center justify-between mb-4 pl-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-dark-700/50 flex items-center justify-center border border-dark-600 shadow-inner">
                                                <span className="text-amber-400 font-bold text-sm">{order.tableNumber}</span>
                                            </div>
                                            <h3 className="text-white font-bold tracking-wide">Table {order.tableNumber}</h3>
                                        </div>
                                        <div className={statusBadge(order.status)}>{order.status}</div>
                                    </div>

                                    <div className="space-y-1.5 mb-5 pl-2 flex-1">
                                        {order.items?.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <span className="bg-dark-700 px-1.5 py-0.5 rounded text-[10px] text-dark-300 font-medium min-w-[24px] text-center border border-dark-600">{item.quantity}×</span>
                                                <span className="text-dark-200 text-sm leading-tight pt-0.5 truncate">{item.name}</span>
                                            </div>
                                        ))}
                                        {order.items?.length > 3 && (
                                            <div className="text-[10px] text-dark-500 italic mt-1 ml-8">
                                                + {order.items.length - 3} more items
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto pl-2 pt-4 border-t border-dark-800/60">
                                        {order.createdBy && (
                                            <div className="flex items-center gap-1.5 text-dark-500 text-[11px] mb-3">
                                                <IoPersonOutline />
                                                Ordered by: <span className="text-dark-300 font-medium truncate">{order.createdBy}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => advanceStatus(order)}
                                            className="w-full py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-400 border border-amber-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.1)] group-hover/card:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                                        >
                                            <IoCheckmarkCircleOutline className="text-lg" />
                                            Mark Served
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Served — Awaiting Completion */}
            {servedOrders.length > 0 && (
                <div className="glass-card shadow-xl shadow-black/10 overflow-hidden relative">
                    <div className="p-4 md:p-6 border-b border-dark-700/50 bg-dark-900/40 relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 md:p-2.5 bg-violet-500/10 rounded-xl text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                                <IoTimeOutline className="text-lg md:text-xl" />
                            </div>
                            <div>
                                <h2 className="text-base md:text-lg font-bold text-white tracking-wide">Served — Awaiting Completion</h2>
                                <p className="text-[10px] md:text-xs text-dark-400 mt-0.5">{servedOrders.length} tables eating currently</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 md:p-6 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                            {servedOrders.map(order => (
                                <div key={order.id} className="bg-dark-800/40 border border-dark-700/50 rounded-2xl p-5 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/5 flex flex-col group/card text-left relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-violet-400 to-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />

                                    <div className="flex items-center justify-between mb-4 pl-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-dark-700/50 flex items-center justify-center border border-dark-600 shadow-inner">
                                                <span className="text-violet-400 font-bold text-sm">{order.tableNumber}</span>
                                            </div>
                                            <h3 className="text-white font-bold tracking-wide">Table {order.tableNumber}</h3>
                                        </div>
                                        <span className="text-emerald-400 font-bold text-base bg-dark-900/50 px-2.5 py-1 rounded-lg border border-dark-700/50">
                                            ₹{order.totalAmount?.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="mb-5 pl-2 flex-1 flex flex-col justify-center">
                                        <div className="flex items-center gap-2 text-dark-300 text-sm">
                                            <span className="bg-dark-700/50 px-2 py-1 rounded border border-dark-600">{order.items?.length} items</span> in order
                                        </div>
                                    </div>

                                    <div className="mt-auto pl-2 pt-4 border-t border-dark-800/60">
                                        {order.createdBy && (
                                            <div className="flex items-center gap-1.5 text-dark-500 text-[11px] mb-3">
                                                <IoPersonOutline />
                                                Ordered by: <span className="text-dark-300 font-medium truncate">{order.createdBy}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => advanceStatus(order)}
                                            className="w-full py-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 active:scale-95 text-violet-400 border border-violet-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover/card:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                                        >
                                            <IoCheckmarkDoneCircleOutline className="text-xl" />
                                            Mark Finished
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* General Active Order List */}
            <div className="glass-card shadow-xl shadow-black/10 overflow-hidden group">
                <div className="p-4 md:p-6 border-b border-dark-700/50 bg-dark-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 md:p-2.5 bg-blue-500/10 rounded-xl text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                            <IoCartOutline className="text-lg md:text-xl" />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-white tracking-wide">All Active Orders</h2>
                            <p className="text-[10px] md:text-xs text-dark-400 mt-0.5">Summary of {activeOrders.length} ongoing tables</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    {activeOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-10 md:py-16">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-dark-800/50 rounded-full flex items-center justify-center mb-4 border border-dark-700">
                                <IoCheckmarkDoneCircleOutline className="text-3xl md:text-4xl text-dark-400" />
                            </div>
                            <h4 className="text-white font-medium mb-1 text-sm md:text-base">All Caught Up!</h4>
                            <p className="text-xs md:text-sm text-dark-400 max-w-[250px]">No active orders are currently in the system.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {activeOrders.map(order => (
                                <div key={order.id} className="bg-dark-800/30 border border-dark-700/50 rounded-2xl p-4 hover:bg-dark-800/50 transition-colors flex flex-col group/order text-left">
                                    <div className="flex items-center justify-between mb-3 border-b border-dark-700/50 pb-3">
                                        <div className="flex items-center gap-2">
                                            <IoRestaurantOutline className="text-dark-400" />
                                            <h3 className="text-white font-bold tracking-wide text-sm">Table {order.tableNumber}</h3>
                                        </div>
                                        <div className={statusBadge(order.status)}>{order.status}</div>
                                    </div>

                                    <div className="text-dark-400 text-xs mb-3 flex-1">
                                        <span className="text-dark-200 font-medium">{order.items?.length || 0}</span> items taking up <span className="text-emerald-400 font-semibold">₹{order.totalAmount?.toLocaleString() || 0}</span>
                                    </div>

                                    <div className="mt-auto pt-2">
                                        {order.createdBy && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-dark-500">
                                                <IoPersonOutline />
                                                <span className="truncate">Steward: {order.createdBy}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-15deg); }
                    50% { transform: rotate(15deg); }
                    75% { transform: rotate(-10deg); }
                }
                .animate-wave {
                    animation: wave 1.5s ease-in-out infinite;
                }
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

export default WaiterDashboard;
