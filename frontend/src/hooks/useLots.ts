import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'ok'

export interface StockLot {
  id: string
  productId: string
  productName: string
  productSku: string
  productUnit: string | null
  warehouseId: string | null
  warehouseName: string | null
  batchNumber: string | null
  expiryDate: string | null
  daysRemaining: number | null
  expiryStatus: ExpiryStatus | null
  quantity: number
  reference: string | null
  receivedAt: string
}

export function useLots(productId?: string) {
  return useQuery({
    queryKey: ['stock-lots', productId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (productId) params.append('productId', productId)
      const { data } = await api.get<{ lots: StockLot[] }>(`/stock/lots?${params.toString()}`)
      return data.lots
    },
  })
}
