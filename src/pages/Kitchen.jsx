// Kitchen Dashboard — Chef's view of incoming and cooking orders
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection, updateDocument } from '../firebase/firestore';
import { where } from 'firebase/firestore';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import { IoFlameOutline, IoCheckmarkCircleOutline, IoTimeOutline } from 'react-icons/io5';

const Kitchen = () => {
    const { isChef, userData } = useAuth();
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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title flex items-center gap-3">
                    <IoFlameOutline className="text-orange-400" />
                    Kitchen Display
                </h1>
                <p className="page-subtitle">
                    {confirmedOrders.length} incoming • {preparingOrders.length} cooking
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* INCOMING ORDERS — Confirmed, waiting to be started */}
                <div>
                    <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                        <IoTimeOutline size={20} />
                        Incoming ({confirmedOrders.length})
                    </h2>
                    {confirmedOrders.length === 0 ? (
                        <div className="glass-card p-8 text-center">
                            <div className="text-4xl mb-3">✨</div>
                            <p className="text-dark-400">No incoming orders</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {confirmedOrders.map(order => (
                                <div key={order.id} className="glass-card-hover p-4 border-l-4 border-amber-500">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-white font-bold text-lg">
                                            Table {order.tableNumber}
                                        </h3>
                                        <span className="text-dark-400 text-xs">
                                            {order.createdAt?.toDate
                                                ? order.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                                : 'Now'}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 mb-4">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-dark-300">
                                                    {item.quantity}× {item.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {order.createdBy && (
                                        <div className="text-dark-500 text-xs mb-4">📝 {order.createdBy}</div>
                                    )}
                                    <button
                                        onClick={() => startPreparing(order)}
                                        className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <IoFlameOutline size={16} />
                                        Start Cooking
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* COOKING ORDERS — Preparing, in progress */}
                <div>
                    <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                        <IoFlameOutline size={20} />
                        Cooking ({preparingOrders.length})
                    </h2>
                    {preparingOrders.length === 0 ? (
                        <div className="glass-card p-8 text-center">
                            <div className="text-4xl mb-3">🍳</div>
                            <p className="text-dark-400">Nothing cooking right now</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {preparingOrders.map(order => (
                                <div key={order.id} className="glass-card-hover p-4 border-l-4 border-orange-500 animate-pulse-slow">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-white font-bold text-lg">
                                            Table {order.tableNumber}
                                        </h3>
                                        <span className="badge-info text-xs">Cooking</span>
                                    </div>
                                    <div className="space-y-1.5 mb-4">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-dark-300">
                                                    {item.quantity}× {item.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {order.createdBy && (
                                        <div className="text-dark-500 text-xs mb-4">📝 {order.createdBy}</div>
                                    )}
                                    <button
                                        onClick={() => markReady(order)}
                                        className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <IoCheckmarkCircleOutline size={16} />
                                        Mark Ready
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {orders.length === 0 && (
                <div className="glass-card p-12 text-center">
                    <div className="text-6xl mb-4">👨‍🍳</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Kitchen is quiet</h3>
                    <p className="text-dark-400">No orders in the pipeline right now. Take a breather!</p>
                </div>
            )}
        </div>
    );
};

export default Kitchen;
