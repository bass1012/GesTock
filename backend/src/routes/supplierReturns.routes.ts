import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { supplierReturnService } from '../services/supplierReturn.service'

const router = Router()
router.use(authMiddleware)
router.use(tenantMiddleware)

const returnSchema = z.object({
  supplierId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  reason: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative().optional(),
  })).min(1, 'Au moins un article requis'),
})

/**
 * @swagger
 * /suppliers/returns:
 *   get:
 *     tags: [Suppliers]
 *     summary: Lister les retours fournisseurs
 *     responses:
 *       200:
 *         description: Liste des retours
 *   post:
 *     tags: [Suppliers]
 *     summary: Créer un retour fournisseur (génère des sorties de stock)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [supplierId, items]
 *             properties:
 *               supplierId: { type: string, format: uuid }
 *               warehouseId: { type: string, format: uuid }
 *               reason: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: string, format: uuid }
 *                     quantity: { type: integer, minimum: 1 }
 *                     unitPrice: { type: number }
 *     responses:
 *       201:
 *         description: Retour créé, mouvements OUT générés
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const returns = await supplierReturnService.list(req.tenantSlug!)
    res.json({ returns })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = returnSchema.parse(req.body)
    const result = await supplierReturnService.create(data, req.tenantSlug!, req.userId)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await supplierReturnService.get(req.params.id, req.tenantSlug!)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

export default router
