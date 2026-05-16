import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

export interface TenantUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'manager' | 'lecteur'
  createdAt: string
}

export interface InviteUserPayload {
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'manager' | 'lecteur'
  password: string
}

// ─── Liste des utilisateurs ──────────────────────────────────────────────────
export const useUsers = () => {
  return useQuery<TenantUser[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users')
      return data
    },
  })
}

// ─── Inviter un utilisateur ──────────────────────────────────────────────────
export const useInviteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: InviteUserPayload) => {
      const { data } = await api.post('/users/invite', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur invité avec succès — un email de bienvenue a été envoyé')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Erreur lors de l'invitation"
      toast.error(msg)
    },
  })
}

// ─── Modifier le rôle ────────────────────────────────────────────────────────
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data } = await api.put(`/users/${userId}/role`, { role })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Rôle mis à jour')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la mise à jour du rôle'
      toast.error(msg)
    },
  })
}

// ─── Révoquer un utilisateur ─────────────────────────────────────────────────
export const useRemoveUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.delete(`/users/${userId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur révoqué')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erreur lors de la révocation'
      toast.error(msg)
    },
  })
}
