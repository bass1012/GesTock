import { Router } from 'express'
import { suppliersController } from '../controllers/suppliers.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

router.get('/', suppliersController.list)
router.get('/:id', suppliersController.get)
router.post('/', suppliersController.create)
router.put('/:id', suppliersController.update)
router.delete('/:id', suppliersController.delete)

export default router
