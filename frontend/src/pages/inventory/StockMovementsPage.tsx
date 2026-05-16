import { useState } from 'react'
import { Plus, ArrowDownRight, ArrowUpRight, ShieldAlert, ArrowRightLeft } from 'lucide-react'
import { useStockMovements } from '../../hooks/useStockMovements'
import NewMovementModal from './NewMovementModal'
import { formatDateTime } from '../../lib/format'

export default function StockMovementsPage() {
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data, isLoading } = useStockMovements(page, 20)

  const formatType = (type: string) => {
    switch (type) {
      case 'IN':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-medium">
            <ArrowDownRight size={14} /> Entrée
          </span>
        )
      case 'OUT':
        return (
          <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-md text-xs font-medium">
            <ArrowUpRight size={14} /> Sortie
          </span>
        )
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-medium">
            <ShieldAlert size={14} /> Ajustement
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-md text-xs font-medium">
            <ArrowRightLeft size={14} /> Autre
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mouvements de stock</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historique complet des entrées, sorties et ajustements.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={20} className="mr-2" />
          Nouveau mouvement
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date & Heure
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Entrepôt
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Quantité
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Notes & Réf
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Chargement des mouvements…
                  </td>
                </tr>
              ) : data?.movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Aucun historique de mouvement.
                  </td>
                </tr>
              ) : (
                data?.movements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(mov.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatType(mov.type)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                      {mov.warehouse?.name || <span className="text-gray-400 italic">Inconnu</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 truncate max-w-[200px]">
                        {mov.product.name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{mov.product.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      <span
                        className={
                          mov.type === 'IN' || mov.type === 'ADJUSTMENT'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }
                      >
                        {mov.type === 'OUT' ? '-' : '+'}
                        {mov.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                      {mov.reference && (
                        <span className="block text-gray-900 font-medium text-xs mb-0.5">
                          {mov.reference}
                        </span>
                      )}
                      {mov.note || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination minimaliste */}
        {data && data.total > 20 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total: {data.total} mouvements</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                disabled={data.movements.length < 20}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      <NewMovementModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
