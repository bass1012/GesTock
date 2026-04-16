import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useCreateOrder } from '../../hooks/useOrders'
import { useProducts } from '../../hooks/useProducts'
import { useSuppliers } from '../../hooks/useSuppliers'

interface NewOrderModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewOrderModal({ isOpen, onClose }: NewOrderModalProps) {
  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [items, setItems] = useState([{ productId: '', quantity: 1, unitPrice: 0 }])

  const { data: suppliers } = useSuppliers()
  const { data: productsData } = useProducts()
  const { mutate: createOrder, isPending } = useCreateOrder()

  if (!isOpen) return null

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Auto-fill price if picking a product
    if (field === 'productId') {
      const product = productsData?.products.find(p => p.id === value)
      if (product) {
        newItems[index].unitPrice = product.price || 0
      }
    }
    
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const validItems = items.filter(i => i.productId && i.quantity > 0 && i.unitPrice >= 0)
    if (validItems.length === 0) {
      alert("Ajoutez au moins un article valide")
      return
    }

    createOrder(
      {
        supplierId,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
        items: validItems,
        status: 'DRAFT',
      },
      {
        onSuccess: () => {
          setSupplierId('')
          setExpectedDate('')
          setItems([{ productId: '', quantity: 1, unitPrice: 0 }])
          onClose()
        }
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Nouveau Bon de Commande (Brouillon)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="orderForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fournisseur *
                </label>
                <select
                  required
                  className="input"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">Sélectionnez un fournisseur...</option>
                  {suppliers?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de réception souhaitée
                </label>
                <input
                  type="date"
                  className="input"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-8 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-medium text-gray-700 text-sm">Lignes de commande</h3>
                <button type="button" onClick={handleAddItem} className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1">
                  <Plus size={16} /> Ajouter une ligne
                </button>
              </div>
              
              <div className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <div key={index} className="p-4 grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Produit</label>
                      <select
                        required
                        className="input text-sm py-2"
                        value={item.productId}
                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                      >
                        <option value="">Sélectionner...</option>
                        {productsData?.products.map(p => (
                          <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-span-6 sm:col-span-2">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Quantité</label>
                       <input
                          type="number"
                          min="1"
                          required
                          className="input text-sm py-2"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                       />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                       <label className="block text-xs font-medium text-gray-500 mb-1">Prix Unitaire HT</label>
                       <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="input text-sm py-2"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                       />
                    </div>
                    
                    <div className="col-span-12 sm:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
                <span className="font-medium text-gray-600 sm:text-base">Montant Total Estimé</span>
                <span className="font-bold text-gray-900 text-lg">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(calculateTotal())}
                </span>
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50">
           <button type="button" onClick={onClose} className="btn btn-outline bg-white" disabled={isPending}>
              Annuler
           </button>
           <button type="submit" form="orderForm" className="btn btn-primary" disabled={isPending || !supplierId}>
              {isPending ? 'Enregistrement...' : 'Créer le Bon de Commande'}
           </button>
        </div>
      </div>
    </div>
  )
}
