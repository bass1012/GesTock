import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

export interface ApiKey {
  id: string
  name: string
  key?: string // Seulement présent à la création
  lastUsedAt: string | null
  createdAt: string
}

export const useApiKeys = () => {
  const queryClient = useQueryClient()

  const list = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data } = await api.get('/api-keys')
      return data.data
    },
    retry: false,
  })

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/api-keys', { name })
      return data.data as ApiKey
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('Clé API générée avec succès')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la génération')
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api-keys/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('Clé API révoquée')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la révocation')
    },
  })

  return { list, create, remove }
}
