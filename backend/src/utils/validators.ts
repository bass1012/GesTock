import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  companyName: z.string().min(1, "Nom d'entreprise requis"),
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
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  warehouseId: z.string().optional().nullable(),
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
  productId: z.string(),
  warehouseId: z.string().optional().nullable(),
  type: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT']),
  quantity: z.number().int().positive('La quantité doit être positive'),
  reference: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(), // ISO date string
})

export const supplierSchema = z.object({
  name: z.string().min(1, 'Nom du fournisseur requis'),
  email: z.string().email('Email invalide').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

export const purchaseOrderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive('La quantité doit être positive'),
  unitPrice: z.number().positive('Le prix unitaire doit être positif'),
})

export const purchaseOrderSchema = z.object({
  supplierId: z.string(),
  status: z.enum(['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED']).optional(),
  expectedDate: z.string().datetime().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, 'Au moins un article est requis'),
})

export const warehouseSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  address: z.string().optional(),
})

export const warehouseUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  is_active: z.boolean().optional(),
})

export const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
})

export const clientUpdateSchema = clientSchema.partial()

export const userInviteSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  role: z.enum(['admin', 'manager', 'lecteur']),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
})

export const userRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'lecteur']),
})

export const stockTransferSchema = z.object({
  productId: z.string(),
  sourceWarehouseId: z.string(),
  destWarehouseId: z.string(),
  quantity: z.number().int().positive('La quantité doit être un entier positif'),
  note: z.string().optional(),
})

export const supplierReturnSchema = z.object({
  supplierId: z.string(),
  warehouseId: z.string().optional(),
  reason: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative().optional(),
      }),
    )
    .min(1, 'Au moins un article requis'),
})

export const saleSchema = z.object({
  clientId: z.string().optional().nullable(),
  type: z.enum(['DEV', 'FAC']),
  taxRate: z.number().min(0).max(100).optional(),
  warehouseId: z.string().optional().nullable(),
  pointsToRedeem: z.number().int().min(0).optional().default(0),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
})
