import { useState, useEffect } from 'react'
import { Plus, Warehouse, MapPin, Edit2, Trash2 } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

interface WarehouseModel {
    id: string
    name: string
    address: string
    is_active: boolean
}

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<WarehouseModel[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingWarehouse, setEditingWarehouse] = useState<WarehouseModel | null>(null)
    const [formData, setFormData] = useState({ name: '', address: '' })

    const fetchWarehouses = async () => {
        try {
            const { data } = await api.get('/warehouses')
            setWarehouses(data)
        } catch (error) {
            toast.error('Erreur lors du chargement des entrepôts')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchWarehouses()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingWarehouse) {
                await api.put(`/warehouses/${editingWarehouse.id}`, formData)
                toast.success('Entrepôt mis à jour')
            } else {
                await api.post('/warehouses', formData)
                toast.success('Entrepôt créé')
            }
            setShowModal(false)
            setEditingWarehouse(null)
            setFormData({ name: '', address: '' })
            fetchWarehouses()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Une erreur est survenue')
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cet entrepôt ?')) return
        try {
            await api.delete(`/warehouses/${id}`)
            toast.success('Entrepôt supprimé')
            fetchWarehouses()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Entrepôts</h1>
                    <p className="text-gray-500">Gérez vos emplacements de stockage physique</p>
                </div>
                <button
                    onClick={() => {
                        setEditingWarehouse(null)
                        setFormData({ name: '', address: '' })
                        setShowModal(true)
                    }}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Nouvel Entrepôt
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouses.map((w) => (
                        <div key={w.id} className="card p-6 border-l-4 border-primary-500">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 rounded-lg">
                                        <Warehouse className="text-primary-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{w.name}</h3>
                                        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                                            <MapPin size={14} />
                                            <span>{w.address || 'Aucune adresse'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingWarehouse(w)
                                            setFormData({ name: w.name, address: w.address })
                                            setShowModal(true)
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    {w.name !== 'Dépôt Principal' && (
                                        <button
                                            onClick={() => handleDelete(w.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingWarehouse ? 'Modifier l\'entrepôt' : 'Nouvel entrepôt'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entrepôt</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input w-full"
                                    placeholder="Ex: Magasin Principal, Dépôt Sud..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse / Emplacement</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input w-full"
                                    rows={3}
                                    placeholder="Adresse physique ou pôle logistique"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Annuler
                                </button>
                                <button type="submit" className="btn btn-primary flex-1">
                                    {editingWarehouse ? 'Mettre à jour' : 'Créer l\'entrepôt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
