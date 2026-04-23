import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import InactivityLogoutHandler from './components/InactivityLogoutHandler'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const ProductsPage = lazy(() => import('./pages/inventory/ProductsPage'))
const StockMovementsPage = lazy(() => import('./pages/inventory/StockMovementsPage'))
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage'))
const SuppliersPage = lazy(() => import('./pages/suppliers/SuppliersPage'))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const UsersPage = lazy(() => import('./pages/users/UsersPage'))
const POSPage = lazy(() => import('./pages/sales/POSPage'))
const SalesPage = lazy(() => import('./pages/sales/SalesPage'))
const WarehousesPage = lazy(() => import('./pages/inventory/WarehousesPage'))
const TransfersPage = lazy(() => import('./pages/inventory/TransfersPage'))
const LotsPage = lazy(() => import('./pages/inventory/LotsPage'))
const SupplierReturnsPage = lazy(() => import('./pages/suppliers/SupplierReturnsPage'))
const SuperAdminLogin = lazy(() => import('./pages/superadmin/SuperAdminLogin'))
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'))

function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center text-slate-500">
            Chargement...
        </div>
    )
}

export default function App() {
    return (
        <>
            <InactivityLogoutHandler />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Auth routes (public) */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/change-password" element={<ChangePasswordPage />} />

                    {/* Super Admin Routes */}
                    <Route path="/superadmin" element={<SuperAdminLogin />} />
                    <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />

                    {/* Protected routes */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/inventory" element={<ProductsPage />} />
                        <Route path="/warehouses" element={<WarehousesPage />} />
                        <Route path="/movements" element={<StockMovementsPage />} />
                        <Route path="/transfers" element={<TransfersPage />} />
                        <Route path="/lots" element={<LotsPage />} />
                        <Route path="/supplier-returns" element={<SupplierReturnsPage />} />
                        <Route path="/suppliers" element={<SuppliersPage />} />
                        <Route path="/orders" element={<OrdersPage />} />
                        <Route path="/sales" element={<SalesPage />} />
                        <Route path="/pos" element={<POSPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                </Routes>
            </Suspense>
        </>
    )
}
