import { useState } from 'react'
import { Package, AlertTriangle, Clock, CheckCircle, Search } from 'lucide-react'
import { useLots, type ExpiryStatus } from '../../hooks/useLots'
import { useProducts } from '../../hooks/useProducts'
import { formatDate } from '../../lib/format'

const statusConfig: Record<ExpiryStatus, { label: string; color: string; icon: React.ReactNode }> =
  {
    expired: {
      label: 'Périmé',
      color: 'bg-red-100 text-red-800',
      icon: <AlertTriangle size={12} />,
    },
    critical: {
      label: '≤ 7 jours',
      color: 'bg-orange-100 text-orange-800',
      icon: <AlertTriangle size={12} />,
    },
    warning: {
      label: '≤ 30 jours',
      color: 'bg-amber-100 text-amber-800',
      icon: <Clock size={12} />,
    },
    ok: {
      label: 'OK',
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle size={12} />,
    },
  }

function ExpiryBadge({ status }: { status: ExpiryStatus | null }) {
  if (!status) return <span className="text-zinc-400 text-xs">-</span>
  const cfg = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

export default function LotsPage() {
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: products } = useProducts()
  const { data: lots = [], isLoading } = useLots(selectedProductId || undefined)

  const filtered = lots.filter((lot) => {
    const matchSearch =
      !search ||
      lot.productName.toLowerCase().includes(search.toLowerCase()) ||
      lot.productSku.toLowerCase().includes(search.toLowerCase()) ||
      (lot.batchNumber ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || lot.expiryStatus === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    expired: lots.filter((l) => l.expiryStatus === 'expired').length,
    critical: lots.filter((l) => l.expiryStatus === 'critical').length,
    warning: lots.filter((l) => l.expiryStatus === 'warning').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Lots & Péremption</h1>
          <p className="text-sm text-zinc-500 mt-1">Suivi des lots avec dates d'expiration</p>
        </div>
      </div>

      {/* KPI banners */}
      {(counts.expired > 0 || counts.critical > 0) && (
        <div className="flex flex-wrap gap-3">
          {counts.expired > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {counts.expired} lot{counts.expired > 1 ? 's' : ''} périmé
                {counts.expired > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {counts.critical > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
              <Clock size={16} className="text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                {counts.critical} lot{counts.critical > 1 ? 's' : ''} expirent dans 7 jours
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Rechercher produit ou lot…"
            className="input pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
        >
          <option value="">Tous les produits</option>
          {products?.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} – {p.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tous les statuts</option>
          <option value="expired">Périmés</option>
          <option value="critical">Critique (≤ 7j)</option>
          <option value="warning">Attention (≤ 30j)</option>
          <option value="ok">OK</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={48} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500">Aucun lot trouvé.</p>
            <p className="text-sm text-zinc-400 mt-1">
              Les lots apparaissent lors d'entrées de stock avec un numéro de lot ou une date de
              péremption.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Produit</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">N° Lot</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Entrepôt</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-600">Qté reçue</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Reçu le</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Péremption</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Jours restants</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((lot) => (
                  <tr
                    key={lot.id}
                    className={
                      lot.expiryStatus === 'expired'
                        ? 'bg-red-50'
                        : lot.expiryStatus === 'critical'
                          ? 'bg-orange-50'
                          : ''
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{lot.productName}</div>
                      <div className="text-zinc-400 text-xs">{lot.productSku}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-700">
                      {lot.batchNumber ?? <span className="text-zinc-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{lot.warehouseName ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {lot.quantity} {lot.productUnit ?? ''}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(lot.receivedAt)}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(lot.expiryDate)}</td>
                    <td className="px-4 py-3">
                      {lot.daysRemaining !== null ? (
                        <span
                          className={
                            lot.daysRemaining < 0
                              ? 'text-red-600 font-semibold'
                              : lot.daysRemaining <= 7
                                ? 'text-orange-600 font-semibold'
                                : 'text-zinc-700'
                          }
                        >
                          {lot.daysRemaining < 0
                            ? `${Math.abs(lot.daysRemaining)}j dépassés`
                            : `${lot.daysRemaining}j`}
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ExpiryBadge status={lot.expiryStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
