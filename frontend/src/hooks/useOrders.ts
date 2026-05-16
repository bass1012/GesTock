import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

interface OrderItem {
  id?: string
  productId: string
  productName?: string
  productSku?: string
  quantity: number
  unitPrice: number
}

export interface PurchaseOrder {
  id: string
  supplierId: string
  supplierName: string
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED'
  totalAmount: number
  expectedDate?: string | null
  createdAt: string
  updatedAt: string
  items?: OrderItem[]
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get<PurchaseOrder[]>('/orders')
      return data
    },
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (order: Partial<PurchaseOrder>) => {
      const { data } = await api.post<PurchaseOrder>('/orders', order)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Commande créée avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la création de la commande')
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.put<PurchaseOrder>(`/orders/${id}/status`, { status })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] }) // Update stock on products list
      queryClient.invalidateQueries({ queryKey: ['movements'] }) // Adding received creates movements
      toast.success('Statut de la commande mis à jour')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du statut')
    },
  })
}
