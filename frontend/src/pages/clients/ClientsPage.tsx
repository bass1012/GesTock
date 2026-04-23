import { useState } from 'react'
import { useClients } from '../../hooks/useClients'
import { useClientLoyalty } from '../../hooks/useLoyalty'
import { Users, Star, Plus, X, TrendingUp, Gift } from 'lucide-react'
import { formatCFA } from '../../lib/currency'

function LoyaltyPanel({ clientId, onClose }: { clientId: string; onClose: () => void }) {
    const { data: loyalty, isLoading } = useClientLoyalty(clientId)

    if (isLoading) return <div className="p-6 text-center text-gray-400">Chargement...</div>
    if (!loyalty) return null

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-bold">{loyalty.name}</h2>
                        <p className="text-sm text-gray-500">{loyalty.email || loyalty.phone || '—'}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                </div>

                {/* Stats fidélité */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                        <Star size={18} className="mx-auto mb-1 fill-amber-400 text-amber-400" />
                        <p className="text-xl font-bold text-amber-700">{loyalty.loyaltyPoints}</p>
                        <p className="text-xs text-amber-600">Points</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                        <Gift size={18} className="mx-auto mb-1 text-green-600" />
                        <p className="text-lg font-bold text-green-700">{formatCFA(loyalty.discountAvailable)}</p>
                        <p className="text-xs text-green-600">Remise dispo.</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                        <TrendingUp size={18} className="mx-auto mb-1 text-blue-600" />
                        <p className="text-lg font-bold text-blue-700">{formatCFA(loyalty.totalSpent)}</p>
                        <p className="text-xs text-blue-600">Total dépensé</p>
                    </div>
                </div>

                {/* Historique */}
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Historique des points</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {loyalty.transactions.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">Aucune transaction</p>
                    )}
                    {loyalty.transactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                            <div>
                                <p className="text-sm">{t.description}</p>
                                <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <span className={`font-bold text-sm ${t.type === 'EARN' ? 'text-green-600' : 'text-red-500'}`}>
                                {t.type === 'EARN' ? '+' : ''}{t.points} pts
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function NewClientModal({ onClose }: { onClose: () => void }) {
    const { createClient, isCreating } = useClients()
    const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await createClient(form)
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Nouveau Client</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Nom *</label>
                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Nom du client" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="email@exemple.com" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Téléphone</label>
                        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="+226 70 00 00 00" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Adresse</label>
                        <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Adresse" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50">Annuler</button>
                        <button type="submit" disabled={isCreating} className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                            {isCreating ? 'Création...' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function ClientsPage() {
    const { clients, isLoading } = useClients()
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
    const [showNewModal, setShowNewModal] = useState(false)
    const [search, setSearch] = useState('')

    const filtered = clients.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
        (c.phone && c.phone.includes(search))
    )

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 rounded-xl">
                        <Users size={22} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Clients & Fidélité</h1>
                        <p className="text-sm text-gray-500">Gérez vos clients et suivez leurs points de fidélité</p>
                    </div>
                </div>
                <button onClick={() => setShowNewModal(true)} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
                    <Plus size={16} /> Nouveau client
                </button>
            </div>

            {/* Règles fidélité */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Star size={18} className="fill-amber-400 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                    <strong>Programme fidélité :</strong> 1 point gagné par 1 000 F CFA dépensés. 1 point = 50 F CFA de remise en caisse.
                </div>
            </div>

            {/* Barre de recherche */}
            <div className="mb-4">
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher par nom, email, téléphone..."
                    className="w-full max-w-sm px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:outline-none"
                />
            </div>

            {/* Tableau clients */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Nom</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                            <th className="text-center px-4 py-3 font-semibold text-gray-600">Points fidélité</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Total dépensé</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Remise dispo.</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading && (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chargement...</td></tr>
                        )}
                        {!isLoading && filtered.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">Aucun client trouvé</td></tr>
                        )}
                        {filtered.map((c: any) => (
                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                                <td className="px-4 py-3 text-gray-500">{c.email || c.phone || '—'}</td>
                                <td className="px-4 py-3 text-center">
                                    {c.loyaltyPoints > 0 ? (
                                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-semibold">
                                            <Star size={11} className="fill-amber-400 text-amber-400" /> {c.loyaltyPoints} pts
                                        </span>
                                    ) : (
                                        <span className="text-gray-300">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-700">{c.totalSpent > 0 ? formatCFA(c.totalSpent) : '—'}</td>
                                <td className="px-4 py-3 text-right">
                                    {c.loyaltyPoints > 0 ? (
                                        <span className="text-green-600 font-medium">{formatCFA(c.loyaltyPoints * 50)}</span>
                                    ) : (
                                        <span className="text-gray-300">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => setSelectedClientId(c.id)} className="text-xs text-primary-600 hover:underline font-medium">
                                        Historique
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedClientId && (
                <LoyaltyPanel clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
            )}
            {showNewModal && <NewClientModal onClose={() => setShowNewModal(false)} />}
        </div>
    )
}
