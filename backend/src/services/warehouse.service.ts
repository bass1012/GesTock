import { PrismaClient } from '@prisma/client'
import { NotFoundError } from '../utils/errors'
import { mapRow, mapRows } from '../utils/mapper'
import { warehouseSchema, warehouseUpdateSchema } from '../utils/validators'

const prisma = new PrismaClient()

export interface DbWarehouse {
  id: string
  name: string
  address: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Warehouse {
  id: string
  name: string
  address: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DbStockCount {
  total: string
}

export interface DbProductWarehouse {
  product_id: string
  warehouse_id: string
  quantity: number
  created_at: Date
  updated_at: Date
  warehouse_name: string
}

export interface ProductWarehouse {
  productId: string
  warehouseId: string
  quantity: number
  createdAt: Date
  updatedAt: Date
  warehouseName: string
}

export const warehouseService = {
  async listWarehouses(tenantSlug: string): Promise<Warehouse[]> {
    const schemaName = `tenant_${tenantSlug}`
    const warehouses = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "${schemaName}".warehouses ORDER BY name ASC`,
    )) as DbWarehouse[]
    return mapRows<Warehouse>(warehouses)
  },

  async getWarehouse(id: string, tenantSlug: string): Promise<Warehouse> {
    const schemaName = `tenant_${tenantSlug}`
    const warehouses = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "${schemaName}".warehouses WHERE id = $1::uuid`,
      id,
    )) as DbWarehouse[]

    if (!warehouses.length) {
      throw new NotFoundError('Entrepôt introuvable')
    }

    return mapRow<Warehouse>(warehouses[0])
  },

  async createWarehouse(data: any, tenantSlug: string): Promise<Warehouse> {
    const validatedData = warehouseSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`
    const result = (await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".warehouses (name, address)
             VALUES ($1, $2)
             RETURNING *`,
      validatedData.name,
      validatedData.address || null,
    )) as DbWarehouse[]
    return mapRow<Warehouse>(result[0])
  },

  async updateWarehouse(
    id: string,
    data: any,
    tenantSlug: string,
  ): Promise<Warehouse> {
    const validatedData = warehouseUpdateSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`

    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (validatedData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`)
      values.push(validatedData.name)
    }
    if (validatedData.address !== undefined) {
      fields.push(`address = $${paramIndex++}`)
      values.push(validatedData.address)
    }
    if (validatedData.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`)
      values.push(validatedData.is_active)
    }

    if (fields.length === 0) return this.getWarehouse(id, tenantSlug)

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const result = (await prisma.$queryRawUnsafe(
      `UPDATE "${schemaName}".warehouses SET ${fields.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
      ...values,
    )) as DbWarehouse[]

    if (!result.length) {
      throw new NotFoundError('Entrepôt introuvable')
    }

    return mapRow<Warehouse>(result[0])
  },

  async deleteWarehouse(id: string, tenantSlug: string): Promise<{ success: boolean }> {
    const schemaName = `tenant_${tenantSlug}`

    // On ne supprime pas physiquement s'il y a du stock ou des mouvements ?
    // Pour l'instant, on désactive ou on vérifie.
    const stockCount = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM "${schemaName}".product_warehouses WHERE warehouse_id = $1::uuid AND quantity > 0`,
      id,
    )) as DbStockCount[]

    if (parseInt(stockCount[0].total) > 0) {
      throw new Error('Impossible de supprimer un entrepôt contenant encore du stock.')
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "${schemaName}".warehouses WHERE id = $1::uuid`, id)
    return { success: true }
  },

  async getProductStock(productId: string, tenantSlug: string): Promise<ProductWarehouse[]> {
    const schemaName = `tenant_${tenantSlug}`
    const stock = (await prisma.$queryRawUnsafe(
      `SELECT pw.*, w.name as warehouse_name 
             FROM "${schemaName}".product_warehouses pw
             JOIN "${schemaName}".warehouses w ON pw.warehouse_id = w.id
             WHERE pw.product_id = $1::uuid`,
      productId,
    )) as DbProductWarehouse[]
    return mapRows<ProductWarehouse>(stock)
  },
}
