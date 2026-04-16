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
            `SELECT *, (SELECT name FROM "${schemaName}".categories WHERE id = p.category_id) as category_name
       FROM "${schemaName}".products p
       ${whereClause}
       ORDER BY created_at DESC
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

        return result[0]
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
            // Pour l'ajustement, on considère que la quantité envoyée est le nouveau stock local
            // Ou on garde le delta ? Ici, par simplicité avec l'UI existante, on va traiter quantité comme delta.
            newGlobalStock += data.quantity 
            newLocalStock += data.quantity
        }

        // 3. Exécuter les mises à jour
        const mov = await prisma.$queryRawUnsafe(
            `INSERT INTO "${schemaName}".stock_movements (product_id, warehouse_id, type, quantity, reference, note, created_by)
             VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid)
             RETURNING *`,
             data.productId,
             warehouseId,
             data.type,
             data.quantity,
             data.reference || null,
             data.note || null,
             userId || null
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
    }
}

