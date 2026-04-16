import { Router } from 'express'
import { reportController } from '../controllers/report.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

import { requirePlan } from '../middleware/planLimit.middleware'

const router = Router()

// Apply auth and tenant middleware to all routes
router.use(authMiddleware)
router.use(tenantMiddleware)

// Dashboard stats
router.get('/dashboard', reportController.getDashboardStats)

// Inventory report
router.get('/inventory', reportController.getInventoryReport)

// Movement report
router.get('/movements', reportController.getMovementReport)

// Advanced Business Intelligence (Pro/Enterprise only)
router.get('/alerts/expiry', requirePlan(['pro', 'enterprise']), reportController.getExpiryAlerts)
router.get('/rotation/slow', requirePlan(['pro', 'enterprise']), reportController.getSlowRotationReport)

// Export endpoints
router.get('/export/inventory', reportController.exportInventoryCSV)
router.get('/export/movements', reportController.exportMovementsCSV)

export default router
