import { useState } from 'react'
import { Plus, Search, CheckCircle, Clock, XCircle, FileText } from 'lucide-react'
import { useOrders, useUpdateOrderStatus } from '../../hooks/useOrders'
import NewOrderModal from './NewOrderModal'
import ConfirmModal from '../../components/ConfirmModal'

const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR')
const cfaFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' })
const formatAmount = (amount: number) => cfaFormatter.format(amount)

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { data: orders, isLoading } = useOrders()
  const { mutate: updateStatus } = useUpdateOrderStatus()
  const [confirmConfig, setConfirmConfig] = useState<any>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: undefined,
  })

  const handleStatusChange = (id: string, newStatus: string) => {
    if (newStatus === 'RECEIVED') {
      setConfirmConfig({
        isOpen: true,
        title: 'Confirmer la réception',
        message:
          'Marquer cette commande comme Reçue augmentera automatiquement le stock des produits associés. Voulez-vous continuer ?',
        onConfirm: () => updateStatus({ id, status: newStatus }),
      })
      return
    }
    updateStatus({ id, status: newStatus })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle size={14} /> Reçue
          </span>
        )
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            <Clock size={14} /> Envoyée
          </span>
        )
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
            <FileText size={14} /> Brouillon
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
            <XCircle size={14} /> Annulée
          </span>
        )
      default:
        return null
    }
  }

  const filteredOrders = orders?.filter(
    (o) =>
      o.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Bons de Commande</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gérez vos achats fournisseurs et réceptionnez la marchandise.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={20} className="mr-2" />
          Nouveau Bon de Commande
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-zinc-100 flex gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher par fournisseur ou numéro de bon…"
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Fournisseur
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
                  Montant Total
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Chargement…
                  </td>
                </tr>
              ) : filteredOrders?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Aucun bon de commande trouvé.
                  </td>
                </tr>
              ) : (
                filteredOrders?.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm text-primary font-medium">
                        #{order.id.split('-')[0].toUpperCase()}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Créé le {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900">{order.supplierName}</div>
                      {order.expectedDate && (
                        <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          Requis av. {formatDate(order.expectedDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                    <td className="px-6 py-4 text-right font-medium text-zinc-900">
                      {formatAmount(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.status !== 'RECEIVED' && order.status !== 'CANCELLED' && (
                        <select
                          className="text-sm border-zinc-200 rounded-lg shadow-sm focus:border-primary focus:ring-primary py-1.5 pl-3 pr-8 bg-white cursor-pointer"
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        >
                          <option value="DRAFT">Brouillon</option>
                          <option value="SENT">Envoyée</option>
                          <option value="RECEIVED">Marquer Reçue</option>
                          <option value="CANCELLED">Annuler</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onClose={() => setConfirmConfig((c: any) => ({ ...c, isOpen: false }))}
        onConfirm={() => {
          if (confirmConfig.onConfirm) confirmConfig.onConfirm()
          setConfirmConfig((c: any) => ({ ...c, isOpen: false }))
        }}
      />
    </div>
  )
}
