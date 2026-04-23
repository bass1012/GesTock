import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import toast from 'react-hot-toast'

export interface TransferData {
    productId: string
    sourceWarehouseId: string
    destWarehouseId: string
    quantity: number
    note?: string
}

export const useTransfers = () => {
    const queryClient = useQueryClient()

    const createTransfer = useMutation({
        mutationFn: async (data: TransferData) => {
            const { data: result } = await api.post('/stock/transfers', data)
            return result
        },
        onSuccess: () => {
            toast.success('Transfert effectué avec succès')
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
            queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] })
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Erreur lors du transfert'
            toast.error(message)
        },
    })

    return { createTransfer }
}
