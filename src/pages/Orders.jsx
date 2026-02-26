// Orders Page - Role-based order management with status workflow
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    listenToCollection,
    addDocument,
    updateDocument,
} from '../firebase/firestore';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoAddOutline,
    IoRemoveOutline,
    IoTrashOutline,
    IoCartOutline,
    IoChevronForwardOutline,
} from 'react-icons/io5';

// Full order lifecycle
const statusFlow = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Served', 'Completed'];

// Which roles can trigger each status transition
const canAdvance = (currentStatus, role) => {
    const roleTransitions = {
        admin: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Served'], // admin can do all
        manager: ['Pending'],                                             // Pending → Confirmed
        chef: ['Confirmed', 'Preparing'],                                 // Confirmed → Preparing, Preparing → Ready
        staff: ['Ready', 'Served'],                                       // Ready → Served, Served → Completed
    };
    return roleTransitions[role]?.includes(currentStatus) ?? false;
};

const Orders = () => {
    const { userRole, isAdmin, isManager, isStaff, userData } = useAuth();
    const [orders, setOrders] = useState([]);
    const [tables, setTables] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [filter, setFilter] = useState('All');

    // New order state
    const [selectedTable, setSelectedTable] = useState('');
    const [cart, setCart] = useState([]);
    const [menuSearch, setMenuSearch] = useState('');

    useEffect(() => {
        const unsubs = [];
        unsubs.push(
            listenToCollection('orders', (data) => {
                data.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
                setOrders(data);
                setLoading(false);
            })
        );
        unsubs.push(listenToCollection('tables', setTables));
        unsubs.push(listenToCollection('menu', setMenuItems));
        return () => unsubs.forEach((u) => u());
    }, []);

    // Cart functions
    const addToCart = (item) => {
        const existing = cart.find((c) => c.id === item.id);
        if (existing) {
            setCart(cart.map((c) =>
                c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
            ));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const updateQuantity = (itemId, delta) => {
        setCart(cart.map((c) => {
            if (c.id === itemId) {
                const newQty = c.quantity + delta;
                return newQty > 0 ? { ...c, quantity: newQty } : c;
            }
            return c;
        }).filter((c) => c.quantity > 0));
    };

    const removeFromCart = (itemId) => {
        setCart(cart.filter((c) => c.id !== itemId));
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handlePlaceOrder = async () => {
        if (!selectedTable) {
            toast.error('Please select a table');
            return;
        }
        if (cart.length === 0) {
            toast.error('Please add items to the order');
            return;
        }

        try {
            const orderItems = cart.map((item) => ({
                menuId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity,
            }));

            await addDocument('orders', {
                tableNumber: Number(selectedTable),
                items: orderItems,
                totalAmount: cartTotal,
                status: 'Pending',
                createdBy: userData?.email || '',
                createdByRole: userRole,
            });

            // Update table status to Occupied
            const table = tables.find((t) => t.tableNumber === Number(selectedTable));
            if (table) {
                await updateDocument('tables', table.id, { status: 'Occupied' });
            }

            toast.success('Order placed!');
            setModalOpen(false);
            setCart([]);
            setSelectedTable('');
            setMenuSearch('');
        } catch (error) {
            toast.error('Error placing order');
        }
    };

    const advanceStatus = async (order) => {
        const currentIndex = statusFlow.indexOf(order.status);
        if (currentIndex < statusFlow.length - 1) {
            const nextStatus = statusFlow[currentIndex + 1];

            // Check if role is allowed to make this transition
            if (!canAdvance(order.status, userRole)) {
                toast.error('You don\'t have permission to change this status');
                return;
            }

            try {
                const updateData = { status: nextStatus };

                // Track who made the transition
                updateData[`${nextStatus.toLowerCase()}At`] = new Date().toISOString();
                updateData[`${nextStatus.toLowerCase()}By`] = userData?.email || '';

                await updateDocument('orders', order.id, updateData);

                // If completed, free the table (unless other active orders exist)
                if (nextStatus === 'Completed') {
                    const activeStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Served'];
                    const otherActiveOrders = orders.filter(
                        (o) => o.id !== order.id && o.tableNumber === order.tableNumber && activeStatuses.includes(o.status)
                    );
                    if (otherActiveOrders.length === 0) {
                        const table = tables.find((t) => t.tableNumber === order.tableNumber);
                        if (table) {
                            await updateDocument('tables', table.id, { status: 'Available' });
                        }
                    }
                }

                toast.success(`Order → ${nextStatus}`);
            } catch (error) {
                toast.error('Error updating order');
            }
        }
    };

    // Filter which statuses this role cares about
    const visibleStatuses = () => {
        if (isAdmin || isManager) return statusFlow;
        if (isStaff) return ['Pending', 'Ready', 'Served', 'Completed'];
        return statusFlow;
    };

    const filteredOrders =
        filter === 'All' ? orders : orders.filter((o) => o.status === filter);

    const availableMenu = menuItems.filter(
        (item) =>
            item.available !== false &&
            item.name.toLowerCase().includes(menuSearch.toLowerCase())
    );

    const statusBadge = (status) => {
        const map = {
            Pending: 'badge-warning',
            Confirmed: 'badge-info',
            Preparing: 'badge-info',
            Ready: 'badge-purple',
            Served: 'badge-purple',
            Completed: 'badge-success',
        };
        return map[status] || 'badge-info';
    };

    const statusIcon = (status) => {
        const map = {
            Pending: '⏳',
            Confirmed: '✅',
            Preparing: '👨‍🍳',
            Ready: '🔔',
            Served: '🍽️',
            Completed: '✓',
        };
        return map[status] || '📋';
    };

    // Can this role create new orders?
    const canCreateOrder = isAdmin || isManager || isStaff;

    // Get the next status label for a given order (role-aware)
    const getNextAction = (order) => {
        if (!canAdvance(order.status, userRole)) return null;
        const nextIndex = statusFlow.indexOf(order.status) + 1;
        if (nextIndex >= statusFlow.length) return null;

        const actionLabels = {
            Pending: '→ Confirm (Send to Kitchen)',
            Confirmed: '→ Start Preparing',
            Preparing: '→ Mark Ready',
            Ready: '→ Mark Served',
            Served: '→ Mark Completed',
        };
        return actionLabels[order.status] || `→ ${statusFlow[nextIndex]}`;
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Orders</h1>
                    <p className="page-subtitle">{orders.length} total orders</p>
                </div>
                {canCreateOrder && (
                    <button
                        onClick={() => {
                            setCart([]);
                            setSelectedTable('');
                            setMenuSearch('');
                            setModalOpen(true);
                        }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <IoAddOutline size={20} />
                        New Order
                    </button>
                )}
            </div>

            {/* Status Filters */}
            <div className="flex gap-2 flex-wrap">
                {['All', ...visibleStatuses()].map((f) => (
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
                                ({orders.filter((o) => o.status === f).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Orders</h3>
                    <p className="text-dark-400">No orders for the selected status.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredOrders.map((order) => (
                        <div key={order.id} className="glass-card-hover p-5">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{statusIcon(order.status)}</span>
                                    <div>
                                        <h3 className="text-white font-semibold">
                                            Table {order.tableNumber}
                                        </h3>
                                        <p className="text-dark-400 text-xs">
                                            {order.createdAt?.toDate
                                                ? order.createdAt.toDate().toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })
                                                : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                                <span className={statusBadge(order.status)}>{order.status}</span>
                            </div>

                            {/* Items */}
                            <div className="space-y-2 mb-4">
                                {order.items?.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between text-sm py-1.5 border-b border-dark-800/50 last:border-0"
                                    >
                                        <span className="text-dark-300">
                                            {item.name} × {item.quantity}
                                        </span>
                                        <span className="text-white">₹{item.total}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Total + Staff */}
                            <div className="flex justify-between items-center pt-3 border-t border-dark-700/50">
                                <div>
                                    <span className="text-dark-400 text-sm">Total</span>
                                    {order.createdBy && (
                                        <p className="text-dark-500 text-xs mt-0.5">📝 {order.createdBy}</p>
                                    )}
                                </div>
                                <span className="text-xl font-bold text-primary-400">
                                    ₹{order.totalAmount?.toLocaleString()}
                                </span>
                            </div>

                            {/* Role-based action button */}
                            {getNextAction(order) && order.status !== 'Completed' && (
                                <button
                                    onClick={() => advanceStatus(order)}
                                    className="mt-4 w-full btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm"
                                >
                                    {getNextAction(order)}
                                    <IoChevronForwardOutline size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* New Order Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="New Order"
                size="xl"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Menu Items */}
                    <div>
                        <div className="mb-4">
                            <label className="label-text">Select Table</label>
                            <select
                                value={selectedTable}
                                onChange={(e) => setSelectedTable(e.target.value)}
                                className="select-field"
                            >
                                <option value="">Choose a table</option>
                                {tables.map((t) => (
                                    <option key={t.id} value={t.tableNumber}>
                                        Table {t.tableNumber} ({t.capacity} seats) — {t.status}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-3">
                            <input
                                type="text"
                                value={menuSearch}
                                onChange={(e) => setMenuSearch(e.target.value)}
                                placeholder="Search menu items..."
                                className="input-field"
                            />
                        </div>

                        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                            {availableMenu.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="flex items-center justify-between p-3 rounded-xl bg-dark-800 hover:bg-dark-700 cursor-pointer transition-colors"
                                >
                                    <div>
                                        <p className="text-white text-sm font-medium">{item.name}</p>
                                        <p className="text-dark-400 text-xs">{item.category}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-primary-400 font-semibold">₹{item.price}</span>
                                        <IoAddOutline size={18} className="text-dark-400" />
                                    </div>
                                </div>
                            ))}
                            {availableMenu.length === 0 && (
                                <p className="text-dark-400 text-center py-4">No items found</p>
                            )}
                        </div>
                    </div>

                    {/* Right: Cart */}
                    <div className="bg-dark-800/50 rounded-xl p-4">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                            <IoCartOutline size={20} />
                            Order Items ({cart.length})
                        </h4>

                        {cart.length === 0 ? (
                            <p className="text-dark-400 text-sm text-center py-8">
                                Click menu items to add them
                            </p>
                        ) : (
                            <>
                                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                                    {cart.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-3 bg-dark-900/50 rounded-xl"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{item.name}</p>
                                                <p className="text-dark-400 text-xs">
                                                    ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 ml-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    className="w-7 h-7 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-white transition-colors"
                                                >
                                                    <IoRemoveOutline size={14} />
                                                </button>
                                                <span className="text-white text-sm font-medium w-6 text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    className="w-7 h-7 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-white transition-colors"
                                                >
                                                    <IoAddOutline size={14} />
                                                </button>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-dark-400 hover:text-red-400 transition-colors"
                                                >
                                                    <IoTrashOutline size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Cart Total */}
                                <div className="border-t border-dark-700 pt-3 mb-4">
                                    <div className="flex justify-between text-lg font-bold">
                                        <span className="text-dark-300">Total</span>
                                        <span className="text-primary-400">₹{cartTotal.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePlaceOrder}
                                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                                >
                                    Place Order
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Orders;
