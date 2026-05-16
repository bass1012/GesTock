import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'
import { ForbiddenError, NotFoundError } from '../utils/errors'
import { encryptionService } from '../services/encryption.service'

const prisma = new PrismaClient()

export const apiKeyController = {
    /**
     * Liste les clés API d'un tenant (SANS afficher les clés réelles pour la sécurité)
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.tenantId
            if (!tenantId) throw new ForbiddenError('Tenant non identifié')

            const apiKeys = await prisma.apiKey.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    name: true,
                    lastUsedAt: true,
                    createdAt: true
                    // On n'affiche JAMAIS 'key' dans une liste
                },
                orderBy: { createdAt: 'desc' }
            })

            res.json({ data: apiKeys })
        } catch (error) {
            next(error)
        }
    },

    /**
     * Génère une nouvelle clé API
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.tenantId
            const { name } = req.body

            if (!tenantId) throw new ForbiddenError('Tenant non identifié')
            if (!name) throw new ForbiddenError('Le nom est requis')

            // Générer une clé sécurisée (préfixée par 'gk_')
            const rawKey = randomBytes(24).toString('hex')
            const finalKey = `gk_${rawKey}`

            const apiKey = await prisma.apiKey.create({
                data: {
                    name,
                    key: encryptionService.encryptForStorage(finalKey),
                    tenantId
                }
            })

            // On affiche la clé UNIQUEMENT au moment de la création
            res.status(201).json({
                data: {
                    id: apiKey.id,
                    name: apiKey.name,
                    key: finalKey, // L'utilisateur doit la copier maintenant !
                    createdAt: apiKey.createdAt
                }
            })
        } catch (error) {
            next(error)
        }
    },

    /**
     * Révoque une clé API
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const tenantId = req.tenantId

            if (!tenantId) throw new ForbiddenError('Tenant non identifié')

            const apiKey = await prisma.apiKey.findUnique({
                where: { id }
            })

            if (!apiKey || apiKey.tenantId !== tenantId) {
                throw new NotFoundError('Clé API introuvable')
            }

            await prisma.apiKey.delete({
                where: { id }
            })

            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }
}
