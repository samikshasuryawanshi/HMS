// Dashboard — Routes to the correct dashboard based on user role
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { lazy, Suspense } from 'react';

const AdminDashboard = lazy(() => import('./AdminDashboard'));
const ManagerDashboard = lazy(() => import('./ManagerDashboard'));
const WaiterDashboard = lazy(() => import('./WaiterDashboard'));
const Kitchen = lazy(() => import('./Kitchen'));

const Dashboard = () => {
    const { userRole, loading } = useAuth();

    if (loading) return <Loader />;

    return (
        <Suspense fallback={<Loader />}>
            {userRole === 'admin' && <AdminDashboard />}
            {userRole === 'manager' && <ManagerDashboard />}
            {userRole === 'chef' && <Kitchen />}
            {userRole === 'staff' && <WaiterDashboard />}
            {!userRole && <AdminDashboard />}
        </Suspense>
    );
};

export default Dashboard;
