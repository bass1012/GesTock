import { Router } from 'express'
import { productsController } from '../controllers/products.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { checkPlanLimit } from '../middleware/planLimit.middleware'

const router = Router()

// All product routes require auth + tenant
router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/', productsController.list)
router.get('/:id', productsController.get)
router.post('/', checkPlanLimit('products'), productsController.create)
router.put('/:id', productsController.update)
router.delete('/:id', productsController.delete)

export default router
