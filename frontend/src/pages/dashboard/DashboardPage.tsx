import { AlertTriangle, Package, ShoppingCart, Activity } from 'lucide-react'
import { useDashboardStats } from '../../hooks/useReports'
import { useStockMovements } from '../../hooks/useStockMovements'
import { Link } from 'react-router-dom'

const formatCFA = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)

export default function DashboardPage() {
  const { data: statsResponse, isLoading } = useDashboardStats()
  const { data: movementsData } = useStockMovements(1, 5)

  const stats = statsResponse

  const kpiCards = stats
    ? [
        {
          label: 'Produits actifs',
          value: stats.totalProducts,
          sub: `${stats.lowStockCount} en alerte`,
          icon: Package,
          color: 'bg-blue-500',
          alert: stats.lowStockCount > 0,
        },
        {
          label: 'Valeur du stock',
          value: formatCFA(stats.totalStockValue),
          sub: 'Valeur totale estimée',
          icon: Activity,
          color: 'bg-emerald-500',
          alert: false,
        },
        {
          label: 'Mouvements (7j)',
          value: stats.totalMovementsWeek,
          sub: `${stats.totalMovementsToday} aujourd'hui`,
          icon: Activity,
          color: 'bg-purple-500',
          alert: false,
        },
        {
          label: 'Commandes en attente',
          value: stats.purchaseOrdersPending,
          sub: 'Bons de commande',
          icon: ShoppingCart,
          color: 'bg-amber-500',
          alert: false,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Vue d'ensemble de votre gestion de stock</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))
          : kpiCards.map((card) => (
              <div
                key={card.label}
                className={`card p-6 hover:shadow-md transition-shadow duration-200 ${card.alert ? 'border-l-4 border-amber-400' : ''}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                    <card.icon size={20} className="text-white" />
                  </div>
                  {card.alert && (
                    <AlertTriangle size={16} className="text-amber-500" />
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 truncate">{card.value}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{card.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mouvements récents */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Mouvements récents</h3>
            <Link to="/movements" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Voir tout →
            </Link>
          </div>
          {movementsData?.movements.length === 0 || !movementsData ? (
            <div className="flex items-center justify-center h-40 text-gray-400">
              <div className="text-center">
                <Package size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun mouvement pour le moment</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {movementsData.movements.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      mov.type === 'IN' ? 'bg-emerald-500' :
                      mov.type === 'OUT' ? 'bg-rose-500' : 'bg-amber-500'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{mov.product.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(mov.createdAt).toLocaleDateString('fr-FR')} · {mov.product.sku}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ml-2 ${
                    mov.type === 'IN' || mov.type === 'ADJUSTMENT' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {mov.type === 'OUT' ? '-' : '+'}{mov.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertes de stock */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Alertes de stock</h3>
            <Link to="/inventory" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Gérer →
            </Link>
          </div>
          {!stats || stats.lowStockCount === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400">
              <div className="text-center">
                <AlertTriangle size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune alerte de stock</p>
                <p className="text-xs text-gray-300 mt-1">Tous les stocks sont au-dessus du seuil</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 mb-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 font-medium">
                  {stats.lowStockCount} produit{stats.lowStockCount > 1 ? 's sont' : ' est'} sous le seuil minimum
                </p>
              </div>
              {stats.topProducts
                .filter((p: any) => p.currentStock <= (p.minStock ?? 0))
                .slice(0, 4)
                .map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5">
                    <p className="text-sm text-gray-700 truncate">{p.name}</p>
                    <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full ml-2 shrink-0">
                      Stock: {p.currentStock}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
