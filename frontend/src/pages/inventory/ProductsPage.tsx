import { useState } from 'react'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Filter,
  Barcode,
  Warehouse,
  Power,
  PowerOff,
} from 'lucide-react'
import { useProducts, useDeleteProduct, useUpdateProduct, Product } from '../../hooks/useProducts'
import ProductModal from './ProductModal'
import BarcodeDisplayModal from '../../components/BarcodeDisplayModal'
import StockBreakdownModal from './StockBreakdownModal'
import ConfirmModal from '../../components/ConfirmModal'

const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR')
const isExpiringSoon = (d: string) => Date.parse(d) - Date.now() < 30 * 24 * 60 * 60 * 1000

export default function ProductsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [productForBarcode, setProductForBarcode] = useState<Product | null>(null)
  const [productForStock, setProductForStock] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const { data, isLoading } = useProducts(page, 20, search)
  const deleteProduct = useDeleteProduct()
  const updateProduct = useUpdateProduct()

  const handleToggleActive = (product: Product) => {
    const newStatus = !product.isActive
    updateProduct.mutate({
      id: product.id,
      isActive: newStatus,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      minStock: product.minStock,
      currentStock: product.currentStock,
      price: product.price,
    })
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
  }

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct.mutate(productToDelete.id)
      setProductToDelete(null)
    }
  }

  const openCreate = () => {
    setEditingProduct(null)
    setShowModal(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Inventaire</h1>
          <p className="text-zinc-500 mt-1">Gérez votre catalogue de produits</p>
        </div>
        <button onClick={openCreate} className="btn-primary" id="btn-add-product">
          <Plus size={18} />
          Ajouter un produit
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, SKU…"
              className="input pl-10"
              id="input-search-products"
            />
          </div>
          <button className="btn-secondary">
            <Filter size={18} />
            Filtres
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" aria-label="Liste des produits">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Entrepôts
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Expiration
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Prix
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-400">
                      <svg className="animate-spin size-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Chargement…
                    </div>
                  </td>
                </tr>
              ) : data?.products && data.products.length > 0 ? (
                data.products.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-zinc-50 transition-colors ${!product.isActive ? 'opacity-60 bg-zinc-50/50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-primary-50 flex items-center justify-center">
                          <Package size={18} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{product.name}</p>
                          <p className="text-xs text-zinc-500">{product.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 font-mono">{product.sku}</td>
                    <td className="px-6 py-4">
                      <div
                        role="button"
                        tabIndex={0}
                        className="cursor-help group"
                        onClick={() => setProductForStock(product)}
                        onKeyDown={(e) =>
                          (e.key === 'Enter' || e.key === ' ') && setProductForStock(product)
                        }
                        title="Voir la répartition par entrepôt"
                      >
                        <span
                          className={`text-sm font-semibold group-hover:underline ${
                            product.currentStock <= product.minStock
                              ? 'text-red-600'
                              : 'text-zinc-900'
                          }`}
                        >
                          {product.currentStock}
                        </span>
                        {product.currentStock <= product.minStock && (
                          <span className="badge-danger ml-2">Bas</span>
                        )}
                        <Warehouse
                          size={14}
                          className="inline ml-1.5 text-zinc-400 group-hover:text-primary-500 transition-colors"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.warehouses && product.warehouses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.warehouses.map((w) => (
                            <span
                              key={w.id}
                              className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 font-medium"
                              title={`${w.name}: ${w.quantity} ${product.unit}`}
                            >
                              <Warehouse size={10} />
                              {w.name}
                              <span className="text-blue-500">·{w.quantity}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {product.expiryDate ? (
                        <div className="flex flex-col">
                          <span
                            className={`text-sm font-medium ${
                              isExpiringSoon(product.expiryDate)
                                ? 'text-amber-600'
                                : 'text-zinc-900'
                            }`}
                          >
                            {formatDate(product.expiryDate)}
                          </span>
                          {product.batchNumber && (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Lot: {product.batchNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-900 font-medium">
                      {product.price.toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'XOF',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {product.isActive ? (
                        <span className="badge-success">Actif</span>
                      ) : (
                        <span className="badge-warning">Inactif</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-primary-600 transition-colors"
                          title="Modifier"
                          aria-label={`Modifier le produit ${product.name}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`p-2 rounded-lg transition-colors ${
                            product.isActive
                              ? 'hover:bg-amber-50 text-zinc-400 hover:text-amber-600'
                              : 'hover:bg-green-50 text-green-600 hover:text-green-700'
                          }`}
                          title={product.isActive ? 'Désactiver le produit' : 'Activer le produit'}
                          aria-label={
                            product.isActive
                              ? `Désactiver le produit ${product.name}`
                              : `Activer le produit ${product.name}`
                          }
                        >
                          {product.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                        </button>
                        <button
                          onClick={() => setProductForBarcode(product)}
                          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors"
                          title="Générer Code-barres"
                          aria-label={`Générer le code-barres pour ${product.name}`}
                        >
                          <Barcode size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-red-600 transition-colors"
                          title="Supprimer"
                          aria-label={`Supprimer le produit ${product.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Package size={40} className="mx-auto mb-3 text-zinc-300" />
                    <p className="text-zinc-500 font-medium">Aucun produit</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Commencez par ajouter votre premier produit
                    </p>
                    <button onClick={openCreate} className="btn-primary mt-4">
                      <Plus size={18} />
                      Ajouter un produit
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200">
            <p className="text-sm text-zinc-500">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} sur {data.total} produits
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm py-1.5 px-3"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= data.total}
                className="btn-secondary text-sm py-1.5 px-3"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && <ProductModal product={editingProduct} onClose={() => setShowModal(false)} />}

      {/* Barcode Modal */}
      <BarcodeDisplayModal
        isOpen={!!productForBarcode}
        onClose={() => setProductForBarcode(null)}
        sku={productForBarcode?.sku || ''}
        productName={productForBarcode?.name || ''}
      />

      {/* Stock Breakdown Modal */}
      <StockBreakdownModal
        isOpen={!!productForStock}
        onClose={() => setProductForStock(null)}
        productId={productForStock?.id || ''}
        productName={productForStock?.name || ''}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer le produit ?"
        message={`Êtes-vous sûr de vouloir supprimer "${productToDelete?.name}" ? Cette action masquera le produit de votre inventaire actif.`}
        confirmText="Supprimer définitivement"
        cancelText="Garder le produit"
        type="danger"
      />
    </div>
  )
}
