import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { UnauthorizedError, ForbiddenError } from '../utils/errors'
import { jwtBlacklistService } from '../services/jwtBlacklist.service'

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            userId?: string
            tenantId?: string
            userRole?: string
            tenantSlug?: string
            isApiRequest?: boolean
            token?: string
        }
    }
}

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        // Bypass si authentifié par clé API
        if (req.isApiRequest) {
            return next()
        }

        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Token manquant')
        }

        const token = authHeader.split(' ')[1]

        // Check if token is blacklisted
        const isBlacklisted = await jwtBlacklistService.isBlacklisted(token)
        if (isBlacklisted) {
            throw new UnauthorizedError('Token révoqué. Veuillez vous reconnecter.')
        }

        const payload = verifyAccessToken(token)

        // Check if this session is still the active one
        if (payload.sessionId && payload.userId) {
            const activeSession = await jwtBlacklistService.getActiveSession(payload.userId)
            if (activeSession && activeSession !== payload.sessionId) {
                throw new UnauthorizedError('Session expirée. Un autre appareil s\'est connecté avec ce compte.')
            }
        }

        req.userId = payload.userId
        req.tenantId = payload.tenantId
        req.userRole = payload.role
        req.token = token

        next()
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            next(error)
        } else {
            next(new UnauthorizedError('Token invalide ou expiré'))
        }
    }
}

export const requireRole = (...roles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.userRole || !roles.includes(req.userRole)) {
            throw new ForbiddenError('Permissions insuffisantes')
        }
        next()
    }
}
