import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

export interface SupplierReturnItem {
  id: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
}

export interface SupplierReturn {
  id: string
  supplierId: string
  supplierName: string
  warehouseId: string | null
  status: string
  reason: string | null
  reference: string
  createdAt: string
  updatedAt: string
  items?: SupplierReturnItem[]
}

export function useSupplierReturns() {
  return useQuery({
    queryKey: ['supplier-returns'],
    queryFn: async () => {
      const { data } = await api.get<{ returns: SupplierReturn[] }>('/suppliers/returns')
      return data.returns
    },
  })
}

export function useCreateSupplierReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      supplierId: string
      warehouseId?: string
      reason?: string
      items: { productId: string; quantity: number; unitPrice?: number }[]
    }) => {
      const { data } = await api.post<SupplierReturn>('/suppliers/returns', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-returns'] })
      queryClient.invalidateQueries({ queryKey: ['movements'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Retour fournisseur créé avec succès')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors du retour fournisseur')
    },
  })
}
