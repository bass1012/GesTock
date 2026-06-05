import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/auth.service'
import { auditService } from '../services/audit.service'
import { twoFactorService } from '../services/twoFactor.service'
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
        userAgent: req.headers['user-agent'],
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
        userAgent: req.headers['user-agent'],
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
          userAgent: req.headers['user-agent'],
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
        userAgent: req.headers['user-agent'],
      })

      res.json({ message: 'Mot de passe mis à jour avec succès' })
    } catch (error) {
      next(error)
    }
  },

  async enable2FA(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const tenantId = (req as any).tenantId

      if (!userId) {
        return res.status(401).json({ message: 'Non autorisé' })
      }

      const result = await twoFactorService.enable(userId)

      // Audit log 2FA enabled
      await auditService.log({
        action: '2FA_ENABLE',
        userId,
        tenantId,
        resource: 'user',
        resourceId: userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.json(result)
    } catch (error) {
      next(error)
    }
  },

  async verify2FA(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body
      const userId = (req as any).userId
      const tenantId = (req as any).tenantId

      if (!userId) {
        return res.status(401).json({ message: 'Non autorisé' })
      }

      if (!code) {
        return res.status(400).json({ message: 'Code 2FA requis' })
      }

      const isValid = await twoFactorService.verify(userId, code)

      if (!isValid) {
        return res.status(401).json({ message: 'Code 2FA invalide' })
      }

      // Audit log 2FA verified
      await auditService.log({
        action: '2FA_VERIFY',
        userId,
        tenantId,
        resource: 'user',
        resourceId: userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.json({ message: '2FA vérifié avec succès' })
    } catch (error) {
      next(error)
    }
  },

  async disable2FA(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const tenantId = (req as any).tenantId

      if (!userId) {
        return res.status(401).json({ message: 'Non autorisé' })
      }

      await twoFactorService.disable(userId)

      // Audit log 2FA disabled
      await auditService.log({
        action: '2FA_DISABLE',
        userId,
        tenantId,
        resource: 'user',
        resourceId: userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.json({ message: '2FA désactivée avec succès' })
    } catch (error) {
      next(error)
    }
  },

  async regenerateBackupCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const tenantId = (req as any).tenantId

      if (!userId) {
        return res.status(401).json({ message: 'Non autorisé' })
      }

      const backupCodes = await twoFactorService.regenerateBackupCodes(userId)

      // Audit log backup codes regenerated
      await auditService.log({
        action: '2FA_BACKUP_REGEN',
        userId,
        tenantId,
        resource: 'user',
        resourceId: userId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.json({ message: 'Codes backup régénérés', backupCodes })
    } catch (error) {
      next(error)
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body
      if (!token) {
        return res.status(400).json({ message: 'Token de vérification requis' })
      }

      const result = await authService.verifyEmail(token)
      res.json(result)
    } catch (error) {
      next(error)
    }
  },

  async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body
      if (!email) {
        return res.status(400).json({ message: 'Email requis' })
      }

      const result = await authService.resendVerificationEmail(email)
      res.json(result)
    } catch (error) {
      next(error)
    }
  },
}
