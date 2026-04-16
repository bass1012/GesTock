import { useState } from 'react'
import { X, Camera } from 'lucide-react'
import { useCreateMovement } from '../../hooks/useStockMovements'
import { useProducts } from '../../hooks/useProducts'
import { useWarehouses } from '../../hooks/useWarehouses'
import BarcodeScannerModal from '../../components/BarcodeScannerModal'
import { toast } from 'react-hot-toast'

interface NewMovementModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewMovementModal({ isOpen, onClose }: NewMovementModalProps) {
  const [showScanner, setShowScanner] = useState(false)
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    type: 'IN' as 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER',
    quantity: 1,
    reference: '',
    note: '',
  })

  const { data: products } = useProducts()
  const { data: warehouses } = useWarehouses()
  const { mutate: createMovement, isPending } = useCreateMovement()

  if (!isOpen) return null

  const handleScan = (decodedText: string) => {
    if (!products?.products) return
    const matchedProduct = products.products.find(p => p.sku === decodedText || p.id === decodedText)
    if (matchedProduct) {
      setFormData(prev => ({ ...prev, productId: matchedProduct.id }))
      toast.success(`Produit détecté : ${matchedProduct.name}`)
    } else {
      toast.error(`Aucun produit avec le code : ${decodedText}`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Ensure quantity is positive
    const dataToSend = {
      ...formData,
      quantity: Math.abs(formData.quantity)
    }

    createMovement(dataToSend, {
      onSuccess: () => {
        setFormData({ productId: '', warehouseId: '', type: 'IN', quantity: 1, reference: '', note: '' })
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Nouveau Mouvement Manuel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entrepôt source/destination *
              </label>
              <select
                required
                className="input w-full"
                value={formData.warehouseId}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
              >
                <option value="">Sélectionner un entrepôt...</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Produit *
              </label>

              <div className="flex gap-2">
                <select
                  required
                  className="input flex-1"
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                >
                  <option value="">Sélectionner un produit...</option>
                  {products?.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Stock actuel: {p.currentStock})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="px-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 hover:text-gray-900 transition-colors border border-gray-200 shadow-sm"
                  title="Scanner le code"
                >
                  <Camera size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de mouvement *
                </label>
                <select
                  required
                  className="input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="IN">Entrée (IN)</option>
                  <option value="OUT">Sortie (OUT)</option>
                  <option value="ADJUSTMENT">Ajustement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantité *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Référence (optionnel)
              </label>
              <input
                type="text"
                className="input"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Ex: LIV-2024-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note (optionnel)
              </label>
              <textarea
                className="input min-h-[60px]"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Motif du mouvement..."
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={isPending}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending || !formData.productId}>
              {isPending ? 'Enregistrement...' : 'Valider'}
            </button>
          </div>
        </form>
      </div>
      
      <BarcodeScannerModal 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        onScan={handleScan} 
      />
    </div>
  )
}
