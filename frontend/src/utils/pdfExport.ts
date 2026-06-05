import api from '../services/api'

/**
 * Downloads the Inventory PDF Report from the backend.
 */
export const exportInventoryToPDF = async (categoryId?: string, status?: string) => {
  try {
    const params = new URLSearchParams()
    if (categoryId) params.append('categoryId', categoryId)
    if (status) params.append('status', status)

    const response = await api.get(`/reports/export/inventory/pdf?${params.toString()}`, {
      responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `Inventaire_${new Date().toISOString().slice(0, 10)}.pdf`
    link.click()
  } catch (error) {
    console.error('Error downloading inventory PDF:', error)
  }
}

/**
 * Downloads the Movements PDF Report from the backend.
 */
export const exportMovementsToPDF = async (options?: {
  startDate?: string
  endDate?: string
  productId?: string
  type?: string
}) => {
  try {
    const params = new URLSearchParams()
    if (options?.startDate) params.append('startDate', options.startDate)
    if (options?.endDate) params.append('endDate', options.endDate)
    if (options?.productId) params.append('productId', options.productId)
    if (options?.type) params.append('type', options.type)

    const response = await api.get(`/reports/export/movements/pdf?${params.toString()}`, {
      responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `Mouvements_${new Date().toISOString().slice(0, 10)}.pdf`
    link.click()
  } catch (error) {
    console.error('Error downloading movements PDF:', error)
  }
}

/**
 * Downloads the Sale receipt/invoice PDF from the backend.
 */
export const downloadReceiptPDF = async (saleId: string, reference: string) => {
  try {
    const response = await api.get(`/sales/${saleId}/pdf`, {
      responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `Recu_${reference}.pdf`
    link.click()
  } catch (error) {
    console.error('Error downloading receipt PDF:', error)
  }
}
