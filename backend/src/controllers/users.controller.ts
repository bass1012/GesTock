import { Request, Response, NextFunction } from 'express'
import { userService } from '../services/user.service'
import { auditService } from '../services/audit.service'
import { userInviteSchema, userRoleSchema } from '../utils/validators'

export const usersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.listUsers(req.tenantId!)
      res.json(users)
    } catch (error) {
      next(error)
    }
  },

  async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const data = userInviteSchema.parse(req.body)
      const user = await userService.inviteUser(data, req.tenantId!, req.userRole!)

      // Audit log user creation
      await auditService.log({
        action: 'USER_CREATED',
        userId: req.userId!,
        tenantId: req.tenantId!,
        resource: 'user',
        resourceId: user.id,
        metadata: { email: user.email, role: user.role, invitedBy: req.userId },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json(user)
    } catch (error) {
      next(error)
    }
  },

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = userRoleSchema.parse(req.body)
      const targetUserId = req.params.id
      const user = await userService.updateUserRole(
        targetUserId,
        role,
        req.tenantId!,
        req.userId!,
        req.userRole!,
      )

      // Audit log role change
      await auditService.log({
        action: 'ROLE_CHANGED',
        userId: req.userId!,
        tenantId: req.tenantId!,
        resource: 'user',
        resourceId: targetUserId,
        metadata: { newRole: role, changedBy: req.userId },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.json(user)
    } catch (error) {
      next(error)
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id
      await userService.removeUser(targetUserId, req.tenantId!, req.userId!, req.userRole!)

      // Audit log user deletion
      await auditService.log({
        action: 'USER_DELETED',
        userId: req.userId!,
        tenantId: req.tenantId!,
        resource: 'user',
        resourceId: targetUserId,
        metadata: { deletedBy: req.userId },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.json({ message: 'Utilisateur supprimé du tenant' })
    } catch (error) {
      next(error)
    }
  },
}
