import { useState } from 'react'
import { Plus, Trash2, RotateCcw, Package } from 'lucide-react'
import { useSupplierReturns, useCreateSupplierReturn } from '../../hooks/useSupplierReturns'
import { useSuppliers, type Supplier } from '../../hooks/useSuppliers'
import { useProducts } from '../../hooks/useProducts'
import { useWarehouses, type Warehouse } from '../../hooks/useWarehouses'

interface ReturnItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR')
}

export default function SupplierReturnsPage() {
  const [showForm, setShowForm] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<ReturnItem[]>([
    { id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: 0 },
  ])

  const { data: returns = [], isLoading } = useSupplierReturns()
  const { data: suppliers = [] } = useSuppliers()
  const { data: products } = useProducts()
  const { data: warehouses = [] } = useWarehouses()
  const { mutate: createReturn, isPending } = useCreateSupplierReturn()

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: 0 },
    ])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: keyof ReturnItem, value: string | number) => {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId || items.some((it) => !it.productId)) return

    createReturn(
      {
        supplierId,
        warehouseId: warehouseId || undefined,
        reason: reason || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice || 0,
        })),
      },
      {
        onSuccess: () => {
          setSupplierId('')
          setWarehouseId('')
          setReason('')
          setItems([{ id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: 0 }])
          setShowForm(false)
        },
      },
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Retours Fournisseurs</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gérer les retours de marchandises vers les fournisseurs
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Nouveau retour
        </button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-zinc-900">Nouveau retour fournisseur</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="return-supplier"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Fournisseur *
              </label>
              <select
                id="return-supplier"
                required
                className="input w-full"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Sélectionner…</option>
                {suppliers.map((s: Supplier) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="return-warehouse"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Entrepôt source (optionnel)
              </label>
              <select
                id="return-warehouse"
                className="input w-full"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                <option value="">Par défaut</option>
                {warehouses.map((w: Warehouse) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="return-reason" className="block text-sm font-medium text-zinc-700 mb-1">
              Motif du retour (optionnel)
            </label>
            <input
              id="return-reason"
              type="text"
              className="input w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Produit défectueux, non-conforme…"
            />
          </div>

          {/* Articles à retourner */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Articles *</p>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
              >
                <Plus size={14} /> Ajouter un article
              </button>
            </div>
            {items.map((item, idx) => (
              <div key={item.id} className="flex gap-3 items-start">
                <select
                  required
                  className="input flex-1"
                  value={item.productId}
                  onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                >
                  <option value="">Sélectionner un produit…</option>
                  {products?.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} – {p.name} (Stock: {p.currentStock})
                    </option>
                  ))}
                </select>
                <div className="w-28">
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Qté"
                    className="input w-full"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Prix unit."
                    className="input w-full"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="mt-2 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowForm(false)}
              disabled={isPending}
            >
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending || !supplierId}>
              {isPending ? 'Enregistrement…' : 'Valider le retour'}
            </button>
          </div>
        </form>
      )}

      {/* Table des retours */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-400">Chargement…</div>
        ) : returns.length === 0 ? (
          <div className="p-12 text-center">
            <RotateCcw size={48} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500">Aucun retour fournisseur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Référence</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Fournisseur</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Motif</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono text-zinc-700">{ret.reference}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{ret.supplierName}</td>
                    <td className="px-4 py-3 text-zinc-600">{ret.reason ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Package size={10} />
                        {ret.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(ret.createdAt)}</td>
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
