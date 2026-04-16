import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export interface StockAlert {
  id: string
  sku: string
  name: string
  minStock: number
  currentStock: number
  unit: string
}

export const useStockAlerts = () => {
  return useQuery<StockAlert[]>({
    queryKey: ['stock-alerts'],
    queryFn: async () => {
      const { data } = await api.get('/alerts/stock')
      return data
    },
    refetchInterval: 30000, // Refresh every 30s
  })
}
