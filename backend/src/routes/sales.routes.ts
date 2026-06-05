import { Router, Request } from 'express'
import { salesService } from '../services/sales.service'
import { pdfService } from '../services/pdf.service'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { z } from 'zod'

const router = Router()
router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Terminal de vente (POS) — ventes et devis
 */

const saleSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  type: z.enum(['DEV', 'FAC']),
  taxRate: z.number().min(0).max(100).optional(),
  warehouseId: z.string().uuid().optional().nullable(),
  pointsToRedeem: z.number().int().min(0).optional().default(0),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
})

/**
 * @swagger
 * /sales:
 *   get:
 *     tags: [Sales]
 *     summary: Lister toutes les ventes du tenant
 *     responses:
 *       200:
 *         description: Liste des ventes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sale'
 *   post:
 *     tags: [Sales]
 *     summary: Créer une vente (FAC) ou un devis (DEV)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, items]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [FAC, DEV]
 *                 description: FAC = Facture (déduit le stock), DEV = Devis (ne déduit pas)
 *               clientId: { type: string, format: uuid, nullable: true }
 *               taxRate: { type: number, minimum: 0, maximum: 100, example: 18 }
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SaleItem'
 *     responses:
 *       201:
 *         description: Vente créée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sale'
 *       400:
 *         description: Stock insuffisant ou produit introuvable
 */
router.get('/', async (req, res, next) => {
  try {
    const sales = await salesService.getAllSales(req.tenantSlug!)
    res.json(sales)
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Obtenir une vente avec ses articles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vente avec articles
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Sale'
 *                 - type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           quantity: { type: integer }
 *                           unitPrice: { type: number }
 *                           product:
 *                             type: object
 *                             properties:
 *                               name: { type: string }
 *       404:
 *         description: Vente non trouvée
 */
router.get('/:id', async (req, res, next) => {
  try {
    const sale = await salesService.getSaleById(req.params.id, req.tenantSlug!)
    if (!sale) return res.status(404).json({ error: 'Vente non trouvée' })
    res.json(sale)
  } catch (error) {
    next(error)
  }
})

router.post('/', requireRole('admin', 'manager'), async (req: Request, res, next) => {
  try {
    const validatedData = saleSchema.parse(req.body)
    const sale = await salesService.createSale(validatedData, req.userId!, req.tenantSlug!)
    res.status(201).json(sale)
  } catch (error: any) {
    if (error.message.includes('Stock insuffisant')) {
      return res.status(400).json({ error: error.message })
    }
    next(error)
  }
})

router.get('/:id/pdf', async (req, res, next) => {
  try {
    const sale = await salesService.getSaleById(req.params.id, req.tenantSlug!)
    if (!sale) return res.status(404).json({ error: 'Vente non trouvée' })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Duplicata_${sale.reference}.pdf"`)

    await pdfService.generateReceiptPDF(sale, res, req.tenantSlug!)
  } catch (error) {
    next(error)
  }
})

export default router
