// Admin Dashboard — Full overview with stats and charts
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
import { IoRestaurantOutline, IoCartOutline, IoCashOutline, IoFastFoodOutline } from 'react-icons/io5';

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

    const salesChartData = { labels: last7Days.map(d => d.toLocaleDateString('en-IN', { weekday: 'short' })), datasets: [{ label: 'Sales (₹)', data: weeklyData, backgroundColor: 'rgba(234, 85, 69, 0.3)', borderColor: 'rgba(234, 85, 69, 1)', borderWidth: 2, borderRadius: 8, barPercentage: 0.6 }] };
    const salesChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e1e1e', titleColor: '#fff', bodyColor: '#b0b0b0', borderColor: '#4f4f4f', borderWidth: 1, cornerRadius: 12, padding: 12 } }, scales: { x: { grid: { display: false }, ticks: { color: '#888' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888', callback: (v) => '₹' + v } } } };

    const doughnutData = { labels: statusFlow, datasets: [{ data: statusFlow.map(s => orders.filter(o => o.status === s).length), backgroundColor: ['rgba(245,158,11,0.7)', 'rgba(59,130,246,0.7)', 'rgba(6,182,212,0.7)', 'rgba(168,85,247,0.7)', 'rgba(139,92,246,0.7)', 'rgba(16,185,129,0.7)'], borderWidth: 0 }] };
    const doughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#b0b0b0', padding: 16, usePointStyle: true, pointStyleWidth: 10 } } } };

    const recentOrders = [...orders].sort((a, b) => { const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt); const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt); return dateB - dateA; }).slice(0, 8);

    const statusBadge = (status) => {
        const map = { Pending: 'badge-warning', Confirmed: 'badge-info', Preparing: 'badge-info', Ready: 'badge-purple', Served: 'badge-purple', Completed: 'badge-success' };
        return map[status] || 'badge-info';
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Welcome back, {userData?.name || 'Admin'} 👋</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<IoRestaurantOutline size={24} />} label="Total Tables" value={tables.length} color="primary" />
                <StatCard icon={<IoCartOutline size={24} />} label="Active Orders" value={activeOrders} color="warning" />
                <StatCard icon={<IoCashOutline size={24} />} label="Today's Sales" value={`₹${todaySales.toLocaleString()}`} color="success" />
                <StatCard icon={<IoFastFoodOutline size={24} />} label="Menu Items" value={menu.length} color="info" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Weekly Sales Overview</h3>
                    <div className="h-64"><Bar data={salesChartData} options={salesChartOptions} /></div>
                </div>
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Order Status</h3>
                    <div className="h-64"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
                </div>
            </div>

            {/* Live Order Queue */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">📋 Live Order Queue</h3>
                {recentOrders.length === 0 ? (
                    <p className="text-dark-400 text-center py-8">No orders yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="table-header">
                                    <th className="px-4 py-3 text-left">Table</th>
                                    <th className="px-4 py-3 text-left">Items</th>
                                    <th className="px-4 py-3 text-left">Total</th>
                                    <th className="px-4 py-3 text-left">Staff</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-800">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-dark-800/30 transition-colors">
                                        <td className="px-4 py-3 text-white font-medium">Table {order.tableNumber}</td>
                                        <td className="px-4 py-3 text-dark-300">{order.items?.length || 0} items</td>
                                        <td className="px-4 py-3 text-white">₹{order.totalAmount?.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-dark-400 text-sm">{order.createdBy || '—'}</td>
                                        <td className="px-4 py-3"><span className={statusBadge(order.status)}>{order.status}</span></td>
                                        <td className="px-4 py-3 text-dark-400 text-sm">
                                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
