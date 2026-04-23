import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    Menu,
    ArrowRightLeft,
    Shuffle,
    Truck,
    UserCog,
    Monitor,
    FileText,
    Warehouse,
    Boxes,
    CalendarClock,
    RotateCcw,
    Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
    { to: '/inventory', icon: Package, label: 'Inventaire', adminOnly: false },
    { to: '/warehouses', icon: Warehouse, label: 'Entrepôts', adminOnly: false },
    { to: '/movements', icon: ArrowRightLeft, label: 'Mouvements de stock', adminOnly: false },
    { to: '/transfers', icon: Shuffle, label: 'Transferts', adminOnly: false },
    { to: '/lots', icon: CalendarClock, label: 'Lots & Péremption', adminOnly: false },
    { to: '/suppliers', icon: Truck, label: 'Fournisseurs', adminOnly: false },
    { to: '/supplier-returns', icon: RotateCcw, label: 'Retours fournisseurs', adminOnly: false },
    { to: '/orders', icon: ShoppingCart, label: 'Commandes', adminOnly: false },
    { to: '/pos', icon: Monitor, label: 'Terminal Caisse', adminOnly: false },
    { to: '/sales', icon: FileText, label: 'Historique Ventes', adminOnly: false },
    { to: '/clients', icon: Users, label: 'Clients & Fidélité', adminOnly: false },
    { to: '/reports', icon: BarChart3, label: 'Rapports', adminOnly: false },
    { to: '/users', icon: UserCog, label: 'Utilisateurs', adminOnly: true },
    { to: '/settings', icon: Settings, label: 'Paramètres', adminOnly: false },
]

export default function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (c: boolean) => void }) {
    const { logout, tenant } = useAuth()
    const { user } = useAuthStore()
    const isAdmin = user?.role === 'admin'

    return (
        <aside
            className={`fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'
                }`}
        >
            {/* Logo */}
            <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
                {!collapsed && (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <Boxes size={22} className="text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            GesStock
                        </span>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                    {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Tenant info */}
            {!collapsed && tenant && (
                <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-xs text-gray-400">Espace de travail</p>
                    <p className="text-sm font-medium truncate">{tenant.name}</p>
                    <span className="badge bg-primary-500/20 text-primary-300 text-[10px] mt-1">
                        {tenant.plan}
                    </span>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.filter(({ adminOnly }) => !adminOnly || isAdmin).map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            } ${collapsed ? 'justify-center' : ''}`
                        }
                    >
                        <Icon size={20} />
                        {!collapsed && <span>{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className="px-3 pb-4">
                <button
                    onClick={logout}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ${collapsed ? 'justify-center' : ''
                        }`}
                >
                    <LogOut size={20} />
                    {!collapsed && <span>Déconnexion</span>}
                </button>
            </div>
        </aside>
    )
}
