import { useSales } from '../../hooks/useSales';
import { format } from 'date-fns';
import { Receipt, FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SalesPage() {
    const { sales, isLoading } = useSales();

    const redownloadReceipt = async (sale: any) => {
        try {
            const loadingToast = toast.loading('Génération du reçu...');
            const { data: fullSale } = await api.get(`/sales/${sale.id}`);
            
            const doc = new jsPDF();
            
            doc.setFontSize(22);
            doc.setTextColor(37, 99, 235);
            doc.text('GesStock Copie', 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Reçu N° : ${sale.reference}`, 14, 30);
            doc.text(`Date : ${format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm')}`, 14, 36);

            const tableBody = fullSale.items.map((item: any) => ([
                item.product.name,
                item.quantity.toString(),
                item.unitPrice.toLocaleString('fr-FR').replace(/\s/g, ' '),
                (item.unitPrice * item.quantity).toLocaleString('fr-FR').replace(/\s/g, ' ')
            ]));

            autoTable(doc, {
                startY: 50,
                head: [['Produit', 'Qté', 'Prix Unitaire', 'Total']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [100, 100, 100] },
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`TOTAL : ${sale.totalAmount.toLocaleString('fr-FR').replace(/\s/g, ' ')} F CFA`, 140, finalY);

            doc.save(`Duplicata_${sale.reference}.pdf`);
            toast.dismiss(loadingToast);
            toast.success('Le reçu a été téléchargé !');
        } catch (error) {
            console.error(error);
            toast.error('Erreur lors du téléchargement');
        }
    };

    if (isLoading) return <div className="p-8">Chargement de l'historique...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Historique des Ventes</h1>
                    <p className="text-sm text-gray-500 mt-1">Gérez vos factures et tickets de caisse</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-500">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr>
                            <th className="px-6 py-4">Réf</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Articles (Qté)</th>
                            <th className="px-6 py-4">Montant Vente</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sales.map((sale: any) => (
                            <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                    <Receipt size={16} className="text-primary-500" />
                                    {sale.reference}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {format(new Date(sale.createdAt), 'dd MMMM yyyy HH:mm')}
                                </td>
                                <td className="px-6 py-4">
                                    {sale._count?.items}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">
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
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                    Aucune vente réalisée pour le moment. Allez sur « Terminal Caisse » pour encaisser !
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
