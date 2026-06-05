import { useState } from 'react'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import { useSuppliers, useDeleteSupplier, Supplier } from '../../hooks/useSuppliers'
import SupplierModal from './SupplierModal'
import ConfirmModal from '../../components/ConfirmModal'

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: suppliers, isLoading } = useSuppliers()
  const { mutate: deleteSupplier } = useDeleteSupplier()

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
  }

  const filteredSuppliers = suppliers?.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Fournisseurs</h1>
          <p className="text-sm text-zinc-500 mt-1">Gérez vos fournisseurs et coordonnées.</p>
        </div>
        <button
          onClick={() => {
            setEditingSupplier(null)
            setIsModalOpen(true)
          }}
          className="btn btn-primary"
        >
          <Plus size={20} className="mr-2" />
          Nouveau fournisseur
        </button>
      </div>

      <div className="card">
        {/* Filtres alignés comme dans ProductsPage */}
        <div className="p-4 border-b border-zinc-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher par nom, email…"
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tableau premium */}
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="Liste des fournisseurs">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Fournisseur
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Adresse
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                    Chargement des fournisseurs…
                  </td>
                </tr>
              ) : filteredSuppliers?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                    Aucun fournisseur trouvé.
                  </td>
                </tr>
              ) : (
                filteredSuppliers?.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900">{supplier.name}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5 mt-1">
                        ID: {supplier.id.split('-')[0]}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-900">{supplier.email || '-'}</div>
                      <div className="text-sm text-zinc-500">{supplier.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-500 max-w-xs truncate">
                        {supplier.address || 'Non renseignée'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="Modifier"
                          aria-label="Modifier le fournisseur"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-100 rounded-lg transition-colors"
                          title="Supprimer"
                          aria-label="Supprimer le fournisseur"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplier={editingSupplier}
      />

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          deleteSupplier(deleteId!)
          setDeleteId(null)
        }}
        title="Supprimer le fournisseur"
        message="Voulez-vous vraiment supprimer ce fournisseur ? Cette action est irreversible."
        confirmText="Supprimer"
      />
    </div>
  )
}
