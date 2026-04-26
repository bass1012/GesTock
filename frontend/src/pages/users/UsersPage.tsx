import { useState } from 'react'
import {
  Users,
  UserPlus,
  Shield,
  Eye,
  Briefcase,
  Trash2,
  ChevronDown,
  X,
  Loader2,
  Mail,
  Lock,
  User,
} from 'lucide-react'
import {
  useUsers,
  useInviteUser,
  useUpdateUserRole,
  useRemoveUser,
  type TenantUser,
  type InviteUserPayload,
} from '../../hooks/useUsers'
import { useAuthStore } from '../../store/authStore'

// ─── Constantes rôles ────────────────────────────────────────────────────────
const ROLES: { value: TenantUser['role']; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'admin',    label: 'Administrateur', icon: Shield,   color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'manager',  label: 'Manager',        icon: Briefcase, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'lecteur',  label: 'Lecteur',        icon: Eye,       color: 'text-gray-600 bg-gray-50 border-gray-200' },
]

function roleMeta(role: TenantUser['role']) {
  return ROLES.find((r) => r.value === role) ?? ROLES[2]
}

// ─── Badge rôle ──────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: TenantUser['role'] }) {
  const meta = roleMeta(role)
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.color}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  )
}

// ─── Dropdown rôle ───────────────────────────────────────────────────────────
function RoleDropdown({
  userId,
  current,
  disabled,
}: {
  userId: string
  current: TenantUser['role']
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const updateRole = useUpdateUserRole()
  const meta = roleMeta(current)
  const Icon = meta.icon

  return (
    <div className="relative inline-block">
      <button
        disabled={disabled || updateRole.isPending}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-opacity ${meta.color} ${disabled || updateRole.isPending ? 'opacity-50 cursor-default' : 'hover:opacity-80 cursor-pointer'}`}
      >
        {updateRole.isPending ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <Icon size={11} />
        )}
        {meta.label}
        {!disabled && !updateRole.isPending && <ChevronDown size={11} className="ml-0.5" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 overflow-hidden">
            {ROLES.map((r) => {
              const RIcon = r.icon
              return (
                <button
                  key={r.value}
                  onClick={() => {
                    setOpen(false)
                    if (r.value !== current) updateRole.mutate({ userId, role: r.value })
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    r.value === current
                      ? 'bg-gray-50 text-gray-500 cursor-default'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RIcon size={14} />
                  {r.label}
                  {r.value === current && <span className="ml-auto text-xs text-gray-400">actuel</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Modal d'invitation ──────────────────────────────────────────────────────
function InviteModal({ onClose }: { onClose: () => void }) {
  const inviteUser = useInviteUser()
  const [form, setForm] = useState<InviteUserPayload>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'manager',
    password: '',
  })

  const set = (k: keyof InviteUserPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await inviteUser.mutateAsync(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <UserPlus size={18} className="text-blue-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Inviter un utilisateur</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prénom</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={set('firstName')}
                  placeholder="Jean"
                  className="input w-full pl-8 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={set('lastName')}
                placeholder="Dupont"
                className="input w-full text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={set('email')}
                placeholder="jean.dupont@entreprise.com"
                className="input w-full pl-8 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rôle</label>
            <select value={form.role} onChange={set('role')} className="input w-full text-sm">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {form.role === 'admin' && 'Accès total à toutes les fonctionnalités et à la gestion des utilisateurs.'}
              {form.role === 'manager' && 'Peut gérer les stocks, fournisseurs et commandes. Ne peut pas modifier les utilisateurs.'}
              {form.role === 'lecteur' && 'Accès en lecture seule. Ne peut pas créer ni modifier de données.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe temporaire</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                minLength={8}
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 8 caractères"
                className="input w-full pl-8 text-sm font-mono"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">L'utilisateur le recevra par email et devra le changer.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 text-sm">
              Annuler
            </button>
            <button
              type="submit"
              disabled={inviteUser.isPending}
              className="btn btn-primary flex-1 text-sm flex items-center justify-center gap-2"
            >
              {inviteUser.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Envoi...</>
              ) : (
                <><UserPlus size={14} /> Inviter</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function UsersPage() {
  const [showInvite, setShowInvite] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const { user: me } = useAuthStore()
  const isAdmin = me?.role === 'admin'

  const { data: users = [], isLoading } = useUsers()
  const removeUser = useRemoveUser()

  const handleRemove = async (u: TenantUser) => {
    if (!confirm(`Révoquer l'accès de ${u.firstName} ${u.lastName} ?`)) return
    setRemoving(u.id)
    await removeUser.mutateAsync(u.id).finally(() => setRemoving(null))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
            <p className="text-gray-500 mt-1">
              {users.length} membre{users.length > 1 ? 's' : ''} dans votre espace
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <UserPlus size={16} />
              Inviter un utilisateur
            </button>
          )}
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4">
          {ROLES.map((r) => {
            const Icon = r.icon
            const count = users.filter((u) => u.role === r.value).length
            return (
              <div key={r.value} className="card p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${r.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-500">{r.label}{count > 1 ? 's' : ''}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Aucun utilisateur</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Utilisateur</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Rôle</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Membre depuis</th>
                    {isAdmin && (
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => {
                    const isMe = u.id === me?.id
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        {/* Avatar + nom */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                              {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {u.firstName} {u.lastName}
                                {isMe && (
                                  <span className="ml-2 text-xs text-gray-400 font-normal">(vous)</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>

                        {/* Rôle */}
                        <td className="px-6 py-4">
                          {isAdmin && !isMe ? (
                            <RoleDropdown userId={u.id} current={u.role} disabled={false} />
                          ) : (
                            <RoleBadge role={u.role} />
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(u.createdAt)}</td>

                        {/* Actions */}
                        {isAdmin && (
                          <td className="px-6 py-4">
                            {!isMe && (
                              <button
                                onClick={() => handleRemove(u)}
                                disabled={removing === u.id}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Révoquer l'accès"
                              >
                                {removing === u.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Note permissions */}
        {!isAdmin && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Seuls les administrateurs peuvent inviter ou modifier des utilisateurs.
          </div>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </>
  )
}
