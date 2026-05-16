import { PrismaClient } from '@prisma/client'
import { NotFoundError, BadRequestError } from '../utils/errors'
import { stockService } from './stock.service'

const prisma = new PrismaClient()

export const orderService = {
  async list({ tenantSlug }: { tenantSlug: string }) {
    const schemaName = `tenant_${tenantSlug}`
    const orders = await prisma.$queryRawUnsafe(
      `SELECT o.*, s.name as supplier_name 
       FROM "${schemaName}".purchase_orders o
       JOIN "${schemaName}".suppliers s ON o.supplier_id = s.id
       ORDER BY o.created_at DESC`
    ) as any[]
    
    return orders.map(o => ({
      id: o.id,
      supplierId: o.supplier_id,
      supplierName: o.supplier_name,
      status: o.status,
      totalAmount: o.total_amount,
      expectedDate: o.expected_date,
      createdAt: o.created_at,
      updatedAt: o.updated_at
    }))
  },

  async get(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    
    const orders = await prisma.$queryRawUnsafe(
      `SELECT o.*, s.name as supplier_name 
       FROM "${schemaName}".purchase_orders o
       JOIN "${schemaName}".suppliers s ON o.supplier_id = s.id
       WHERE o.id = $1::uuid`,
      id
    ) as any[]

    if (!orders.length) throw new NotFoundError('Commande introuvable')

    const items = await prisma.$queryRawUnsafe(
      `SELECT i.*, p.name as product_name, p.sku as product_sku
       FROM "${schemaName}".purchase_order_items i
       JOIN "${schemaName}".products p ON i.product_id = p.id
       WHERE i.purchase_order_id = $1::uuid`,
      id
    ) as any[]

    const o = orders[0]
    return {
      id: o.id,
      supplierId: o.supplier_id,
      supplierName: o.supplier_name,
      status: o.status,
      totalAmount: o.total_amount,
      expectedDate: o.expected_date,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      items: items.map(i => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        productSku: i.product_sku,
        quantity: i.quantity,
        unitPrice: i.unit_price
      }))
    }
  },

  async create(data: any, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    
    // Simplistic sum
    let totalAmount = 0
    for (const item of data.items) {
      totalAmount += (item.quantity * item.unitPrice)
    }

    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".purchase_orders (supplier_id, status, expected_date, total_amount)
       VALUES ($1::uuid, $2, $3, $4) RETURNING *`,
       data.supplierId,
       data.status || 'DRAFT',
       data.expectedDate ? new Date(data.expectedDate) : null,
       totalAmount
    ) as any[]
    
    const order = result[0]

    // Insert items
    for (const item of data.items) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schemaName}".purchase_order_items (purchase_order_id, product_id, quantity, unit_price)
         VALUES ($1::uuid, $2::uuid, $3, $4)`,
         order.id,
         item.productId,
         item.quantity,
         item.unitPrice
      )
    }

    return this.get(order.id, tenantSlug)
  },

  async updateStatus(id: string, newStatus: string, tenantSlug: string, userId?: string) {
    const schemaName = `tenant_${tenantSlug}`
    const orderRaw = await this.get(id, tenantSlug)
    if (orderRaw.status === 'RECEIVED' || orderRaw.status === 'CANCELLED') {
      throw new BadRequestError(`Impossible de modifier une commande au statut ${orderRaw.status}`)
    }

    const result = await prisma.$queryRawUnsafe(
      `UPDATE "${schemaName}".purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2::uuid RETURNING id`,
      newStatus,
      id
    ) as any[]

    if (!result.length) throw new NotFoundError('Commande introuvable')

    // If newStatus is RECEIVED, create stock movements
    if (newStatus === 'RECEIVED') {
      for (const item of orderRaw.items) {
        await stockService.createMovement({
          productId: item.productId,
          type: 'IN',
          quantity: item.quantity,
          reference: `PO-${id}`,
          note: `Réception de la commande ${id}`
        }, tenantSlug, userId) // userId is handled correctly
      }
    }

    return this.get(id, tenantSlug)
  }
}
