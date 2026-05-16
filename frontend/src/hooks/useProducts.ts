import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  categoryId?: string
  category?: { id: string; name: string }
  unit: string
  minStock: number
  currentStock: number
  price: number
  expiryDate: string | null
  batchNumber: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  warehouses: { id: string; name: string; quantity: number }[]
}

export interface ProductFormData {
  sku: string
  name: string
  description?: string | null
  categoryId?: string | null
  warehouseId?: string | null
  unit: string
  minStock: number
  currentStock: number
  price: number
  expiryDate?: string | null
  batchNumber?: string | null
  isActive?: boolean
}

interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  limit: number
}

export const useProducts = (page = 1, limit = 20, search = '') => {
  return useQuery<ProductsResponse>({
    queryKey: ['products', page, limit, search],
    queryFn: async () => {
      const { data } = await api.get('/products', {
        params: { page, limit, search },
      })
      return data
    },
  })
}

// useProduct removed (unused)

export const useCreateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (product: ProductFormData) => {
      const { data } = await api.post('/products', product)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit créé avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la création du produit')
    },
  })
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...product }: ProductFormData & { id: string }) => {
      const { data } = await api.put(`/products/${id}`, product)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit mis à jour')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour')
    },
  })
}

export const useDeleteProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit supprimé')
    },
    onError: () => {
      toast.error('Erreur lors de la suppression')
    },
  })
}
