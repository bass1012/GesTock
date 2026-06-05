import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { PLANS } from '../services/billing.service'
import { ForbiddenError } from '../utils/errors'

const prisma = new PrismaClient()

/**
 * Vérifie les limites du plan pour un tenant avant création d'une ressource.
 * @param resource - 'products' | 'users' | 'warehouses'
 */
export const checkPlanLimit = (resource: 'products' | 'users' | 'warehouses') => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!
      const tenantSlug = req.tenantSlug!

      // 1. Récupère le plan actuel du tenant
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
      if (!tenant) return next()

      const planName = (tenant.plan as string) || 'starter'
      const planConfig = PLANS[planName as keyof typeof PLANS] || PLANS.starter

      // 2. Vérifie selon le type de ressource
      if (resource === 'products') {
        const limit = planConfig.productLimit
        if (limit === Infinity) return next() // Enterprise — pas de limite

        // Compte les produits actifs du tenant
        const result = (await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as total FROM "tenant_${tenantSlug}".products WHERE is_active = true`,
        )) as any[]
        const count = parseInt(result[0]?.total || '0', 10)

        if (count >= limit) {
          throw new ForbiddenError(
            `Limite du plan ${planName.charAt(0).toUpperCase() + planName.slice(1)} atteinte (${limit} produits max). ` +
              `Passez au plan supérieur dans Paramètres > Facturation pour continuer.`,
          )
        }
      }

      if (resource === 'users') {
        const limit = planConfig.userLimit
        if (limit === Infinity) return next() // Enterprise — pas de limite

        // Compte les utilisateurs du tenant
        const count = await prisma.user.count({ where: { tenantId } })

        if (count >= limit) {
          throw new ForbiddenError(
            `Limite du plan ${planName.charAt(0).toUpperCase() + planName.slice(1)} atteinte (${limit} utilisateurs max). ` +
              `Passez au plan supérieur dans Paramètres > Facturation pour continuer.`,
          )
        }
      }

      if (resource === 'warehouses') {
        const limit = planConfig.warehouseLimit
        if (limit === Infinity) return next() // Enterprise — pas de limite

        // Compte les entrepôts du tenant
        const result = (await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as total FROM "tenant_${tenantSlug}".warehouses`,
        )) as any[]
        const count = parseInt(result[0]?.total || '0', 10)

        if (count >= limit) {
          throw new ForbiddenError(
            `Limite du plan ${planName.charAt(0).toUpperCase() + planName.slice(1)} atteinte (${limit} entrepôts max). ` +
              `Passez au plan supérieur dans Paramètres > Facturation pour continuer.`,
          )
        }
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware pour restreindre l'accès à certaines fonctionnalités selon le plan.
 */
export const requirePlan = (allowedPlans: Array<'starter' | 'pro' | 'enterprise'>) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })

      if (!tenant) throw new ForbiddenError('Tenant non trouvé')

      const currentPlan = (tenant.plan as 'starter' | 'pro' | 'enterprise') || 'starter'

      if (!allowedPlans.includes(currentPlan)) {
        throw new ForbiddenError(
          `Cette fonctionnalité requiert un plan ${allowedPlans.join(' ou ')}. ` +
            `Votre plan actuel est : ${currentPlan}.`,
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
