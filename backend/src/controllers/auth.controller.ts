import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service'
import { auditService } from '../services/audit.service'
import { registerSchema, loginSchema } from '../utils/validators'

export const authController = {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const data = registerSchema.parse(req.body)
            const result = await authService.register(data)

            // Audit log successful registration
            await auditService.log({
                action: 'USER_REGISTER',
                userId: result.user.id,
                tenantId: result.tenant.id,
                resource: 'user',
                resourceId: result.user.id,
                metadata: { email: result.user.email, company: data.companyName },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            })

            res.status(201).json(result)
        } catch (error) {
            next(error)
        }
    },

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = loginSchema.parse(req.body)
            const tenantSlug = req.headers['x-tenant-id'] as string | undefined
            const result = await authService.login(email, password, tenantSlug)

            // Audit log successful login
            await auditService.log({
                action: 'USER_LOGIN',
                userId: result.user.id,
                tenantId: result.tenant.id,
                resource: 'user',
                resourceId: result.user.id,
                metadata: { email: result.user.email },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            })

            res.json(result)
        } catch (error) {
            next(error)
        }
    },

    async refresh(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body
            if (!refreshToken) {
                return res.status(400).json({ message: 'Refresh token requis' })
            }
            const result = await authService.refresh(refreshToken)
            res.json(result)
        } catch (error) {
            next(error)
        }
    },

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body
            const accessToken = req.token
            const userId = req.userId
            const tenantId = req.tenantId

            if (accessToken) {
                await authService.logout(accessToken, refreshToken)
            }

            // Audit log logout
            if (userId) {
                await auditService.log({
                    action: 'USER_LOGOUT',
                    userId,
                    tenantId,
                    resource: 'user',
                    resourceId: userId,
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                })
            }

            res.json({ message: 'Déconnexion réussie' })
        } catch (error) {
            next(error)
        }
    },

    async me(req: Request, res: Response, next: NextFunction) {
        try {
            res.json({
                userId: req.userId,
                tenantId: req.tenantId,
                role: req.userRole,
            })
        } catch (error) {
            next(error)
        }
    },

    async changePasswordMandatory(req: Request, res: Response, next: NextFunction) {
        try {
            const { newPassword } = req.body
            const userId = (req as any).userId // From middleware
            const tenantId = (req as any).tenantId

            if (!userId) {
                return res.status(401).json({ message: 'Non autorisé' })
            }

            await authService.changePasswordMandatory(userId, newPassword)

            // Audit log password change
            await auditService.log({
                action: 'PASSWORD_CHANGE',
                userId,
                tenantId,
                resource: 'user',
                resourceId: userId,
                metadata: { mandatory: true },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            })

            res.json({ message: 'Mot de passe mis à jour avec succès' })
        } catch (error) {
            next(error)
        }
    },
}
