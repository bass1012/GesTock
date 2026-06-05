import { PrismaClient } from '@prisma/client'
import { cacheService } from './cache.service'
import { SqlQueryBuilder } from '../utils/queryBuilder'

const prisma = new PrismaClient()

export interface DbDashboardProductsResult {
  total: string | number | bigint
  stock_value: number | string
  low_stock: string | number | bigint
}

export interface DbTodayMovements {
  total: string | number | bigint
}

export interface DbTopProduct {
  id: string
  name: string
  sku: string
  current_stock: number | string
  value: number | string
}

export interface DbStockByCategory {
  category: string
  count: string | number | bigint
  value: number | string
}

export interface DbMovementsByType {
  type: string
  count: string | number | bigint
  quantity: string | number | bigint
}

export interface DbInventoryReportRow {
  id: string
  sku: string
  name: string
  category: string | null
  unit: string
  current_stock: number | string
  min_stock: number | string
  price: number | string
  stock_value: number | string
}

export interface DbMovementReportRow {
  id: string
  product_name: string
  product_sku: string
  type: string
  quantity: number | string
  reference: string | null
  note: string | null
  created_at: Date
}

export interface DbExpiryAlertRow {
  id: string
  name: string
  sku: string
  current_stock: number | string
  expiry_date: Date
}

export interface DbSlowRotationRow {
  id: string
  name: string
  sku: string
  current_stock: number | string
  price: number | string
  created_at: Date
}

export interface DbRestockForecastRow {
  id: string
  name: string
  sku: string
  unit: string
  current_stock: number | string
  min_stock: number | string
  price: number | string
  total_out: number | string
  total_transfer_out: number | string
}
const CACHE_TTL_SHORT = 300 // 5 minutes
const CACHE_TTL_MEDIUM = 600 // 10 minutes
const CACHE_TTL_LONG = 1800 // 30 minutes

export interface DashboardStats {
  totalProducts: number
  totalStockValue: number
  lowStockCount: number
  totalMovementsToday: number
  totalMovementsWeek: number
  purchaseOrdersPending: number
  topProducts: Array<{
    id: string
    name: string
    sku: string
    currentStock: number
    value: number
  }>
  stockByCategory: Array<{
    category: string
    count: number
    value: number
  }>
  movementsByType: Array<{
    type: string
    count: number
    quantity: number
  }>
}

export interface InventoryReport {
  products: Array<{
    id: string
    sku: string
    name: string
    category: string | null
    unit: string
    currentStock: number
    minStock: number
    price: number
    stockValue: number
    status: 'OK' | 'LOW' | 'OUT'
  }>
  summary: {
    totalProducts: number
    totalValue: number
    lowStockProducts: number
    outOfStock: number
  }
  pagination: {
    page: number
    limit: number
    totalPages: number
    totalItems: number
  }
}

export interface MovementReport {
  movements: Array<{
    id: string
    productName: string
    productSku: string
    type: string
    quantity: number
    reference: string | null
    note: string | null
    createdAt: Date
  }>
  summary: {
    totalMovements: number
    totalIn: number
    totalOut: number
    totalAdjustments: number
  }
  pagination: {
    page: number
    limit: number
    totalPages: number
    totalItems: number
  }
}

export const reportService = {
  async getDashboardStats(tenantSlug: string): Promise<DashboardStats> {
    const cacheKey = cacheService.generateKey('dashboard', {
      tenantSlug,
      date: new Date().toISOString().split('T')[0],
    })

    return cacheService.wrap(
      async () => {
        const schemaName = `tenant_${tenantSlug}`

        // Total products and stock value
        const productsResult = (await prisma.$queryRawUnsafe(
          `SELECT 
                COUNT(*) as total,
                COALESCE(SUM(current_stock * price), 0) as stock_value,
                COUNT(CASE WHEN current_stock <= min_stock AND min_stock > 0 THEN 1 END) as low_stock
             FROM "${schemaName}".products WHERE is_active = true`,
        )) as DbDashboardProductsResult[]

        // Movements today
        const today = new Date().toISOString().split('T')[0]
        const movementsTodayResult = (await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as total FROM "${schemaName}".stock_movements WHERE DATE(created_at) = $1::date`,
          today,
        )) as DbTodayMovements[]

        // Movements this week
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const movementsWeekResult = (await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as total FROM "${schemaName}".stock_movements WHERE created_at >= $1::timestamp`,
          weekAgo,
        )) as DbTodayMovements[]

        // Pending purchase orders
        const pendingOrdersResult = (await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as total FROM "${schemaName}".purchase_orders WHERE status IN ('DRAFT', 'SENT')`,
        )) as DbTodayMovements[]

        // Top 5 products by stock value
        const topProductsResult = (await prisma.$queryRawUnsafe(
          `SELECT 
                p.id, p.name, p.sku, p.current_stock, (p.current_stock * p.price) as value
             FROM "${schemaName}".products p
             WHERE p.is_active = true AND p.current_stock > 0
             ORDER BY value DESC
             LIMIT 5`,
        )) as DbTopProduct[]

        // Stock by category
        const stockByCategoryResult = (await prisma.$queryRawUnsafe(
          `SELECT 
                COALESCE(c.name, 'Sans catégorie') as category,
                COUNT(p.id) as count,
                COALESCE(SUM(p.current_stock * p.price), 0) as value
             FROM "${schemaName}".products p
             LEFT JOIN "${schemaName}".categories c ON p.category_id = c.id
             WHERE p.is_active = true
             GROUP BY c.name`,
        )) as DbStockByCategory[]

        // Movements by type
        const movementsByTypeResult = (await prisma.$queryRawUnsafe(
          `SELECT 
                type,
                COUNT(*) as count,
                SUM(quantity) as quantity
             FROM "${schemaName}".stock_movements
             WHERE created_at >= $1::timestamp
             GROUP BY type`,
          weekAgo,
        )) as DbMovementsByType[]

        return {
          totalProducts: Number(productsResult[0]?.total || 0),
          totalStockValue: Number(productsResult[0]?.stock_value || 0),
          lowStockCount: Number(productsResult[0]?.low_stock || 0),
          totalMovementsToday: Number(movementsTodayResult[0]?.total || 0),
          totalMovementsWeek: Number(movementsWeekResult[0]?.total || 0),
          purchaseOrdersPending: Number(pendingOrdersResult[0]?.total || 0),
          topProducts: topProductsResult.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            currentStock: Number(p.current_stock),
            value: Number(p.value),
          })),
          stockByCategory: stockByCategoryResult.map((c: any) => ({
            category: c.category,
            count: Number(c.count),
            value: Number(c.value),
          })),
          movementsByType: movementsByTypeResult.map((m: any) => ({
            type: m.type,
            count: parseInt(m.count, 10),
            quantity: parseInt(m.quantity, 10),
          })),
        }
      },
      cacheKey,
      { ttl: CACHE_TTL_SHORT, tags: [`tenant:${tenantSlug}`, 'dashboard'] },
    )
  },

  async getInventoryReport(
    tenantSlug: string,
    options?: { categoryId?: string; status?: string; page?: number; limit?: number },
  ): Promise<InventoryReport> {
    const page = options?.page || 1
    const limit = options?.limit || 50
    const offset = (page - 1) * limit

    const cacheKey = cacheService.generateKey('inventory', {
      tenantSlug,
      categoryId: options?.categoryId || 'all',
      status: options?.status || 'all',
      page,
      limit,
    })

    return cacheService.wrap(
      async () => {
        const schemaName = `tenant_${tenantSlug}`
        const builder = new SqlQueryBuilder()
        builder.where('p.is_active = true')

        if (options?.categoryId) {
          builder.where('p.category_id = ?', options.categoryId)
        }

        // Get total count for pagination
        const countResult = (await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as total FROM "${schemaName}".products p ${builder.buildWhere()}`,
          ...builder.getParams(),
        )) as DbTodayMovements[]
        const totalItems = Number(countResult[0]?.total || 0)

        // Get paginated products
        const limitIndex = builder.addParam(limit)
        const offsetIndex = builder.addParam(offset)
        const products = (await prisma.$queryRawUnsafe(
          `SELECT 
                p.id, p.sku, p.name, c.name as category, p.unit,
                p.current_stock, p.min_stock, p.price,
                (p.current_stock * p.price) as stock_value
              FROM "${schemaName}".products p
              LEFT JOIN "${schemaName}".categories c ON p.category_id = c.id
              ${builder.buildWhere()}
              ORDER BY p.name
              LIMIT ${limitIndex} OFFSET ${offsetIndex}`,
          ...builder.getParams(),
        )) as DbInventoryReportRow[]

        const mappedProducts = products.map((p: any) => {
          const currentStock = parseInt(p.current_stock, 10)
          const minStock = parseInt(p.min_stock, 10)
          let status: 'OK' | 'LOW' | 'OUT' = 'OK'
          if (currentStock === 0) status = 'OUT'
          else if (minStock > 0 && currentStock <= minStock) status = 'LOW'

          return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            unit: p.unit,
            currentStock,
            minStock,
            price: parseFloat(p.price),
            stockValue: parseFloat(p.stock_value || 0),
            status,
          }
        })

        // Filter by status if specified (post-query for calculated status)
        const filteredProducts = options?.status
          ? mappedProducts.filter((p) => p.status === options.status)
          : mappedProducts

        const summary = {
          totalProducts: totalItems,
          totalValue: filteredProducts.reduce((sum, p) => sum + p.stockValue, 0),
          lowStockProducts: filteredProducts.filter((p) => p.status === 'LOW').length,
          outOfStock: filteredProducts.filter((p) => p.status === 'OUT').length,
        }

        return {
          products: filteredProducts,
          summary,
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
          },
        }
      },
      cacheKey,
      { ttl: CACHE_TTL_MEDIUM, tags: [`tenant:${tenantSlug}`, 'inventory'] },
    )
  },

  async getMovementReport(
    tenantSlug: string,
    options?: {
      startDate?: string
      endDate?: string
      productId?: string
      type?: string
      page?: number
      limit?: number
    },
  ): Promise<MovementReport> {
    const page = options?.page || 1
    const limit = options?.limit || 50
    const offset = (page - 1) * limit

    const cacheKey = cacheService.generateKey('movements', {
      tenantSlug,
      startDate: options?.startDate || 'all',
      endDate: options?.endDate || 'all',
      productId: options?.productId || 'all',
      type: options?.type || 'all',
      page,
      limit,
    })

    return cacheService.wrap(
      async () => {
        const schemaName = `tenant_${tenantSlug}`
        const builder = new SqlQueryBuilder()
        builder.where('1=1')

        if (options?.startDate) {
          builder.where('m.created_at >= ?::timestamp', options.startDate)
        }

        if (options?.endDate) {
          builder.where('m.created_at <= ?::timestamp', options.endDate + 'T23:59:59')
        }

        if (options?.productId) {
          builder.where('m.product_id = ?', options.productId)
        }

        if (options?.type) {
          builder.where('m.type = ?', options.type)
        }

        // Get total count for pagination
        const countResult = (await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as total FROM "${schemaName}".stock_movements m ${builder.buildWhere()}`,
          ...builder.getParams(),
        )) as DbTodayMovements[]
        const totalItems = Number(countResult[0]?.total || 0)

        // Get paginated movements
        const limitIndex = builder.addParam(limit)
        const offsetIndex = builder.addParam(offset)
        const movements = (await prisma.$queryRawUnsafe(
          `SELECT 
                m.id, p.name as product_name, p.sku as product_sku,
                m.type, m.quantity, m.reference, m.note, m.created_at
              FROM "${schemaName}".stock_movements m
              JOIN "${schemaName}".products p ON m.product_id = p.id
              ${builder.buildWhere()}
              ORDER BY m.created_at DESC
              LIMIT ${limitIndex} OFFSET ${offsetIndex}`,
          ...builder.getParams(),
        )) as DbMovementReportRow[]

        const summary = {
          totalMovements: totalItems,
          totalIn: movements
            .filter((m: any) => m.type === 'IN')
            .reduce((sum: number, m: any) => sum + parseInt(m.quantity, 10), 0),
          totalOut: movements
            .filter((m: any) => m.type === 'OUT')
            .reduce((sum: number, m: any) => sum + parseInt(m.quantity, 10), 0),
          totalAdjustments: movements.filter((m: any) => m.type === 'ADJUSTMENT').length,
        }

        return {
          movements: movements.map((m: any) => ({
            id: m.id,
            productName: m.product_name,
            productSku: m.product_sku,
            type: m.type,
            quantity: parseInt(m.quantity, 10),
            reference: m.reference,
            note: m.note,
            createdAt: new Date(m.created_at),
          })),
          summary,
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalItems / limit),
            totalItems,
          },
        }
      },
      cacheKey,
      { ttl: CACHE_TTL_SHORT, tags: [`tenant:${tenantSlug}`, 'movements'] },
    )
  },

  async getExpiryAlerts(tenantSlug: string, daysThreshold: number = 30): Promise<any[]> {
    const cacheKey = cacheService.generateKey('expiry', { tenantSlug, daysThreshold })

    return cacheService.wrap(
      async () => {
        const schemaName = `tenant_${tenantSlug}`
        const thresholdDate = new Date(
          Date.now() + daysThreshold * 24 * 60 * 60 * 1000,
        ).toISOString()

        const results = (await prisma.$queryRawUnsafe(
          `SELECT id, name, sku, current_stock, expiry_date
             FROM "${schemaName}".products
             WHERE is_active = true 
             AND expiry_date IS NOT NULL 
             AND expiry_date <= $1::timestamp
             ORDER BY expiry_date ASC`,
          thresholdDate,
        )) as DbExpiryAlertRow[]

        return results.map((r) => ({
          ...r,
          daysRemaining: Math.ceil(
            (new Date(r.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          ),
        }))
      },
      cacheKey,
      { ttl: CACHE_TTL_SHORT, tags: [`tenant:${tenantSlug}`, 'expiry'] },
    )
  },

  async getSlowRotationReport(tenantSlug: string, daysThreshold: number = 90): Promise<any[]> {
    const cacheKey = cacheService.generateKey('slow-rotation', { tenantSlug, daysThreshold })

    return cacheService.wrap(
      async () => {
        const schemaName = `tenant_${tenantSlug}`
        const windowDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000).toISOString()

        // Produits avec stock > 0 mais sans mouvement de type 'OUT' depuis X jours
        const results = (await prisma.$queryRawUnsafe(
          `SELECT p.id, p.name, p.sku, p.current_stock, p.price, p.created_at
             FROM "${schemaName}".products p
             WHERE p.is_active = true 
             AND p.current_stock > 0 
             AND p.created_at <= $1::timestamp
             AND NOT EXISTS (
                SELECT 1 FROM "${schemaName}".stock_movements m 
                WHERE m.product_id = p.id 
                AND m.type = 'OUT' 
                AND m.created_at >= $1::timestamp
             )
             ORDER BY p.current_stock * p.price DESC`,
          windowDate,
        )) as DbSlowRotationRow[]

        return results.map((r) => ({
          ...r,
          lastMovementOut: null, // On sait qu'il n'y en a pas dans la fenêtre
          value: Number(r.current_stock) * Number(r.price),
        }))
      },
      cacheKey,
      { ttl: CACHE_TTL_LONG, tags: [`tenant:${tenantSlug}`, 'slow-rotation'] },
    )
  },

  async exportInventoryToCSV(tenantSlug: string): Promise<string> {
    const report = await this.getInventoryReport(tenantSlug)

    const headers = [
      'SKU',
      'Nom',
      'Catégorie',
      'Unité',
      'Stock Actuel',
      'Stock Min',
      'Prix',
      'Valeur Stock',
      'Statut',
    ]
    const rows = report.products.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category || '',
      p.unit,
      p.currentStock,
      p.minStock,
      p.price.toFixed(2),
      p.stockValue.toFixed(2),
      p.status,
    ])

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  },

  async exportMovementsToCSV(
    tenantSlug: string,
    options?: { startDate?: string; endDate?: string },
  ): Promise<string> {
    const report = await this.getMovementReport(tenantSlug, options)

    const headers = ['Date', 'Produit', 'SKU', 'Type', 'Quantité', 'Référence', 'Note']
    const rows = report.movements.map((m) => [
      m.createdAt.toISOString().split('T')[0],
      `"${m.productName.replace(/"/g, '""')}"`,
      m.productSku,
      m.type,
      m.quantity,
      m.reference || '',
      m.note ? `"${m.note.replace(/"/g, '""')}"` : '',
    ])

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  },

  /**
   * Prévisions de réapprovisionnement :
   * - Calcule la vélocité de sortie (quantité vendue/sortie par semaine sur les X derniers jours)
   * - Estime la date de rupture de stock
   * - Signale les produits nécessitant un réappro urgent (< 2 semaines)
   */
  async getRestockForecasts(tenantSlug: string, windowDays: number = 30): Promise<any[]> {
    const cacheKey = cacheService.generateKey('restock-forecasts', { tenantSlug, windowDays })

    return cacheService.wrap(
      async () => {
        const schemaName = `tenant_${tenantSlug}`
        const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()

        // Vélocité de sortie par produit (OUT + TRANSFER négatif) sur la fenêtre
        const velocities = (await prisma.$queryRawUnsafe(
          `SELECT 
                    p.id,
                    p.name,
                    p.sku,
                    p.unit,
                    p.current_stock,
                    p.min_stock,
                    p.price,
                    COALESCE(SUM(ABS(m.quantity)) FILTER (
                        WHERE m.type IN ('OUT') AND m.created_at >= $2::timestamp
                    ), 0) AS total_out,
                    COALESCE(SUM(ABS(m.quantity)) FILTER (
                        WHERE m.type = 'TRANSFER' AND m.quantity < 0 AND m.created_at >= $2::timestamp
                    ), 0) AS total_transfer_out
                FROM "${schemaName}".products p
                LEFT JOIN "${schemaName}".stock_movements m ON m.product_id = p.id
                WHERE p.is_active = true AND p.is_deleted = false
                GROUP BY p.id, p.name, p.sku, p.unit, p.current_stock, p.min_stock, p.price
                ORDER BY p.name ASC`,
          windowDays,
          windowStart,
        )) as DbRestockForecastRow[]

        return velocities
          .map((r: any) => {
            const totalConsumed = parseFloat(r.total_out) + parseFloat(r.total_transfer_out)
            // Vélocité en unités/semaine
            const weeklyVelocity = (totalConsumed / windowDays) * 7
            const currentStock = parseFloat(r.current_stock)
            const minStock = parseFloat(r.min_stock)

            // Jours avant rupture (stock = 0)
            const daysUntilStockout =
              weeklyVelocity > 0 ? Math.floor((currentStock / weeklyVelocity) * 7) : null

            // Date estimée de rupture
            const estimatedStockoutDate =
              daysUntilStockout !== null
                ? new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0]
                : null

            // Statut urgence
            let urgency: 'critical' | 'warning' | 'ok' | 'no_movement' = 'no_movement'
            if (weeklyVelocity > 0) {
              if (daysUntilStockout !== null && daysUntilStockout <= 7) urgency = 'critical'
              else if (daysUntilStockout !== null && daysUntilStockout <= 14) urgency = 'warning'
              else urgency = 'ok'
            }
            if (currentStock <= 0) urgency = 'critical'

            // Quantité recommandée à commander (4 semaines de stock)
            const recommendedOrderQty =
              weeklyVelocity > 0
                ? Math.max(0, Math.ceil(weeklyVelocity * 4) - currentStock + minStock)
                : 0

            return {
              id: r.id,
              name: r.name,
              sku: r.sku,
              unit: r.unit,
              currentStock,
              minStock,
              price: parseFloat(r.price),
              weeklyVelocity: Math.round(weeklyVelocity * 100) / 100,
              totalConsumedInWindow: totalConsumed,
              windowDays,
              daysUntilStockout,
              estimatedStockoutDate,
              recommendedOrderQty,
              urgency,
            }
          })
          .sort((a: any, b: any) => {
            // Trier : critiques d'abord, puis warnings, puis ok, puis no_movement
            const order: Record<string, number> = { critical: 0, warning: 1, ok: 2, no_movement: 3 }
            return (order[a.urgency] ?? 4) - (order[b.urgency] ?? 4)
          })
      },
      cacheKey,
      { ttl: CACHE_TTL_SHORT, tags: [`tenant:${tenantSlug}`, 'forecasts'] },
    )
  },
}
