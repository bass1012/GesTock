import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { NotFoundError, ForbiddenError } from '../utils/errors'
import { emailService } from './notification.service'

const prisma = new PrismaClient()

export const userService = {
  /**
   * Liste tous les utilisateurs du tenant courant
   */
  async listUsers(tenantId: string) {
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    return users
  },

  /**
   * Inviter (créer) un utilisateur dans le tenant sans passer par le register public
   */
  async inviteUser(
    data: { email: string; firstName: string; lastName: string; role: string; password: string },
    tenantId: string,
    invitedByRole: string
  ) {
    // Seul un admin peut inviter
    if (invitedByRole !== 'admin') {
      throw new ForbiddenError('Seul un administrateur peut inviter des utilisateurs')
    }

    // Vérifier que le rôle est valide
    const validRoles = ['admin', 'manager', 'lecteur']
    if (!validRoles.includes(data.role)) {
      throw new Error('Rôle invalide. Valeurs acceptées : admin, manager, lecteur')
    }

    // Vérifier si l'email est déjà utilisé dans ce tenant
    const existing = await prisma.user.findUnique({
      where: { email_tenantId: { email: data.email, tenantId } },
    })
    if (existing) {
      throw new Error('Un utilisateur avec cet email existe déjà dans ce tenant')
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)

    // Récupérer le nom du tenant pour l'email
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })

    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        password: hashedPassword,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    })

    // Envoyer l'email de bienvenue avec les identifiants temporaires
    await emailService.sendWelcomeEmail({
      to: data.email,
      firstName: data.firstName,
      tenantName: tenant?.name || 'GesStock',
      role: data.role,
      password: data.password,
    }).catch((err) => {
      // Ne pas bloquer la création si l'email échoue
      console.warn('[UserService] Email de bienvenue non envoyé :', err.message)
    })

    return user
  },

  /**
   * Mettre à jour le rôle d'un utilisateur
   */
  async updateUserRole(
    userId: string,
    newRole: string,
    tenantId: string,
    requesterId: string,
    requesterRole: string
  ) {
    if (requesterRole !== 'admin') {
      throw new ForbiddenError('Seul un administrateur peut modifier les rôles')
    }

    // Empêcher de modifier son propre rôle
    if (userId === requesterId) {
      throw new Error('Vous ne pouvez pas modifier votre propre rôle')
    }

    const validRoles = ['admin', 'manager', 'lecteur']
    if (!validRoles.includes(newRole)) {
      throw new Error('Rôle invalide')
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    })
    if (!user) throw new NotFoundError('Utilisateur introuvable')

    return prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })
  },

  /**
   * Supprimer (révoquer) un utilisateur du tenant
   */
  async removeUser(userId: string, tenantId: string, requesterId: string, requesterRole: string) {
    if (requesterRole !== 'admin') {
      throw new ForbiddenError('Seul un administrateur peut supprimer des utilisateurs')
    }
    if (userId === requesterId) {
      throw new Error('Vous ne pouvez pas supprimer votre propre compte')
    }

    const user = await prisma.user.findFirst({ where: { id: userId, tenantId } })
    if (!user) throw new NotFoundError('Utilisateur introuvable')

    await prisma.user.delete({ where: { id: userId } })
    return { success: true }
  },
}
