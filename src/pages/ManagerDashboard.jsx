// Manager Dashboard — Pending approvals, live order board, stats (Premium UI)
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, updateDocument } from '../firebase/firestore';
import { where } from 'firebase/firestore';
import StatCard from '../components/StatCard';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoRestaurantOutline,
    IoCartOutline,
    IoCashOutline,
    IoCheckmarkCircleOutline,
    IoTimeOutline,
    IoPersonOutline,
    IoFastFoodOutline,
    IoListOutline
} from 'react-icons/io5';

const statusFlow = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Served', 'Completed'];

const ManagerDashboard = () => {
    const { userData } = useAuth();
    const [orders, setOrders] = useState([]);
    const [tables, setTables] = useState([]);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userData?.businessId) return;
        const unsubs = [];
        unsubs.push(listenToCollection(
            'orders',
            (data) => {
                data.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
                setOrders(data);
                setLoading(false);
            },
            [where('businessId', '==', userData.businessId)]
        ));
        unsubs.push(listenToCollection('tables', setTables, [where('businessId', '==', userData.businessId)]));
        unsubs.push(listenToCollection('bills', setBills, [where('businessId', '==', userData.businessId)]));
        return () => unsubs.forEach(u => u());
    }, [userData]);

    const pendingOrders = orders.filter(o => o.status === 'Pending');
    const activeOrders = orders.filter(o => !['Completed'].includes(o.status));
    const todayStr = new Date().toDateString();
    const todayBills = bills.filter(b => {
        const d = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return d.toDateString() === todayStr;
    });
    const todaySales = todayBills.reduce((sum, b) => sum + (b.total || 0), 0);

    const confirmOrder = async (order) => {
        try {
            await updateDocument('orders', order.id, {
                status: 'Confirmed',
                confirmedAt: new Date().toISOString(),
                confirmedBy: userData?.email || '',
            });
            toast.success(`Table ${order.tableNumber} — Sent to kitchen!`);
        } catch (error) {
            toast.error('Error confirming order');
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
        <div className="space-y-6 md:space-y-8 animate-fade-in relative z-10 w-full pb-10">
            {/* Header */}
            <div className="flex flex-col gap-1.5">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2 lg:gap-3">
                    Cashier Dashboard
                </h1>
                <p className="text-dark-400 text-xs md:text-sm font-medium flex items-center gap-2">
                    Welcome back, <span className="text-white font-semibold">{userData?.name || 'Cashier'}</span>
                    <span className="inline-block origin-bottom-right animate-wave">👋</span>
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                <StatCard
                    icon={<IoTimeOutline className="text-xl md:text-2xl" />}
                    label="Pending Approval"
                    value={pendingOrders.length}
                    color="warning"
                />
                <StatCard
                    icon={<IoCartOutline className="text-xl md:text-2xl" />}
                    label="Active Orders"
                    value={activeOrders.length}
                    color="info"
                />
                <StatCard
                    icon={<IoRestaurantOutline className="text-xl md:text-2xl" />}
                    label="Occupied Tables"
                    value={tables.filter(t => t.status === 'Occupied').length}
                    color="primary"
                />
                <StatCard
                    icon={<IoCashOutline className="text-xl md:text-2xl" />}
                    label="Today's Sales"
                    value={`₹${todaySales.toLocaleString()}`}
                    color="success"
                />
            </div>

            {/* Pending Approval Queue */}
            <div className="glass-card shadow-xl shadow-black/10 overflow-hidden group">
                <div className="p-4 md:p-6 border-b border-dark-700/50 bg-dark-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 md:p-2.5 bg-amber-500/10 rounded-xl text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                            <IoTimeOutline className="text-lg md:text-xl" />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-white tracking-wide">Pending Approval</h2>
                            <p className="text-[10px] md:text-xs text-dark-400 mt-0.5">{pendingOrders.length} orders awaiting kitchen dispatch</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    {pendingOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-6 md:py-10">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                                <IoCheckmarkCircleOutline className="text-3xl md:text-4xl text-emerald-400" />
                            </div>
                            <h4 className="text-white font-medium mb-1 text-sm md:text-base">All Caught Up!</h4>
                            <p className="text-xs md:text-sm text-dark-400 max-w-[250px]">There are no pending orders waiting for approval at the moment.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                            {pendingOrders.map(order => (
                                <div key={order.id} className="relative bg-dark-800/40 border border-dark-700/50 rounded-2xl p-5 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 flex flex-col overflow-hidden group/card text-left">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />

                                    <div className="flex items-center justify-between mb-4 pl-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-dark-700/50 flex items-center justify-center border border-dark-600">
                                                <span className="text-amber-400 font-bold text-sm">{order.tableNumber}</span>
                                            </div>
                                            <h3 className="text-white font-bold tracking-wide">Table {order.tableNumber}</h3>
                                        </div>
                                        <span className="text-emerald-400 font-bold text-base bg-dark-900/50 px-2 py-1 rounded-lg border border-dark-700/50">
                                            ₹{order.totalAmount?.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 mb-5 pl-2 flex-1">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <span className="bg-dark-700 px-1.5 py-0.5 rounded text-[10px] text-dark-300 font-medium min-w-[24px] text-center border border-dark-600">{item.quantity}×</span>
                                                <span className="text-dark-200 text-sm leading-tight pt-0.5">{item.name}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-auto pl-2">
                                        {order.createdBy && (
                                            <div className="flex items-center gap-1.5 text-dark-500 text-[11px] mb-4 bg-dark-900/40 px-3 py-2 rounded-xl border border-dark-800">
                                                <IoPersonOutline />
                                                Ordered by: <span className="text-dark-300 font-medium truncate">{order.createdBy}</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => confirmOrder(order)}
                                            className="w-full py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover/card:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                        >
                                            <IoCheckmarkCircleOutline className="text-lg" />
                                            Approve & Dispatch
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Live Order Board */}
            <div className="glass-card shadow-xl shadow-black/10 overflow-hidden group">
                <div className="p-4 md:p-6 border-b border-dark-700/50 bg-dark-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 md:p-2.5 bg-blue-500/10 rounded-xl text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                            <IoListOutline className="text-lg md:text-xl" />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-white tracking-wide">Live Order Board</h2>
                            <p className="text-[10px] md:text-xs text-dark-400 mt-0.5">Real-time status of all {activeOrders.length} active orders</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    {/* Status Legend Pills */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                        {statusFlow.map(status => {
                            const count = orders.filter(o => o.status === status).length;
                            // mapping generic tailwind text colors cleanly from the raw badge function without manual string manipulation bugs
                            const mapBg = { Pending: 'bg-amber-500/10', Confirmed: 'bg-blue-500/10', Preparing: 'bg-cyan-500/10', Ready: 'bg-purple-500/10', Served: 'bg-violet-500/10', Completed: 'bg-emerald-500/10' };
                            const mapBorder = { Pending: 'border-amber-500/20', Confirmed: 'border-blue-500/20', Preparing: 'border-cyan-500/20', Ready: 'border-purple-500/20', Served: 'border-violet-500/20', Completed: 'border-emerald-500/20' };
                            const mapText = { Pending: 'text-amber-400', Confirmed: 'text-blue-400', Preparing: 'text-cyan-400', Ready: 'text-purple-400', Served: 'text-violet-400', Completed: 'text-emerald-400' };

                            return (
                                <div key={status} className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${mapBg[status] || 'bg-dark-800'} ${mapBorder[status] || 'border-dark-700'} ${count > 0 ? 'shadow-md' : 'opacity-60'}`}>
                                    <div className={`text-xl md:text-2xl font-bold ${mapText[status] || 'text-dark-300'}`}>{count}</div>
                                    <div className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${mapText[status] || 'text-dark-400'}`}>{status}</div>
                                </div>
                            );
                        })}
                    </div>

                    {activeOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-8">
                            <div className="w-16 h-16 bg-dark-800/50 rounded-full flex items-center justify-center mb-4 border border-dark-700">
                                <IoFastFoodOutline className="text-2xl md:text-3xl text-dark-400" />
                            </div>
                            <p className="text-sm md:text-base text-white font-medium mb-1">Board is empty</p>
                            <p className="text-xs md:text-sm text-dark-400">No active orders right now.</p>
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

                                    <div className="space-y-1 mb-4 flex-1">
                                        {/* Show top 3 items, then abstract */}
                                        {order.items?.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-1.5 text-xs text-dark-300">
                                                <span className="text-dark-400 min-w-[16px] text-right">{item.quantity}×</span>
                                                <span className="truncate">{item.name}</span>
                                            </div>
                                        ))}
                                        {order.items?.length > 3 && (
                                            <div className="text-[10px] text-dark-500 italic mt-1 pl-5">
                                                + {order.items.length - 3} more items
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-dark-800/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[10px] text-dark-400">
                                                <IoPersonOutline />
                                                <span className="truncate max-w-[80px]">{order.createdBy || 'Unknown'}</span>
                                            </div>
                                            <span className="text-emerald-400 font-bold text-sm">₹{order.totalAmount?.toLocaleString() || 0}</span>
                                        </div>
                                        {order.createdAt?.toDate && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-dark-500">
                                                <IoTimeOutline />
                                                <span>{order.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
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

export default ManagerDashboard;
