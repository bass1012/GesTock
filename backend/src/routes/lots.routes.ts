import { Router } from 'express'
import { stockMovementsController } from '../controllers/stockMovements.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

const router = Router()
router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * @swagger
 * /stock/lots:
 *   get:
 *     tags: [Stock]
 *     summary: Lister les lots et dates de péremption
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema: { type: string, format: uuid }
 *         description: Filtrer par produit (optionnel)
 *     responses:
 *       200:
 *         description: Liste des lots avec statut péremption
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       productId: { type: string }
 *                       productName: { type: string }
 *                       productSku: { type: string }
 *                       warehouseName: { type: string }
 *                       batchNumber: { type: string, nullable: true }
 *                       expiryDate: { type: string, format: date-time, nullable: true }
 *                       daysRemaining: { type: integer, nullable: true }
 *                       expiryStatus:
 *                         type: string
 *                         enum: [expired, critical, warning, ok]
 *                         nullable: true
 *                       quantity: { type: integer }
 *                       receivedAt: { type: string, format: date-time }
 */
router.get('/', stockMovementsController.listLots)

export default router
