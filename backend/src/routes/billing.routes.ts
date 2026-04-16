import { Router } from 'express'
import { billingController } from '../controllers/billing.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { requireRole } from '../middleware/auth.middleware'

const router = Router()

// Public endpoint for webhook (needs raw body, handled in app.ts)
router.post('/webhook', billingController.handleWebhook)

// Protected routes
router.use(authMiddleware)
router.use(tenantMiddleware)

// Plans (available to all authenticated users)
router.get('/plans', billingController.getPlans)

// Billing info
router.get('/info', billingController.getBillingInfo)

// Subscription management (admin only)
router.post('/subscribe', requireRole('admin'), billingController.createSubscription)
router.post('/cancel', requireRole('admin'), billingController.cancelSubscription)
router.post('/resume', requireRole('admin'), billingController.resumeSubscription)

// Invoices
router.get('/invoices', billingController.getInvoices)

// Payment method
router.post('/setup-intent', billingController.createSetupIntent)

// Customer portal
router.post('/portal', billingController.createPortalSession)

export default router
