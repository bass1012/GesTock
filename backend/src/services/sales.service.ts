import { PrismaClient } from '@prisma/client'
import { loyaltyService } from './loyalty.service'
import { auditService } from './audit.service'
import { NotFoundError, BadRequestError } from '../utils/errors'
import { mapRow } from '../utils/mapper'
import { DbProduct } from './stock.service'
import { saleSchema } from '../utils/validators'

export interface DbSaleWithCount {
  id: string
  client_id: string | null
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED'
  total_amount: number | string
  tax_rate: number | string | null
  tax_amount: number | string | null
  reference: string
  created_at: Date
  updated_at: Date
  _count_items: string | number | bigint
}

export interface DbSale {
  id: string
  client_id: string | null
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED'
  total_amount: number | string
  tax_rate: number | string | null
  tax_amount: number | string | null
  reference: string
  created_at: Date
  updated_at: Date
  pointsEarned?: number
  loyaltyDiscount?: number
}

export interface DbSaleItemWithProductName {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number | string
  product_name: string
}

const prisma = new PrismaClient()

export class SalesService {
  async getAllSales(tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const sales = (await prisma.$queryRawUnsafe(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM "${schemaName}".sale_items WHERE sale_id = s.id) as "_count_items"
       FROM "${schemaName}".sales s
       ORDER BY s.created_at DESC`,
    )) as DbSaleWithCount[]

    return sales.map((s) => {
      const mapped = mapRow(s) as any
      return {
        ...mapped,
        _count: { items: Number(s._count_items) },
      } as any
    })
  }

  async getSaleById(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const sales = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "${schemaName}".sales WHERE id = $1::uuid`,
      id,
    )) as DbSale[]
    if (!sales.length) return null

    const items = (await prisma.$queryRawUnsafe(
      `
        SELECT si.*, p.name as product_name
        FROM "${schemaName}".sale_items si
        JOIN "${schemaName}".products p ON si.product_id = p.id
        WHERE si.sale_id = $1::uuid
    `,
      id,
    )) as DbSaleItemWithProductName[]

    const mappedSale = mapRow(sales[0]) as any
    return {
      ...mappedSale,
      items: items.map((it) => {
        const mappedItem = mapRow(it) as any
        return {
          ...mappedItem,
          product: { name: it.product_name },
        } as any
      }),
    }
  }

  async createSale(data: any, userId: string, tenantSlug: string) {
    const validatedData = saleSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`

    let totalAmount = 0
    const prefix = validatedData.type === 'DEV' ? 'DEV' : 'FAC'
    const reference = `${prefix}-${Date.now().toString().slice(-6)}`

    const resolvedItems = []

    // Check stock explicitly via Raw query to hit Tenant domain
    for (const item of validatedData.items) {
      const prods = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "${schemaName}".products WHERE id = $1::uuid`,
        item.productId,
      )) as DbProduct[]

      if (!prods.length) throw new NotFoundError(`Produit introuvable : ${item.productId}`)
      const product = prods[0]

      if (validatedData.type === 'FAC') {
        if (product.current_stock < item.quantity) {
          throw new BadRequestError(`Stock insuffisant pour le produit: ${product.name}`)
        }
      }

      totalAmount += product.price * item.quantity
      resolvedItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        product,
      })
    }

    let taxAmount = 0
    if (validatedData.taxRate && validatedData.taxRate > 0) {
      taxAmount = totalAmount * (validatedData.taxRate / 100)
    }

    // Remise fidélité (points utilisés)
    let loyaltyDiscount = 0
    const pointsToRedeem = Number(validatedData.pointsToRedeem) || 0
    if (pointsToRedeem > 0 && validatedData.clientId) {
      loyaltyDiscount = loyaltyService.calculateDiscount(pointsToRedeem)
    }

    const finalTotal = Math.max(0, totalAmount + taxAmount - loyaltyDiscount)

    // Create Sale Ticket
    const saleResult = (await prisma.$queryRawUnsafe(
      `
      INSERT INTO "${schemaName}".sales (client_id, status, total_amount, tax_rate, tax_amount, reference)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      validatedData.clientId || null,
      validatedData.type === 'DEV' ? 'DRAFT' : 'COMPLETED',
      finalTotal,
      validatedData.taxRate || 0,
      taxAmount,
      reference,
    )) as DbSale[]

    const sale = saleResult[0]

    // Sub-items creation and Stock Deduction
    for (const it of resolvedItems) {
      await prisma.$queryRawUnsafe(
        `
          INSERT INTO "${schemaName}".sale_items (sale_id, product_id, quantity, unit_price)
          VALUES ($1::uuid, $2::uuid, $3, $4)
        `,
        sale.id,
        it.productId,
        it.quantity,
        it.unitPrice,
      )

      if (validatedData.type === 'FAC') {
        await prisma.$queryRawUnsafe(
          `
              UPDATE "${schemaName}".products 
              SET current_stock = current_stock - $1, updated_at = NOW() 
              WHERE id = $2::uuid
            `,
          it.quantity,
          it.productId,
        )

        // Audit
        await prisma.$queryRawUnsafe(
          `
              INSERT INTO "${schemaName}".stock_movements (product_id, type, quantity, reference, note, created_by)
              VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid)
            `,
          it.productId,
          'OUT',
          it.quantity,
          reference,
          `Vente Caisse ${reference}`,
          userId,
        )
      }
    }

    // Fidélité : débit points utilisés, puis crédit points gagnés
    if (validatedData.type === 'FAC' && validatedData.clientId) {
      if (pointsToRedeem > 0) {
        await loyaltyService.redeemPoints(validatedData.clientId, sale.id, pointsToRedeem, tenantSlug)
      }
      const pointsEarned = await loyaltyService.earnPoints(
        validatedData.clientId,
        sale.id,
        finalTotal,
        tenantSlug,
      )
      sale.pointsEarned = pointsEarned
      sale.loyaltyDiscount = loyaltyDiscount
    }

    // Audit — uniquement pour les ventes finalisées (FAC)
    if (validatedData.type === 'FAC') {
      auditService
        .log({
          action: 'SALE_COMPLETED',
          userId,
          resource: 'sale',
          resourceId: sale.id,
          metadata: {
            reference,
            totalAmount: finalTotal,
            itemCount: resolvedItems.length,
            clientId: validatedData.clientId || null,
            loyaltyDiscount: loyaltyDiscount || 0,
          },
        })
        .catch((err) => console.error('[Audit] createSale:', err))
    }

    return mapRow(sale)
  }
}

export const salesService = new SalesService()
