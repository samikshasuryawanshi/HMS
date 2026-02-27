// Admin Dashboard — Full overview with stats and charts (Mobile Optimized & Premium)
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToCollection } from '../firebase/firestore';
import { where } from 'firebase/firestore';
import StatCard from '../components/StatCard';
import Loader from '../components/Loader';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    IoRestaurantOutline,
    IoCartOutline,
    IoCashOutline,
    IoFastFoodOutline,
    IoListOutline,
    IoTimeOutline,
    IoPersonOutline
} from 'react-icons/io5';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const statusFlow = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Served', 'Completed'];

const AdminDashboard = () => {
    const { userData } = useAuth();
    const [tables, setTables] = useState([]);
    const [orders, setOrders] = useState([]);
    const [menu, setMenu] = useState([]);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userData?.businessId) return;
        const unsubs = [];
        unsubs.push(listenToCollection('tables', (data) => { setTables(data); setLoading(false); }, [where('businessId', '==', userData.businessId)]));
        unsubs.push(listenToCollection('orders', (data) => setOrders(data), [where('businessId', '==', userData.businessId)]));
        unsubs.push(listenToCollection('menu', (data) => setMenu(data), [where('businessId', '==', userData.businessId)]));
        unsubs.push(listenToCollection('bills', (data) => setBills(data), [where('businessId', '==', userData.businessId)]));
        return () => unsubs.forEach(unsub => unsub());
    }, [userData]);

    const activeOrders = orders.filter(o => o.status !== 'Completed').length;
    const todayStr = new Date().toDateString();
    const todayBills = bills.filter(b => {
        const billDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return billDate.toDateString() === todayStr;
    });
    const todaySales = todayBills.reduce((sum, b) => sum + (b.total || 0), 0);

    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
        return days;
    };
    const last7Days = getLast7Days();
    const weeklyData = last7Days.map(day => {
        const dayStr = day.toDateString();
        return bills.filter(b => { const d = b.date?.toDate ? b.date.toDate() : new Date(b.date); return d.toDateString() === dayStr; }).reduce((sum, b) => sum + (b.total || 0), 0);
    });

    const salesChartData = {
        labels: last7Days.map(d => d.toLocaleDateString('en-IN', { weekday: 'short' })),
        datasets: [{
            label: 'Sales (₹)',
            data: weeklyData,
            backgroundColor: 'rgba(234, 85, 69, 0.25)', // primary-500 fading out
            borderColor: 'rgba(234, 85, 69, 0.9)',
            borderWidth: 2,
            borderRadius: { topLeft: 6, topRight: 6 },
            borderSkipped: false,
            barPercentage: 0.5,
            hoverBackgroundColor: 'rgba(234, 85, 69, 0.45)',
        }]
    };

    const salesChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(18, 18, 18, 0.95)',
                titleColor: '#fff',
                bodyColor: '#e7e7e7',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 12,
                displayColors: false,
                callbacks: { label: (context) => `₹${context.raw.toLocaleString()}` }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#888', font: { family: 'Inter', size: 10 } }, border: { display: false } },
            y: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, border: { display: false }, ticks: { color: '#6d6d6d', font: { family: 'Inter', size: 10 }, callback: (v) => '₹' + v } }
        },
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 1000, easing: 'easeOutQuart' }
    };

    const doughnutData = {
        labels: statusFlow,
        datasets: [{
            data: statusFlow.map(s => orders.filter(o => o.status === s).length),
            backgroundColor: [
                'rgba(245,158,11,0.85)', // amber
                'rgba(59,130,246,0.85)', // blue
                'rgba(6,182,212,0.85)',  // cyan
                'rgba(168,85,247,0.85)', // purple
                'rgba(139,92,246,0.85)', // violet
                'rgba(16,185,129,0.85)'  // emerald
            ],
            borderWidth: 2,
            borderColor: 'rgba(18, 18, 18, 1)',
            hoverOffset: 4
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#b0b0b0',
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: { family: 'Inter', size: 11 }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(18, 18, 18, 0.95)',
                titleColor: '#fff',
                bodyColor: '#e7e7e7',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 12
            }
        },
        animation: { animateScale: true, animateRotate: true, duration: 1000, easing: 'easeOutQuart' }
    };

    const recentOrders = [...orders].sort((a, b) => { const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt); const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt); return dateB - dateA; }).slice(0, 8);

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
            {/* Header Section */}
            <div className="flex flex-col gap-1.5">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2 lg:gap-3">
                    Dashboard
                </h1>
                {/* <p className="text-dark-400 text-xs md:text-sm font-medium flex items-center gap-2">
                    Welcome back, <span className="text-white font-semibold">{userData?.name || 'Admin'}</span>
                    <span className="inline-block origin-bottom-right animate-wave">👋</span>
                </p> */}
            </div>

            {/* Stat Cards Container - Optimized for Mobile Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                <StatCard icon={<IoRestaurantOutline className="text-xl md:text-2xl" />} label="Tables" value={tables.length} color="primary" />
                <StatCard icon={<IoCartOutline className="text-xl md:text-2xl" />} label="Orders" value={activeOrders} color="warning" />
                <StatCard icon={<IoCashOutline className="text-xl md:text-2xl" />} label="Sales" value={`₹${todaySales.toLocaleString()}`} color="success" />
                <StatCard icon={<IoFastFoodOutline className="text-xl md:text-2xl" />} label="Menu" value={menu.length} color="info" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Sales Chart */}
                <div className="lg:col-span-2 glass-card p-4 md:p-6 lg:p-7 shadow-xl shadow-black/10 hover:border-dark-600/50 transition-colors group relative overflow-hidden flex flex-col">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    <div className="mb-4 md:mb-6 relative z-10">
                        <h3 className="text-base md:text-lg font-bold text-white tracking-wide">Weekly Sales Overview</h3>
                        <p className="text-[10px] md:text-xs text-dark-400 mt-1">Total revenue generated over the last 7 days</p>
                    </div>

                    <div className="h-56 md:h-64 lg:h-[280px] w-full relative z-10 mt-auto">
                        <Bar data={salesChartData} options={salesChartOptions} />
                    </div>
                </div>

                {/* Status Doughnut */}
                <div className="glass-card p-4 md:p-6 lg:p-7 shadow-xl shadow-black/10 hover:border-dark-600/50 transition-colors group relative overflow-hidden flex flex-col">
                    <div className="absolute -right-20 -top-20 w-40 h-40 bg-purple-500/10 rounded-full blur-[80px] group-hover:bg-purple-500/20 transition-colors duration-500 pointer-events-none" />

                    <div className="mb-4 relative z-10 text-center lg:text-left">
                        <h3 className="text-base md:text-lg font-bold text-white tracking-wide">Order Status</h3>
                        <p className="text-[10px] md:text-xs text-dark-400 mt-1">Distribution of active orders</p>
                    </div>

                    <div className="flex-1 w-full relative z-10 flex flex-col items-center justify-center min-h-[220px]">
                        {orders.length === 0 ? (
                            <div className="text-center py-6">
                                <div className="w-14 h-14 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                                    <IoCartOutline size={24} className="text-dark-500" />
                                </div>
                                <p className="text-dark-400 text-xs md:text-sm">No active orders</p>
                            </div>
                        ) : (
                            <div className="w-full max-w-[220px] lg:max-w-full lg:h-[240px] flex items-center justify-center">
                                <Doughnut data={doughnutData} options={doughnutOptions} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Live Order Queue - Mobile Responsive approach */}
            <div className="glass-card shadow-xl shadow-black/10 overflow-hidden group">
                <div className="p-4 md:p-6 border-b border-dark-700/50 bg-dark-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 md:p-2.5 bg-primary-500/10 rounded-xl text-primary-400 shadow-[0_0_10px_rgba(234,85,69,0.2)]">
                            <IoListOutline className="text-lg md:text-xl" />
                        </div>
                        <div>
                            <h3 className="text-base md:text-lg font-bold text-white tracking-wide">Live Order Queue</h3>
                            <p className="text-[10px] md:text-xs text-dark-400 mt-0.5">Most recent {recentOrders.length} orders</p>
                        </div>
                    </div>
                </div>

                {recentOrders.length === 0 ? (
                    <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-dark-800/50 rounded-full flex items-center justify-center mb-4 border border-dark-700">
                            <IoRestaurantOutline className="text-2xl md:text-3xl text-dark-400" />
                        </div>
                        <h4 className="text-white font-medium mb-1 text-sm md:text-base">Queue is empty</h4>
                        <p className="text-xs md:text-sm text-dark-400 max-w-[220px]">New orders will appear here automatically.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile View (Stack layout rather than table to avoid ugly horizontal scrolling) */}
                        <div className="md:hidden divide-y divide-dark-800/40">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="p-4 flex flex-col gap-3 hover:bg-dark-800/20 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_5px_rgba(234,85,69,0.5)]" />
                                            <span className="text-white font-bold text-sm">Table {order.tableNumber}</span>
                                        </div>
                                        <div className={statusBadge(order.status)}>{order.status}</div>
                                    </div>

                                    <div className="flex items-center text-xs text-dark-300">
                                        <span className="bg-dark-800 px-2 py-0.5 rounded-md border border-dark-700/50 mr-1.5">{order.items?.length || 0}</span> items
                                    </div>

                                    <div className="flex items-center justify-between mt-1 border-t border-dark-800/50 pt-3">
                                        <div className="flex items-center gap-1.5 text-xs text-dark-400">
                                            <IoPersonOutline />
                                            <span className="truncate max-w-[80px]">{order.createdBy || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-emerald-400 font-bold text-sm">₹{order.totalAmount?.toLocaleString() || 0}</span>
                                            {order.createdAt?.toDate && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-dark-400 bg-dark-800/80 px-2 py-1 rounded border border-dark-700/50">
                                                    <IoTimeOutline />
                                                    <span>{order.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View (Standard Table) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-dark-800/30 text-dark-300 text-[11px] uppercase tracking-wider font-semibold border-b border-dark-700/50">
                                        <th className="px-5 py-3.5 whitespace-nowrap">Table</th>
                                        <th className="px-5 py-3.5 whitespace-nowrap">Items</th>
                                        <th className="px-5 py-3.5 whitespace-nowrap">Total</th>
                                        <th className="px-5 py-3.5 whitespace-nowrap">Staff</th>
                                        <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                                        <th className="px-5 py-3.5 whitespace-nowrap text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-800/40 text-sm">
                                    {recentOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-dark-800/40 transition-colors duration-200 group/row">
                                            <td className="px-5 py-4 w-[15%]">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_5px_rgba(234,85,69,0.5)] opacity-0 group-hover/row:opacity-100 transition-opacity" />
                                                    <span className="text-white font-semibold">Table {order.tableNumber}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-dark-300 w-[15%]">
                                                <span className="bg-dark-800 px-2.5 py-1 rounded-md border border-dark-700/50 shadow-sm">{order.items?.length || 0}</span> items
                                            </td>
                                            <td className="px-5 py-4 text-white font-medium w-[15%] text-emerald-400">
                                                ₹{order.totalAmount?.toLocaleString() || 0}
                                            </td>
                                            <td className="px-5 py-4 text-dark-400 w-[20%]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-dark-700/80 flex items-center justify-center text-[10px] text-white font-bold ring-1 ring-dark-600">
                                                        {(order.createdBy || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="truncate max-w-[120px]">{order.createdBy || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 w-[20%]">
                                                <span className={statusBadge(order.status)}>{order.status}</span>
                                            </td>
                                            <td className="px-5 py-4 text-dark-400 text-right w-[15%] whitespace-nowrap tabular-nums">
                                                {order.createdAt?.toDate
                                                    ? <span className="bg-dark-800/80 px-2.5 py-1.5 rounded-lg border border-dark-700/50 shadow-sm text-xs flex items-center justify-end gap-1.5 w-fit ml-auto">
                                                        <IoTimeOutline className="text-dark-500" />
                                                        {order.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
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
                
                /* Chart.js overrides to ensure they fill nicely on mobile */
                canvas {
                    max-width: 100%;
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
