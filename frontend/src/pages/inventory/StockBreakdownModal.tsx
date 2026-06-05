import { useState, useEffect } from 'react'
import { X, Warehouse } from 'lucide-react'
import api from '../../services/api'

interface StockBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
}

interface WarehouseStock {
  warehouse_name: string
  quantity: number
}

export default function StockBreakdownModal({
  isOpen,
  onClose,
  productId,
  productName,
}: StockBreakdownModalProps) {
  const [stocks, setStocks] = useState<WarehouseStock[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen && productId) {
      const fetchStock = async () => {
        setIsLoading(true)
        try {
          const { data } = await api.get(`/warehouses/product/${productId}`)
          setStocks(data)
        } catch (error) {
          console.error(error)
        } finally {
          setIsLoading(false)
        }
      }
      fetchStock()
    }
  }, [isOpen, productId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Warehouse size={20} className="text-primary-600" />
            Répartition par Entrepôt
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-zinc-500 uppercase font-semibold">Produit</p>
            <p className="text-zinc-900 font-bold">{productName}</p>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-zinc-400">Chargement…</div>
            ) : stocks.length > 0 ? (
              stocks.map((s) => (
                <div
                  key={s.warehouse_name}
                  className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg border border-zinc-100"
                >
                  <span className="text-sm font-medium text-zinc-700">{s.warehouse_name}</span>
                  <span className="font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded">
                    {s.quantity}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-zinc-400 italic">
                Aucun stock enregistré dans les entrepôts.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-100 flex justify-end">
          <button onClick={onClose} className="btn btn-secondary text-sm">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
