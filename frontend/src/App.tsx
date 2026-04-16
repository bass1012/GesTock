import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProductsPage from './pages/inventory/ProductsPage'
import StockMovementsPage from './pages/inventory/StockMovementsPage'
import OrdersPage from './pages/orders/OrdersPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import ReportsPage from './pages/reports/ReportsPage'
import SettingsPage from './pages/settings/SettingsPage'
import UsersPage from './pages/users/UsersPage'
import POSPage from './pages/sales/POSPage'
import SalesPage from './pages/sales/SalesPage'
import WarehousesPage from './pages/inventory/WarehousesPage'
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'

export default function App() {
    return (
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
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/pos" element={<POSPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    )
}
