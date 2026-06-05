import { Router } from 'express'
import { superAdminController, superAdminMiddleware } from '../controllers/superadmin.controller'

const router = Router()

// Login is public
router.post('/login', superAdminController.login)

// All subsequent requests require JWT validation
router.use(superAdminMiddleware)

router.get('/tenants', superAdminController.listTenants)
router.put('/tenants/:id/plan', superAdminController.updateTenantPlan)
router.put('/tenants/:id/status', superAdminController.toggleTenantStatus)
router.put('/tenants/:id/api', superAdminController.toggleTenantApi)

// Gestion des utilisateurs par tenant
router.get('/users-by-tenant/:tenantId', superAdminController.listTenantUsers)
router.post('/users-by-id/:userId/reset-password', superAdminController.resetUserPassword)
router.put('/users-by-id/:userId/role', superAdminController.updateUserRole)

// Audit logs
router.get('/audit-logs', superAdminController.getAuditLogs)
router.get('/audit-stats', superAdminController.getAuditStats)
router.get('/audit-logs/export', superAdminController.exportAuditLogs)

export default router
