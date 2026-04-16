import { Router } from 'express'
import { usersController } from '../controllers/users.controller'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { checkPlanLimit } from '../middleware/planLimit.middleware'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

// GET  /api/v1/users           — Lister les utilisateurs du tenant (tous rôles)
router.get('/', usersController.list)

// POST /api/v1/users/invite    — Inviter un nouvel utilisateur (admin only)
router.post('/invite', requireRole('admin'), checkPlanLimit('users'), usersController.invite)

// PUT  /api/v1/users/:id/role  — Modifier le rôle (admin only)
router.put('/:id/role', requireRole('admin'), usersController.updateRole)

// DELETE /api/v1/users/:id     — Révoquer un utilisateur (admin only)
router.delete('/:id', requireRole('admin'), usersController.remove)

export default router
