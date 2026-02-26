// Main app layout with sidebar navigation and top bar
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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

// Preload map for route chunks — triggers import on hover so chunks are cached before click
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
    const { userData, userRole, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logoutUser();
            toast.success('Logged out successfully');
            navigate('/login');
        } catch (error) {
            toast.error('Error logging out');
        }
    };

    // Preload a route chunk on hover/focus
    const handlePreload = (path) => {
        const loader = preloadMap[path];
        if (loader) loader();
    };

    return (
        <div className="min-h-screen bg-dark-950 flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-dark-800 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo */}
                <div className="p-6 border-b border-dark-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                            <span className="text-xl">🍽️</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">RestaurantPro</h1>
                            <p className="text-xs text-dark-400">Management System</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.filter(item => item.roles.includes(userRole || 'admin')).map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            onMouseEnter={() => handlePreload(item.path)}
                            onFocus={() => handlePreload(item.path)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                                    : 'text-dark-300 hover:text-white hover:bg-dark-800'
                                }`
                            }
                        >
                            <item.icon size={20} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User info */}
                <div className="p-4 border-t border-dark-800">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <IoPersonCircleOutline size={36} className="text-dark-400" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {userData?.name || 'User'}
                            </p>
                            <p className="text-xs text-dark-400 capitalize">{userRole || 'Loading...'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="mt-2 w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-dark-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    >
                        <IoLogOutOutline size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top Bar */}
                <header className="bg-dark-900/80 backdrop-blur-xl border-b border-dark-800 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-dark-300 hover:text-white p-1"
                    >
                        <IoMenuOutline size={24} />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <span className="text-xs text-dark-400 hidden sm:block">
                            {new Date().toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </span>
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                            {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
