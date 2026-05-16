import { useState } from 'react'
import {
  Settings,
  CreditCard,
  Receipt,
  Check,
  AlertTriangle,
  ExternalLink,
  Users,
  Warehouse,
  Package,
  Loader2,
  Key,
  Plus,
  Trash2,
  Copy,
} from 'lucide-react'
import { usePlans, useBillingInfo, useInvoices, usePlanUsage } from '../../hooks/useBilling'
import { useApiKeys } from '../../hooks/useApiKeys'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

// Plan Card Component
function PlanCard({
  name,
  plan,
  currentPlan,
  isActive,
  onSelect,
}: {
  name: string
  plan: {
    name: string
    price: number
    productLimit: number
    userLimit: number
    warehouseLimit: number
    features: string[]
  }
  currentPlan: string
  isActive: boolean
  onSelect: () => void
}) {
  const isCurrent = currentPlan === name.toLowerCase()

  return (
    <div
      className={`card p-6 relative ${isActive ? 'ring-2 ring-blue-500' : ''} ${isCurrent ? 'border-blue-500 border-2' : ''}`}
    >
      {isCurrent && (
        <span className="absolute -top-3 left-4 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
          Plan actuel
        </span>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-bold text-gray-900">
            {plan.price.toLocaleString('fr-FR')} F CFA
          </span>
          <span className="text-gray-500">/mois</span>
        </div>
      </div>

      <ul className="space-y-2 mb-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
            <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={`w-full btn ${isCurrent ? 'btn-secondary cursor-default' : 'btn-primary'}`}
      >
        {isCurrent ? 'Actif' : 'Sélectionner'}
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'billing' | 'api'>('general')
  const { user, tenant } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  // API Keys logic
  const { list: apiKeys, create: createApiKey, remove: removeApiKey } = useApiKeys()
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)

  // Billing hooks
  const { data: plansData, isLoading: plansLoading } = usePlans()
  const { data: billingData, isLoading: billingLoading } = useBillingInfo()
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices()
  const { data: usageData } = usePlanUsage()

  const plans = plansData?.data
  const billing = billingData?.data
  const invoices = invoicesData?.data || []

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trialing: 'bg-blue-100 text-blue-800',
      canceled: 'bg-gray-100 text-gray-800',
      past_due: 'bg-red-100 text-red-800',
      unpaid: 'bg-red-100 text-red-800',
    }
    const labels: Record<string, string> = {
      active: 'Actif',
      trialing: 'Essai',
      canceled: 'Annulé',
      past_due: 'Impayé',
      unpaid: 'Non payé',
    }
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 mt-1">Configuration de votre espace et facturation</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {[
            { id: 'general', label: 'Général', icon: Settings },
            { id: 'billing', label: 'Facturation', icon: CreditCard },
            ...(isAdmin ? [{ id: 'api', label: 'Intégrations & API', icon: Key }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de l'espace</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="company-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nom de l'entreprise
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={tenant?.name || ''}
                  readOnly
                  disabled
                  className="input w-full bg-gray-50"
                />
              </div>
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1">Plan actuel</p>
                <div className="flex items-center gap-2">
                  <span className="input w-full bg-gray-50 capitalize">
                    {billing?.plan || 'Starter'}
                  </span>
                  {billing && getStatusBadge(billing.status)}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilisation du plan</h3>
            <div className="space-y-5">
              {plans && billing ? (
                <>
                  {/* Produits */}
                  {(() => {
                    const limit = plans[billing.plan].productLimit
                    const used = usageData?.productsCount ?? 0
                    const isUnlimited = limit === Infinity || limit === null
                    const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
                    const color =
                      pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500'
                    return (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Package size={16} className="text-blue-500" /> Produits
                          </span>
                          <span
                            className={`text-sm font-bold ${pct >= 90 ? 'text-red-600' : 'text-gray-600'}`}
                          >
                            {isUnlimited ? `${used} / Illimité` : `${used} / ${limit}`}
                          </span>
                        </div>
                        {!isUnlimited && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${color}`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        )}
                        {pct >= 90 && !isUnlimited && (
                          <p className="text-xs text-red-500 mt-1">
                            ⚠️ Quota presque atteint : passez au plan supérieur
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  {/* Utilisateurs */}
                  {(() => {
                    const limit = plans[billing.plan].userLimit
                    const used = usageData?.usersCount ?? 0
                    const isUnlimited = limit === Infinity || limit === null
                    const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
                    const color =
                      pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-green-500'
                    return (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Users size={16} className="text-green-500" /> Utilisateurs
                          </span>
                          <span
                            className={`text-sm font-bold ${pct >= 90 ? 'text-red-600' : 'text-gray-600'}`}
                          >
                            {isUnlimited ? `${used} / Illimité` : `${used} / ${limit}`}
                          </span>
                        </div>
                        {!isUnlimited && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${color}`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        )}
                        {pct >= 90 && !isUnlimited && (
                          <p className="text-xs text-red-500 mt-1">
                            ⚠️ Quota presque atteint : passez au plan supérieur
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  {/* Entrepôts */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Warehouse size={16} className="text-purple-500" /> Entrepôts
                      </span>
                      <span className="text-sm font-bold text-gray-600">
                        {plans[billing.plan].warehouseLimit === Infinity ||
                        plans[billing.plan].warehouseLimit === null
                          ? 'Illimité'
                          : `Max ${plans[billing.plan].warehouseLimit}`}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="animate-spin text-gray-400" size={20} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Current Subscription */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Abonnement actuel</h3>
            {billingLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            ) : billing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Plan</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">{billing.plan}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Statut</p>
                    {getStatusBadge(billing.status)}
                  </div>
                </div>

                {/* Stripe specific management removed */}

                {!billing.stripeSubscriptionId && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Vous êtes actuellement en essai ou sur le plan gratuit. Sélectionnez un plan
                      ci-dessous pour vous abonner.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Chargement des informations…</p>
            )}
          </div>

          {/* Plans - Mode Offline Mobile Money */}
          {isAdmin && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Changer de plan (Paiement Mobile Money)
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-blue-600" />
                  Procédure de paiement et d'activation
                </h4>
                <p className="text-sm text-blue-800 mb-4">
                  Pour activer ou renouveler votre compte Pro / Enterprise, veuillez effectuer un
                  dépôt Mobile Money (Wave, Orange, MTN ou Moov) sur l'un de nos numéros
                  professionnels. L'activation de votre compte se fera manuellement dans les minutes
                  qui suivent.
                </p>
                <ul className="list-disc list-inside text-sm text-blue-800 font-medium space-y-1 mb-4">
                  <li>
                    Wave CI : <strong>+225 00 00 00 00 00</strong>
                  </li>
                  <li>
                    Orange Money : <strong>+225 00 00 00 00 00</strong>
                  </li>
                </ul>
                <a
                  href="https://wa.me/2250000000000?text=Bonjour,%20je%20viens%20d'effectuer%20un%20paiement%20pour%20mon%20compte%20GesStock…"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <ExternalLink size={16} /> Contacter le Support WhatsApp
                </a>
              </div>

              {plansLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="animate-spin text-gray-400" size={24} />
                </div>
              ) : plans ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PlanCard
                    name="Starter"
                    plan={plans.starter}
                    currentPlan={billing?.plan || 'starter'}
                    isActive={false}
                    onSelect={() =>
                      toast.success('Pour rester sur Starter, aucune action requise.')
                    }
                  />
                  <PlanCard
                    name="Pro"
                    plan={plans.pro}
                    currentPlan={billing?.plan || 'starter'}
                    isActive={true}
                    onSelect={() =>
                      toast('Effectuez le dépôt puis contactez-nous sur WhatsApp !', { icon: '📲' })
                    }
                  />
                  <PlanCard
                    name="Enterprise"
                    plan={plans.enterprise}
                    currentPlan={billing?.plan || 'starter'}
                    isActive={false}
                    onSelect={() =>
                      toast('Effectuez le dépôt puis contactez-nous sur WhatsApp !', { icon: '📲' })
                    }
                  />
                </div>
              ) : (
                <p className="text-gray-500">Chargement des plans…</p>
              )}
            </div>
          )}

          {/* Invoices */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt size={20} />
              Historique des factures
            </h3>
            {invoicesLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            ) : invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                        Date
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                        Montant
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                        Statut
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {invoice.amount.toFixed(2)} F CFA
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'open'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {invoice.status === 'paid'
                              ? 'Payée'
                              : invoice.status === 'open'
                                ? 'En attente'
                                : invoice.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {invoice.invoicePdf && (
                            <a
                              href={invoice.invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Télécharger
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucune facture disponible</p>
            )}
          </div>
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && isAdmin && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Clés d'API externes</h3>
                <p className="text-sm text-gray-500">
                  Utilisez ces clés pour connecter votre site e-commerce ou logiciel comptable.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nom de la clé (ex: WooCommerce)"
                  className="input text-sm px-3 py-1.5"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
                <button
                  onClick={async () => {
                    if (!newKeyName) return toast.error('Donnez un nom à la clé')
                    const res = await createApiKey.mutateAsync(newKeyName)
                    setGeneratedKey(res.key || null)
                    setNewKeyName('')
                  }}
                  disabled={createApiKey.isPending}
                  className="btn btn-primary text-sm flex items-center gap-2"
                >
                  {createApiKey.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Générer
                </button>
              </div>
            </div>

            {generatedKey && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in zoom-in-95 duration-300">
                <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} />
                  Copiez votre clé maintenant !
                </h4>
                <p className="text-xs text-amber-700 mb-3">
                  Pour des raisons de sécurité, cette clé ne sera plus jamais affichée.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white border border-amber-300 rounded font-mono text-sm break-all">
                    {generatedKey}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedKey)
                      toast.success('Copié !')
                    }}
                    className="p-2 bg-white border border-amber-300 rounded hover:bg-amber-100 text-amber-600"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <button
                  onClick={() => setGeneratedKey(null)}
                  className="mt-3 text-xs text-amber-800 font-medium hover:underline"
                >
                  J'ai bien noté la clé
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                      Nom
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                      Créée le
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                      Dernière utilisation
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {apiKeys?.data?.map((key) => (
                    <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Key size={14} className="text-blue-500" />
                          <span className="text-sm font-medium text-gray-900">{key.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(key.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Jamais utilisée'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "Révoquer cette clé ? Les services l'utilisant ne pourront plus se connecter.",
                              )
                            ) {
                              removeApiKey.mutate(key.id)
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!apiKeys?.data || apiKeys.data.length === 0) && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500 text-sm">
                        Aucune clé API active. Générez-en une pour commencer l'intégration.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6 bg-blue-50 border-blue-100">
            <h3 className="text-sm font-bold text-blue-900 mb-2">Documentation rapide</h3>
            <p className="text-xs text-blue-800 leading-relaxed space-y-2">
              Pour utiliser l'API, ajoutez le header suivant à vos requêtes HTTP :<br />
              <code className="bg-white border border-blue-200 px-1 py-0.5 rounded text-blue-600 font-mono">
                X-API-Key: VOTRE_CLE_ICI
              </code>
            </p>
            <ul className="mt-3 space-y-1">
              <li className="text-[10px] text-blue-600 flex items-center gap-1">
                <Check size={10} /> Accès complet aux produits, stocks et ventes du tenant.
              </li>
              <li className="text-[10px] text-blue-600 flex items-center gap-1">
                <Check size={10} /> Débit limité à 100 requêtes / minute.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
