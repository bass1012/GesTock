import { Router } from 'express'
import { apiKeyController } from '../controllers/api-key.controller'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { requirePlan } from '../middleware/planLimit.middleware'

const router = Router()

// Ces routes sont UNIQUEMENT pour la gestion des clés via le Dashboard
// L'utilisation des clés se fait directement sur les autres ressources (products, sales, etc.)
router.use(authMiddleware)
router.use(tenantMiddleware)
router.use(requireRole('admin'))
router.use(requirePlan(['pro', 'enterprise']))

router.get('/', apiKeyController.list)
router.post('/', apiKeyController.create)
router.delete('/:id', apiKeyController.delete)

export default router
