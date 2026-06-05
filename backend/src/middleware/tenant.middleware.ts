import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { BadRequestError } from '../utils/errors'

const prisma = new PrismaClient()

declare global {
  namespace Express {
    interface Request {
      tenantId?: string
      tenantSlug?: string
    }
  }
}

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get tenant from header, subdomain, or JWT payload
    let tenantSlug = req.headers['x-tenant-id'] as string

    if (!tenantSlug) {
      // Try subdomain
      const host = req.hostname
      const parts = host.split('.')
      if (parts.length > 2) {
        tenantSlug = parts[0]
      }
    }

    // If we have a tenantId from JWT, use that to find the slug
    if (!tenantSlug && req.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId },
      })
      if (tenant) {
        tenantSlug = tenant.slug
      }
    }

    if (!tenantSlug) {
      throw new BadRequestError('Tenant non identifié')
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      throw new BadRequestError('Tenant introuvable')
    }

    if (tenant.isSuspended) {
      return res.status(403).json({ error: 'COMPTE SUSPENDU. Veuillez contacter le support (QG).' })
    }

    req.tenantId = tenant.id
    req.tenantSlug = tenantSlug

    // NOTE: Ne PAS utiliser SET search_path ici — les connexions Prisma
    // sont poolées et partagées entre tenants, ce qui causerait une
    // contamination inter-tenant. L'isolation est TOUJOURS assurée par
    // les requêtes SQL brutes avec schéma explicite dans chaque service
    // (ex: SELECT * FROM "tenant_demo".products).

    next()
  } catch (error) {
    next(error)
  }
}
