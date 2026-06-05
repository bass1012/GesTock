import PDFDocument from 'pdfkit'
import { Response } from 'express'

function formatPrice(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export const pdfService = {
  /**
  /**
   * Generates a PDF receipt/invoice for a Sale and writes it directly to the response stream.
   * Thermal cash register format (80mm width / dynamic height).
   */
  async generateReceiptPDF(sale: any, res: Response): Promise<void> {
    const itemHeight = 26
    const calculatedHeight = 250 + (sale.items.length * itemHeight)
    const pageHeight = Math.max(350, calculatedHeight)

    const doc = new PDFDocument({
      margin: 12,
      size: [226, pageHeight]
    })
    doc.pipe(res)

    // Center header
    doc.fontSize(14).fillColor('#18181b').font('Helvetica-Bold').text('GesStock', 12, 12, { align: 'center', width: 202 })
    doc.fontSize(7).fillColor('#71717a').font('Helvetica').text('Terminal Point de Vente', 12, 28, { align: 'center', width: 202 })

    // Separation line
    doc.moveTo(12, 40).lineTo(214, 40).strokeColor('#e4e4e7').lineWidth(1).stroke()

    // Metadata
    let currentY = 46
    doc.fontSize(7).fillColor('#27272a').font('Helvetica-Bold')
    doc.text(`Reçu N° :`, 12, currentY, { width: 60 })
    doc.font('Helvetica').text(sale.reference, 72, currentY, { width: 142, align: 'right' })
    currentY += 10

    doc.font('Helvetica-Bold').text(`Date :`, 12, currentY, { width: 60 })
    doc.font('Helvetica').text(new Date(sale.createdAt).toLocaleString('fr-FR'), 72, currentY, { width: 142, align: 'right' })
    currentY += 10

    const clientName = sale.client?.name || 'Client de passage'
    doc.font('Helvetica-Bold').text(`Client :`, 12, currentY, { width: 60 })
    doc.font('Helvetica').text(clientName, 72, currentY, { width: 142, align: 'right' })
    currentY += 12

    // Table Header Separator
    doc.moveTo(12, currentY).lineTo(214, currentY).strokeColor('#e4e4e7').stroke()
    currentY += 6

    // Items list
    doc.fontSize(8).fillColor('#18181b')
    for (const item of sale.items) {
      const productName = item.product?.name || 'Produit inconnu'
      
      // Line 1: Product Name
      doc.font('Helvetica-Bold').text(productName, 12, currentY, { width: 202 })
      
      // Line 2: Qté x Prix Unitaire (Left) | Total (Right)
      doc.font('Helvetica').text(
        `${item.quantity} x ${formatPrice(item.unitPrice)} F`, 
        20, 
        currentY + 10, 
        { width: 100 }
      )
      doc.font('Helvetica-Bold').text(
        `${formatPrice(item.unitPrice * item.quantity)} F`, 
        120, 
        currentY + 10, 
        { width: 94, align: 'right' }
      )
      
      currentY += itemHeight
    }

    // Totals Separator
    doc.moveTo(12, currentY).lineTo(214, currentY).strokeColor('#e4e4e7').stroke()
    currentY += 8

    // Totals calculation
    const subTotal = sale.items.reduce((acc: number, item: any) => acc + (item.unitPrice * item.quantity), 0)
    
    doc.fontSize(7).font('Helvetica')
    doc.text('Total Brut :', 12, currentY, { width: 100 })
    doc.text(`${formatPrice(subTotal)} F`, 112, currentY, { width: 102, align: 'right' })
    currentY += 10

    if (sale.taxRate && sale.taxRate > 0) {
      const taxAmount = subTotal * (sale.taxRate / 100)
      doc.text(`TVA (${sale.taxRate}%) :`, 12, currentY, { width: 100 })
      doc.text(`${formatPrice(taxAmount)} F`, 112, currentY, { width: 102, align: 'right' })
      currentY += 10
    }

    const discount = sale.pointsToRedeem ? sale.pointsToRedeem * 50 : 0
    if (discount > 0) {
      doc.text('Remise Fidélité :', 12, currentY, { width: 100 })
      doc.text(`-${formatPrice(discount)} F`, 112, currentY, { width: 102, align: 'right' })
      currentY += 10
    }

    // Net Total line
    doc.moveTo(12, currentY).lineTo(214, currentY).strokeColor('#e4e4e7').stroke()
    currentY += 6

    doc.fontSize(9).font('Helvetica-Bold')
    doc.text('NET A PAYER :', 12, currentY, { width: 90 })
    doc.text(`${formatPrice(sale.totalAmount)} F CFA`, 102, currentY, { width: 112, align: 'right' })
    currentY += 18

    // Thank you note
    doc.moveTo(12, currentY).lineTo(214, currentY).strokeColor('#e4e4e7').stroke()
    currentY += 8
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#71717a').text('Merci pour votre visite !', 12, currentY, { align: 'center', width: 202 })

    doc.end()
  },

  /**
   * Generates a PDF Inventory Report.
   */
  async generateInventoryReportPDF(report: any, res: Response): Promise<void> {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    doc.pipe(res)

    // Title / Header
    doc.fontSize(20).fillColor('#18181b').font('Helvetica-Bold').text('GesStock SaaS', 40, 40)
    doc.fontSize(12).fillColor('#71717a').text("Rapport d'Etat d'Inventaire Physique", 40, 62)
    doc.fontSize(9).text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 40, 77)

    // Summary Box
    doc.fontSize(10).fillColor('#18181b').font('Helvetica-Bold').text(`Valeur Totale Stock : ${formatPrice(report.summary.totalValue)} F CFA`, 320, 40, { align: 'right', width: 230 })
    doc.font('Helvetica').fillColor('#dc2626').text(`Alerte(s) : ${report.summary.lowStockProducts} stock(s) faible(s), ${report.summary.outOfStock} rupture(s)`, 320, 55, { align: 'right', width: 230 })

    doc.moveTo(40, 95).lineTo(550, 95).strokeColor('#e4e4e7').stroke()

    // Table Header
    let currentY = 110
    doc.fontSize(9).fillColor('#27272a').font('Helvetica-Bold')
    doc.text('SKU', 40, currentY, { width: 70 })
    doc.text('Produit', 110, currentY, { width: 170 })
    doc.text('Catégorie', 280, currentY, { width: 90 })
    doc.text('Stock', 370, currentY, { width: 45, align: 'right' })
    doc.text('Prix U.', 420, currentY, { width: 65, align: 'right' })
    doc.text('Valeur', 490, currentY, { width: 60, align: 'right' })

    doc.moveTo(40, currentY + 12).lineTo(550, currentY + 12).strokeColor('#e4e4e7').stroke()
    currentY += 20

    // Table Rows
    doc.font('Helvetica').fillColor('#27272a')
    for (const product of report.products) {
      if (currentY > 750) {
        doc.addPage()
        currentY = 40
      }
      doc.text(product.sku, 40, currentY, { width: 70 })
      doc.text(product.name, 110, currentY, { width: 170 })
      doc.text(product.category || 'N/A', 280, currentY, { width: 90 })
      doc.text(product.currentStock.toString(), 370, currentY, { width: 45, align: 'right' })
      doc.text(`${formatPrice(product.price)} F`, 420, currentY, { width: 65, align: 'right' })
      doc.text(`${formatPrice(product.stockValue)} F`, 490, currentY, { width: 60, align: 'right' })
      currentY += 18
    }

    doc.end()
  },

  /**
   * Generates a PDF Movement Report.
   */
  async generateMovementReportPDF(report: any, res: Response): Promise<void> {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    doc.pipe(res)

    // Title / Header
    doc.fontSize(20).fillColor('#18181b').font('Helvetica-Bold').text('GesStock SaaS', 40, 40)
    doc.fontSize(12).fillColor('#71717a').text("Rapport des Mouvements de Stock", 40, 62)
    doc.fontSize(9).text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 40, 77)

    // Stats
    const summaryText = `Volume Total : ${report.summary.totalMovements} actions (${report.summary.totalIn} entrées / ${report.summary.totalOut} sorties)`
    doc.fontSize(9).fillColor('#18181b').font('Helvetica-Bold').text(summaryText, 250, 40, { align: 'right', width: 300 })

    doc.moveTo(40, 95).lineTo(550, 95).strokeColor('#e4e4e7').stroke()

    // Table Header
    let currentY = 110
    doc.fontSize(9).fillColor('#27272a').font('Helvetica-Bold')
    doc.text('Date', 40, currentY, { width: 90 })
    doc.text('Produit', 130, currentY, { width: 140 })
    doc.text('SKU', 270, currentY, { width: 65 })
    doc.text('Type', 335, currentY, { width: 60 })
    doc.text('Qté', 395, currentY, { width: 35, align: 'right' })
    doc.text('Réf.', 430, currentY, { width: 60 })
    doc.text('Note', 490, currentY, { width: 60 })

    doc.moveTo(40, currentY + 12).lineTo(550, currentY + 12).strokeColor('#e4e4e7').stroke()
    currentY += 20

    const typeMap: Record<string, string> = {
      IN: '+ Entrée',
      OUT: '- Sortie',
      ADJUSTMENT: 'Ajustement',
      TRANSFER: 'Transfert',
    }

    // Table Rows
    doc.font('Helvetica').fillColor('#27272a')
    for (const m of report.movements) {
      if (currentY > 750) {
        doc.addPage()
        currentY = 40
      }
      doc.text(new Date(m.createdAt).toLocaleString('fr-FR'), 40, currentY, { width: 90 })
      
      const productName = m.productName.length > 18 ? `${m.productName.substring(0, 18)}..` : m.productName
      doc.text(productName, 130, currentY, { width: 140 })
      doc.text(m.productSku, 270, currentY, { width: 65 })
      doc.text(typeMap[m.type] || m.type, 335, currentY, { width: 60 })
      doc.text(m.quantity.toString(), 395, currentY, { width: 35, align: 'right' })
      
      const reference = m.reference && m.reference.length > 10 ? `${m.reference.substring(0, 10)}..` : m.reference || '-'
      doc.text(reference, 430, currentY, { width: 60 })
      
      const note = m.note && m.note.length > 10 ? `${m.note.substring(0, 10)}..` : m.note || '-'
      doc.text(note, 490, currentY, { width: 60 })
      currentY += 18
    }

    doc.end()
  },
}
