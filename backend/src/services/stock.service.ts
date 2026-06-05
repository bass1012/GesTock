import { PrismaClient } from '@prisma/client'
import { NotFoundError, BadRequestError } from '../utils/errors'
import { cacheService } from './cache.service'
import { auditService } from './audit.service'
import { mapRow } from '../utils/mapper'
import { SqlQueryBuilder } from '../utils/queryBuilder'
import { productSchema, productUpdateSchema, stockMovementSchema, stockTransferSchema } from '../utils/validators'

const prisma = new PrismaClient()

export interface DbProduct {
  id: string
  sku: string
  name: string
  description: string | null
  category_id: string | null
  unit: string
  min_stock: number
  current_stock: number
  price: number
  expiry_date: Date | null
  batch_number: string | null
  is_deleted: boolean
  is_active: boolean
  created_at: Date
  updated_at: Date
  category_name?: string | null
  warehouses?: any
}

export interface DbCountResult {
  total: string | number | bigint
}

export interface DbStockMovementWithRelations {
  id: string
  product_id: string
  warehouse_id: string | null
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  quantity: number
  reference: string | null
  note: string | null
  created_by: string | null
  created_at: Date
  product_name: string
  product_sku: string
  warehouse_name: string | null
}

export interface DbWarehouseId {
  id: string
}

export interface DbLocalStock {
  quantity: number
}

export interface DbStockMovement {
  id: string
  product_id: string
  warehouse_id: string | null
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  quantity: number
  reference: string | null
  note: string | null
  created_by: string | null
  created_at: Date
  batch_number: string | null
  expiry_date: Date | null
}

export interface DbLot {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  product_unit: string
  warehouse_id: string | null
  warehouse_name: string | null
  batch_number: string | null
  expiry_date: Date | null
  quantity: number
  created_at: Date
  reference: string | null
}

export interface DbProductWarehouseStock {
  quantity: number | string
}

export interface DbProductCurrentStock {
  current_stock: number | string
}

interface ProductQuery {
  page: number
  limit: number
  search?: string
  tenantSlug: string
}

export const stockService = {
  async listProducts({ page, limit, search, tenantSlug }: ProductQuery) {
    const schemaName = `tenant_${tenantSlug}`
    const offset = (page - 1) * limit

    const builder = new SqlQueryBuilder()
    const limitIndex = builder.addParam(limit)
    const offsetIndex = builder.addParam(offset)

    builder.where('is_deleted = false')
    if (search) {
      builder.where('(name ILIKE ? OR sku ILIKE ?)', `%${search}%`, `%${search}%`)
    }

    const products = (await prisma.$queryRawUnsafe(
      `SELECT p.*,
                    (SELECT name FROM "${schemaName}".categories WHERE id = p.category_id) as category_name,
                    COALESCE(
                        (SELECT json_agg(json_build_object('id', w.id, 'name', w.name, 'quantity', pw.quantity) ORDER BY w.name)
                         FROM "${schemaName}".product_warehouses pw
                         JOIN "${schemaName}".warehouses w ON pw.warehouse_id = w.id
                         WHERE pw.product_id = p.id AND pw.quantity > 0),
                        '[]'::json
                    ) as warehouses
              FROM "${schemaName}".products p
              ${builder.buildWhere()}
              ORDER BY p.created_at DESC
              LIMIT ${limitIndex} OFFSET ${offsetIndex}`,
      ...builder.getParams(),
    )) as DbProduct[]

    const countBuilder = new SqlQueryBuilder()
    countBuilder.where('is_deleted = false')
    if (search) {
      countBuilder.where('(name ILIKE ? OR sku ILIKE ?)', `%${search}%`, `%${search}%`)
    }

    const countResult = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM "${schemaName}".products ${countBuilder.buildWhere()}`,
      ...countBuilder.getParams(),
    )) as DbCountResult[]

    const total = Number(countResult[0]?.total || 0)

    return {
      products: products.map((p: any) => {
        const mapped = mapRow(p) as any
        return {
          ...mapped,
          category: mapped.categoryName
            ? { id: mapped.categoryId, name: mapped.categoryName }
            : null,
          warehouses: Array.isArray(mapped.warehouses) ? mapped.warehouses : [],
        } as any
      }),
      total,
      page,
      limit,
    }
  },

  async getProduct(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const products = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "${schemaName}".products WHERE id = $1::uuid`,
      id,
    )) as DbProduct[]

    if (!products.length) {
      throw new NotFoundError('Produit introuvable')
    }

    return mapRow(products[0])
  },

  async createProduct(data: any, tenantSlug: string) {
    const validatedData = productSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`
    const result = (await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".products (sku, name, description, category_id, unit, min_stock, current_stock, price, expiry_date, batch_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      validatedData.sku,
      validatedData.name,
      validatedData.description || null,
      validatedData.categoryId || null,
      validatedData.unit || 'unité',
      validatedData.minStock || 0,
      validatedData.currentStock || 0,
      validatedData.price || 0,
      validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
      validatedData.batchNumber || null,
    )) as DbProduct[]

    const product = result[0]

    // If warehouseId provided, create entry in product_warehouses
    if (validatedData.warehouseId) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                 VALUES ($1::uuid, $2::uuid, $3)
                 ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = $3, updated_at = NOW()`,
        product.id,
        validatedData.warehouseId,
        validatedData.currentStock || 0,
      )
    }

    return product
  },

  async updateProduct(id: string, data: any, tenantSlug: string) {
    const validatedData = productUpdateSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`

    // Build SET clause dynamically
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    const fieldMap: Record<string, string> = {
      sku: 'sku',
      name: 'name',
      description: 'description',
      categoryId: 'category_id',
      unit: 'unit',
      minStock: 'min_stock',
      currentStock: 'current_stock',
      price: 'price',
      expiryDate: 'expiry_date',
      batchNumber: 'batch_number',
      isActive: 'is_active',
    }

    for (const [key, column] of Object.entries(fieldMap)) {
      if (validatedData[key as keyof typeof validatedData] !== undefined) {
        let value = validatedData[key as keyof typeof validatedData] as any
        // Sanitize empty strings for date and UUID fields
        if (value === '' && (key === 'expiryDate' || key === 'categoryId')) {
          value = null
        }
        // Explicitly convert date string to Date object for Postgres TIMESTAMP
        if (key === 'expiryDate' && typeof value === 'string' && value !== '') {
          value = new Date(value)
        }
        fields.push(`${column} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const result = (await prisma.$queryRawUnsafe(
      `UPDATE "${schemaName}".products SET ${fields.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
      ...values,
    )) as DbProduct[]

    if (!result.length) {
      throw new NotFoundError('Produit introuvable')
    }

    // Si un entrepôt est fourni, mettre à jour product_warehouses avec le stock actuel
    if (validatedData.warehouseId) {
      const stockQty = validatedData.currentStock !== undefined ? validatedData.currentStock : result[0].current_stock
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                 VALUES ($1::uuid, $2::uuid, $3)
                 ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = $3, updated_at = NOW()`,
        id,
        validatedData.warehouseId,
        stockQty,
      )
    }

    return result[0]
  },

  async deleteProduct(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const result = (await prisma.$queryRawUnsafe(
      `UPDATE "${schemaName}".products SET is_deleted = true, updated_at = NOW() WHERE id = $1::uuid RETURNING id`,
      id,
    )) as Array<{ id: string }>

    if (!result.length) {
      throw new NotFoundError('Produit introuvable')
    }

    return { success: true }
  },

  async listMovements({
    page,
    limit,
    tenantSlug,
    productId,
  }: {
    page: number
    limit: number
    tenantSlug: string
    productId?: string
  }) {
    const schemaName = `tenant_${tenantSlug}`
    const offset = (page - 1) * limit
    const builder = new SqlQueryBuilder()
    const limitIndex = builder.addParam(limit)
    const offsetIndex = builder.addParam(offset)

    if (productId) {
      builder.where('m.product_id = ?::uuid', productId)
    }

    // We join with products and warehouses
    const movements = (await prisma.$queryRawUnsafe(
      `SELECT m.*, p.name as product_name, p.sku as product_sku, w.name as warehouse_name
              FROM "${schemaName}".stock_movements m
              JOIN "${schemaName}".products p ON m.product_id = p.id
              LEFT JOIN "${schemaName}".warehouses w ON m.warehouse_id = w.id
              ${builder.buildWhere()}
              ORDER BY m.created_at DESC
              LIMIT ${limitIndex} OFFSET ${offsetIndex}`,
      ...builder.getParams(),
    )) as DbStockMovementWithRelations[]

    const countBuilder = new SqlQueryBuilder()
    if (productId) {
      countBuilder.where('m.product_id = ?::uuid', productId)
    }

    const totalQuery = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM "${schemaName}".stock_movements m ${countBuilder.buildWhere()}`,
      ...countBuilder.getParams(),
    )) as DbCountResult[]
    const total = Number(totalQuery[0]?.total || 0)

    return {
      movements: movements.map((m) => {
        const mapped = mapRow(m) as any
        return {
          ...mapped,
          product: { id: mapped.productId, name: mapped.productName, sku: mapped.productSku },
          warehouse: mapped.warehouseName
            ? { id: mapped.warehouseId, name: mapped.warehouseName }
            : null,
        } as any
      }),
      total,
      page,
      limit,
    }
  },

  async createMovement(data: any, tenantSlug: string, userId?: string) {
    const validatedData = stockMovementSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`

    // 1. Déterminer l'entrepôt
    let warehouseId = validatedData.warehouseId
    if (!warehouseId) {
      const defaultWarehouse = (await prisma.$queryRawUnsafe(
        `SELECT id FROM "${schemaName}".warehouses WHERE name = 'Dépôt Principal' LIMIT 1`,
      )) as DbWarehouseId[]
      if (defaultWarehouse.length > 0) {
        warehouseId = defaultWarehouse[0].id
      } else {
        throw new NotFoundError('Entrepôt par défaut introuvable. Veuillez spécifier un entrepôt.')
      }
    }

    // 2. Récupérer le stock actuel (global et local)
    const product = await this.getProduct(validatedData.productId, tenantSlug)
    const localStockResult = (await prisma.$queryRawUnsafe(
      `SELECT quantity FROM "${schemaName}".product_warehouses 
             WHERE product_id = $1::uuid AND warehouse_id = $2::uuid`,
      validatedData.productId,
      warehouseId,
    )) as DbLocalStock[]

    const currentLocalStock = localStockResult.length > 0 ? localStockResult[0].quantity : 0
    let newGlobalStock = product.currentStock
    let newLocalStock = currentLocalStock

    if (validatedData.type === 'IN') {
      newGlobalStock += validatedData.quantity
      newLocalStock += validatedData.quantity
    } else if (validatedData.type === 'OUT') {
      if (newLocalStock < validatedData.quantity) {
        throw new BadRequestError(
          `Stock insuffisant dans cet entrepôt (Disponible: ${newLocalStock})`,
        )
      }
      newGlobalStock -= validatedData.quantity
      newLocalStock -= validatedData.quantity
    } else if (validatedData.type === 'ADJUSTMENT') {
      newGlobalStock += validatedData.quantity
      newLocalStock += validatedData.quantity
    }

    // 3. Préparer les champs optionnels lot
    const batchNumber = validatedData.batchNumber || null
    const expiryDate = validatedData.expiryDate ? new Date(validatedData.expiryDate) : null

    // 4. Exécuter les mises à jour
    const mov = (await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".stock_movements (product_id, warehouse_id, type, quantity, reference, note, created_by, batch_number, expiry_date)
             VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid, $8, $9)
             RETURNING *`,
      validatedData.productId,
      warehouseId,
      validatedData.type,
      validatedData.quantity,
      validatedData.reference || null,
      validatedData.note || null,
      userId || null,
      batchNumber,
      expiryDate,
    )) as DbStockMovement[]

    // Mise à jour stock global
    await prisma.$queryRawUnsafe(
      `UPDATE "${schemaName}".products SET current_stock = $1, updated_at = NOW() WHERE id = $2::uuid`,
      newGlobalStock,
      validatedData.productId,
    )

    // Mise à jour ou création stock local
    if (localStockResult.length > 0) {
      await prisma.$queryRawUnsafe(
        `UPDATE "${schemaName}".product_warehouses SET quantity = $1, updated_at = NOW() 
                 WHERE product_id = $2::uuid AND warehouse_id = $3::uuid`,
        newLocalStock,
        validatedData.productId,
        warehouseId,
      )
    } else {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                 VALUES ($1::uuid, $2::uuid, $3)`,
        validatedData.productId,
        warehouseId,
        newLocalStock,
      )
    }

    // Invalider le cache des rapports pour ce tenant
    cacheService
      .invalidateTags([`tenant:${tenantSlug}`, 'dashboard', 'inventory', 'movements'])
      .catch((err) => console.error("[Cache] Erreur lors de l'invalidation:", err))

    // Audit
    if (userId) {
      const action =
        validatedData.type === 'IN'
          ? 'STOCK_MOVEMENT_IN'
          : validatedData.type === 'OUT'
            ? 'STOCK_MOVEMENT_OUT'
            : 'STOCK_ADJUSTED'
      auditService
        .log({
          action,
          userId,
          resource: 'stock_movement',
          resourceId: mov[0].id,
          metadata: {
            productId: validatedData.productId,
            warehouseId,
            quantity: validatedData.quantity,
            type: validatedData.type,
            reference: validatedData.reference || null,
          },
        })
        .catch((err) => console.error('[Audit] createMovement:', err))
    }

    return mov[0]
  },

  /**
   * Liste les lots actifs par produit (entrées IN avec batch_number ou expiry_date).
   * Un "lot" = un mouvement IN avec son batchNumber + expiryDate.
   * La quantité restante est estimée à partir des sorties postérieures (même produit + entrepôt).
   */
  async listLots(tenantSlug: string, productId?: string) {
    const schemaName = `tenant_${tenantSlug}`

    const builder = new SqlQueryBuilder()
    builder.where("m.type = 'IN'")
    if (productId) {
      builder.where("m.product_id = ?::uuid", productId)
    }

    const lots = (await prisma.$queryRawUnsafe(
      `SELECT
                m.id,
                m.product_id,
                p.name  AS product_name,
                p.sku   AS product_sku,
                p.unit  AS product_unit,
                m.warehouse_id,
                w.name  AS warehouse_name,
                m.batch_number,
                m.expiry_date,
                m.quantity,
                m.created_at,
                m.reference
             FROM "${schemaName}".stock_movements m
             JOIN "${schemaName}".products p ON p.id = m.product_id
             LEFT JOIN "${schemaName}".warehouses w ON w.id = m.warehouse_id
             ${builder.buildWhere()}
             AND (m.batch_number IS NOT NULL OR m.expiry_date IS NOT NULL)
             ORDER BY m.expiry_date ASC NULLS LAST, m.created_at DESC`,
      ...builder.getParams(),
    )) as DbLot[]

    return lots.map((l: any) => {
      const mapped = mapRow(l)
      const now = new Date()
      const expiry = mapped.expiryDate ? new Date(mapped.expiryDate) : null
      const daysRemaining = expiry
        ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null
      let expiryStatus: 'expired' | 'critical' | 'warning' | 'ok' | null = null
      if (daysRemaining !== null) {
        if (daysRemaining < 0) expiryStatus = 'expired'
        else if (daysRemaining <= 7) expiryStatus = 'critical'
        else if (daysRemaining <= 30) expiryStatus = 'warning'
        else expiryStatus = 'ok'
      }
      return {
        ...mapped,
        daysRemaining,
        expiryStatus,
        receivedAt: mapped.createdAt,
      }
    })
  },

  async createTransfer(
    data: {
      productId: string
      sourceWarehouseId: string
      destWarehouseId: string
      quantity: number
      note?: string
    },
    tenantSlug: string,
    userId?: string,
  ) {
    const validatedData = stockTransferSchema.parse(data)
    const schemaName = `tenant_${tenantSlug}`
    const { productId, sourceWarehouseId, destWarehouseId, quantity, note } = validatedData

    if (sourceWarehouseId === destWarehouseId) {
      throw new BadRequestError("L'entrepôt source et destination doivent être différents")
    }

    // 1. Vérifier stock disponible dans la source
    const sourceStock = (await prisma.$queryRawUnsafe(
      `SELECT quantity FROM "${schemaName}".product_warehouses 
             WHERE product_id = $1::uuid AND warehouse_id = $2::uuid`,
      productId,
      sourceWarehouseId,
    )) as DbProductWarehouseStock[]

    let currentSourceQty: number
    if (sourceStock.length > 0) {
      currentSourceQty = Number(sourceStock[0].quantity)
    } else {
      // Pas d'entrée product_warehouses : utiliser current_stock global comme fallback
      // (produit créé avant le système multi-entrepôts)
      const prod = (await prisma.$queryRawUnsafe(
        `SELECT current_stock FROM "${schemaName}".products WHERE id = $1::uuid`,
        productId,
      )) as DbProductCurrentStock[]
      currentSourceQty = prod.length > 0 ? Number(prod[0].current_stock) : 0
      // Initialiser l'entrée product_warehouses pour la source
      if (currentSourceQty > 0) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                     VALUES ($1::uuid, $2::uuid, $3)
                     ON CONFLICT (product_id, warehouse_id) DO NOTHING`,
          productId,
          sourceWarehouseId,
          currentSourceQty,
        )
      }
    }

    if (currentSourceQty < quantity) {
      throw new BadRequestError(
        `Stock insuffisant dans l'entrepôt source (Disponible: ${currentSourceQty})`,
      )
    }

    // 2. Stock destination
    const destStock = (await prisma.$queryRawUnsafe(
      `SELECT quantity FROM "${schemaName}".product_warehouses 
             WHERE product_id = $1::uuid AND warehouse_id = $2::uuid`,
      productId,
      destWarehouseId,
    )) as DbProductWarehouseStock[]
    const currentDestQty = destStock.length > 0 ? Number(destStock[0].quantity) : 0

    // 3. Insérer les 2 mouvements TRANSFER (OUT source, IN dest)
    const reference = `TRF-${Date.now()}`

    await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".stock_movements (product_id, warehouse_id, type, quantity, reference, note, created_by)
             VALUES ($1::uuid, $2::uuid, 'TRANSFER', $3, $4, $5, $6::uuid)`,
      productId,
      sourceWarehouseId,
      -quantity,
      reference,
      note || null,
      userId || null,
    )

    await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".stock_movements (product_id, warehouse_id, type, quantity, reference, note, created_by)
             VALUES ($1::uuid, $2::uuid, 'TRANSFER', $3, $4, $5, $6::uuid)`,
      productId,
      destWarehouseId,
      quantity,
      reference,
      note || null,
      userId || null,
    )

    // 4. Mise à jour stock source
    await prisma.$queryRawUnsafe(
      `UPDATE "${schemaName}".product_warehouses SET quantity = $1, updated_at = NOW()
             WHERE product_id = $2::uuid AND warehouse_id = $3::uuid`,
      currentSourceQty - quantity,
      productId,
      sourceWarehouseId,
    )

    // 5. Mise à jour ou création stock destination
    if (destStock.length > 0) {
      await prisma.$queryRawUnsafe(
        `UPDATE "${schemaName}".product_warehouses SET quantity = $1, updated_at = NOW()
                  WHERE product_id = $2::uuid AND warehouse_id = $3::uuid`,
        currentDestQty + quantity,
        productId,
        destWarehouseId,
      )
    } else {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                  VALUES ($1::uuid, $2::uuid, $3)`,
        productId,
        destWarehouseId,
        quantity,
      )
    }

    // 6. Invalider cache
    cacheService
      .invalidateTags([`tenant:${tenantSlug}`, 'dashboard', 'inventory', 'movements'])
      .catch((err) => console.error("[Cache] Erreur lors de l'invalidation:", err))

    // Audit
    if (userId) {
      auditService
        .log({
          action: 'STOCK_TRANSFER',
          userId,
          resource: 'stock_transfer',
          resourceId: reference,
          metadata: {
            productId,
            sourceWarehouseId,
            destWarehouseId,
            quantity,
            reference,
            note: note || null,
          },
        })
        .catch((err) => console.error('[Audit] createTransfer:', err))
    }

    return { reference, productId, sourceWarehouseId, destWarehouseId, quantity }
  },
}
