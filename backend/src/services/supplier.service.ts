import { PrismaClient } from '@prisma/client'
import { NotFoundError, BadRequestError } from '../utils/errors'
import { supplierSchema } from '../utils/validators'
import { mapRow, mapRows } from '../utils/mapper'

export interface DbSupplier {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  created_at: Date
  updated_at: Date
}

const prisma = new PrismaClient()

export const supplierService = {
  async list({ tenantSlug }: { tenantSlug: string }) {
    const schemaName = `tenant_${tenantSlug}`
    const suppliers = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "${schemaName}".suppliers ORDER BY created_at DESC`,
    )) as DbSupplier[]

    return mapRows(suppliers)
  },

  async get(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const result = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "${schemaName}".suppliers WHERE id = $1`,
      id,
    )) as DbSupplier[]

    if (!result.length) throw new NotFoundError('Fournisseur introuvable')

    return mapRow(result[0])
  },

  async create(data: any, tenantSlug: string) {
    const validatedData = supplierSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`
    const result = (await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".suppliers (name, email, phone, address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      validatedData.name,
      validatedData.email || null,
      validatedData.phone || null,
      validatedData.address || null,
    )) as DbSupplier[]
    return result[0]
  },

  async update(id: string, data: any, tenantSlug: string) {
    const validatedData = supplierSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`
    const result = (await prisma.$queryRawUnsafe(
      `UPDATE "${schemaName}".suppliers 
       SET name = $1, email = $2, phone = $3, address = $4, updated_at = NOW() 
       WHERE id = $5 RETURNING *`,
      validatedData.name,
      validatedData.email || null,
      validatedData.phone || null,
      validatedData.address || null,
      id,
    )) as DbSupplier[]

    if (!result.length) throw new NotFoundError('Fournisseur introuvable')
    return result[0]
  },

  async delete(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`

    // Check for linked purchase orders
    const linkedOrders = (await prisma.$queryRawUnsafe(
      `SELECT id FROM "${schemaName}".purchase_orders WHERE supplier_id = $1::uuid LIMIT 1`,
      id,
    )) as Array<{ id: string }>

    if (linkedOrders.length > 0) {
      throw new BadRequestError(
        'Impossible de supprimer ce fournisseur car il possède des bons de commande liés.',
      )
    }

    const result = (await prisma.$queryRawUnsafe(
      `DELETE FROM "${schemaName}".suppliers WHERE id = $1::uuid RETURNING id`,
      id,
    )) as Array<{ id: string }>

    if (!result.length) throw new NotFoundError('Fournisseur introuvable')
    return { success: true }
  },
}
