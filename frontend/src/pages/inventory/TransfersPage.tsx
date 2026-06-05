import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRightLeft,
  Package,
  Warehouse,
  Info,
  ArrowRight,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { useWarehouses } from '../../hooks/useWarehouses'
import { useProducts } from '../../hooks/useProducts'
import { useTransfers } from '../../hooks/useTransfers'
import { useStockMovements } from '../../hooks/useStockMovements'
import api from '../../services/api'
import { formatDateTime } from '../../lib/format'

function useProductWarehouseStock(productId: string | null) {
  return useQuery({
    queryKey: ['warehouse-stock', productId],
    queryFn: async () => {
      const { data } = await api.get(`/warehouses/product/${productId}`)
      return data as { warehouse_id: string; warehouse_name: string; quantity: number }[]
    },
    enabled: !!productId,
  })
}

export default function TransfersPage() {
  const [form, setForm] = useState({
    productId: '',
    sourceWarehouseId: '',
    destWarehouseId: '',
    quantity: 1,
    note: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const { data: warehousesData, isLoading: loadingWarehouses } = useWarehouses()
  const { data: productsData, isLoading: loadingProducts } = useProducts(1, 100)
  const { createTransfer } = useTransfers()
  const { data: warehouseStock } = useProductWarehouseStock(form.productId || null)
  const { data: movementsData } = useStockMovements(1, 10)

  const warehouses = warehousesData ?? []
  const products = productsData?.products ?? []

  // Recent TRANSFER movements only
  const recentTransfers = (movementsData?.movements ?? []).filter((m) => m.type === 'TRANSFER')

  const stockByWarehouse = (warehouseStock ?? []).reduce((acc: Record<string, number>, s) => {
    acc[s.warehouse_id] = Number(s.quantity)
    return acc
  }, {})

  const selectedProduct = products.find((p) => p.id === form.productId)
  const sourceWarehouse = warehouses.find((w) => w.id === form.sourceWarehouseId)
  const destWarehouse = warehouses.find((w) => w.id === form.destWarehouseId)
  const sourceStock = form.sourceWarehouseId
    ? (stockByWarehouse[form.sourceWarehouseId] ?? selectedProduct?.currentStock ?? 0)
    : null

  const isLoading = loadingWarehouses || loadingProducts
  const isSameWarehouse =
    form.sourceWarehouseId &&
    form.destWarehouseId &&
    form.sourceWarehouseId === form.destWarehouseId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!form.productId || !form.sourceWarehouseId || !form.destWarehouseId || form.quantity < 1)
      return
    if (isSameWarehouse) return

    await createTransfer.mutateAsync({
      productId: form.productId,
      sourceWarehouseId: form.sourceWarehouseId,
      destWarehouseId: form.destWarehouseId,
      quantity: form.quantity,
      note: form.note || undefined,
    })

    setForm({ productId: '', sourceWarehouseId: '', destWarehouseId: '', quantity: 1, note: '' })
    setSubmitted(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <ArrowRightLeft size={24} className="text-primary-600" />
            Transferts inter-entrepôts
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Déplacez du stock d'un entrepôt vers un autre sans modifier le stock global.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-xl">
          <TrendingUp size={16} className="text-primary-600" />
          <span className="text-sm font-medium text-primary-700">
            {recentTransfers.length} transfert{recentTransfers.length !== 1 ? 's' : ''} récent
            {recentTransfers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form : 3 cols */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 bg-gradient-to-r from-primary-50 to-white">
              <h2 className="text-base font-semibold text-zinc-800">Nouveau transfert</h2>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-zinc-400">Chargement…</div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Produit */}
                <div>
                  <label
                    htmlFor="transfer-product"
                    className="text-sm font-medium text-zinc-700 flex items-center gap-1.5 mb-1"
                  >
                    <Package size={14} className="text-zinc-400" />
                    Produit
                  </label>
                  <select
                    id="transfer-product"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white ${submitted && !form.productId ? 'border-red-400' : 'border-zinc-300'}`}
                    value={form.productId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        productId: e.target.value,
                        sourceWarehouseId: '',
                        destWarehouseId: '',
                      }))
                    }
                  >
                    <option value="">Sélectionner un produit…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) : Stock: {p.currentStock} {p.unit}
                      </option>
                    ))}
                  </select>
                  {submitted && !form.productId && (
                    <p className="text-xs text-red-500 mt-1">Produit requis</p>
                  )}
                  {form.productId &&
                    warehouseStock !== undefined &&
                    warehouseStock.length === 0 && (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 flex items-center gap-1.5">
                        <Info size={12} />
                        Stock non ventilé : le stock global sera utilisé comme fallback.
                      </p>
                    )}
                </div>

                {/* Source → Destination visual */}
                <div>
                  <label
                    htmlFor="transfer-source"
                    className="text-sm font-medium text-zinc-700 flex items-center gap-1.5 mb-3"
                  >
                    <Warehouse size={14} className="text-zinc-400" />
                    Trajet du transfert
                  </label>
                  <div className="flex items-center gap-3">
                    {/* Source */}
                    <div className="flex-1">
                      <p className="text-xs text-zinc-400 mb-1">Depuis</p>
                      <select
                        id="transfer-source"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white ${submitted && !form.sourceWarehouseId ? 'border-red-400' : isSameWarehouse ? 'border-orange-400' : 'border-zinc-300'}`}
                        value={form.sourceWarehouseId}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, sourceWarehouseId: e.target.value }))
                        }
                      >
                        <option value="">Source…</option>
                        {warehouses.map((w) => {
                          const qty = stockByWarehouse[w.id]
                          const label =
                            form.productId && qty !== undefined
                              ? `${w.name} (${qty} dispo)`
                              : w.name
                          return (
                            <option
                              key={w.id}
                              value={w.id}
                              disabled={w.id === form.destWarehouseId}
                            >
                              {label}
                            </option>
                          )
                        })}
                      </select>
                      {submitted && !form.sourceWarehouseId && (
                        <p className="text-xs text-red-500 mt-1">Requis</p>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex flex-col items-center gap-1 mt-4">
                      <div className="size-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <ArrowRight size={16} className="text-primary-600" />
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="flex-1">
                      <p className="text-xs text-zinc-400 mb-1">Vers</p>
                      <select
                        id="transfer-destination"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white ${submitted && !form.destWarehouseId ? 'border-red-400' : isSameWarehouse ? 'border-orange-400' : 'border-zinc-300'}`}
                        value={form.destWarehouseId}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, destWarehouseId: e.target.value }))
                        }
                      >
                        <option value="">Destination…</option>
                        {warehouses.map((w) => (
                          <option
                            key={w.id}
                            value={w.id}
                            disabled={w.id === form.sourceWarehouseId}
                          >
                            {w.name}
                          </option>
                        ))}
                      </select>
                      {submitted && !form.destWarehouseId && (
                        <p className="text-xs text-red-500 mt-1">Requis</p>
                      )}
                    </div>
                  </div>
                  {isSameWarehouse && (
                    <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 mt-2 flex items-center gap-1.5">
                      <Info size={12} />
                      L'entrepôt source et destination doivent être différents.
                    </p>
                  )}
                </div>

                {/* Quantité */}
                <div>
                  <label
                    htmlFor="transfer-quantity"
                    className="text-sm font-medium text-zinc-700 mb-1 block"
                  >
                    Quantité à transférer
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="transfer-quantity"
                      type="number"
                      min={1}
                      max={sourceStock ?? undefined}
                      className={`w-32 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${submitted && form.quantity < 1 ? 'border-red-400' : 'border-zinc-300'}`}
                      value={form.quantity}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))
                      }
                    />
                    {sourceStock !== null && (
                      <span className="text-xs text-zinc-500">
                        / <span className="font-medium text-zinc-700">{sourceStock}</span>{' '}
                        disponible
                        {form.quantity > sourceStock && (
                          <span className="ml-2 text-red-500 font-medium">: insuffisant</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label
                    htmlFor="transfer-note"
                    className="text-sm font-medium text-zinc-700 mb-1 block"
                  >
                    Note <span className="text-zinc-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    id="transfer-note"
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Ex: Réapprovisionnement succursale nord"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>

                {/* Récap visuel */}
                {selectedProduct &&
                  sourceWarehouse &&
                  destWarehouse &&
                  form.quantity > 0 &&
                  !isSameWarehouse && (
                    <div className="bg-zinc-50 rounded-xl border border-zinc-200 px-4 py-3 flex items-center gap-3 text-sm">
                      <CheckCircle size={16} className="text-green-500 shrink-0" />
                      <span className="text-zinc-600">
                        Transfert de{' '}
                        <span className="font-semibold text-zinc-900">
                          {form.quantity} × {selectedProduct.name}
                        </span>{' '}
                        depuis{' '}
                        <span className="font-medium text-primary-700">{sourceWarehouse.name}</span>{' '}
                        vers{' '}
                        <span className="font-medium text-primary-700">{destWarehouse.name}</span>
                      </span>
                    </div>
                  )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex items-center gap-2"
                    disabled={createTransfer.isPending || !!isSameWarehouse}
                  >
                    {createTransfer.isPending ? (
                      <>
                        <Clock size={16} className="animate-spin" />
                        Transfert en cours…
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft size={16} />
                        Effectuer le transfert
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Historique récent : 2 cols */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-800 flex items-center gap-2">
                <Clock size={16} className="text-zinc-400" />
                Transferts récents
              </h2>
            </div>
            {recentTransfers.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowRightLeft size={36} className="mx-auto text-zinc-200 mb-3" />
                <p className="text-sm text-zinc-400">Aucun transfert effectué.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-50">
                {recentTransfers.map((m) => (
                  <li key={m.id} className="px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {m.product?.name ?? '-'}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {m.note ?? 'Transfert stock'}
                        </p>
                      </div>
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
                        {m.quantity > 0 ? '+' : ''}
                        {m.quantity}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">{formatDateTime(m.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
