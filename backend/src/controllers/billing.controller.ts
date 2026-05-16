import { Request, Response, NextFunction } from 'express'
import { billingService, PLANS, requireStripe } from '../services/billing.service'

export const billingController = {
    async getPlans(req: Request, res: Response, next: NextFunction) {
        try {
            res.json({
                success: true,
                data: PLANS
            })
        } catch (error) {
            next(error)
        }
    },

    async getBillingInfo(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.tenantId as string
            const info = await billingService.getBillingInfo(tenantId)
            res.json({
                success: true,
                data: info
            })
        } catch (error) {
            next(error)
        }
    },

    async createSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.tenantId as string
            const { plan, priceId } = req.body

            if (!plan || !priceId) {
                return res.status(400).json({
                    success: false,
                    error: 'Plan et priceId requis'
                })
            }

            const result = await billingService.createSubscription(tenantId, plan, priceId)
            res.json({
                success: true,
                data: result
            })
        } catch (error) {
            next(error)
        }
    },

    async cancelSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.tenantId as string
            await billingService.cancelSubscription(tenantId)
            res.json({
                success: true,
                message: 'Abonnement annulé (fin à la fin de la période)'
            })
        } catch (error) {
            next(error)
        }
    },

    async resumeSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.tenantId as string
            await billingService.resumeSubscription(tenantId)
            res.json({
                success: true,
                message: 'Abonnement réactivé'
            })
        } catch (error) {
            next(error)
        }
    },

    async getInvoices(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.tenantId as string
            const invoices = await billingService.getInvoices(tenantId)
            res.json({
                success: true,
                data: invoices
            })
        } catch (error) {
            next(error)
        }
    },

    async createSetupIntent(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.tenantId as string
            const clientSecret = await billingService.createSetupIntent(tenantId)
            res.json({
                success: true,
                data: { clientSecret }
            })
        } catch (error) {
            next(error)
        }
    },

    async createPortalSession(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.tenantId as string
            const url = await billingService.createPortalSession(tenantId)
            res.json({
                success: true,
                data: { url }
            })
        } catch (error) {
            next(error)
        }
    },

    async handleWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const signature = req.headers['stripe-signature'] as string
            if (!signature) {
                return res.status(400).send('Missing stripe-signature header')
            }

            let event
            try {
                event = requireStripe().webhooks.constructEvent(
                    req.body,
                    signature,
                    process.env.STRIPE_WEBHOOK_SECRET || ''
                )
            } catch (err: any) {
                console.error('Webhook signature verification failed:', err.message)
                return res.status(400).send(`Webhook Error: ${err.message}`)
            }

            // Handle the event
            await billingService.handleWebhookEvent(event)

            res.json({ received: true })
        } catch (error) {
            next(error)
        }
    }
}
