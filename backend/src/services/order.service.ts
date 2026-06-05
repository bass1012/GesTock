import { PrismaClient } from '@prisma/client'
import { NotFoundError, BadRequestError } from '../utils/errors'
import { stockService } from './stock.service'
import { purchaseOrderSchema } from '../utils/validators'
import { mapRow, mapRows } from '../utils/mapper'

export interface DbPurchaseOrder {
  id: string
  supplier_id: string
  supplier_name: string
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED'
  total_amount: number | string
  expected_date: Date | null
  created_at: Date
  updated_at: Date
}

export interface DbPurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_price: number | string
}

const prisma = new PrismaClient()

export const orderService = {
  async list({ tenantSlug }: { tenantSlug: string }) {
    const schemaName = `tenant_${tenantSlug}`
    const orders = (await prisma.$queryRawUnsafe(
      `SELECT o.*, s.name as supplier_name 
       FROM "${schemaName}".purchase_orders o
       JOIN "${schemaName}".suppliers s ON o.supplier_id = s.id
       ORDER BY o.created_at DESC`,
    )) as DbPurchaseOrder[]

    return mapRows(orders)
  },

  async get(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`

    const orders = (await prisma.$queryRawUnsafe(
      `SELECT o.*, s.name as supplier_name 
       FROM "${schemaName}".purchase_orders o
       JOIN "${schemaName}".suppliers s ON o.supplier_id = s.id
       WHERE o.id = $1::uuid`,
      id,
    )) as DbPurchaseOrder[]

    if (!orders.length) throw new NotFoundError('Commande introuvable')

    const items = (await prisma.$queryRawUnsafe(
      `SELECT i.*, p.name as product_name, p.sku as product_sku
       FROM "${schemaName}".purchase_order_items i
       JOIN "${schemaName}".products p ON i.product_id = p.id
       WHERE i.purchase_order_id = $1::uuid`,
      id,
    )) as DbPurchaseOrderItem[]

    const o = mapRow(orders[0]) as any
    return {
      ...o,
      items: mapRows(items),
    }
  },

  async create(data: any, tenantSlug: string) {
    const validatedData = purchaseOrderSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`

    // Simplistic sum
    let totalAmount = 0
    for (const item of validatedData.items) {
      totalAmount += item.quantity * item.unitPrice
    }

    const result = (await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".purchase_orders (supplier_id, status, expected_date, total_amount)
       VALUES ($1::uuid, $2, $3, $4) RETURNING *`,
      validatedData.supplierId,
      validatedData.status || 'DRAFT',
      validatedData.expectedDate ? new Date(validatedData.expectedDate) : null,
      totalAmount,
    )) as DbPurchaseOrder[]

    const order = result[0]

    // Insert items
    for (const item of validatedData.items) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schemaName}".purchase_order_items (purchase_order_id, product_id, quantity, unit_price)
         VALUES ($1::uuid, $2::uuid, $3, $4)`,
        order.id,
        item.productId,
        item.quantity,
        item.unitPrice,
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

    const result = (await prisma.$queryRawUnsafe(
      `UPDATE "${schemaName}".purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2::uuid RETURNING id`,
      newStatus,
      id,
    )) as Array<{ id: string }>

    if (!result.length) throw new NotFoundError('Commande introuvable')

    // If newStatus is RECEIVED, create stock movements
    if (newStatus === 'RECEIVED') {
      for (const item of orderRaw.items) {
        await stockService.createMovement(
          {
            productId: item.productId,
            type: 'IN',
            quantity: item.quantity,
            reference: `PO-${id}`,
            note: `Réception de la commande ${id}`,
          },
          tenantSlug,
          userId,
        ) // userId is handled correctly
      }
    }

    return this.get(id, tenantSlug)
  },
}
