import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import { NotFoundError, BadRequestError } from '../utils/errors'

const prisma = new PrismaClient()

// Initialize Stripe (optional - billing features won't work without it)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''
if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ STRIPE_SECRET_KEY not set - billing features will be disabled')
}
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16' as any,
}) : null

// Helper to ensure Stripe is configured
const requireStripe = () => {
    if (!stripe) {
        throw new BadRequestError('Stripe n\'est pas configuré. Contactez l\'administrateur.')
    }
    return stripe
}

// Plan definitions (should match Stripe Product/Price IDs in production)
export const PLANS = {
    starter: {
        name: 'Starter',
        price: 19000,
        productLimit: 500,
        userLimit: 3,
        warehouseLimit: 1,
        features: ['Produits limités à 500', '3 utilisateurs', '1 entrepôt', 'Support email']
    },
    pro: {
        name: 'Pro',
        price: 52000,
        productLimit: 10000,
        userLimit: 15,
        warehouseLimit: 5,
        features: ['Produits limités à 10 000', '15 utilisateurs', '5 entrepôts', 'Support prioritaire', 'API access', 'Rapports avancés']
    },
    enterprise: {
        name: 'Enterprise',
        price: 130500,
        productLimit: Infinity,
        userLimit: Infinity,
        warehouseLimit: Infinity,
        features: ['Produits illimités', 'Utilisateurs illimités', 'Entrepôts illimités', 'Support dédié', 'API access', 'Rapports personnalisés', 'Onboarding dédié']
    }
}

export interface BillingInfo {
    plan: 'starter' | 'pro' | 'enterprise'
    status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
}

export interface Invoice {
    id: string
    amount: number
    status: string
    createdAt: Date
    invoicePdf: string | null
}

export const billingService = {
    async getOrCreateCustomer(tenantId: string, email: string, name: string): Promise<string> {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) throw new NotFoundError('Tenant introuvable')

        // Check if customer already exists
        const config = tenant.config as any
        if (config?.stripeCustomerId) {
            return config.stripeCustomerId
        }

        // Create new Stripe customer
        const customer = await requireStripe().customers.create({
            email,
            name,
            metadata: {
                tenantId,
                tenantSlug: tenant.slug
            }
        })

        // Update tenant with customer ID
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                config: {
                    ...config,
                    stripeCustomerId: customer.id
                } as any
            }
        })

        return customer.id
    },

    async createSubscription(tenantId: string, plan: 'starter' | 'pro' | 'enterprise', priceId: string): Promise<{ clientSecret: string; subscriptionId: string }> {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { users: { take: 1 } }
        })
        if (!tenant) throw new NotFoundError('Tenant introuvable')

        // Get or create customer
        const adminUser = tenant.users[0]
        if (!adminUser) throw new NotFoundError('Aucun utilisateur administrateur trouvé')

        const customerId = await this.getOrCreateCustomer(tenantId, adminUser.email, tenant.name)

        // Create subscription
        const subscription = await requireStripe().subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                tenantId,
                plan
            }
        })

        // Update tenant with subscription info
        const config = tenant.config as any
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                plan,
                config: {
                    ...config,
                    stripeSubscriptionId: subscription.id,
                    subscriptionStatus: subscription.status
                } as any
            }
        })

        const latestInvoice = subscription.latest_invoice as Stripe.Invoice
        const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent

        if (!paymentIntent?.client_secret) {
            throw new BadRequestError('Erreur lors de la création du paiement')
        }

        return {
            clientSecret: paymentIntent.client_secret,
            subscriptionId: subscription.id
        }
    },

    async getBillingInfo(tenantId: string): Promise<BillingInfo | null> {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) throw new NotFoundError('Tenant introuvable')

        const config = tenant.config as any
        
        let status = config.subscriptionStatus || 'trialing';
        let endDate = config.subscriptionEndDate ? new Date(config.subscriptionEndDate) : new Date(tenant.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days trial Default
        
        if (endDate < new Date()) {
            status = 'past_due'; // Expired
        }

        return {
            plan: tenant.plan as any,
            status: status as any,
            currentPeriodEnd: endDate,
            cancelAtPeriodEnd: false,
            stripeCustomerId: null,
            stripeSubscriptionId: null
        }
    },

    async cancelSubscription(tenantId: string): Promise<void> {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) throw new NotFoundError('Tenant introuvable')

        const config = tenant.config as any
        if (!config?.stripeSubscriptionId) {
            throw new BadRequestError('Aucun abonnement actif')
        }

        // Cancel at period end
        await requireStripe().subscriptions.update(config.stripeSubscriptionId, {
            cancel_at_period_end: true
        })
    },

    async resumeSubscription(tenantId: string): Promise<void> {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) throw new NotFoundError('Tenant introuvable')

        const config = tenant.config as any
        if (!config?.stripeSubscriptionId) {
            throw new BadRequestError('Aucun abonnement trouvé')
        }

        // Resume subscription
        await requireStripe().subscriptions.update(config.stripeSubscriptionId, {
            cancel_at_period_end: false
        })
    },

    async getInvoices(tenantId: string): Promise<Invoice[]> {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) throw new NotFoundError('Tenant introuvable')

        const config = tenant.config as any
        if (!config?.stripeCustomerId) {
            return []
        }

        const invoices = await requireStripe().invoices.list({
            customer: config.stripeCustomerId,
            limit: 12
        })

        return invoices.data.map(inv => ({
            id: inv.id,
            amount: inv.amount_due / 100, // Convert from cents
            status: inv.status || 'unknown',
            createdAt: new Date(inv.created * 1000),
            invoicePdf: inv.invoice_pdf || null
        }))
    },

    async createSetupIntent(tenantId: string): Promise<string> {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) throw new NotFoundError('Tenant introuvable')

        const config = tenant.config as any
        if (!config?.stripeCustomerId) {
            throw new BadRequestError('Aucun client Stripe associé')
        }

        const setupIntent = await requireStripe().setupIntents.create({
            customer: config.stripeCustomerId,
            payment_method_types: ['card']
        })

        return setupIntent.client_secret as string
    },

    async updatePaymentMethod(tenantId: string, paymentMethodId: string): Promise<void> {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) throw new NotFoundError('Tenant introuvable')

        const config = tenant.config as any
        if (!config?.stripeCustomerId || !config?.stripeSubscriptionId) {
            throw new BadRequestError('Aucun abonnement actif')
        }

        // Attach payment method to customer
        await requireStripe().paymentMethods.attach(paymentMethodId, {
            customer: config.stripeCustomerId
        })

        // Update default payment method
        await requireStripe().customers.update(config.stripeCustomerId, {
            invoice_settings: { default_payment_method: paymentMethodId }
        })

        // Update subscription payment method
        await requireStripe().subscriptions.update(config.stripeSubscriptionId, {
            default_payment_method: paymentMethodId
        })
    },

    // Webhook handler
    async handleWebhookEvent(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice
                const tenantId = invoice.subscription_details?.metadata?.tenantId
                if (tenantId) {
                    await this.updateSubscriptionStatus(tenantId, 'active')
                }
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                const tenantId = invoice.subscription_details?.metadata?.tenantId
                if (tenantId) {
                    await this.updateSubscriptionStatus(tenantId, 'past_due')
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const tenantId = subscription.metadata?.tenantId
                if (tenantId) {
                    await this.handleSubscriptionCanceled(tenantId)
                }
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                const tenantId = subscription.metadata?.tenantId
                if (tenantId) {
                    await this.updateSubscriptionStatus(tenantId, subscription.status as any)
                }
                break
            }
        }
    },

    async updateSubscriptionStatus(tenantId: string, status: string): Promise<void> {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) return

        const config = tenant.config as any
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                config: {
                    ...config,
                    subscriptionStatus: status
                } as any
            }
        })
    },

    async handleSubscriptionCanceled(tenantId: string): Promise<void> {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) return

        const config = tenant.config as any
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                plan: 'starter',
                config: {
                    ...config,
                    stripeSubscriptionId: null,
                    subscriptionStatus: 'canceled'
                } as any
            }
        })
    },

    async createPortalSession(tenantId: string): Promise<string> {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) throw new NotFoundError('Tenant introuvable')

        const config = tenant.config as any
        if (!config?.stripeCustomerId) {
            throw new BadRequestError('Aucun client Stripe associé')
        }

        const session = await requireStripe().billingPortal.sessions.create({
            customer: config.stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL}/settings/billing`
        })

        return session.url
    }
}

export { stripe, requireStripe }
