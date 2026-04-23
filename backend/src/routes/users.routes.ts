import { Router } from 'express'
import { usersController } from '../controllers/users.controller'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { checkPlanLimit } from '../middleware/planLimit.middleware'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestion des utilisateurs du tenant
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Lister les utilisateurs du tenant
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 * /users/invite:
 *   post:
 *     tags: [Users]
 *     summary: Inviter un nouvel utilisateur (admin uniquement)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName, role]
 *             properties:
 *               email: { type: string, format: email }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               role: { type: string, enum: [manager, lecteur] }
 *     responses:
 *       201:
 *         description: Invitation envoyée, mot de passe temporaire généré
 *       403:
 *         description: Rôle insuffisant (admin requis)
 * /users/{id}/role:
 *   put:
 *     tags: [Users]
 *     summary: Modifier le rôle d'un utilisateur (admin uniquement)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [admin, manager, lecteur] }
 *     responses:
 *       200:
 *         description: Rôle mis à jour
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Révoquer un utilisateur (admin uniquement)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Utilisateur révoqué
 */

// GET  /api/v1/users           — Lister les utilisateurs du tenant (tous rôles)
router.get('/', usersController.list)

// POST /api/v1/users/invite    — Inviter un nouvel utilisateur (admin only)
router.post('/invite', requireRole('admin'), checkPlanLimit('users'), usersController.invite)

// PUT  /api/v1/users/:id/role  — Modifier le rôle (admin only)
router.put('/:id/role', requireRole('admin'), usersController.updateRole)

// DELETE /api/v1/users/:id     — Révoquer un utilisateur (admin only)
router.delete('/:id', requireRole('admin'), usersController.remove)

export default router
