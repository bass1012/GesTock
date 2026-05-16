import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

export interface StockMovement {
  id: string
  productId: string
  product: { id: string; name: string; sku: string }
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  quantity: number
  reference: string | null
  note: string | null
  createdBy: string | null
  warehouse?: { id: string; name: string }
  createdAt: string
}

export interface MovementsResponse {
  movements: StockMovement[]
  total: number
  page: number
  limit: number
}

export function useStockMovements(page = 1, limit = 20, productId?: string) {
  return useQuery({
    queryKey: ['movements', page, limit, productId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      if (productId) params.append('productId', productId)

      const { data } = await api.get<MovementsResponse>(`/stock/movements?${params.toString()}`)
      return data
    },
  })
}

export function useCreateMovement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (movement: Partial<StockMovement>) => {
      const { data } = await api.post<StockMovement>('/stock/movements', movement)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] })
      queryClient.invalidateQueries({ queryKey: ['products'] }) // Stock changes
      toast.success('Mouvement enregistré avec succès')
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement du mouvement")
    },
  })
}
