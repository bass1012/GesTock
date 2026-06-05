import { Router } from 'express'
import { reportController } from '../controllers/report.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

import { requirePlan } from '../middleware/planLimit.middleware'

const router = Router()

// Apply auth and tenant middleware to all routes
router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Rapports et statistiques (avec cache Redis)
 */

/**
 * @swagger
 * /reports/dashboard:
 *   get:
 *     tags: [Reports]
 *     summary: Statistiques du tableau de bord
 *     responses:
 *       200:
 *         description: KPIs du tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 * /reports/inventory:
 *   get:
 *     tags: [Reports]
 *     summary: Rapport d'inventaire paginé
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Rapport inventaire
 * /reports/movements:
 *   get:
 *     tags: [Reports]
 *     summary: Rapport des mouvements de stock
 *     responses:
 *       200:
 *         description: Rapport mouvements
 * /reports/alerts/expiry:
 *   get:
 *     tags: [Reports]
 *     summary: Produits proches de leur date de péremption (Pro/Enterprise)
 *     responses:
 *       200:
 *         description: Liste des produits concernés
 *       403:
 *         description: Plan insuffisant
 * /reports/rotation/slow:
 *   get:
 *     tags: [Reports]
 *     summary: Produits à rotation lente (Pro/Enterprise)
 *     responses:
 *       200:
 *         description: Produits peu vendus
 *       403:
 *         description: Plan insuffisant
 * /reports/export/inventory:
 *   get:
 *     tags: [Reports]
 *     summary: Exporter l'inventaire en CSV
 *     responses:
 *       200:
 *         description: Fichier CSV
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 * /reports/export/movements:
 *   get:
 *     tags: [Reports]
 *     summary: Exporter les mouvements en CSV
 *     responses:
 *       200:
 *         description: Fichier CSV
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */

// Dashboard stats
router.get('/dashboard', reportController.getDashboardStats)

// Inventory report
router.get('/inventory', reportController.getInventoryReport)

// Movement report
router.get('/movements', reportController.getMovementReport)

// Advanced Business Intelligence (Pro/Enterprise only)
router.get('/alerts/expiry', requirePlan(['pro', 'enterprise']), reportController.getExpiryAlerts)
router.get(
  '/rotation/slow',
  requirePlan(['pro', 'enterprise']),
  reportController.getSlowRotationReport,
)

/**
 * @swagger
 * /reports/forecasts:
 *   get:
 *     tags: [Reports]
 *     summary: Prévisions de réapprovisionnement (Pro/Enterprise)
 *     description: Calcule la vélocité de sortie par produit et estime les dates de rupture de stock
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *         description: Fenêtre d'analyse en jours (historique de ventes)
 *     responses:
 *       200:
 *         description: Liste des produits avec prévisions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       sku: { type: string }
 *                       currentStock: { type: number }
 *                       weeklyVelocity: { type: number }
 *                       daysUntilStockout: { type: integer, nullable: true }
 *                       estimatedStockoutDate: { type: string, format: date, nullable: true }
 *                       recommendedOrderQty: { type: integer }
 *                       urgency:
 *                         type: string
 *                         enum: [critical, warning, ok, no_movement]
 *       403:
 *         description: Plan insuffisant
 */
router.get('/forecasts', requirePlan(['pro', 'enterprise']), reportController.getRestockForecasts)

// Export endpoints
router.get('/export/inventory', reportController.exportInventoryCSV)
router.get('/export/movements', reportController.exportMovementsCSV)
router.get('/export/inventory/pdf', reportController.exportInventoryPDF)
router.get('/export/movements/pdf', reportController.exportMovementsPDF)

export default router
