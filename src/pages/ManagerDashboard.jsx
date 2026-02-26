// Manager Dashboard — Pending approvals, live order board, stats
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, updateDocument } from '../firebase/firestore';
import StatCard from '../components/StatCard';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoRestaurantOutline,
    IoCartOutline,
    IoCashOutline,
    IoCheckmarkCircleOutline,
    IoChevronForwardOutline,
} from 'react-icons/io5';

const statusFlow = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Served', 'Completed'];

const ManagerDashboard = () => {
    const { userData } = useAuth();
    const [orders, setOrders] = useState([]);
    const [tables, setTables] = useState([]);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

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
        unsubs.push(listenToCollection('bills', setBills));
        return () => unsubs.forEach(u => u());
    }, []);

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
        const map = { Pending: 'badge-warning', Confirmed: 'badge-info', Preparing: 'badge-info', Ready: 'badge-purple', Served: 'badge-purple', Completed: 'badge-success' };
        return map[status] || 'badge-info';
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title">Manager Dashboard</h1>
                <p className="page-subtitle">Welcome, {userData?.name || 'Manager'} 👋</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<IoCartOutline size={24} />}
                    label="Pending Approval"
                    value={pendingOrders.length}
                    color="warning"
                />
                <StatCard
                    icon={<IoCartOutline size={24} />}
                    label="Active Orders"
                    value={activeOrders.length}
                    color="info"
                />
                <StatCard
                    icon={<IoRestaurantOutline size={24} />}
                    label="Occupied Tables"
                    value={tables.filter(t => t.status === 'Occupied').length}
                    color="primary"
                />
                <StatCard
                    icon={<IoCashOutline size={24} />}
                    label="Today's Sales"
                    value={`₹${todaySales.toLocaleString()}`}
                    color="success"
                />
            </div>

            {/* Pending Approval Queue */}
            <div>
                <h2 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
                    ⏳ Pending Approval ({pendingOrders.length})
                </h2>
                {pendingOrders.length === 0 ? (
                    <div className="glass-card p-6 text-center">
                        <div className="text-4xl mb-2">✅</div>
                        <p className="text-dark-400">All orders approved. No pending items.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pendingOrders.map(order => (
                            <div key={order.id} className="glass-card-hover p-4 border-l-4 border-amber-500">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-bold">Table {order.tableNumber}</h3>
                                    <span className="text-white font-bold">₹{order.totalAmount?.toLocaleString()}</span>
                                </div>
                                <div className="space-y-1 mb-2">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="text-dark-300 text-sm">{item.quantity}× {item.name}</div>
                                    ))}
                                </div>
                                {order.createdBy && (
                                    <div className="text-dark-500 text-xs mb-3">
                                        📝 Ordered by: <span className="text-dark-300">{order.createdBy}</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => confirmOrder(order)}
                                    className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <IoCheckmarkCircleOutline size={16} />
                                    Approve & Send to Kitchen
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Live Order Board */}
            <div>
                <h2 className="text-lg font-bold text-white mb-3">📋 Live Order Board</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                    {statusFlow.map(status => {
                        const count = orders.filter(o => o.status === status).length;
                        return (
                            <div key={status} className="glass-card p-3 text-center">
                                <div className="text-2xl font-bold text-white">{count}</div>
                                <div className={`text-xs mt-1 ${statusBadge(status).replace('badge-', 'text-')}`}>{status}</div>
                            </div>
                        );
                    })}
                </div>

                {activeOrders.length === 0 ? (
                    <div className="glass-card p-6 text-center">
                        <p className="text-dark-400">No active orders right now</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeOrders.map(order => (
                            <div key={order.id} className="glass-card p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-semibold">Table {order.tableNumber}</h3>
                                    <span className={`${statusBadge(order.status)} text-xs`}>{order.status}</span>
                                </div>
                                <div className="text-dark-300 text-sm">{order.items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}</div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-800">
                                    <span className="text-dark-500 text-xs">{order.createdBy || 'Unknown'}</span>
                                    <span className="text-primary-400 font-semibold text-sm">₹{order.totalAmount?.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagerDashboard;
