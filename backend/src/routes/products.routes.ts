import { Router } from 'express'
import { productsController } from '../controllers/products.controller'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { checkPlanLimit } from '../middleware/planLimit.middleware'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

// All product routes require auth + tenant
router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Gestion du catalogue produits
 */

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Lister les produits du tenant
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Recherche par nom ou SKU
 *     responses:
 *       200:
 *         description: Liste paginée de produits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 */
router.get('/', asyncHandler(productsController.list))
/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Obtenir un produit par son ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Produit trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Produit introuvable
 */
router.get('/:id', asyncHandler(productsController.get))

/**
 * @swagger
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Créer un nouveau produit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sku, name]
 *             properties:
 *               sku: { type: string }
 *               name: { type: string }
 *               description: { type: string }
 *               categoryId: { type: string, format: uuid }
 *               unit: { type: string, default: unité }
 *               minStock: { type: integer, default: 0 }
 *               currentStock: { type: integer, default: 0 }
 *               price: { type: number }
 *               expiryDate: { type: string, format: date }
 *               batchNumber: { type: string }
 *               warehouseId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Produit créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 */
router.post(
  '/',
  requireRole('admin', 'manager'),
  checkPlanLimit('products'),
  asyncHandler(productsController.create),
)

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Mettre à jour un produit
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
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Produit mis à jour
 *       404:
 *         description: Produit introuvable
 *   delete:
 *     tags: [Products]
 *     summary: Supprimer un produit (soft delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Produit supprimé
 *       404:
 *         description: Produit introuvable
 */
router.put('/:id', requireRole('admin', 'manager'), asyncHandler(productsController.update))
router.delete('/:id', requireRole('admin', 'manager'), asyncHandler(productsController.delete))

export default router
