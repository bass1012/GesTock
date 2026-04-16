import { Router } from 'express'
import { ordersController } from '../controllers/orders.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/', ordersController.list)
router.get('/:id', ordersController.get)
router.post('/', ordersController.create)
router.put('/:id/status', ordersController.updateStatus)

export default router
