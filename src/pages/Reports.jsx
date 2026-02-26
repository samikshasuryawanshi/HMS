// Reports Page - Sales reports and order history with filters
import { useState, useEffect, useMemo } from 'react';
import { listenToCollection } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { where } from 'firebase/firestore';
import Loader from '../components/Loader';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
    IoCalendarOutline,
    IoFunnelOutline,
    IoTrendingUpOutline,
    IoReceiptOutline,
    IoCashOutline,
} from 'react-icons/io5';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement, PointElement,
    Title, Tooltip, Legend, Filler
);

const Reports = () => {
    const { userData } = useAuth();
    const [bills, setBills] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('daily');
    const [dateFilter, setDateFilter] = useState('');
    const [tableFilter, setTableFilter] = useState('');

    useEffect(() => {
        if (!userData?.businessId) return;
        const unsubs = [];
        unsubs.push(
            listenToCollection('bills', (data) => {
                setBills(data);
                setLoading(false);
            }, [where('businessId', '==', userData.businessId)])
        );
        unsubs.push(listenToCollection('orders', setOrders, [where('businessId', '==', userData.businessId)]));
        return () => unsubs.forEach(u => u());
    }, [userData]);

    // Parse date from bill
    const parseBillDate = (bill) => {
        return bill.date?.toDate ? bill.date.toDate() : new Date(bill.date);
    };

    // ===== DAILY REPORT =====
    const dailySales = useMemo(() => {
        const today = dateFilter ? new Date(dateFilter) : new Date();
        const todayStr = today.toDateString();
        const todayBills = bills.filter(b => parseBillDate(b).toDateString() === todayStr);
        const totalSales = todayBills.reduce((sum, b) => sum + (b.total || 0), 0);
        const totalOrders = todayBills.length;
        const totalGST = todayBills.reduce((sum, b) => sum + (b.gst || 0), 0);
        return { todayBills, totalSales, totalOrders, totalGST, date: today };
    }, [bills, dateFilter]);

    // ===== MONTHLY REPORT =====
    const monthlySales = useMemo(() => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dailyData = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const day = new Date(now.getFullYear(), now.getMonth(), i);
            const dayStr = day.toDateString();
            const dayTotal = bills
                .filter(b => parseBillDate(b).toDateString() === dayStr)
                .reduce((sum, b) => sum + (b.total || 0), 0);
            dailyData.push({ day: i, total: dayTotal });
        }

        const monthTotal = dailyData.reduce((sum, d) => sum + d.total, 0);
        return { dailyData, monthTotal };
    }, [bills]);

    // Monthly chart config
    const monthlyChartData = {
        labels: monthlySales.dailyData.map(d => d.day),
        datasets: [{
            label: 'Daily Sales (₹)',
            data: monthlySales.dailyData.map(d => d.total),
            borderColor: 'rgba(234, 85, 69, 1)',
            backgroundColor: 'rgba(234, 85, 69, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 6,
            borderWidth: 2,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e1e1e',
                titleColor: '#fff',
                bodyColor: '#b0b0b0',
                borderColor: '#4f4f4f',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 12,
                callbacks: {
                    label: (ctx) => `₹${ctx.raw.toLocaleString()}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#888' },
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#888', callback: (v) => '₹' + v },
            },
        },
    };

    // ===== ORDER HISTORY =====
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            if (tableFilter && o.tableNumber !== Number(tableFilter)) return false;
            if (dateFilter) {
                const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
                if (orderDate.toDateString() !== new Date(dateFilter).toDateString()) return false;
            }
            return true;
        }).sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
        });
    }, [orders, tableFilter, dateFilter]);

    // Unique table numbers for filter
    const tableNumbers = [...new Set(orders.map(o => o.tableNumber))].sort((a, b) => a - b);

    const statusBadge = (status) => {
        const map = {
            Pending: 'badge-warning',
            Preparing: 'badge-info',
            Served: 'badge-purple',
            Completed: 'badge-success',
        };
        return map[status] || 'badge-info';
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title">Reports</h1>
                <p className="page-subtitle">Sales analytics and order history</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { key: 'daily', label: 'Daily Sales', icon: IoCalendarOutline },
                    { key: 'monthly', label: 'Monthly Sales', icon: IoTrendingUpOutline },
                    { key: 'history', label: 'Order History', icon: IoReceiptOutline },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === tab.key
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ===== DAILY SALES TAB ===== */}
            {activeTab === 'daily' && (
                <div className="space-y-6">
                    {/* Date Filter */}
                    <div className="flex items-center gap-3">
                        <IoCalendarOutline className="text-dark-400" size={18} />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="input-field max-w-xs"
                        />
                        {dateFilter && (
                            <button onClick={() => setDateFilter('')} className="text-sm text-primary-400 hover:text-primary-300">
                                Reset to today
                            </button>
                        )}
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="glass-card p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                                    <IoCashOutline size={22} />
                                </div>
                                <div>
                                    <p className="text-dark-400 text-sm">Total Sales</p>
                                    <p className="text-2xl font-bold text-white">₹{dailySales.totalSales.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                                    <IoReceiptOutline size={22} />
                                </div>
                                <div>
                                    <p className="text-dark-400 text-sm">Bills Generated</p>
                                    <p className="text-2xl font-bold text-white">{dailySales.totalOrders}</p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
                                    <IoTrendingUpOutline size={22} />
                                </div>
                                <div>
                                    <p className="text-dark-400 text-sm">GST Collected</p>
                                    <p className="text-2xl font-bold text-white">₹{dailySales.totalGST.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Bills Table */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            Bills for {dailySales.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </h3>
                        {dailySales.todayBills.length === 0 ? (
                            <p className="text-dark-400 text-center py-8">No bills for this date</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="table-header">
                                            <th className="px-4 py-3 text-left">Bill #</th>
                                            <th className="px-4 py-3 text-left">Table</th>
                                            <th className="px-4 py-3 text-left">Items</th>
                                            <th className="px-4 py-3 text-left">Subtotal</th>
                                            <th className="px-4 py-3 text-left">GST</th>
                                            <th className="px-4 py-3 text-left">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dark-800">
                                        {dailySales.todayBills.map(bill => (
                                            <tr key={bill.id} className="hover:bg-dark-800/30 transition-colors">
                                                <td className="px-4 py-3 text-dark-400 text-sm">#{bill.id?.slice(0, 6)}</td>
                                                <td className="px-4 py-3 text-white">Table {bill.tableNumber}</td>
                                                <td className="px-4 py-3 text-dark-300">{bill.items?.length || 0}</td>
                                                <td className="px-4 py-3 text-dark-300">₹{bill.subtotal?.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-dark-300">₹{bill.gst?.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-white font-medium">₹{bill.total?.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== MONTHLY SALES TAB ===== */}
            {activeTab === 'monthly' && (
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">
                                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} Sales
                            </h3>
                            <span className="text-primary-400 font-bold text-xl">
                                ₹{monthlySales.monthTotal.toLocaleString()}
                            </span>
                        </div>
                        <div className="h-72">
                            <Line data={monthlyChartData} options={chartOptions} />
                        </div>
                    </div>
                </div>
            )}

            {/* ===== ORDER HISTORY TAB ===== */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <IoFunnelOutline className="text-dark-400" size={18} />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="input-field max-w-[200px]"
                        />
                        <select
                            value={tableFilter}
                            onChange={(e) => setTableFilter(e.target.value)}
                            className="select-field max-w-[180px]"
                        >
                            <option value="">All Tables</option>
                            {tableNumbers.map(t => (
                                <option key={t} value={t}>Table {t}</option>
                            ))}
                        </select>
                        {(dateFilter || tableFilter) && (
                            <button
                                onClick={() => { setDateFilter(''); setTableFilter(''); }}
                                className="text-sm text-primary-400 hover:text-primary-300"
                            >
                                Clear filters
                            </button>
                        )}
                        <span className="text-dark-400 text-sm ml-auto">
                            {filteredOrders.length} orders
                        </span>
                    </div>

                    {/* Orders Table */}
                    <div className="glass-card overflow-hidden">
                        {filteredOrders.length === 0 ? (
                            <p className="text-dark-400 text-center py-12">No orders match the filters</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="table-header">
                                            <th className="px-4 py-3 text-left">Date/Time</th>
                                            <th className="px-4 py-3 text-left">Table</th>
                                            <th className="px-4 py-3 text-left">Items</th>
                                            <th className="px-4 py-3 text-left">Total</th>
                                            <th className="px-4 py-3 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dark-800">
                                        {filteredOrders.map(order => {
                                            const orderDate = order.createdAt?.toDate
                                                ? order.createdAt.toDate()
                                                : new Date(order.createdAt || 0);
                                            return (
                                                <tr key={order.id} className="hover:bg-dark-800/30 transition-colors">
                                                    <td className="px-4 py-3 text-dark-300 text-sm">
                                                        {orderDate.toLocaleString('en-IN', {
                                                            day: '2-digit', month: 'short',
                                                            hour: '2-digit', minute: '2-digit',
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-white font-medium">Table {order.tableNumber}</td>
                                                    <td className="px-4 py-3 text-dark-300">
                                                        {order.items?.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                                                    </td>
                                                    <td className="px-4 py-3 text-white">₹{order.totalAmount?.toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={statusBadge(order.status)}>{order.status}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
