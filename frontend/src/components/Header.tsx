import { useState, useEffect, useRef } from 'react'
import { Bell, PackageOpen, Check, Star, Crown, Zap } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import { useStockAlerts } from '../hooks/useAlerts'

const TENANT_PLANS = {
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const { tenant } = useAuth()
  const { data: alerts = [] } = useStockAlerts()
  const plan = tenant?.plan || TENANT_PLANS.STARTER
  const [showNotifications, setShowNotifications] = useState(false)
  const lastAlertCount = useRef(0)
  const [hasUnread, setHasUnread] = useState(false)

  // Update unread status when alerts increase
  useEffect(() => {
    if (alerts.length > lastAlertCount.current) {
      setHasUnread(true)
    }
    lastAlertCount.current = alerts.length
  }, [alerts.length])

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Title / Spacer */}
      <div className="flex-1 max-w-lg">{/* Espace vide… */}</div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              if (!showNotifications) setHasUnread(false)
            }}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
          >
            <Bell size={20} className="text-gray-600" />
            {hasUnread && alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2.5 bg-red-500 rounded-full border-2 border-white box-content animate-pulse"></span>
            )}
            {!hasUnread && alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {alerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Notifications ({alerts.length})
                  </h3>
                  {alerts.length > 0 && (
                    <button
                      onClick={() => setHasUnread(false)}
                      className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1"
                    >
                      <Check size={12} /> Tout marquer lu
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                      >
                        <div className="flex gap-3">
                          <div className="size-8 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                            <PackageOpen size={16} className="text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-0.5">
                              Stock bas : {alert.name}
                            </p>
                            <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                              Le stock est de{' '}
                              <span className="font-bold text-red-600">
                                {alert.currentStock} {alert.unit}
                              </span>
                              . Seuil d'alerte : {alert.minStock}.
                            </p>
                            <Link
                              to="/inventory"
                              onClick={() => setShowNotifications(false)}
                              className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 uppercase tracking-wide"
                            >
                              Gérer l'inventaire →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <Bell size={32} className="mx-auto text-gray-200 mb-2" />
                      <p className="text-xs text-gray-400">Aucune nouvelle notification.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
          <div className="size-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center relative">
            <span className="text-white text-sm font-bold uppercase transition-transform hover:scale-110">
              {user?.firstName?.charAt(0)}
              {user?.lastName?.charAt(0)}
            </span>
            <div className="absolute -top-1 -right-1">
              {plan === TENANT_PLANS.ENTERPRISE ? (
                <div className="bg-amber-100 p-0.5 rounded-full border border-amber-300 shadow-sm animate-bounce">
                  <Crown size={10} className="text-amber-600" />
                </div>
              ) : plan === TENANT_PLANS.PRO ? (
                <div className="bg-primary-100 p-0.5 rounded-full border border-primary-300 shadow-sm">
                  <Star size={10} className="text-primary-600" fill="currentColor" />
                </div>
              ) : (
                <div className="bg-gray-100 p-0.5 rounded-full border border-gray-300 shadow-sm">
                  <Zap size={10} className="text-gray-400" />
                </div>
              )}
            </div>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 leading-none mb-1">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
