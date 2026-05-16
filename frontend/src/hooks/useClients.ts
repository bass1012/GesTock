import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

export function useClients() {
  const queryClient = useQueryClient()

  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get('/clients')
      return data as any[]
    },
  })

  const createClientMutation = useMutation({
    mutationFn: async (clientData: {
      name: string
      email?: string
      phone?: string
      address?: string
    }) => {
      const { data } = await api.post('/clients', clientData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client créé avec succès')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la création du client')
    },
  })

  return {
    clients: clientsQuery.data || [],
    isLoading: clientsQuery.isLoading,
    createClient: createClientMutation.mutateAsync,
    isCreating: createClientMutation.isPending,
  }
}
