import PDFDocument from 'pdfkit'
import { Response } from 'express'

export const pdfService = {
  /**
   * Generates a PDF receipt/invoice for a Sale and writes it directly to the response stream.
   */
  async generateReceiptPDF(sale: any, res: Response): Promise<void> {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    doc.pipe(res)

    // Header
    doc.fontSize(22).fillColor('#18181b').font('Helvetica-Bold').text('GesStock', 40, 40)
    doc.fontSize(10).fillColor('#71717a').font('Helvetica').text('Terminal Point de Vente / Facturation', 40, 65)

    // Meta Info
    doc.fontSize(10).fillColor('#18181b').font('Helvetica-Bold').text(`Reçu N° : ${sale.reference}`, 350, 40, { align: 'right', width: 200 })
    doc.font('Helvetica').fillColor('#71717a').text(`Date : ${new Date(sale.createdAt).toLocaleString('fr-FR')}`, 350, 55, { align: 'right', width: 200 })
    
    const clientName = sale.client?.name || 'Client de passage'
    doc.text(`Client : ${clientName}`, 350, 70, { align: 'right', width: 200 })

    // Horizontal separator
    doc.moveTo(40, 100).lineTo(550, 100).strokeColor('#e4e4e7').stroke()

    // Table Header
    let currentY = 120
    doc.fontSize(10).fillColor('#27272a').font('Helvetica-Bold')
    doc.text('Désignation Produit', 40, currentY, { width: 240 })
    doc.text('Qté', 290, currentY, { width: 40, align: 'right' })
    doc.text('Prix U.', 340, currentY, { width: 90, align: 'right' })
    doc.text('Montant', 440, currentY, { width: 110, align: 'right' })

    // Border line under header
    doc.moveTo(40, currentY + 15).lineTo(550, currentY + 15).strokeColor('#e4e4e7').stroke()
    currentY += 25

    // Table Rows
    doc.font('Helvetica').fillColor('#27272a')
    for (const item of sale.items) {
      if (currentY > 750) {
        doc.addPage()
        currentY = 40
      }
      const productName = item.product?.name || 'Produit inconnu'
      doc.text(productName, 40, currentY, { width: 240 })
      doc.text(item.quantity.toString(), 290, currentY, { width: 40, align: 'right' })
      doc.text(`${item.unitPrice.toLocaleString('fr-FR')} F`, 340, currentY, { width: 90, align: 'right' })
      doc.text(`${(item.unitPrice * item.quantity).toLocaleString('fr-FR')} F`, 440, currentY, { width: 110, align: 'right' })
      currentY += 20
    }

    // Border line before totals
    doc.moveTo(40, currentY).lineTo(550, currentY).strokeColor('#e4e4e7').stroke()
    currentY += 15

    if (currentY > 750) {
      doc.addPage()
      currentY = 40
    }

    // Totals Section
    doc.fontSize(10).font('Helvetica-Bold')
    doc.text('Total Brut :', 300, currentY, { width: 130, align: 'right' })
    const subTotal = sale.items.reduce((acc: number, item: any) => acc + (item.unitPrice * item.quantity), 0)
    doc.text(`${subTotal.toLocaleString('fr-FR')} F CFA`, 440, currentY, { width: 110, align: 'right' })
    currentY += 15

    if (sale.taxRate && sale.taxRate > 0) {
      const taxAmount = subTotal * (sale.taxRate / 100)
      doc.text(`TVA (${sale.taxRate}%) :`, 300, currentY, { width: 130, align: 'right' })
      doc.text(`${taxAmount.toLocaleString('fr-FR')} F CFA`, 440, currentY, { width: 110, align: 'right' })
      currentY += 15
    }

    const discount = sale.pointsToRedeem ? sale.pointsToRedeem * 50 : 0
    if (discount > 0) {
      doc.text('Remise Fidélité :', 300, currentY, { width: 130, align: 'right' })
      doc.text(`-${discount.toLocaleString('fr-FR')} F CFA`, 440, currentY, { width: 110, align: 'right' })
      currentY += 15
    }

    doc.fontSize(12).fillColor('#18181b')
    doc.text('TOTAL NET À PAYER :', 300, currentY, { width: 130, align: 'right' })
    doc.text(`${sale.totalAmount.toLocaleString('fr-FR')} F CFA`, 440, currentY, { width: 110, align: 'right' })

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
    doc.fontSize(10).fillColor('#18181b').font('Helvetica-Bold').text(`Valeur Totale Stock : ${report.summary.totalValue.toLocaleString('fr-FR')} F CFA`, 320, 40, { align: 'right', width: 230 })
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
      doc.text(`${product.price.toLocaleString('fr-FR')} F`, 420, currentY, { width: 65, align: 'right' })
      doc.text(`${product.stockValue.toLocaleString('fr-FR')} F`, 490, currentY, { width: 60, align: 'right' })
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
