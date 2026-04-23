import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { stockService } from '../services/stock.service'
import { BadRequestError } from '../utils/errors'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

const transferSchema = z.object({
    productId: z.string().uuid('productId doit être un UUID'),
    sourceWarehouseId: z.string().uuid('sourceWarehouseId doit être un UUID'),
    destWarehouseId: z.string().uuid('destWarehouseId doit être un UUID'),
    quantity: z.number().int().positive('La quantité doit être un entier positif'),
    note: z.string().optional(),
})

/**
 * @swagger
 * tags:
 *   name: Transfers
 *   description: Transferts inter-entrepôts
 */

/**
 * @swagger
 * /stock/transfers:
 *   post:
 *     tags: [Transfers]
 *     summary: Transférer du stock entre deux entrepôts
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, sourceWarehouseId, destWarehouseId, quantity]
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               sourceWarehouseId:
 *                 type: string
 *                 format: uuid
 *               destWarehouseId:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transfert effectué avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reference: { type: string }
 *                 productId: { type: string }
 *                 sourceWarehouseId: { type: string }
 *                 destWarehouseId: { type: string }
 *                 quantity: { type: integer }
 *       400:
 *         description: Stock insuffisant ou paramètres invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req: any, res: any, next: any) => {
    try {
        const data = transferSchema.parse(req.body)
        const tenantSlug = req.tenantSlug
        const userId = req.userId

        const result = await stockService.createTransfer(data, tenantSlug, userId)
        res.status(201).json(result)
    } catch (err: any) {
        if (err.message?.includes('Stock insuffisant') || err.message?.includes('différents')) {
            return next(new BadRequestError(err.message))
        }
        next(err)
    }
})

export default router
