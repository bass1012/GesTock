import { z } from 'zod'

export const registerSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    firstName: z.string().min(1, 'Prénom requis'),
    lastName: z.string().min(1, 'Nom requis'),
    companyName: z.string().min(1, 'Nom d\'entreprise requis'),
    companySlug: z
        .string()
        .min(3, 'Identifiant trop court')
        .max(50, 'Identifiant trop long')
        .regex(/^[a-z0-9-]+$/, 'Identifiant invalide (lettres minuscules, chiffres, tirets)'),
})

export const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
})

export const productSchema = z.object({
    sku: z.string().min(1, 'SKU requis'),
    name: z.string().min(1, 'Nom requis'),
    description: z.string().optional(),
    categoryId: z.string().uuid().optional().nullable(),
    warehouseId: z.string().uuid().optional().nullable(),
    unit: z.string().default('unité'),
    minStock: z.number().int().min(0).default(0),
    currentStock: z.number().int().min(0).default(0),
    price: z.number().min(0).default(0),
    isActive: z.boolean().optional().default(true),
    expiryDate: z.string().optional().nullable(),
    batchNumber: z.string().optional().nullable(),
})

export const productUpdateSchema = productSchema.partial()

export const stockMovementSchema = z.object({
  productId: z.string().uuid('ID produit invalide'),
  warehouseId: z.string().uuid('ID entrepôt invalide').optional(),
  type: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT']),
  quantity: z.number().int().positive('La quantité doit être positive'),
  reference: z.string().optional(),
  note: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(), // ISO date string
})

export const supplierSchema = z.object({
  name: z.string().min(1, 'Nom du fournisseur requis'),
  email: z.string().email('Email invalide').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

export const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid('ID produit invalide'),
  quantity: z.number().int().positive('La quantité doit être positive'),
  unitPrice: z.number().positive('Le prix unitaire doit être positif'),
})

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid('ID fournisseur invalide'),
  status: z.enum(['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED']).optional(),
  expectedDate: z.string().datetime().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, 'Au moins un article est requis'),
})
