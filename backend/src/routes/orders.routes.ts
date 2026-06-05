import { Router } from 'express'
import { ordersController } from '../controllers/orders.controller'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Bons de commande fournisseurs
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: Lister les bons de commande
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Liste des bons de commande
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *   post:
 *     tags: [Orders]
 *     summary: Créer un bon de commande
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [supplierId, items]
 *             properties:
 *               supplierId: { type: string, format: uuid }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity, unitPrice]
 *                   properties:
 *                     productId: { type: string, format: uuid }
 *                     quantity: { type: integer }
 *                     unitPrice: { type: number }
 *     responses:
 *       201:
 *         description: Bon de commande créé
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Obtenir un bon de commande
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Bon de commande avec articles
 *       404:
 *         description: Commande introuvable
 * /orders/{id}/status:
 *   put:
 *     tags: [Orders]
 *     summary: "Mettre à jour le statut (ex: RECEIVED déclenche une entrée stock)"
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, RECEIVED, CANCELLED]
 *     responses:
 *       200:
 *         description: "Statut mis à jour. Si RECEIVED, entrée de stock générée automatiquement."
 */
router.get('/', ordersController.list)
router.get('/:id', ordersController.get)
router.post('/', requireRole('admin', 'manager'), ordersController.create)
router.put('/:id/status', requireRole('admin', 'manager'), ordersController.updateStatus)

export default router
