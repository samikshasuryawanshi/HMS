// Main app layout — fixed sleek sidebar, glassmorphic topnav, floating mobile bottom nav
import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../firebase/auth';
import { toast } from 'react-toastify';
import {
    IoGridOutline,
    IoRestaurantOutline,
    IoFastFoodOutline,
    IoCartOutline,
    IoCalendarOutline,
    IoReceiptOutline,
    IoBarChartOutline,
    IoPeopleOutline,
    IoFlameOutline,
    IoLogOutOutline,
    IoMenuOutline,
    IoCloseOutline,
} from 'react-icons/io5';

// roles: which roles can see each nav item
const navItems = [
    { path: '/', icon: IoGridOutline, label: 'Dashboard', roles: ['owner', 'manager', 'cashier', 'chef', 'staff'] },
    { path: '/kitchen', icon: IoFlameOutline, label: 'Kitchen', roles: ['chef'] },
    { path: '/tables', icon: IoRestaurantOutline, label: 'Tables', roles: ['manager', 'cashier', 'staff'] },
    { path: '/menu', icon: IoFastFoodOutline, label: 'Menu', roles: ['manager', 'cashier', 'chef', 'staff'] },
    { path: '/orders', icon: IoCartOutline, label: 'Orders', roles: ['manager', 'cashier', 'staff'] },
    { path: '/bookings', icon: IoCalendarOutline, label: 'Bookings', roles: ['manager', 'cashier', 'staff'] },
    { path: '/bills', icon: IoReceiptOutline, label: 'Bills', roles: ['manager', 'cashier', 'staff'] },
    { path: '/reports', icon: IoBarChartOutline, label: 'Reports', roles: ['manager', 'cashier'] },
    { path: '/staff', icon: IoPeopleOutline, label: 'Staff', roles: ['owner', 'manager', 'cashier'] },
];

// Preload map for route chunks
const preloadMap = {
    '/': () => import('../pages/Dashboard'),
    '/kitchen': () => import('../pages/Kitchen'),
    '/tables': () => import('../pages/Tables'),
    '/menu': () => import('../pages/Menu'),
    '/orders': () => import('../pages/Orders'),
    '/bookings': () => import('../pages/Bookings'),
    '/bills': () => import('../pages/Bills'),
    '/reports': () => import('../pages/Reports'),
    '/staff': () => import('../pages/Staff'),
};

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { userData, userRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Handle scroll for glossy topnav effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            await logoutUser();
            toast.success('Logged out successfully');
            navigate('/login');
        } catch (error) {
            toast.error('Error logging out');
        }
    };

    const handlePreload = (path) => {
        const loader = preloadMap[path];
        if (loader) loader();
    };

    const filteredNavItems = navItems.filter(item => item.roles.includes(userRole || 'manager'));

    // For mobile bottom nav, pick up to 5 most important items
    const mobileNavItems = filteredNavItems.slice(0, 5);

    const roleBadge = {
        owner: { label: 'Owner', color: 'text-purple-400 bg-purple-500/10 border border-purple-500/20' },
        manager: { label: 'Manager', color: 'text-blue-400 bg-blue-500/10 border border-blue-500/20' },
        cashier: { label: 'Cashier', color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' },
        chef: { label: 'Chef', color: 'text-orange-400 bg-orange-500/10 border border-orange-500/20' },
        staff: { label: 'Staff', color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' },
    };
    const badge = roleBadge[userRole] || { label: 'User', color: 'text-dark-400 bg-dark-800 border border-dark-700' };

    return (
        <div className="min-h-screen bg-custom-gradient selection:bg-primary-500/30">
            {/* ── Mobile overlay ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Desktop Sidebar — FIXED, always visible on lg+ ── */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[linear-gradient(to_right,rgba(17,17,17,1),rgba(22,22,22,1),rgba(17,17,17,1))] backdrop-blur-2xl border-r border-dark-700/50 flex flex-col transform transition-transform duration-500 ease-out
                    lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-[4px_0_24px_rgba(0,0,0,0.5)]`}
            >
                {/* Logo + close button */}
                <div className="h-20 px-6 shadow-lg  flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 w-full">
                        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30 overflow-hidden group">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                            <span className="text-xl relative z-10">🍽️</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-dark-200">
                                RestroPro
                            </h1>
                            <p className="text-[9px] font-bold text-primary-400 tracking-[0.2em] uppercase mt-0.5">
                                Management
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                    >
                        <IoCloseOutline size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
                    <p className="px-3 mb-2 text-[10px] font-semibold text-dark-500 uppercase tracking-wider">Main Menu</p>

                    {filteredNavItems.map((item) => {
                        const isActive = item.path === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.path);

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                onMouseEnter={() => handlePreload(item.path)}
                                onFocus={() => handlePreload(item.path)}
                                className={`group relative flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${isActive
                                        ? 'text-white bg-primary-500/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                                        : 'text-dark-300 hover:text-white hover:bg-dark-800/50 hover:translate-x-1'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-primary-400 to-primary-600 rounded-r-full shadow-[0_0_10px_rgba(234,85,69,0.5)]" />
                                )}

                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-300 ${isActive ? 'text-primary-400 bg-primary-500/20' : 'text-dark-400 group-hover:text-primary-300 group-hover:bg-dark-700'
                                    }`}>
                                    <item.icon size={18} className={isActive ? 'drop-shadow-[0_0_8px_rgba(234,85,69,0.4)]' : ''} />
                                </div>
                                <span className={isActive ? 'font-semibold tracking-wide' : 'tracking-wide'}>
                                    {item.label}
                                </span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* User info + logout */}
                <div className="p-4 border-t border-dark-800/50 mt-auto">
                    <div className="p-3 mb-3 rounded-2xl bg-dark-800/30 border border-dark-700/30 transition-all duration-300 hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-500/5 group group-hover">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                {userData?.photoURL ? (
                                    <img src={userData.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover ring-2 ring-dark-600 group-hover:ring-primary-500/50 transition-all duration-300" />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dark-700 to-dark-800 flex items-center justify-center text-lg font-bold text-white ring-2 ring-dark-600 group-hover:ring-primary-500/50 transition-all duration-300">
                                        {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-dark-900" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate w-full group-hover:text-primary-100 transition-colors">
                                    {userData?.name || 'User Name'}
                                </p>
                                <p className={`text-[10px] font-bold mt-0.5 w-max px-1.5 py-0.5 rounded-md uppercase tracking-wider ${badge.color}`}>
                                    {badge.label}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-dark-300 hover:text-white border border-transparent hover:border-red-500/30 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all duration-300"
                    >
                        <IoLogOutOutline size={18} className="text-dark-400 group-hover:text-red-400" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ── Main content area — offset by sidebar width on desktop ── */}
            <div className="lg:pl-[260px] flex flex-col min-h-screen relative">

                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-[260px] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none -z-10 hidden lg:block" />

                {/* Sticky Top Bar */}
                <header className={`sticky top-0 z-30 transition-all duration-300 ease-in-out ${scrolled
                        ? 'bg-dark-900/60 backdrop-blur-2xl shadow-xl'
                        : 'bg-transparent'
                    }`}>
                    <div className="flex items-center bg-[linear-gradient(to_right,rgba(17,17,17,1),rgba(22,22,22,1),rgba(17,17,17,1))] justify-between shadow-xl px-4 sm:px-6 lg:px-8 h-20 lg:h-24">
                        {/* Left: Mobile logo & menu toggle */}
                        <div className="flex items-center gap-4">
                            {/* Mobile menu button */}
                            {/* <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800/80 text-dark-300 hover:text-white border border-dark-700/50 active:scale-95 transition-all shadow-md"
                            >
                                <IoMenuOutline size={22} />
                            </button> */}

                            {/* Mobile brand (visible only on mobile) */}
                            <div className="lg:hidden flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-500/30">
                                    <span className="text-sm">🍽️</span>
                                </div>
                                <span className="text-lg font-bold text-white tracking-tight">RestroPro</span>
                            </div>

                            {/* Desktop greeting */}
                            <div className="hidden lg:flex flex-col">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    Welcome back, {userData?.name?.split(' ')[0] || 'User'} <span className="text-2xl inline-block origin-bottom-right hover:animate-wave cursor-default">👋</span>
                                </h2>
                                <p className="text-sm text-dark-400 mt-1">Here's what is happening at your restaurant today.</p>
                            </div>
                        </div>

                        {/* Right: Actions & User summary */}
                        <div className="flex items-center gap-3 sm:gap-5">
                            {/* Date Badge */}
                            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800/50 border border-dark-700/50 backdrop-blur-md shadow-sm">
                                <IoCalendarOutline size={16} className="text-primary-400" />
                                <span className="text-sm font-medium text-dark-200">
                                    {new Date().toLocaleDateString('en-IN', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </span>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-8 bg-dark-700/50 hidden sm:block" />

                            {/* Mini profile group */}
                            <div className="flex items-center gap-3 pl-1">
                                <span className={`hidden sm:flex text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest ${badge.color} shadow-sm`}>
                                    {badge.label}
                                </span>

                                <div className="relative group cursor-pointer">
                                    {userData?.photoURL ? (
                                        <img src={userData.photoURL} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-dark-700 group-hover:ring-primary-500 transition-all duration-300 shadow-md" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-dark-600 to-dark-800 flex items-center justify-center text-sm font-bold text-white ring-2 ring-dark-700 group-hover:ring-primary-500 transition-all duration-300 shadow-md">
                                            {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8 relative z-10 transition-all duration-300">
                    {/* Rendered route content */}
                    {children}
                </main>
            </div>

            {/* ── Mobile Bottom Nav — floating style, visible on small screens only ── */}
            <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 safe-bottom">
                <nav className="bg-dark-900/85 backdrop-blur-2xl border border-dark-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden px-2 py-2 flex items-center justify-around">
                    {mobileNavItems.map((item) => {
                        const isActive = item.path === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className="relative flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-xl transition-all duration-300"
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-primary-500/10 rounded-xl" />
                                )}
                                <item.icon
                                    size={isActive ? 22 : 20}
                                    className={`relative z-10 transition-all duration-300 ${isActive ? 'text-primary-400 drop-shadow-[0_0_8px_rgba(234,85,69,0.5)] -translate-y-0.5' : 'text-dark-400 hover:text-dark-200'
                                        }`}
                                />
                                <span className={`relative z-10 text-[9px] font-semibold tracking-wide transition-all duration-300 ${isActive ? 'text-primary-400 opacity-100' : 'text-dark-500 opacity-80'
                                    }`}>
                                    {item.label}
                                </span>
                            </NavLink>
                        );
                    })}
                    {/* More button */}
                    {filteredNavItems.length > 5 && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="relative flex flex-col items-center justify-center gap-1 w-14 h-12 rounded-xl transition-all duration-300 group"
                        >
                            <IoMenuOutline size={20} className="text-dark-400 group-active:scale-95 transition-transform" />
                            <span className="text-[9px] font-semibold tracking-wide text-dark-500">More</span>
                        </button>
                    )}
                </nav>
            </div>

            {/* Inject minimal keyframes for interactions */}
            <style>{`
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-10deg); }
                    50% { transform: rotate(10deg); }
                    75% { transform: rotate(-5deg); }
                }
                .animate-wave {
                    animation: wave 1.5s ease-in-out infinite;
                    transform-origin: 70% 70%;
                }
            `}</style>
        </div>
    );
};

export default Layout;
