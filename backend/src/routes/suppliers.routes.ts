import { Router } from 'express'
import { suppliersController } from '../controllers/suppliers.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'

const router = Router()

router.use(authMiddleware)
router.use(tenantMiddleware)

/**
 * @swagger
 * tags:
 *   name: Suppliers
 *   description: Gestion des fournisseurs
 */

/**
 * @swagger
 * /suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: Lister les fournisseurs
 *     responses:
 *       200:
 *         description: Liste des fournisseurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Supplier'
 *   post:
 *     tags: [Suppliers]
 *     summary: Créer un fournisseur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               address: { type: string }
 *     responses:
 *       201:
 *         description: Fournisseur créé
 * /suppliers/{id}:
 *   get:
 *     tags: [Suppliers]
 *     summary: Obtenir un fournisseur
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fournisseur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Supplier'
 *       404:
 *         description: Fournisseur introuvable
 *   put:
 *     tags: [Suppliers]
 *     summary: Mettre à jour un fournisseur
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
 *             $ref: '#/components/schemas/Supplier'
 *     responses:
 *       200:
 *         description: Fournisseur mis à jour
 *   delete:
 *     tags: [Suppliers]
 *     summary: Supprimer un fournisseur
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Fournisseur supprimé
 */
router.get('/', suppliersController.list)
router.get('/:id', suppliersController.get)
router.post('/', suppliersController.create)
router.put('/:id', suppliersController.update)
router.delete('/:id', suppliersController.delete)

export default router
