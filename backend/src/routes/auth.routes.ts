import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { authLimiter } from '../middleware/rateLimiter'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification et gestion de compte
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Créer un compte entreprise
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, companyName, companySlug]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               companyName: { type: string }
 *               companySlug: { type: string, example: ma-boutique }
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       409:
 *         description: Slug entreprise déjà pris
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', authLimiter, authController.register)
/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion utilisateur
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               tenantSlug: { type: string, description: 'Slug du tenant (optionnel)' }
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         description: Identifiants invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', authLimiter, authController.login)
/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renouveler le token d'accès
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Nouveaux tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       401:
 *         description: Refresh token invalide ou expiré
 */
router.post('/refresh', authController.refresh)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Déconnexion (révocation du token)
 *     responses:
 *       200:
 *         description: Déconnecté avec succès
 */
router.post('/logout', authController.logout)

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Profil de l'utilisateur connecté
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Non authentifié
 */
router.get('/me', authMiddleware, authController.me)

/**
 * @swagger
 * /auth/change-password-mandatory:
 *   post:
 *     tags: [Auth]
 *     summary: Changer le mot de passe (obligatoire à la 1ère connexion)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Mot de passe changé avec succès
 *       401:
 *         description: Non authentifié
 */
router.post('/change-password-mandatory', authMiddleware, authController.changePasswordMandatory)

export default router
