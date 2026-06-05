import { PrismaClient } from '@prisma/client'
import { NotFoundError } from '../utils/errors'
import { stockService } from './stock.service'
import { supplierReturnSchema } from '../utils/validators'
import { mapRow, mapRows } from '../utils/mapper'

export interface DbSupplierReturn {
  id: string
  supplier_id: string
  supplier_name: string
  warehouse_id: string | null
  status: 'PENDING' | 'COMPLETED'
  reason: string | null
  reference: string
  created_at: Date
  updated_at: Date
}

export interface DbSupplierReturnItem {
  id: string
  return_id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number | string
}

const prisma = new PrismaClient()

export const supplierReturnService = {
  async list(tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT r.*, s.name AS supplier_name
       FROM "${schemaName}".supplier_returns r
       JOIN "${schemaName}".suppliers s ON s.id = r.supplier_id
       ORDER BY r.created_at DESC`,
    )) as DbSupplierReturn[]

    return mapRows(rows)
  },

  async get(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT r.*, s.name AS supplier_name
       FROM "${schemaName}".supplier_returns r
       JOIN "${schemaName}".suppliers s ON s.id = r.supplier_id
       WHERE r.id = $1::uuid`,
      id,
    )) as DbSupplierReturn[]

    if (!rows.length) throw new NotFoundError('Retour introuvable')

    const items = (await prisma.$queryRawUnsafe(
      `SELECT i.*, p.name AS product_name, p.sku AS product_sku
       FROM "${schemaName}".supplier_return_items i
       JOIN "${schemaName}".products p ON p.id = i.product_id
       WHERE i.return_id = $1::uuid`,
      id,
    )) as DbSupplierReturnItem[]

    const r = mapRow(rows[0]) as any
    return {
      ...r,
      items: mapRows(items),
    }
  },

  /**
   * Crée un retour fournisseur et génère immédiatement les mouvements OUT.
   */
  async create(
    data: any,
    tenantSlug: string,
    userId?: string,
  ) {
    const validatedData = supplierReturnSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`

    const refNumber = `RET-${Date.now()}`

    const result = (await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".supplier_returns (supplier_id, warehouse_id, status, reason, reference, created_by)
       VALUES ($1::uuid, $2::uuid, 'COMPLETED', $3, $4, $5)
       RETURNING *`,
      validatedData.supplierId,
      validatedData.warehouseId || null,
      validatedData.reason || null,
      refNumber,
      userId || null,
    )) as DbSupplierReturn[]

    const returnOrder = result[0]

    for (const item of validatedData.items) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".supplier_return_items (return_id, product_id, quantity, unit_price)
         VALUES ($1::uuid, $2::uuid, $3, $4)`,
        returnOrder.id,
        item.productId,
        item.quantity,
        item.unitPrice ?? 0,
      )

      // Générer le mouvement OUT correspondant
      await stockService.createMovement(
        {
          productId: item.productId,
          warehouseId: validatedData.warehouseId,
          type: 'OUT',
          quantity: item.quantity,
          reference: refNumber,
          note: `Retour fournisseur${validatedData.reason ? ': ' + validatedData.reason : ''}`,
        },
        tenantSlug,
        userId,
      )
    }

    return this.get(returnOrder.id, tenantSlug)
  },
}
