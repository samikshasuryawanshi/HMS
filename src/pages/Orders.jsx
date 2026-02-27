// Orders Page - Role-based order management with status workflow and accordion details
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    listenToCollection,
    addDocument,
    updateDocument,
} from '../firebase/firestore';
import { where } from 'firebase/firestore';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { toast } from 'react-toastify';
import {
    IoAddOutline,
    IoRemoveOutline,
    IoTrashOutline,
    IoCartOutline,
    IoChevronForwardOutline,
    IoChevronDownOutline,
    IoChevronUpOutline,
    IoTimeOutline,
    IoRestaurantOutline,
    IoCheckmarkDoneOutline,
    IoSearchOutline,
    IoCloseOutline,
    IoReceiptOutline
} from 'react-icons/io5';

// Full order lifecycle
const statusFlow = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Served', 'Completed'];

// Which roles can trigger each status transition
const canAdvance = (currentStatus, role) => {
    const roleTransitions = {
        manager: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Served'], // manager can do all
        cashier: ['Pending'],                                             // Pending → Confirmed
        chef: ['Confirmed', 'Preparing'],                                 // Confirmed → Preparing, Preparing → Ready
        staff: ['Ready', 'Served'],                                       // Ready → Served, Served → Completed
    };
    return roleTransitions[role]?.includes(currentStatus) ?? false;
};

const Orders = () => {
    const { userRole, isManager, isCashier, isStaff, userData } = useAuth();
    const [orders, setOrders] = useState([]);
    const [tables, setTables] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [filter, setFilter] = useState('All');

    // New order state
    const [selectedTable, setSelectedTable] = useState('');
    const [cart, setCart] = useState([]);
    const [menuSearch, setMenuSearch] = useState('');

    useEffect(() => {
        const unsubs = [];
        unsubs.push(
            listenToCollection(
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
                [where('businessId', '==', userData?.businessId)]
            )
        );
        unsubs.push(listenToCollection('tables', setTables, [where('businessId', '==', userData?.businessId)]));
        unsubs.push(listenToCollection('menu', setMenuItems, [where('businessId', '==', userData?.businessId)]));
        return () => unsubs.forEach((u) => u());
    }, [userData]);

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
                imageUrl: item.imageUrl || item.image || '',
            }));

            await addDocument('orders', {
                tableNumber: Number(selectedTable),
                items: orderItems,
                totalAmount: cartTotal,
                status: 'Pending',
                createdBy: userData?.email || '',
                createdByRole: userRole,
                businessId: userData?.businessId,
                createdAt: new Date(),
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
                    if (expandedOrderId === order.id) setExpandedOrderId(null);
                }

                toast.success(`Order → ${nextStatus}`);
            } catch (error) {
                toast.error('Error updating order');
            }
        }
    };

    // Filter which statuses this role cares about
    const visibleStatuses = () => {
        if (isManager || isCashier) return statusFlow;
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
            Pending: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
            Confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
            Preparing: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
            Ready: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
            Served: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
            Completed: 'bg-dark-950/80 text-dark-500 border-dark-700',
        };
        return map[status] || 'bg-dark-800 text-white';
    };

    const statusIcon = (status) => {
        const map = {
            Pending: '⏳',
            Confirmed: '✅',
            Preparing: '👨🍳',
            Ready: '🔔',
            Served: '🍽️',
            Completed: '✓',
        };
        return map[status] || '📋';
    };

    // Can this role create new orders?
    const canCreateOrder = isManager || isCashier || isStaff;

    // Get the next status label for a given order (role-aware)
    const getNextAction = (order) => {
        if (!canAdvance(order.status, userRole)) return null;
        const nextIndex = statusFlow.indexOf(order.status) + 1;
        if (nextIndex >= statusFlow.length) return null;

        const actionLabels = {
            Pending: 'Confirm Order',
            Confirmed: 'Start Preparing',
            Preparing: 'Mark Ready',
            Ready: 'Mark Served',
            Served: 'Mark Completed',
        };
        return actionLabels[order.status] || `Mark ${statusFlow[nextIndex]}`;
    };

    const toggleExpand = (id) => {
        setExpandedOrderId(expandedOrderId === id ? null : id);
    };

    const getProductImage = (itemId) => {
        const product = menuItems.find(m => m.id === itemId);
        return product?.imageUrl || product?.image || '';
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        Orders
                    </h1>
                    <p className="text-dark-400 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                        {orders.length} ACTIVE SERVICE RECORDS
                    </p>
                </div>
                {canCreateOrder && (
                    <button
                        onClick={() => {
                            setCart([]);
                            setSelectedTable('');
                            setMenuSearch('');
                            setModalOpen(true);
                        }}
                        className="btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs"
                    >
                        <IoAddOutline size={20} />
                        New Order
                    </button>
                )}
            </div>

            {/* Status Filters */}
            <div className="bg-dark-900/40 backdrop-blur-xl border border-dark-700/50 p-3 rounded-2xl md:rounded-3xl shadow-lg relative overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                    {['All', ...visibleStatuses()].map((f) => {
                        const isActive = filter === f;
                        const count = f === 'All' ? orders.length : orders.filter(o => o.status === f).length;
                        return (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-3 rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 whitespace-nowrap uppercase tracking-widest border flex items-center gap-2 ${isActive
                                    ? 'bg-primary-500/10 text-white border-primary-500/40'
                                    : 'bg-dark-800/40 text-dark-500 border-transparent hover:text-dark-300 hover:bg-dark-800/80'
                                    }`}
                            >
                                {f}
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${isActive ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-400'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Orders List (Accordion) */}
            {filteredOrders.length === 0 ? (
                <div className="glass-card p-24 text-center rounded-[2.5rem]">
                    <div className="text-8xl mb-8 opacity-20 filter grayscale">📋</div>
                    <h3 className="text-xl font-black text-white mb-2 tracking-tighter uppercase">No Records</h3>
                    <p className="text-dark-400 text-[10px] font-black uppercase tracking-[0.3em]">
                        PIPELINE CLEAR FOR {filter.toUpperCase()}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredOrders.map((order) => {
                        const isExpanded = expandedOrderId === order.id;
                        const nextAction = getNextAction(order);

                        return (
                            <div key={order.id} className="glass-card overflow-hidden transition-all duration-300 border-dark-700 hover:border-primary-500/30">
                                {/* Collapsed Header */}
                                <div
                                    onClick={() => toggleExpand(order.id)}
                                    className="p-4 md:p-5 flex items-center justify-between cursor-pointer group hover:bg-white/5 active:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-4 md:gap-8 flex-1">
                                        <div className="flex flex-col items-center justify-center min-w-[70px] border-r border-dark-700/50 pr-4 md:pr-8">
                                            <span className="text-[10px]  text-dark-500 uppercase tracking-widest leading-none mb-1">Table</span>
                                            <span className="text-2xl  text-white tracking-tighter">#{order.tableNumber}</span>
                                        </div>

                                        <div className="hidden sm:flex flex-col min-w-[100px]">
                                            <span className="text-[10px]  text-dark-500 uppercase tracking-widest leading-none mb-1">Amount</span>
                                            <span className="text-lg  text-primary-400 tabular-nums">₹{order.totalAmount?.toLocaleString()}</span>
                                        </div>

                                        <div className="flex flex-col min-w-[80px]">
                                            <span className="text-[10px]  text-dark-500 uppercase tracking-widest leading-none mb-1">Status</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`px-2 py-0.5 rounded-lg bg-green-700 text-[9px]  text-white uppercase tracking-wider border ${statusBadge(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="hidden md:flex flex-col">
                                            <span className="text-[10px]  text-dark-500 uppercase tracking-widest leading-none mb-1">Order Time</span>
                                            <div className="flex items-center gap-1.5 text-[10px] text-dark-400 uppercase tracking-tight">
                                                <IoTimeOutline size={14} className="text-primary-500/60" />
                                                {order.createdAt?.toDate
                                                    ? order.createdAt.toDate().toLocaleString('en-IN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })
                                                    : 'SYNCING...'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-dark-500 group-hover:text-primary-400 transition-colors">
                                            <span className="hidden sm:inline-block text-[10px]  uppercase tracking-widest">{isExpanded ? 'CLOSE' : 'VIEW'}</span>
                                            {isExpanded ? <IoChevronUpOutline size={20} /> : <IoChevronDownOutline size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-dark-700/60 bg-dark-950/20 p-6 md:p-8 space-y-8 animate-slide-down">
                                        {/* Items Section */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px]  text-dark-500 uppercase tracking-[0.3em] pl-1 flex items-center gap-3">
                                                <IoReceiptOutline className="text-primary-500" /> DELICACY PAYLOAD
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {order.items?.map((item, idx) => {
                                                    const img = item.imageUrl || getProductImage(item.menuId);
                                                    return (
                                                        <div key={idx} className="flex items-center gap-4 p-4 bg-dark-900/60 rounded-2xl border border-dark-800/50 hover:bg-dark-800/60 transition-all group/item">
                                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-dark-800 shrink-0 border border-dark-700/50 relative">
                                                                {img ? (
                                                                    <img src={img} alt={item.name} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-30 grayscale group-hover/item:grayscale-0 group-hover/item:opacity-100 transition-all">🍽️</div>
                                                                )}
                                                                <div className="absolute top-1 right-1 bg-primary-500 text-white text-[10px]  w-6 h-6 rounded-lg flex items-center justify-center shadow-lg">
                                                                    {item.quantity}
                                                                </div>
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-white text-sm  tracking-tight leading-tight uppercase truncate">{item.name}</p>
                                                                <p className="text-[10px] font-bold text-primary-500/60 mt-2 tabular-nums">₹{item.price} UNIT</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-sm  text-white group-hover/item:text-primary-400 transition-colors tabular-nums">₹{item.total}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Meta & Actions */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-6 border-t border-dark-700/40">
                                            <div className="flex flex-wrap gap-4 md:gap-8">
                                                <div className="space-y-1.5">
                                                    <span className="text-[9px] font-black text-dark-500 uppercase tracking-widest block">Operational Handler</span>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 font-extrabold border border-primary-500/20 text-xs shadow-inner">
                                                            {order.createdBy?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[11px]  text-white tracking-tight uppercase">{order.createdBy?.split('@')[0]}</p>
                                                            <p className="text-[9px]  text-dark-500 uppercase tracking-[0.1em]">{order.createdByRole}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <span className="text-[9px]  text-dark-500 uppercase tracking-widest block">Protocol Trace ID</span>
                                                    <div className="px-3 py-1.5 bg-dark-900/60 border border-dark-800 rounded-xl">
                                                        <p className="text-[10px]  text-dark-300 tracking-widest uppercase">#{order.id.slice(-8).toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {nextAction && order.status !== 'Completed' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        advanceStatus(order);
                                                    }}
                                                    className="w-full md:w-auto py-4 px-8 rounded-2xl bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white font-black text-xs uppercase tracking-[0.25em] transition-all shadow-xl hover:shadow-primary-500/20 flex items-center justify-center gap-3 group/action"
                                                >
                                                    {nextAction}
                                                    <IoChevronForwardOutline className="text-lg group-hover/action:translate-x-1 transition-transform" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* New Order Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Protocol Initiation"
                size="xl"
            >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-4">
                    {/* Catalog Selection (7 columns) */}
                    <div className="lg:col-span-12 xl:col-span-7 space-y-7 flex flex-col h-[650px]">
                        {/* Table Selector */}
                        <div className="space-y-3 shrink-0">
                            <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest pl-1">Station Selection *</label>
                            <div className="relative group/select">
                                <IoRestaurantOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500 z-10" size={20} />
                                <select
                                    value={selectedTable}
                                    onChange={(e) => setSelectedTable(e.target.value)}
                                    className="w-full bg-dark-800 border border-dark-700/50 focus:border-primary-500/50 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-8 focus:ring-primary-500/5 transition-all font-black text-sm appearance-none cursor-pointer"
                                >
                                    <option value="" disabled className="bg-dark-900">SELECT TARGET STATION</option>
                                    {tables.map((t) => (
                                        <option key={t.id} value={t.tableNumber} className="bg-dark-900">
                                            TABLE #{t.tableNumber.toString().padStart(2, '0')} ({t.status.toUpperCase()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Search Deli */}
                        <div className="space-y-4 flex-1 flex flex-col min-h-0">
                            <div className="relative group/search shrink-0">
                                <IoSearchOutline className="absolute left-5 top-1/2 -translate-y-1/2 text-dark-500 group-focus-within/search:text-primary-500 transition-colors" size={22} />
                                <input
                                    type="text"
                                    value={menuSearch}
                                    onChange={(e) => setMenuSearch(e.target.value)}
                                    placeholder="SEARCH DELICACIES..."
                                    className="w-full bg-dark-800/50 border border-dark-700/50 rounded-2xl pl-14 pr-12 py-4.5 text-white placeholder:text-dark-600 focus:outline-none focus:border-primary-500/40 transition-all font-black text-[13px] tracking-tight uppercase"
                                />
                                {menuSearch && (
                                    <button onClick={() => setMenuSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-dark-700 text-dark-400 hover:text-white transition-all">
                                        <IoCloseOutline size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Catalog Grid */}
                            <div className="flex-1 overflow-y-auto pr-2 space-y-2 no-scrollbar pb-6 custom-scrollbar-v2">
                                {availableMenu.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => addToCart(item)}
                                        className="group/item flex items-center gap-4 p-3 rounded-2xl bg-dark-900/40 border border-dark-800/40 hover:border-primary-500/40 cursor-pointer transition-all hover:bg-dark-800/40 shadow-sm"
                                    >
                                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-dark-800 shrink-0 border border-dark-700/50">
                                            {(item.imageUrl || item.image) ? (
                                                <img src={item.imageUrl || item.image} alt={item.name} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl opacity-30 grayscale group-hover/item:grayscale-0 group-hover/item:opacity-100 transition-all">🍽️</div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-white text-[11px] font-black tracking-tight leading-tight uppercase truncate">{item.name}</p>
                                            <p className="text-primary-500 text-[10px] font-black mt-1.5 tabular-nums">₹{item.price}</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-dark-950 text-dark-600 group-hover/item:bg-primary-500 group-hover/item:text-white transition-all shadow-xl">
                                            <IoAddOutline size={18} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Operational Feed (5 columns) */}
                    <div className="lg:col-span-12 xl:col-span-5 flex flex-col h-[650px]">
                        <div className="flex-1 glass-card border-dark-700 rounded-[2.5rem] p-6 lg:p-10 flex flex-col shadow-2xl relative overflow-hidden">
                            <h4 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                                <IoCartOutline className="text-primary-500" size={20} /> ACTIVE PAYLOAD
                            </h4>

                            {cart.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 space-y-5">
                                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-dark-700 flex items-center justify-center text-4xl">🛒</div>
                                    <p className="text-dark-400 font-black text-[9px] uppercase tracking-[0.3em] max-w-[150px] leading-relaxed">
                                        SELECT ITEMS TO INITIALIZE ORDER PAYLOAD
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1 mb-6 custom-scrollbar-v2">
                                        {cart.map((item) => (
                                            <div
                                                key={item.id}
                                                className="group/cartitem p-4 bg-dark-950/40 rounded-2xl border border-dark-800/40 hover:border-dark-700 transition-all"
                                            >
                                                <div className="flex justify-between items-start gap-2 mb-4">
                                                    <p className="text-white text-[11px] font-black tracking-tight leading-tight uppercase truncate">{item.name}</p>
                                                    <button onClick={() => removeFromCart(item.id)} className="text-dark-600 hover:text-red-500 transition-colors">
                                                        <IoCloseOutline size={18} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 bg-dark-900 border border-dark-700/50 p-1 rounded-xl">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg bg-dark-800 hover:bg-dark-700 flex items-center justify-center text-white transition-all border border-dark-700 active:scale-90">
                                                            <IoRemoveOutline size={12} />
                                                        </button>
                                                        <span className="text-white text-xs font-black w-6 text-center tabular-nums">
                                                            {item.quantity}
                                                        </span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-dark-800 hover:bg-dark-700 flex items-center justify-center text-white transition-all border border-dark-700 active:scale-90">
                                                            <IoAddOutline size={12} />
                                                        </button>
                                                    </div>
                                                    <span className="text-xs font-black text-white tabular-nums">₹{item.price * item.quantity}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-dark-800/50">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-dark-500 uppercase tracking-widest leading-none">AGGREGATE VALUE</span>
                                                <div className="text-4xl font-black text-white flex items-center gap-1 tracking-tighter">
                                                    <span className="text-base font-black text-primary-500/50 mt-1">₹</span>
                                                    {cartTotal.toLocaleString()}
                                                </div>
                                            </div>
                                            <button onClick={() => setCart([])} className="text-dark-600 hover:text-red-500 text-[9px] font-black uppercase tracking-widest pb-1 border-b border-dark-800">
                                                RESET
                                            </button>
                                        </div>

                                        <button
                                            onClick={handlePlaceOrder}
                                            className="w-full py-5 rounded-2xl bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white font-black text-[13px] uppercase tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-4 group/place"
                                        >
                                            LAUNCH ORDER
                                            <IoCheckmarkDoneOutline className="text-2xl group-hover/place:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Aesthetic Overrides */}
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

export default Orders;
