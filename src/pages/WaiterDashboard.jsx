// Waiter Dashboard — Active orders, quick create, and status overview
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, updateDocument } from '../firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoCartOutline,
    IoAddOutline,
    IoChevronForwardOutline,
    IoCheckmarkCircleOutline,
    IoRestaurantOutline,
    IoTimeOutline,
} from 'react-icons/io5';

const statusFlow = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Served', 'Completed'];

const WaiterDashboard = () => {
    const { userData } = useAuth();
    const [orders, setOrders] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubs = [];
        unsubs.push(listenToCollection('orders', (data) => {
            data.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });
            setOrders(data);
            setLoading(false);
        }));
        unsubs.push(listenToCollection('tables', setTables));
        return () => unsubs.forEach(u => u());
    }, []);

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
        const map = { Pending: 'badge-warning', Confirmed: 'badge-info', Preparing: 'badge-info', Ready: 'badge-purple', Served: 'badge-purple', Completed: 'badge-success' };
        return map[status] || 'badge-info';
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">👋 Hey, {userData?.name || 'Waiter'}</h1>
                    <p className="page-subtitle">Your active orders and tasks</p>
                </div>
                <button onClick={() => navigate('/orders')} className="btn-primary flex items-center gap-2">
                    <IoAddOutline size={20} />
                    New Order
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card p-4 text-center">
                    <div className="text-3xl font-bold text-primary-400">{myOrders.length}</div>
                    <div className="text-dark-400 text-xs mt-1">My Active Orders</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <div className="text-3xl font-bold text-amber-400">{readyOrders.length}</div>
                    <div className="text-dark-400 text-xs mt-1">Ready to Serve</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <div className="text-3xl font-bold text-violet-400">{servedOrders.length}</div>
                    <div className="text-dark-400 text-xs mt-1">Awaiting Completion</div>
                </div>
                <div className="glass-card p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-400">{occupiedTables}</div>
                    <div className="text-dark-400 text-xs mt-1">Occupied Tables</div>
                </div>
            </div>

            {/* Ready to Serve — Priority Section */}
            {readyOrders.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
                        <IoRestaurantOutline size={20} />
                        🔔 Ready to Serve ({readyOrders.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {readyOrders.map(order => (
                            <div key={order.id} className="glass-card-hover p-4 border-l-4 border-amber-500">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-bold">Table {order.tableNumber}</h3>
                                    <span className={statusBadge(order.status)}>{order.status}</span>
                                </div>
                                <div className="text-dark-300 text-sm mb-1">{order.items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}</div>
                                {order.createdBy && (
                                    <div className="text-dark-500 text-xs mb-3">Ordered by: {order.createdBy}</div>
                                )}
                                <button
                                    onClick={() => advanceStatus(order)}
                                    className="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <IoCheckmarkCircleOutline size={16} /> Mark Served
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Served — Awaiting Completion */}
            {servedOrders.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-violet-400 mb-3 flex items-center gap-2">
                        <IoTimeOutline size={20} />
                        Served — Awaiting Completion ({servedOrders.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {servedOrders.map(order => (
                            <div key={order.id} className="glass-card-hover p-4 border-l-4 border-violet-500">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-bold">Table {order.tableNumber}</h3>
                                    <span className="text-white font-bold">₹{order.totalAmount?.toLocaleString()}</span>
                                </div>
                                <div className="text-dark-300 text-sm mb-1">{order.items?.length} items</div>
                                {order.createdBy && (
                                    <div className="text-dark-500 text-xs mb-3">Ordered by: {order.createdBy}</div>
                                )}
                                <button
                                    onClick={() => advanceStatus(order)}
                                    className="w-full py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <IoCheckmarkCircleOutline size={16} /> Mark Completed
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Live Order Queue */}
            <div>
                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <IoCartOutline size={20} />
                    All Active Orders ({activeOrders.length})
                </h2>
                {activeOrders.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <div className="text-4xl mb-3">✨</div>
                        <p className="text-dark-400">No active orders. All caught up!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeOrders.map(order => (
                            <div key={order.id} className="glass-card p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-semibold text-sm">Table {order.tableNumber}</h3>
                                    <span className={`${statusBadge(order.status)} text-xs`}>{order.status}</span>
                                </div>
                                <div className="text-dark-400 text-xs">
                                    {order.items?.length} items • ₹{order.totalAmount?.toLocaleString()}
                                </div>
                                {order.createdBy && (
                                    <div className="text-dark-500 text-xs mt-1">by {order.createdBy}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaiterDashboard;
