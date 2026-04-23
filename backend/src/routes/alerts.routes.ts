import { Router } from 'express'
import { alertsController } from '../controllers/alert.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Alertes de stock bas
 */

/**
 * @swagger
 * /alerts/stock:
 *   get:
 *     tags: [Alerts]
 *     summary: Produits en dessous du seuil minimum
 *     responses:
 *       200:
 *         description: Liste des produits en alerte
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alert'
 */
router.get('/stock', alertsController.getStockAlerts)

export default router
