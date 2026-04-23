import { PrismaClient } from '@prisma/client'
import { NotFoundError } from '../utils/errors'
import { stockService } from './stock.service'

const prisma = new PrismaClient()

export const supplierReturnService = {
  async list(tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const rows = await prisma.$queryRawUnsafe(
      `SELECT r.*, s.name AS supplier_name
       FROM "${schemaName}".supplier_returns r
       JOIN "${schemaName}".suppliers s ON s.id = r.supplier_id
       ORDER BY r.created_at DESC`
    ) as any[]

    return rows.map((r: any) => ({
      id: r.id,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      warehouseId: r.warehouse_id,
      status: r.status,
      reason: r.reason,
      reference: r.reference,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  },

  async get(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const rows = await prisma.$queryRawUnsafe(
      `SELECT r.*, s.name AS supplier_name
       FROM "${schemaName}".supplier_returns r
       JOIN "${schemaName}".suppliers s ON s.id = r.supplier_id
       WHERE r.id = $1::uuid`,
      id
    ) as any[]

    if (!rows.length) throw new NotFoundError('Retour introuvable')

    const items = await prisma.$queryRawUnsafe(
      `SELECT i.*, p.name AS product_name, p.sku AS product_sku
       FROM "${schemaName}".supplier_return_items i
       JOIN "${schemaName}".products p ON p.id = i.product_id
       WHERE i.return_id = $1::uuid`,
      id
    ) as any[]

    const r = rows[0]
    return {
      id: r.id,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      warehouseId: r.warehouse_id,
      status: r.status,
      reason: r.reason,
      reference: r.reference,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      items: items.map((i: any) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        productSku: i.product_sku,
        quantity: i.quantity,
        unitPrice: i.unit_price,
      })),
    }
  },

  /**
   * Crée un retour fournisseur et génère immédiatement les mouvements OUT.
   */
  async create(data: {
    supplierId: string
    warehouseId?: string
    reason?: string
    items: { productId: string; quantity: number; unitPrice?: number }[]
  }, tenantSlug: string, userId?: string) {
    const schemaName = `tenant_${tenantSlug}`

    const refNumber = `RET-${Date.now()}`

    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".supplier_returns (supplier_id, warehouse_id, status, reason, reference, created_by)
       VALUES ($1::uuid, $2, 'COMPLETED', $3, $4, $5)
       RETURNING *`,
      data.supplierId,
      data.warehouseId ? `${data.warehouseId}::uuid` : null,
      data.reason || null,
      refNumber,
      userId || null
    ) as any[]

    const returnOrder = result[0]

    for (const item of data.items) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".supplier_return_items (return_id, product_id, quantity, unit_price)
         VALUES ($1::uuid, $2::uuid, $3, $4)`,
        returnOrder.id,
        item.productId,
        item.quantity,
        item.unitPrice ?? 0
      )

      // Générer le mouvement OUT correspondant
      await stockService.createMovement({
        productId: item.productId,
        warehouseId: data.warehouseId,
        type: 'OUT',
        quantity: item.quantity,
        reference: refNumber,
        note: `Retour fournisseur${data.reason ? ': ' + data.reason : ''}`,
      }, tenantSlug, userId)
    }

    return this.get(returnOrder.id, tenantSlug)
  },
}
