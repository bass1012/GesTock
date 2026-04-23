import { PrismaClient, Prisma } from '@prisma/client'
import { NotFoundError } from '../utils/errors'
import { cacheService } from './cache.service'

const prisma = new PrismaClient()

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

        let whereClause = 'WHERE is_deleted = false'
        const params: any[] = [limit, offset]

        if (search) {
            whereClause += ` AND (name ILIKE $3 OR sku ILIKE $3)`
            params.push(`%${search}%`)
        }

        const products = await prisma.$queryRawUnsafe(
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
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT $1 OFFSET $2`,
            ...params
        ) as any[]

        const countResult = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*) as total FROM "${schemaName}".products ${whereClause ? whereClause.replace(/\$3/g, `$1`) : 'WHERE is_deleted = false'}`,
            ...(search ? [`%${search}%`] : [])
        ) as any[]

        const total = parseInt(countResult[0]?.total || '0', 10)

        return {
            products: products.map((p: any) => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                description: p.description,
                categoryId: p.category_id,
                category: p.category_name ? { id: p.category_id, name: p.category_name } : null,
                unit: p.unit,
                minStock: p.min_stock,
                currentStock: p.current_stock,
                price: p.price,
                expiryDate: p.expiry_date,
                batchNumber: p.batch_number,
                isActive: p.is_active,
                createdAt: p.created_at,
                updatedAt: p.updated_at,
                warehouses: Array.isArray(p.warehouses) ? p.warehouses : [],
            })),
            total,
            page,
            limit,
        }
    },

    async getProduct(id: string, tenantSlug: string) {
        const schemaName = `tenant_${tenantSlug}`
        const products = await prisma.$queryRawUnsafe(
            `SELECT * FROM "${schemaName}".products WHERE id = $1::uuid`,
            id
        ) as any[]

        if (!products.length) {
            throw new NotFoundError('Produit introuvable')
        }

        const p = products[0]
        return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            description: p.description,
            categoryId: p.category_id,
            unit: p.unit,
            minStock: p.min_stock,
            currentStock: p.current_stock,
            price: p.price,
            expiryDate: p.expiry_date,
            batchNumber: p.batch_number,
            isActive: p.is_active,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
        }
    },

    async createProduct(data: any, tenantSlug: string) {
        const schemaName = `tenant_${tenantSlug}`
        const result = await prisma.$queryRawUnsafe(
            `INSERT INTO "${schemaName}".products (sku, name, description, category_id, unit, min_stock, current_stock, price, expiry_date, batch_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
            data.sku,
            data.name,
            data.description || null,
            data.categoryId || null,
            data.unit || 'unité',
            data.minStock || 0,
            data.currentStock || 0,
            data.price || 0,
            data.expiryDate ? new Date(data.expiryDate) : null,
            data.batchNumber || null
        ) as any[]

        const product = result[0]

        // If warehouseId provided, create entry in product_warehouses
        if (data.warehouseId) {
            await prisma.$queryRawUnsafe(
                `INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                 VALUES ($1::uuid, $2::uuid, $3)
                 ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = $3, updated_at = NOW()`,
                product.id,
                data.warehouseId,
                data.currentStock || 0
            )
        }

        return product
    },

    async updateProduct(id: string, data: any, tenantSlug: string) {
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
            if (data[key] !== undefined) {
                let value = data[key]
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

        const result = await prisma.$queryRawUnsafe(
            `UPDATE "${schemaName}".products SET ${fields.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
            ...values
        ) as any[]

        if (!result.length) {
            throw new NotFoundError('Produit introuvable')
        }

        // Si un entrepôt est fourni, mettre à jour product_warehouses avec le stock actuel
        if (data.warehouseId) {
            const stockQty = data.currentStock !== undefined ? data.currentStock : result[0].current_stock
            await prisma.$executeRawUnsafe(
                `INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                 VALUES ($1::uuid, $2::uuid, $3)
                 ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = $3, updated_at = NOW()`,
                id,
                data.warehouseId,
                stockQty
            )
        }

        return result[0]
    },

    async deleteProduct(id: string, tenantSlug: string) {
        const schemaName = `tenant_${tenantSlug}`
        const result = await prisma.$queryRawUnsafe(
            `UPDATE "${schemaName}".products SET is_deleted = true, updated_at = NOW() WHERE id = $1::uuid RETURNING id`,
            id
        ) as any[]

        if (!result.length) {
            throw new NotFoundError('Produit introuvable')
        }

        return { success: true }
    },

    async listMovements({ page, limit, tenantSlug, productId }: { page: number; limit: number; tenantSlug: string; productId?: string }) {
        const schemaName = `tenant_${tenantSlug}`
        const offset = (page - 1) * limit

        let whereClause = ''
        const params: any[] = [limit, offset]

        if (productId) {
            whereClause = `WHERE m.product_id = $3::uuid`
            params.push(productId)
        }

        // We join with products and warehouses
        const movements = await prisma.$queryRawUnsafe(
            `SELECT m.*, p.name as product_name, p.sku as product_sku, w.name as warehouse_name
             FROM "${schemaName}".stock_movements m
             JOIN "${schemaName}".products p ON m.product_id = p.id
             LEFT JOIN "${schemaName}".warehouses w ON m.warehouse_id = w.id
             ${whereClause}
             ORDER BY m.created_at DESC
             LIMIT $1 OFFSET $2`,
            ...params
        ) as any[]

        const totalQuery = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*) as total FROM "${schemaName}".stock_movements m ${whereClause ? 'WHERE m.product_id = $1::uuid' : ''}`,
            ...(productId ? [productId] : [])
        ) as any[]
        const total = parseInt(totalQuery[0]?.total || '0', 10)

        return {
            movements: movements.map(m => ({
                id: m.id,
                productId: m.product_id,
                product: { id: m.product_id, name: m.product_name, sku: m.product_sku },
                warehouseId: m.warehouse_id,
                warehouse: m.warehouse_name ? { id: m.warehouse_id, name: m.warehouse_name } : null,
                type: m.type,
                quantity: m.quantity,
                reference: m.reference,
                note: m.note,
                createdBy: m.created_by,
                createdAt: m.created_at
            })),
            total,
            page,
            limit
        }
    },

    async createMovement(data: any, tenantSlug: string, userId?: string) {
        const schemaName = `tenant_${tenantSlug}`

        // 1. Déterminer l'entrepôt
        let warehouseId = data.warehouseId
        if (!warehouseId) {
            const defaultWarehouse = await prisma.$queryRawUnsafe(
                `SELECT id FROM "${schemaName}".warehouses WHERE name = 'Dépôt Principal' LIMIT 1`
            ) as any[]
            if (defaultWarehouse.length > 0) {
                warehouseId = defaultWarehouse[0].id
            } else {
                throw new Error('Entrepôt par défaut introuvable. Veuillez spécifier un entrepôt.')
            }
        }

        // 2. Récupérer le stock actuel (global et local)
        const product = await this.getProduct(data.productId, tenantSlug)
        const localStockResult = await prisma.$queryRawUnsafe(
            `SELECT quantity FROM "${schemaName}".product_warehouses 
             WHERE product_id = $1::uuid AND warehouse_id = $2::uuid`,
            data.productId, warehouseId
        ) as any[]
        
        const currentLocalStock = localStockResult.length > 0 ? localStockResult[0].quantity : 0
        let newGlobalStock = product.currentStock
        let newLocalStock = currentLocalStock

        if (data.type === 'IN') {
            newGlobalStock += data.quantity
            newLocalStock += data.quantity
        } else if (data.type === 'OUT') {
            if (newLocalStock < data.quantity) {
                throw new Error(`Stock insuffisant dans cet entrepôt (Disponible: ${newLocalStock})`)
            }
            newGlobalStock -= data.quantity
            newLocalStock -= data.quantity
        } else if (data.type === 'ADJUSTMENT') {
            newGlobalStock += data.quantity 
            newLocalStock += data.quantity
        }

        // 3. Préparer les champs optionnels lot
        const batchNumber = data.batchNumber || null
        const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null

        // 4. Exécuter les mises à jour
        const mov = await prisma.$queryRawUnsafe(
            `INSERT INTO "${schemaName}".stock_movements (product_id, warehouse_id, type, quantity, reference, note, created_by, batch_number, expiry_date)
             VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid, $8, $9)
             RETURNING *`,
             data.productId,
             warehouseId,
             data.type,
             data.quantity,
             data.reference || null,
             data.note || null,
             userId || null,
             batchNumber,
             expiryDate
        ) as any[]

        // Mise à jour stock global
        await prisma.$queryRawUnsafe(
            `UPDATE "${schemaName}".products SET current_stock = $1, updated_at = NOW() WHERE id = $2::uuid`,
            newGlobalStock,
            data.productId
        )

        // Mise à jour ou création stock local
        if (localStockResult.length > 0) {
            await prisma.$queryRawUnsafe(
                `UPDATE "${schemaName}".product_warehouses SET quantity = $1, updated_at = NOW() 
                 WHERE product_id = $2::uuid AND warehouse_id = $3::uuid`,
                newLocalStock, data.productId, warehouseId
            )
        } else {
            await prisma.$queryRawUnsafe(
                `INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                 VALUES ($1::uuid, $2::uuid, $3)`,
                data.productId, warehouseId, newLocalStock
            )
        }

        // Invalider le cache des rapports pour ce tenant
        cacheService.invalidateTags([`tenant:${tenantSlug}`, 'dashboard', 'inventory', 'movements'])
            .catch(err => console.error('[Cache] Erreur lors de l\'invalidation:', err))

        return mov[0]
    },

    /**
     * Liste les lots actifs par produit (entrées IN avec batch_number ou expiry_date).
     * Un "lot" = un mouvement IN avec son batchNumber + expiryDate.
     * La quantité restante est estimée à partir des sorties postérieures (même produit + entrepôt).
     */
    async listLots(tenantSlug: string, productId?: string) {
        const schemaName = `tenant_${tenantSlug}`

        const whereClause = productId
            ? `WHERE m.type = 'IN' AND m.product_id = $1::uuid`
            : `WHERE m.type = 'IN'`
        const params: any[] = productId ? [productId] : []

        const lots = await prisma.$queryRawUnsafe(
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
             ${whereClause}
             AND (m.batch_number IS NOT NULL OR m.expiry_date IS NOT NULL)
             ORDER BY m.expiry_date ASC NULLS LAST, m.created_at DESC`,
            ...params
        ) as any[]

        return lots.map((l: any) => {
            const now = new Date()
            const expiry = l.expiry_date ? new Date(l.expiry_date) : null
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
                id: l.id,
                productId: l.product_id,
                productName: l.product_name,
                productSku: l.product_sku,
                productUnit: l.product_unit,
                warehouseId: l.warehouse_id,
                warehouseName: l.warehouse_name,
                batchNumber: l.batch_number,
                expiryDate: l.expiry_date,
                daysRemaining,
                expiryStatus,
                quantity: l.quantity,
                reference: l.reference,
                receivedAt: l.created_at,
            }
        })
    },

    async createTransfer(data: {        productId: string
        sourceWarehouseId: string
        destWarehouseId: string
        quantity: number
        note?: string
    }, tenantSlug: string, userId?: string) {
        const schemaName = `tenant_${tenantSlug}`
        const { productId, sourceWarehouseId, destWarehouseId, quantity, note } = data

        if (sourceWarehouseId === destWarehouseId) {
            throw new Error("L'entrepôt source et destination doivent être différents")
        }

        // 1. Vérifier stock disponible dans la source
        const sourceStock = await prisma.$queryRawUnsafe(
            `SELECT quantity FROM "${schemaName}".product_warehouses 
             WHERE product_id = $1::uuid AND warehouse_id = $2::uuid`,
            productId, sourceWarehouseId
        ) as any[]

        let currentSourceQty: number
        if (sourceStock.length > 0) {
            currentSourceQty = Number(sourceStock[0].quantity)
        } else {
            // Pas d'entrée product_warehouses : utiliser current_stock global comme fallback
            // (produit créé avant le système multi-entrepôts)
            const prod = await prisma.$queryRawUnsafe(
                `SELECT current_stock FROM "${schemaName}".products WHERE id = $1::uuid`,
                productId
            ) as any[]
            currentSourceQty = prod.length > 0 ? Number(prod[0].current_stock) : 0
            // Initialiser l'entrée product_warehouses pour la source
            if (currentSourceQty > 0) {
                await prisma.$executeRawUnsafe(
                    `INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                     VALUES ($1::uuid, $2::uuid, $3)
                     ON CONFLICT (product_id, warehouse_id) DO NOTHING`,
                    productId, sourceWarehouseId, currentSourceQty
                )
            }
        }

        if (currentSourceQty < quantity) {
            throw new Error(`Stock insuffisant dans l'entrepôt source (Disponible: ${currentSourceQty})`)
        }

        // 2. Stock destination
        const destStock = await prisma.$queryRawUnsafe(
            `SELECT quantity FROM "${schemaName}".product_warehouses 
             WHERE product_id = $1::uuid AND warehouse_id = $2::uuid`,
            productId, destWarehouseId
        ) as any[]
        const currentDestQty = destStock.length > 0 ? destStock[0].quantity : 0

        // 3. Insérer les 2 mouvements TRANSFER (OUT source, IN dest)
        const reference = `TRF-${Date.now()}`

        await prisma.$queryRawUnsafe(
            `INSERT INTO "${schemaName}".stock_movements (product_id, warehouse_id, type, quantity, reference, note, created_by)
             VALUES ($1::uuid, $2::uuid, 'TRANSFER', $3, $4, $5, $6::uuid)`,
            productId, sourceWarehouseId, -quantity, reference, note || null, userId || null
        )

        await prisma.$queryRawUnsafe(
            `INSERT INTO "${schemaName}".stock_movements (product_id, warehouse_id, type, quantity, reference, note, created_by)
             VALUES ($1::uuid, $2::uuid, 'TRANSFER', $3, $4, $5, $6::uuid)`,
            productId, destWarehouseId, quantity, reference, note || null, userId || null
        )

        // 4. Mise à jour stock source
        await prisma.$queryRawUnsafe(
            `UPDATE "${schemaName}".product_warehouses SET quantity = $1, updated_at = NOW()
             WHERE product_id = $2::uuid AND warehouse_id = $3::uuid`,
            currentSourceQty - quantity, productId, sourceWarehouseId
        )

        // 5. Mise à jour ou création stock destination
        if (destStock.length > 0) {
            await prisma.$queryRawUnsafe(
                `UPDATE "${schemaName}".product_warehouses SET quantity = $1, updated_at = NOW()
                 WHERE product_id = $2::uuid AND warehouse_id = $3::uuid`,
                currentDestQty + quantity, productId, destWarehouseId
            )
        } else {
            await prisma.$queryRawUnsafe(
                `INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                 VALUES ($1::uuid, $2::uuid, $3)`,
                productId, destWarehouseId, quantity
            )
        }

        // 6. Invalider cache
        cacheService.invalidateTags([`tenant:${tenantSlug}`, 'dashboard', 'inventory', 'movements'])
            .catch(err => console.error('[Cache] Erreur lors de l\'invalidation:', err))

        return { reference, productId, sourceWarehouseId, destWarehouseId, quantity }
    }
}

