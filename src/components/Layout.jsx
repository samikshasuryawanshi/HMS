// Main app layout — fixed sidebar, sticky topnav, mobile bottom nav
import { useState } from 'react';
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
    IoPersonCircleOutline,
} from 'react-icons/io5';

// roles: which roles can see each nav item
const navItems = [
    { path: '/', icon: IoGridOutline, label: 'Dashboard', roles: ['admin', 'manager', 'chef', 'staff'] },
    { path: '/kitchen', icon: IoFlameOutline, label: 'Kitchen', roles: ['chef'] },
    { path: '/tables', icon: IoRestaurantOutline, label: 'Tables', roles: ['admin', 'manager', 'staff'] },
    { path: '/menu', icon: IoFastFoodOutline, label: 'Menu', roles: ['admin', 'manager', 'chef', 'staff'] },
    { path: '/orders', icon: IoCartOutline, label: 'Orders', roles: ['admin', 'manager', 'staff'] },
    { path: '/bookings', icon: IoCalendarOutline, label: 'Bookings', roles: ['admin', 'manager', 'staff'] },
    { path: '/bills', icon: IoReceiptOutline, label: 'Bills', roles: ['admin', 'manager', 'staff'] },
    { path: '/reports', icon: IoBarChartOutline, label: 'Reports', roles: ['admin', 'manager'] },
    { path: '/staff', icon: IoPeopleOutline, label: 'Staff', roles: ['admin'] },
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
    const { userData, userRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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

    const filteredNavItems = navItems.filter(item => item.roles.includes(userRole || 'admin'));

    // For mobile bottom nav, pick up to 5 most important items
    const mobileNavItems = filteredNavItems.slice(0, 5);

    const roleBadge = {
        admin: { label: 'Admin', color: 'text-primary-400' },
        manager: { label: 'Manager', color: 'text-blue-400' },
        chef: { label: 'Chef', color: 'text-amber-400' },
        staff: { label: 'Waiter', color: 'text-emerald-400' },
    };
    const badge = roleBadge[userRole] || { label: 'User', color: 'text-dark-400' };

    return (
        <div className="min-h-screen bg-dark-950">
            {/* ── Mobile overlay ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Desktop Sidebar — FIXED, always visible on lg+ ── */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-dark-800 flex flex-col transform transition-transform duration-300 ease-out
                    lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Logo + close button */}
                <div className="p-5 border-b border-dark-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <span className="text-xl">🍽️</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white leading-none">RestaurantPro</h1>
                            <p className="text-[10px] text-dark-500 mt-0.5 tracking-wider uppercase">Management</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-dark-400 hover:text-white p-1"
                    >
                        <IoCloseOutline size={22} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            onClick={() => setSidebarOpen(false)}
                            onMouseEnter={() => handlePreload(item.path)}
                            onFocus={() => handlePreload(item.path)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-primary-600/20 text-primary-400 shadow-sm'
                                    : 'text-dark-300 hover:text-white hover:bg-dark-800'
                                }`
                            }
                        >
                            <item.icon size={19} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User info + logout */}
                <div className="p-3 border-t border-dark-800">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-dark-800/50">
                        {userData?.photoURL ? (
                            <img src={userData.photoURL} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-dark-700" />
                        ) : (
                            <IoPersonCircleOutline size={36} className="text-dark-400" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {userData?.name || 'User'}
                            </p>
                            <p className={`text-[11px] font-semibold ${badge.color}`}>{badge.label}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="mt-2 w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    >
                        <IoLogOutOutline size={19} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* ── Main content area — offset by sidebar width on desktop ── */}
            <div className="lg:ml-64 flex flex-col min-h-screen">
                {/* Sticky Top Bar */}
                <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-xl border-b border-dark-800">
                    <div className="flex items-center justify-between px-4 md:px-6 h-14">
                        {/* Left: hamburger (mobile) + page title */}
                        <div className="flex items-center gap-3">
                            

                            {/* Mobile logo (visible only when sidebar is hidden) */}
                            <div className="lg:hidden flex items-center gap-2">
                                <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                                    <span className="text-sm">🍽️</span>
                                </div>
                                <span className="text-sm font-bold text-white">RestaurantPro</span>
                            </div>
                        </div>

                        {/* Right: date + role badge + avatar */}
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-dark-400 hidden md:block">
                                {new Date().toLocaleDateString('en-IN', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </span>

                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-dark-800 ${badge.color} uppercase tracking-wider hidden sm:block`}>
                                {badge.label}
                            </span>

                            {userData?.photoURL ? (
                                <img src={userData.photoURL} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-dark-700" />
                            ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                                    {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
                    {children}
                </main>
            </div>

            {/* ── Mobile Bottom Nav — fixed at bottom, visible on small screens only ── */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-xl border-t border-dark-800 lg:hidden safe-bottom">
                <div className="flex items-center justify-around h-16 px-1">
                    {mobileNavItems.map((item) => {
                        const isActive = item.path === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
                            >
                                <item.icon
                                    size={20}
                                    className={`transition-colors ${isActive ? 'text-primary-400' : 'text-dark-500'}`}
                                />
                                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary-400' : 'text-dark-500'}`}>
                                    {item.label}
                                </span>
                            </NavLink>
                        );
                    })}
                    {/* More button — opens sidebar for remaining items */}
                    {filteredNavItems.length > 5 && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
                        >
                            <IoMenuOutline size={20} className="text-dark-500" />
                            <span className="text-[10px] font-medium text-dark-500">More</span>
                        </button>
                    )}
                </div>
            </nav>
        </div>
    );
};

export default Layout;
