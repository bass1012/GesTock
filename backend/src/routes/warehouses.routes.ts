import { Router } from 'express'
import { warehouseController } from '../controllers/warehouses.controller'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { checkPlanLimit } from '../middleware/planLimit.middleware'

const router = Router()

// All warehouse routes require auth + tenant
router.use(authMiddleware)
router.use(tenantMiddleware)

// GET /api/v1/warehouses
router.get('/', warehouseController.list)

// GET /api/v1/warehouses/:id
router.get('/:id', warehouseController.get)

// POST /api/v1/warehouses
router.post('/', requireRole('admin'), checkPlanLimit('warehouses'), warehouseController.create)

// PUT /api/v1/warehouses/:id
router.put('/:id', requireRole('admin'), warehouseController.update)

// DELETE /api/v1/warehouses/:id
router.delete('/:id', requireRole('admin'), warehouseController.delete)

// GET /api/v1/warehouses/product/:productId
router.get('/product/:productId', warehouseController.getProductStock)

export default router
