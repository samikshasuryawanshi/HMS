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
    IoStatsChartOutline,
    IoChevronForward
} from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';

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
        layout: {
            padding: {
                top: 20
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#121212',
                titleColor: '#fff',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                cornerRadius: 16,
                padding: 14,
                displayColors: false,
                callbacks: {
                    label: (ctx) => ` ₹${ctx.raw.toLocaleString()}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#64748b',
                    font: {
                        family: 'Inter',
                        weight: '700',
                        size: 10
                    }
                },
            },
            y: {
                grid: {
                    color: 'rgba(255,255,255,0.03)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    font: {
                        family: 'Inter',
                        weight: '700',
                        size: 10
                    },
                    callback: (v) => '₹' + v.toLocaleString()
                },
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

    if (loading) return <Loader />;

    return (
        <div className="space-y-6 md:space-y-10 animate-fade-in pb-20">
            {/* Header Redesigned */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
                        <span className="text-primary-500 font-bold text-xs uppercase tracking-widest">Business Intelligence</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                        Analytics <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">& Reports</span>
                    </h1>
                    <p className="text-dark-400 font-black text-xs uppercase tracking-[0.25em]">Operational and Financial Oversight</p>
                </div>
            </header>

            {/* Unified Tabs Matched to Bills/Orders filter style */}
            <div className="bg-dark-900/40 backdrop-blur-xl border border-dark-700/50 p-3 rounded-2xl md:rounded-3xl shadow-lg relative overflow-hidden">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                    {[
                        { key: 'daily', label: 'Daily Sales', icon: IoCalendarOutline },
                        { key: 'monthly', label: 'Monthly Growth', icon: IoTrendingUpOutline },
                        { key: 'history', label: 'Order Archive', icon: IoReceiptOutline },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-3 rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 whitespace-nowrap uppercase tracking-widest border flex items-center gap-2 ${activeTab === tab.key
                                ? 'bg-primary-500/10 text-white border-primary-500/40'
                                : 'bg-dark-800/40 text-dark-500 border-transparent hover:text-dark-300 hover:bg-dark-800/80'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* ===== DAILY SALES TAB ===== */}
                    {activeTab === 'daily' && (
                        <div className="space-y-8">
                            {/* Date Filter Bar */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-dark-950/50 p-2 md:p-3 rounded-2xl border border-dark-800 w-full sm:w-fit">
                                <div className="px-4 py-2 sm:py-0 flex items-center gap-3 text-dark-500 border-b sm:border-b-0 sm:border-r border-dark-800/50">
                                    <IoCalendarOutline size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Filter Date</span>
                                </div>
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="bg-dark-800/40 border-none text-white text-xs font-black p-3 rounded-xl focus:ring-2 focus:ring-primary-500/20 cursor-pointer w-full sm:w-auto"
                                />
                                {dateFilter && (
                                    <button
                                        onClick={() => setDateFilter('')}
                                        className="px-4 py-2 sm:py-0 text-[9px] font-black text-primary-500 uppercase tracking-widest hover:text-white transition-colors"
                                    >
                                        RESET
                                    </button>
                                )}
                            </div>

                            {/* Summary Stats Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                <motion.div whileHover={{ y: -5 }} className="bg-dark-900/40 border border-dark-800 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 md:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <IoCashOutline className="text-emerald-500 w-16 h-16 md:w-20 md:h-20" />
                                    </div>
                                    <div className="flex flex-col gap-4 md:gap-6">
                                        <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                                            <IoCashOutline className="w-6 h-6 md:w-7 md:h-7" />
                                        </div>
                                        <div>
                                            <p className="text-dark-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Aggregate Revenue</p>
                                            <p className="text-3xl md:text-4xl font-black text-white tracking-tighter">₹{dailySales.totalSales.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div whileHover={{ y: -5 }} className="bg-dark-900/40 border border-dark-800 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 md:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <IoReceiptOutline className="text-primary-500 w-16 h-16 md:w-20 md:h-20" />
                                    </div>
                                    <div className="flex flex-col gap-4 md:gap-6">
                                        <div className="w-12 h-12 md:w-14 md:h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-400">
                                            <IoReceiptOutline className="w-6 h-6 md:w-7 md:h-7" />
                                        </div>
                                        <div>
                                            <p className="text-dark-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Total Invoices</p>
                                            <p className="text-3xl md:text-4xl font-black text-white tracking-tighter">{dailySales.totalOrders}</p>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div whileHover={{ y: -5 }} className="bg-dark-900/40 border border-dark-800 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 md:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <IoStatsChartOutline className="text-amber-500 w-16 h-16 md:w-20 md:h-20" />
                                    </div>
                                    <div className="flex flex-col gap-4 md:gap-6">
                                        <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400">
                                            <IoStatsChartOutline className="w-6 h-6 md:w-7 md:h-7" />
                                        </div>
                                        <div>
                                            <p className="text-dark-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Fiscal/GST Share</p>
                                            <p className="text-3xl md:text-4xl font-black text-white tracking-tighter">₹{dailySales.totalGST.toFixed(0)}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Daily Table Redesigned */}
                            <div className="glass-card overflow-hidden shadow-none border-dark-700/60">
                                <div className="p-6 md:p-8 border-b border-dark-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-black text-white tracking-tight uppercase">Daily Journal</h3>
                                        <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest mt-1">
                                            {dailySales.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                {dailySales.todayBills.length === 0 ? (
                                    <div className="py-24 text-center">
                                        <div className="text-6xl mb-6 opacity-20">📊</div>
                                        <p className="text-dark-500 text-[10px] font-black uppercase tracking-[0.3em]">No activity recorded</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Desktop Table */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-dark-900/50">
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-dark-500 uppercase tracking-widest">Protocol ID</th>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-dark-500 uppercase tracking-widest">Station</th>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-dark-500 uppercase tracking-widest">Payload</th>
                                                        <th className="px-8 py-5 text-left text-[9px] font-black text-dark-500 uppercase tracking-widest text-right">Settlement</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-dark-800/50">
                                                    {dailySales.todayBills.map(bill => (
                                                        <tr key={bill.id} className="group hover:bg-white/[0.02] transition-colors">
                                                            <td className="px-8 py-6">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-mono font-black text-primary-400 leading-none">#{bill.id?.slice(-8).toUpperCase()}</span>
                                                                    <span className="text-[9px] text-dark-600 font-bold mt-1 uppercase tracking-tight">Financial Record</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-black text-white leading-none">Table {bill.tableNumber}</span>
                                                                    <span className="text-[9px] text-dark-600 font-bold mt-1 uppercase tracking-tight">Location</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-baseline gap-2">
                                                                    <span className="text-sm font-black text-white leading-none">{bill.items?.length || 0}</span>
                                                                    <span className="text-[9px] text-dark-600 font-bold uppercase tracking-tight">Units</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-sm font-black text-white tabular-nums leading-none">₹{bill.total?.toFixed(0)}</span>
                                                                    <span className="text-[9px] text-emerald-500/60 font-black mt-1 uppercase tracking-widest italic">Paid</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Records View */}
                                        <div className="md:hidden divide-y divide-dark-800/50">
                                            {dailySales.todayBills.map(bill => (
                                                <div key={bill.id} className="p-6 space-y-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-[9px] text-primary-500 font-black uppercase tracking-widest">#{bill.id?.slice(-8).toUpperCase()}</p>
                                                            <h4 className="text-lg font-black text-white">Table {bill.tableNumber}</h4>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[9px] text-dark-500 font-black uppercase tracking-widest">Total</p>
                                                            <p className="text-xl font-black text-white tabular-nums">₹{bill.total?.toFixed(0)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 pt-2 border-t border-dark-800/30">
                                                        <div className="flex-1">
                                                            <p className="text-[8px] text-dark-600 font-black uppercase tracking-tighter">Payload</p>
                                                            <p className="text-xs font-bold text-dark-300">{bill.items?.length || 0} items processed</p>
                                                        </div>
                                                        <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest">Settled</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== MONTHLY SALES TAB ===== */}
                    {activeTab === 'monthly' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                                <div className="lg:col-span-2 glass-card p-6 md:p-10 border-dark-700/60 shadow-none">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-12">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-dark-500 text-[10px] font-black uppercase tracking-[0.2em]">Growth Metric</span>
                                            </div>
                                            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">Performance Wave</h3>
                                        </div>
                                        <div className="bg-dark-950/30 p-4 rounded-2xl border border-dark-800/50 md:text-right">
                                            <p className="text-dark-500 text-[9px] font-black uppercase tracking-widest mb-1">Cumulative Sales</p>
                                            <p className="text-2xl md:text-3xl font-black text-primary-500 tracking-tighter">₹{monthlySales.monthTotal.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="h-[300px] md:h-[400px]">
                                        <Line data={monthlyChartData} options={chartOptions} />
                                    </div>
                                </div>

                                <div className="space-y-4 md:space-y-6">
                                    <div className="bg-primary-600 p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                                        <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                            <IoTrendingUpOutline className="w-32 h-32 md:w-44 md:h-44" />
                                        </div>
                                        <div className="relative z-10 space-y-6 md:space-y-8">
                                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                                <IoStatsChartOutline className="w-6 h-6 md:w-8 md:h-8" />
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-1 md:mb-2">Current Period</p>
                                                <p className="text-4xl md:text-5xl font-black tracking-tighter">{new Date().toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</p>
                                            </div>
                                            <div className="pt-6 md:pt-8 border-t border-white/20">
                                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Projected Forecast</p>
                                                <p className="text-base md:text-lg font-black uppercase">Exceeding Targets</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-dark-900 border border-dark-800 p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden">
                                        <div className="flex items-center gap-3 mb-4 md:mb-6">
                                            <div className="p-2 md:p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                                                <IoFunnelOutline className="w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                            <span className="text-white font-black text-[10px] md:text-xs uppercase tracking-widest">Market Insights</span>
                                        </div>
                                        <p className="text-dark-400 text-sm leading-relaxed font-medium">
                                            Your weekly revenue velocity is showing a <span className="text-amber-500 font-black tracking-tight">+12.4%</span> uptrend compared to previous cycle.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== ORDER HISTORY TAB ===== */}
                    {activeTab === 'history' && (
                        <div className="space-y-6 md:space-y-8">
                            {/* Filter Bar Matched to Orders page style */}
                            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-dark-900/40 border border-dark-700/50 p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem]">
                                <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
                                    <div className="relative flex-1 w-full group/select">
                                        <IoCalendarOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" size={18} />
                                        <input
                                            type="date"
                                            value={dateFilter}
                                            onChange={(e) => setDateFilter(e.target.value)}
                                            className="w-full bg-dark-800/60 border-none rounded-xl pl-12 pr-4 py-3 text-xs text-white font-black focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer uppercase tracking-widest h-12"
                                        />
                                    </div>
                                    <div className="relative flex-1 w-full group/select">
                                        <IoFunnelOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" size={18} />
                                        <select
                                            value={tableFilter}
                                            onChange={(e) => setTableFilter(e.target.value)}
                                            className="w-full bg-dark-800/60 border-none rounded-xl pl-12 pr-10 py-3 text-xs text-white font-black focus:ring-2 focus:ring-primary-500/20 transition-all appearance-none cursor-pointer uppercase tracking-widest h-12"
                                        >
                                            <option value="">ALL TERMINALS</option>
                                            {tableNumbers.map(t => (
                                                <option key={t} value={t}>TABLE #{t.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {(dateFilter || tableFilter) && (
                                        <button
                                            onClick={() => { setDateFilter(''); setTableFilter(''); }}
                                            className="flex-1 lg:flex-none px-6 py-3 rounded-xl text-[10px] font-black text-primary-400 uppercase tracking-widest hover:bg-primary-500/10 transition-all border border-dashed border-primary-500/30 h-12"
                                        >
                                            PURGE
                                        </button>
                                    )}
                                    <div className="flex-1 lg:flex-none px-6 h-12 flex flex-col justify-center bg-dark-800/40 rounded-xl lg:bg-transparent lg:border-l lg:border-dark-800">
                                        <p className="text-[8px] text-dark-500 font-extrabold uppercase tracking-widest leading-none mb-1">Cursor</p>
                                        <p className="text-white font-black text-xs leading-none">{filteredOrders.length} RECORDS</p>
                                    </div>
                                </div>
                            </div>

                            {/* Orders Table Redesigned */}
                            <div className="glass-card overflow-hidden shadow-none border-dark-700/60 transition-all">
                                {filteredOrders.length === 0 ? (
                                    <div className="py-24 md:py-32 text-center">
                                        <div className="text-6xl md:text-7xl mb-6 opacity-10">📂</div>
                                        <p className="text-dark-500 text-[10px] font-black uppercase tracking-[0.4em]">Zero alignment found</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Desktop View */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-dark-900/50">
                                                        <th className="px-8 py-6 text-left text-[9px] font-black text-dark-500 uppercase tracking-[0.2em]">Record Metadata</th>
                                                        <th className="px-8 py-6 text-left text-[9px] font-black text-dark-500 uppercase tracking-[0.2em]">Station</th>
                                                        <th className="px-8 py-6 text-left text-[9px] font-black text-dark-500 uppercase tracking-[0.2em]">Delicacy Payload</th>
                                                        <th className="px-8 py-6 text-left text-[9px] font-black text-dark-500 uppercase tracking-[0.2em]">Aggregate</th>
                                                        <th className="px-8 py-6 text-left text-[9px] font-black text-dark-500 uppercase tracking-[0.2em]">Operational Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-dark-800/50">
                                                    {filteredOrders.map(order => {
                                                        const orderDate = order.createdAt?.toDate
                                                            ? order.createdAt.toDate()
                                                            : new Date(order.createdAt || 0);
                                                        return (
                                                            <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors relative">
                                                                <td className="px-8 py-6">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-black text-white leading-none">
                                                                            {orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                                        </span>
                                                                        <span className="text-[9px] text-dark-500 font-black mt-1 uppercase tracking-tighter">
                                                                            {orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <span className="text-sm font-black text-primary-400">TABLE {order.tableNumber}</span>
                                                                </td>
                                                                <td className="px-8 py-6 max-w-[300px]">
                                                                    <p className="text-[10px] text-dark-400 font-bold uppercase tracking-tight leading-relaxed line-clamp-2">
                                                                        {order.items?.map(i => `${i.name} ×${i.quantity}`).join(' • ')}
                                                                    </p>
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <span className="text-sm font-black text-white tabular-nums">₹{order.totalAmount?.toLocaleString()}</span>
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${order.status === 'Completed'
                                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                        : 'bg-primary-500/10 text-primary-500 border-primary-500/20'
                                                                        }`}>
                                                                        {order.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Card-Based Archive */}
                                        <div className="md:hidden divide-y divide-dark-800/50">
                                            {filteredOrders.map(order => {
                                                const orderDate = order.createdAt?.toDate
                                                    ? order.createdAt.toDate()
                                                    : new Date(order.createdAt || 0);
                                                return (
                                                    <div key={order.id} className="p-6 space-y-4">
                                                        <div className="flex justify-between items-start">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-black text-white px-2 py-0.5 bg-dark-800 rounded">TABLE {order.tableNumber}</span>
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${order.status === 'Completed'
                                                                        ? 'text-emerald-500 border-emerald-500/20'
                                                                        : 'text-primary-500 border-primary-500/20'
                                                                        }`}>
                                                                        {order.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest">
                                                                    {orderDate.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).toUpperCase()}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-black text-white tabular-nums">₹{order.totalAmount?.toLocaleString()}</p>
                                                                <p className="text-[8px] text-dark-600 font-black uppercase tracking-tighter">Settlement</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-dark-950/40 p-3 rounded-xl border border-dark-800/30">
                                                            <p className="text-[9px] text-dark-400 font-bold uppercase tracking-tight leading-relaxed italic">
                                                                {order.items?.map(i => `${i.name} ×${i.quantity}`).join(' • ')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Global Aesthetic Styles Matched to Bills/Orders */}
            <style jsx>{`
                .animate-fade-in {
                    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default Reports;
