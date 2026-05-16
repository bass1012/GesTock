import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { InventoryReport, MovementReport } from '../hooks/useReports'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const exportInventoryToPDF = (report: InventoryReport) => {
  const doc = new jsPDF()
  const date = format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })

  // Header
  doc.setFontSize(20)
  doc.text('GesStock SaaS', 14, 22)
  doc.setFontSize(14)
  doc.text("Rapport d'Inventaire", 14, 32)
  doc.setFontSize(10)
  doc.text(`Généré le : ${date}`, 14, 40)
  doc.text(
    `Valeur Totale : ${report.summary.totalValue.toLocaleString('fr-FR').replace(/\s/g, ' ')} F CFA`,
    14,
    46,
  )

  // Alert indicator
  if (report.summary.lowStockProducts > 0 || report.summary.outOfStock > 0) {
    doc.setTextColor(220, 38, 38)
    doc.text(
      `Alerte : ${report.summary.lowStockProducts} stock(s) faible(s), ${report.summary.outOfStock} rupture(s)`,
      14,
      52,
    )
    doc.setTextColor(0, 0, 0)
  }

  const tableColumn = [
    'SKU',
    'Produit',
    'Catégorie',
    'Stock Actuel',
    'Seuil Min',
    'Prix U.',
    'Valeur',
    'Statut',
  ]
  const tableRows: (string | number)[][] = []

  report.products.forEach((product) => {
    const productData = [
      product.sku,
      product.name,
      product.category || 'N/A',
      product.currentStock.toString(),
      product.minStock.toString(),
      product.price.toLocaleString('fr-FR').replace(/\s/g, ' '),
      product.stockValue.toLocaleString('fr-FR').replace(/\s/g, ' '),
      product.status === 'OK' ? 'Normal' : product.status === 'LOW' ? 'Faible' : 'Rupture',
    ]
    tableRows.push(productData)
  })

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 60,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 7) {
        if (data.cell.raw === 'Rupture') data.cell.styles.textColor = [220, 38, 38]
        if (data.cell.raw === 'Faible') data.cell.styles.textColor = [234, 179, 8]
      }
    },
  })

  doc.save(`Inventaire_GesStock_${format(new Date(), 'yyyyMMdd')}.pdf`)
}

export const exportMovementsToPDF = (report: MovementReport, dateRangeStr: string) => {
  const doc = new jsPDF()
  const date = format(new Date(), 'dd MMM yyyy', { locale: fr })

  doc.setFontSize(20)
  doc.text('GesStock SaaS', 14, 22)
  doc.setFontSize(14)
  doc.text(`Rapport des Mouvements (${dateRangeStr})`, 14, 32)
  doc.setFontSize(10)
  doc.text(`Généré le : ${date}`, 14, 40)
  doc.text(
    `Volume Total : ${report.summary.totalMovements} actions (${report.summary.totalIn} entrées / ${report.summary.totalOut} sorties)`,
    14,
    46,
  )

  const tableColumn = ['Date', 'Produit', 'SKU', 'Type', 'Quantité', 'Référence', 'Note']
  const tableRows: (string | number)[][] = []

  report.movements.forEach((m) => {
    const typeMap: Record<string, string> = {
      IN: '+ Entrée',
      OUT: '- Sortie',
      ADJUSTMENT: 'Ajustement',
      TRANSFER: 'Transfert',
    }

    // Formatage de la taille des données encombrantes pour éviter de surcharger le document
    const shortProductName =
      m.productName.length > 20 ? `${m.productName.substring(0, 20)}..` : m.productName
    const shortRef =
      m.reference && m.reference.length > 12
        ? `${m.reference.substring(0, 12)}..`
        : m.reference || '-'
    const shortNote = m.note && m.note.length > 20 ? `${m.note.substring(0, 20)}..` : m.note || '-'

    const movementData = [
      format(new Date(m.createdAt), 'dd/MM/yyyy HH:mm'),
      shortProductName,
      m.productSku,
      typeMap[m.type] || m.type,
      m.quantity.toString(),
      shortRef,
      shortNote,
    ]
    tableRows.push(movementData)
  })

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 55,
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] },
    styles: { fontSize: 9 },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === '+ Entrée') data.cell.styles.textColor = [16, 185, 129]
        if (data.cell.raw === '- Sortie') data.cell.styles.textColor = [239, 68, 68]
      }
    },
  })

  doc.save(`Mouvements_GesStock_${format(new Date(), 'yyyyMMdd')}.pdf`)
}
