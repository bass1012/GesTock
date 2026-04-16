import { Router, Request } from 'express'
import { salesService } from '../services/sales.service'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { z } from 'zod'

const router = Router()
router.use(authMiddleware)
router.use(tenantMiddleware)

const saleSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  type: z.enum(['DEV', 'FAC']),
  taxRate: z.number().min(0).max(100).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive()
  })).min(1)
})

router.get('/', async (req, res, next) => {
  try {
    const sales = await salesService.getAllSales(req.tenantSlug!)
    res.json(sales)
  } catch (error) { next(error) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const sale = await salesService.getSaleById(req.params.id, req.tenantSlug!)
    if (!sale) return res.status(404).json({ error: 'Vente non trouvée' })
    res.json(sale)
  } catch (error) { next(error) }
})

router.post('/', async (req: Request, res, next) => {
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

export default router
