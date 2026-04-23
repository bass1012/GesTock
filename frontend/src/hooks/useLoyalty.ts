import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export interface LoyaltyTransaction {
    id: string
    type: 'EARN' | 'REDEEM'
    points: number
    description: string
    saleReference: string | null
    createdAt: string
}

export interface ClientLoyalty {
    id: string
    name: string
    email: string | null
    phone: string | null
    loyaltyPoints: number
    totalSpent: number
    discountAvailable: number
    transactions: LoyaltyTransaction[]
}

export function useClientLoyalty(clientId: string | null) {
    return useQuery({
        queryKey: ['loyalty', clientId],
        queryFn: async () => {
            const { data } = await api.get(`/loyalty/clients/${clientId}`)
            return data as ClientLoyalty
        },
        enabled: !!clientId,
        staleTime: 30_000,
    })
}
