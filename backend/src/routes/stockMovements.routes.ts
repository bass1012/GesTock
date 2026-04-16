import { Router } from 'express'
import { stockMovementsController } from '../controllers/stockMovements.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/', stockMovementsController.list)
router.post('/', stockMovementsController.create)

export default router
