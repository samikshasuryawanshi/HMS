// Protected Route component with business setup redirect
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { currentUser, userRole, loading, needsSetup } = useAuth();

    if (loading) {
        return <Loader />;
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // Admin needs to set up business first
    if (needsSetup && window.location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    // Check role if required
    if (requiredRole) {
        if (Array.isArray(requiredRole)) {
            if (!requiredRole.includes(userRole)) {
                return (
                    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                        <div className="glass-card p-8 text-center max-w-md">
                            <div className="text-6xl mb-4">🚫</div>
                            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                            <p className="text-dark-400">You don't have permission to access this page.</p>
                        </div>
                    </div>
                );
            }
        } else if (userRole !== requiredRole) {
            return (
                <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                    <div className="glass-card p-8 text-center max-w-md">
                        <div className="text-6xl mb-4">🚫</div>
                        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                        <p className="text-dark-400">You don't have permission to access this page.</p>
                    </div>
                </div>
            );
        }
    }

    return children;
};

export default ProtectedRoute;
