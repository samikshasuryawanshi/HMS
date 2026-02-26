// App.jsx - Main application with routing
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Loader from './components/Loader';

// Eager-loaded auth pages (critical path)
import Login from './pages/Login';

// Lazy-loaded protected pages (code-split into separate chunks)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tables = lazy(() => import('./pages/Tables'));
const Menu = lazy(() => import('./pages/Menu'));
const Orders = lazy(() => import('./pages/Orders'));
const Bookings = lazy(() => import('./pages/Bookings'));
const Bills = lazy(() => import('./pages/Bills'));
const Reports = lazy(() => import('./pages/Reports'));
const Staff = lazy(() => import('./pages/Staff'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const BusinessSetup = lazy(() => import('./pages/BusinessSetup'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/staff-login" element={<Navigate to="/login" replace />} />

            {/* Business Setup (admin only, no Layout wrapper) */}
            <Route
              path="/setup"
              element={
                <ProtectedRoute>
                  <BusinessSetup />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/kitchen"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Kitchen />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tables"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Tables />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/menu"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Menu />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Orders />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Bookings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bills"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Bills />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute requiredRole={['owner', 'manager', 'cashier']}>
                  <Layout>
                    <Staff />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          backgroundColor: '#1e1e1e',
          border: '1px solid rgba(79, 79, 79, 0.5)',
          borderRadius: '12px',
        }}
      />
    </AuthProvider>
  );
}

export default App;
