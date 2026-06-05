import { useSales } from '../../hooks/useSales'
import { format } from 'date-fns'
import { Receipt, FileText, Download } from 'lucide-react'
import { downloadReceiptPDF } from '../../utils/pdfExport'
import toast from 'react-hot-toast'

const formatSaleDate = (d: string) => format(new Date(d), 'dd MMMM yyyy HH:mm')

export default function SalesPage() {
  const { sales, isLoading } = useSales()

  const redownloadReceipt = async (sale: any) => {
    try {
      const loadingToast = toast.loading('Téléchargement du reçu…')
      await downloadReceiptPDF(sale.id, sale.reference)
      toast.dismiss(loadingToast)
      toast.success('Le reçu a été téléchargé !')
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors du téléchargement')
    }
  }

  if (isLoading) return <div className="p-8">Chargement de l'historique…</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Historique des Ventes</h1>
          <p className="text-sm text-zinc-500 mt-1">Gérez vos factures et tickets de caisse</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-500">
          <thead className="bg-zinc-50 text-xs text-zinc-700 uppercase">
            <tr>
              <th className="px-6 py-4">Réf</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Articles (Qté)</th>
              <th className="px-6 py-4">Montant Vente</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sales.map((sale: any) => (
              <tr key={sale.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 font-medium text-zinc-900 flex items-center gap-2">
                  <Receipt size={16} className="text-primary-500" />
                  {sale.reference}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{formatSaleDate(sale.createdAt)}</td>
                <td className="px-6 py-4">{sale._count?.items}</td>
                <td className="px-6 py-4 font-bold text-zinc-900">
                  {sale.totalAmount.toLocaleString('fr-FR')} F
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => redownloadReceipt(sale)}
                    className="text-primary-600 hover:text-primary-800 flex items-center justify-end gap-1 font-medium"
                  >
                    <Download size={16} /> Reçu PDF
                  </button>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                  <FileText className="mx-auto size-12 text-zinc-300 mb-3" />
                  Aucune vente réalisée pour le moment. Allez sur « Terminal Caisse » pour encaisser
                  !
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
