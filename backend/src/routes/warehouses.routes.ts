import { Router } from 'express'
import { warehouseController } from '../controllers/warehouses.controller'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { checkPlanLimit } from '../middleware/planLimit.middleware'

const router = Router()

// All warehouse routes require auth + tenant
router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * @swagger
 * tags:
 *   name: Warehouses
 *   description: Gestion multi-entrepôts
 */

/**
 * @swagger
 * /warehouses:
 *   get:
 *     tags: [Warehouses]
 *     summary: Lister les entrepôts du tenant
 *     responses:
 *       200:
 *         description: Liste des entrepôts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Warehouse'
 *   post:
 *     tags: [Warehouses]
 *     summary: Créer un entrepôt (admin uniquement, limité par plan)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               location: { type: string }
 *     responses:
 *       201:
 *         description: Entrepôt créé
 *       403:
 *         description: Rôle insuffisant ou quota dépassé
 * /warehouses/{id}:
 *   get:
 *     tags: [Warehouses]
 *     summary: Obtenir un entrepôt
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Entrepôt trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Warehouse'
 *       404:
 *         description: Entrepôt introuvable
 *   put:
 *     tags: [Warehouses]
 *     summary: Mettre à jour un entrepôt (admin)
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
 *             $ref: '#/components/schemas/Warehouse'
 *     responses:
 *       200:
 *         description: Entrepôt mis à jour
 *   delete:
 *     tags: [Warehouses]
 *     summary: Supprimer un entrepôt (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Entrepôt supprimé
 * /warehouses/product/{productId}:
 *   get:
 *     tags: [Warehouses]
 *     summary: Stock d'un produit par entrepôt
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Répartition du stock par entrepôt
 */

// GET /api/v1/warehouses
router.get('/', warehouseController.list)

// GET /api/v1/warehouses/:id
router.get('/:id', warehouseController.get)

// POST /api/v1/warehouses
router.post('/', requireRole('admin'), checkPlanLimit('warehouses'), warehouseController.create)

// PUT /api/v1/warehouses/:id
router.put('/:id', requireRole('admin'), warehouseController.update)

// DELETE /api/v1/warehouses/:id
router.delete('/:id', requireRole('admin'), warehouseController.delete)

// GET /api/v1/warehouses/product/:productId
router.get('/product/:productId', warehouseController.getProductStock)

export default router
