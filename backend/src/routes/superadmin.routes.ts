import { Router } from 'express';
import { superAdminController, superAdminMiddleware } from '../controllers/superadmin.controller';

const router = Router();

// Toutes les requêtes nécessitent le mot de passe maitre
router.use(superAdminMiddleware);

router.post('/login', superAdminController.verifyLogin);
router.get('/tenants', superAdminController.listTenants);
router.put('/tenants/:id/plan', superAdminController.updateTenantPlan);
router.put('/tenants/:id/status', superAdminController.toggleTenantStatus);
router.put('/tenants/:id/api', superAdminController.toggleTenantApi);

// Gestion des utilisateurs par tenant
router.get('/users-by-tenant/:tenantId', superAdminController.listTenantUsers);
router.post('/users-by-id/:userId/reset-password', superAdminController.resetUserPassword);

// Audit logs
router.get('/audit-logs', superAdminController.getAuditLogs);

export default router;
