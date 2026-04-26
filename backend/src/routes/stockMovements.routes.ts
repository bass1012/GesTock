import { Router } from 'express'
import { stockMovementsController } from '../controllers/stockMovements.controller'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * @swagger
 * tags:
 *   name: Stock
 *   description: Mouvements de stock (entrées, sorties, ajustements)
 */

/**
 * @swagger
 * /stock/movements:
 *   get:
 *     tags: [Stock]
 *     summary: Lister les mouvements de stock
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: productId
 *         schema: { type: string, format: uuid }
 *         description: Filtrer par produit
 *     responses:
 *       200:
 *         description: Liste paginée des mouvements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 movements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StockMovement'
 *                 total: { type: integer }
 *                 page: { type: integer }
 *   post:
 *     tags: [Stock]
 *     summary: Créer un mouvement de stock
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, type, quantity]
 *             properties:
 *               productId: { type: string, format: uuid }
 *               type: { type: string, enum: [IN, OUT, ADJUSTMENT] }
 *               quantity: { type: integer, minimum: 1 }
 *               warehouseId: { type: string, format: uuid }
 *               reference: { type: string }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Mouvement créé, stock mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StockMovement'
 *       400:
 *         description: Stock insuffisant pour une sortie
 */
router.get('/', stockMovementsController.list)
router.post('/', requireRole('admin', 'manager'), stockMovementsController.create)

export default router
