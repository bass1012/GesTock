import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export interface Warehouse {
  id: string
  name: string
  address?: string
  is_active: boolean
}

export const useWarehouses = () => {
  return useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data } = await api.get('/warehouses')
      return data
    },
  })
}
