import { useState, FormEvent } from 'react'
import { X } from 'lucide-react'
import {
  useCreateProduct,
  useUpdateProduct,
  Product,
  ProductFormData,
} from '../../hooks/useProducts'
import { useWarehouses } from '../../hooks/useWarehouses'

interface ProductModalProps {
  product: Product | null
  onClose: () => void
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const [form, setForm] = useState<ProductFormData>({
    sku: product?.sku || '',
    name: product?.name || '',
    description: product?.description || '',
    unit: product?.unit || 'unité',
    minStock: product?.minStock || 0,
    currentStock: product?.currentStock || 0,
    price: product?.price || 0,
    expiryDate: product?.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
    batchNumber: product?.batchNumber || '',
    isActive: product?.isActive ?? true,
    categoryId: product?.categoryId || '',
    warehouseId: '',
  })

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const { data: warehouses } = useWarehouses()
  const isEditing = !!product

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Sanitize data: convert empty strings to undefined for optional DB fields
    const sanitizedData: ProductFormData = {
      ...form,
      expiryDate: form.expiryDate === '' ? undefined : form.expiryDate,
      categoryId: form.categoryId === '' ? undefined : form.categoryId,
      warehouseId: form.warehouseId === '' ? undefined : form.warehouseId,
      description: form.description === '' ? undefined : form.description,
      batchNumber: form.batchNumber === '' ? undefined : form.batchNumber,
    }

    if (isEditing) {
      await updateProduct.mutateAsync({ ...sanitizedData, id: product.id })
    } else {
      await createProduct.mutateAsync(sanitizedData)
    }
    onClose()
  }

  const updateField = (field: keyof ProductFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            {isEditing ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label
                htmlFor="product-name"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Nom du produit
              </label>
              <input
                id="product-name"
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="input"
                placeholder="Ex: Ciment Portland 50kg"
                required
              />
            </div>

            {/* Potentially add Category Select here later if needed, 
                            but for now we just make sure we don't lose the ID if it exists */}

            <div>
              <label htmlFor="product-sku" className="block text-sm font-medium text-zinc-700 mb-1">
                SKU / Code
              </label>
              <input
                id="product-sku"
                type="text"
                value={form.sku}
                onChange={(e) => updateField('sku', e.target.value)}
                className="input font-mono"
                placeholder="CIM-001"
                required
              />
            </div>

            <div>
              <label
                htmlFor="product-status"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Statut du produit
              </label>
              <select
                id="product-status"
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => updateField('isActive', e.target.value === 'active')}
                className={`input font-medium ${form.isActive ? 'text-green-600' : 'text-amber-600'}`}
              >
                <option value="active">🟢 Actif (En vente)</option>
                <option value="inactive">🟠 Inactif (Désactivé)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="product-unit"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Unité
              </label>
              <select
                id="product-unit"
                value={form.unit}
                onChange={(e) => updateField('unit', e.target.value)}
                className="input"
              >
                <option value="unité">Unité</option>
                <option value="kg">Kilogramme (kg)</option>
                <option value="litre">Litre (L)</option>
                <option value="mètre">Mètre (m)</option>
                <option value="carton">Carton</option>
                <option value="palette">Palette</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="product-price"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Prix unitaire (F CFA)
              </label>
              <input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                className="input"
                required
              />
            </div>

            <div>
              <label
                htmlFor="product-stock"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Stock actuel
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                value={form.currentStock}
                onChange={(e) => updateField('currentStock', parseInt(e.target.value) || 0)}
                className="input"
                required
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="product-warehouse"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                🏭 Entrepôt
              </label>
              <select
                id="product-warehouse"
                value={form.warehouseId || ''}
                onChange={(e) => updateField('warehouseId', e.target.value)}
                className="input"
              >
                <option value="">Sélectionner un entrepôt…</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label
                htmlFor="product-min-stock"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Stock minimum (alerte)
              </label>
              <input
                id="product-min-stock"
                type="number"
                min="0"
                value={form.minStock}
                onChange={(e) => updateField('minStock', parseInt(e.target.value) || 0)}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="product-expiry-date"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                📅 Date d'expiration
              </label>
              <input
                id="product-expiry-date"
                type="date"
                value={form.expiryDate || ''}
                onChange={(e) => updateField('expiryDate', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label
                htmlFor="product-batch-number"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                🔢 Numéro de lot
              </label>
              <input
                id="product-batch-number"
                type="text"
                value={form.batchNumber || ''}
                onChange={(e) => updateField('batchNumber', e.target.value)}
                className="input"
                placeholder="Batch-123"
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="product-description"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="product-description"
                value={form.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                className="input min-h-[80px] resize-none"
                placeholder="Description optionnelle…"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-200">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button
              type="submit"
              disabled={createProduct.isPending || updateProduct.isPending}
              className="btn-primary flex-1"
            >
              {createProduct.isPending || updateProduct.isPending
                ? 'Enregistrement…'
                : isEditing
                  ? 'Mettre à jour'
                  : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
