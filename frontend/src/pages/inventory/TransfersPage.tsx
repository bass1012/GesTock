import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightLeft, Package, Warehouse, Info } from 'lucide-react'
import { useWarehouses } from '../../hooks/useWarehouses'
import { useProducts } from '../../hooks/useProducts'
import { useTransfers } from '../../hooks/useTransfers'
import api from '../../services/api'

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

    const warehouses = warehousesData ?? []
    const products = productsData?.products ?? []

    // Stock dispo par entrepôt pour le produit sélectionné
    const stockByWarehouse = (warehouseStock ?? []).reduce((acc: Record<string, number>, s: any) => {
        acc[s.warehouse_id] = Number(s.quantity)
        return acc
    }, {})

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
        if (!form.productId || !form.sourceWarehouseId || !form.destWarehouseId || form.quantity < 1) return

        await createTransfer.mutateAsync({
            productId: form.productId,
            sourceWarehouseId: form.sourceWarehouseId,
            destWarehouseId: form.destWarehouseId,
            quantity: form.quantity,
            note: form.note || undefined,
        })

        // Reset form on success
        setForm({ productId: '', sourceWarehouseId: '', destWarehouseId: '', quantity: 1, note: '' })
        setSubmitted(false)
    }

    const isLoading = loadingWarehouses || loadingProducts

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                    <ArrowRightLeft size={24} className="text-primary-500" />
                    Transferts inter-entrepôts
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Déplacez du stock d'un entrepôt vers un autre sans modifier le stock global.
                </p>
            </div>

            <div className="card">
                <h2 className="text-base font-semibold text-gray-700 mb-6">Nouveau transfert</h2>

                {isLoading ? (
                    <p className="text-sm text-gray-500">Chargement...</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Produit */}
                        <div>
                            <label className="label flex items-center gap-1.5">
                                <Package size={14} />
                                Produit
                            </label>
                            <select
                                className={`input mt-1 ${submitted && !form.productId ? 'border-red-400' : ''}`}
                                value={form.productId}
                                onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                            >
                                <option value="">-- Sélectionner un produit --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.sku}) — Stock: {p.currentStock} {p.unit}
                                    </option>
                                ))}
                            </select>
                            {submitted && !form.productId && (
                                <p className="text-xs text-red-500 mt-1">Produit requis</p>
                            )}
                            {form.productId && warehouseStock !== undefined && warehouseStock.length === 0 && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1 flex items-center gap-1">
                                    <Info size={12} />
                                    Stock non ventilé par entrepôt — le stock global sera utilisé lors du transfert.
                                </p>
                            )}
                        </div>

                        {/* Source & Destination */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label flex items-center gap-1.5">
                                    <Warehouse size={14} />
                                    Entrepôt source
                                </label>
                                <select
                                    className={`input mt-1 ${submitted && !form.sourceWarehouseId ? 'border-red-400' : ''}`}
                                    value={form.sourceWarehouseId}
                                    onChange={e => setForm(f => ({ ...f, sourceWarehouseId: e.target.value }))}
                                >
                                    <option value="">-- Depuis --</option>
                                    {warehouses.map(w => {
                                        const qty = stockByWarehouse[w.id]
                                        const label = form.productId && qty !== undefined
                                            ? `${w.name} (${qty} dispo)`
                                            : w.name
                                        return (
                                            <option key={w.id} value={w.id} disabled={w.id === form.destWarehouseId}>
                                                {label}
                                            </option>
                                        )
                                    })}
                                </select>
                                {submitted && !form.sourceWarehouseId && (
                                    <p className="text-xs text-red-500 mt-1">Requis</p>
                                )}
                            </div>
                            <div>
                                <label className="label flex items-center gap-1.5">
                                    <Warehouse size={14} />
                                    Entrepôt destination
                                </label>
                                <select
                                    className={`input mt-1 ${submitted && !form.destWarehouseId ? 'border-red-400' : ''}`}
                                    value={form.destWarehouseId}
                                    onChange={e => setForm(f => ({ ...f, destWarehouseId: e.target.value }))}
                                >
                                    <option value="">-- Vers --</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id} disabled={w.id === form.sourceWarehouseId}>
                                            {w.name}
                                        </option>
                                    ))}
                                </select>
                                {submitted && !form.destWarehouseId && (
                                    <p className="text-xs text-red-500 mt-1">Requis</p>
                                )}
                            </div>
                        </div>

                        {/* Quantité */}
                        <div>
                            <label className="label">Quantité</label>
                            <input
                                type="number"
                                min={1}
                                className={`input mt-1 ${submitted && form.quantity < 1 ? 'border-red-400' : ''}`}
                                value={form.quantity}
                                onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                            />
                        </div>

                        {/* Note */}
                        <div>
                            <label className="label">Note (optionnel)</label>
                            <input
                                type="text"
                                className="input mt-1"
                                placeholder="Ex: Réapprovisionnement succursale nord"
                                value={form.note}
                                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                            />
                        </div>

                        {/* Source = Dest warning */}
                        {form.sourceWarehouseId && form.destWarehouseId && form.sourceWarehouseId === form.destWarehouseId && (
                            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                                L'entrepôt source et destination doivent être différents.
                            </p>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createTransfer.isPending || (form.sourceWarehouseId === form.destWarehouseId && !!form.sourceWarehouseId)}
                            >
                                {createTransfer.isPending ? 'Transfert en cours...' : 'Effectuer le transfert'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
