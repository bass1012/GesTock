import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { UnauthorizedError } from '../utils/errors'

const prisma = new PrismaClient()

/**
 * Middleware pour l'authentification par clé API externe (X-API-Key)
 * À utiliser pour les intégrations tierces (e-commerce, comptabilité, etc.)
 */
export const apiKeyMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const apiKey = req.headers['x-api-key'] as string

        if (!apiKey) {
            // Si pas de clé API, on laisse la main au middleware suivant (probablement JWT)
            return next()
        }

        // Rechercher la clé dans la table globale (schema public)
        const keyRecord = await prisma.apiKey.findUnique({
            where: { key: apiKey },
            include: { tenant: true }
        })

        if (!keyRecord) {
            throw new UnauthorizedError('Clé API invalide')
        }

        if (keyRecord.tenant.isSuspended) {
            throw new UnauthorizedError('COMPTE SUSPENDU. Accès API bloqué.')
        }

        if (!keyRecord.tenant.apiEnabled) {
            throw new UnauthorizedError('ACCÈS API DÉSACTIVÉ par l\'administrateur QG.')
        }

        // Mettre à jour la date de dernière utilisation (non bloquant)
        prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date() }
        }).catch(console.error)

        // Injecter les infos du tenant dans la requête
        req.tenantId = keyRecord.tenantId
        req.tenantSlug = keyRecord.tenant.slug
        req.userRole = 'admin' // Une clé API a par défaut les droits admin sur son tenant
        req.isApiRequest = true

        next()
    } catch (error) {
        next(error)
    }
}
