import { Router } from 'express'
import { alertsController } from '../controllers/alert.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/stock', alertsController.getStockAlerts)

export default router
