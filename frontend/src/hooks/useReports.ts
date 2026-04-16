import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export interface DashboardStats {
    totalProducts: number
    totalStockValue: number
    lowStockCount: number
    totalMovementsToday: number
    totalMovementsWeek: number
    purchaseOrdersPending: number
    topProducts: Array<{
        id: string
        name: string
        sku: string
        currentStock: number
        value: number
    }>
    stockByCategory: Array<{
        category: string
        count: number
        value: number
    }>
    movementsByType: Array<{
        type: string
        count: number
        quantity: number
    }>
}

export interface InventoryReport {
    products: Array<{
        id: string
        sku: string
        name: string
        category: string | null
        unit: string
        currentStock: number
        minStock: number
        price: number
        stockValue: number
        status: 'OK' | 'LOW' | 'OUT'
    }>
    summary: {
        totalProducts: number
        totalValue: number
        lowStockProducts: number
        outOfStock: number
    }
}

export interface MovementReport {
    movements: Array<{
        id: string
        productName: string
        productSku: string
        type: string
        quantity: number
        reference: string | null
        note: string | null
        createdAt: string
    }>
    summary: {
        totalMovements: number
        totalIn: number
        totalOut: number
        totalAdjustments: number
    }
}

export const useDashboardStats = () => {
    return useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const { data } = await api.get('/reports/dashboard')
            return data.data
        },
    })
}

export const useInventoryReport = (filters?: { categoryId?: string; status?: string }) => {
    return useQuery<InventoryReport>({
        queryKey: ['inventory-report', filters],
        queryFn: async () => {
            const { data } = await api.get('/reports/inventory', { params: filters })
            return data.data
        },
    })
}

export const useMovementReport = (filters?: { startDate?: string; endDate?: string; productId?: string; type?: string }) => {
    return useQuery<MovementReport>({
        queryKey: ['movement-report', filters],
        queryFn: async () => {
            const { data } = await api.get('/reports/movements', { params: filters })
            return data.data
        },
    })
}

export const exportInventoryCSV = async () => {
    const response = await api.get('/reports/export/inventory', {
        responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventaire_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

export const exportMovementsCSV = async (filters?: { startDate?: string; endDate?: string }) => {
    const response = await api.get('/reports/export/movements', {
        params: filters,
        responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mouvements_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

export const useExpiryAlerts = (days: number = 30) => {
    return useQuery<any[]>({
        queryKey: ['expiry-alerts', days],
        queryFn: async () => {
            const { data } = await api.get('/reports/alerts/expiry', { params: { days } })
            return data.data
        },
    })
}

export const useSlowRotationReport = (days: number = 90) => {
    return useQuery<any[]>({
        queryKey: ['slow-rotation-report', days],
        queryFn: async () => {
            const { data } = await api.get('/reports/rotation/slow', { params: { days } })
            return data.data
        },
    })
}
