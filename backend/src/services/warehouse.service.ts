import { PrismaClient } from '@prisma/client'
import { NotFoundError } from '../utils/errors'

const prisma = new PrismaClient()

export const warehouseService = {
    async listWarehouses(tenantSlug: string) {
        const schemaName = `tenant_${tenantSlug}`
        const warehouses = await prisma.$queryRawUnsafe(
            `SELECT * FROM "${schemaName}".warehouses ORDER BY name ASC`
        ) as any[]
        return warehouses
    },

    async getWarehouse(id: string, tenantSlug: string) {
        const schemaName = `tenant_${tenantSlug}`
        const warehouses = await prisma.$queryRawUnsafe(
            `SELECT * FROM "${schemaName}".warehouses WHERE id = $1::uuid`,
            id
        ) as any[]

        if (!warehouses.length) {
            throw new NotFoundError('Entrepôt introuvable')
        }

        return warehouses[0]
    },

    async createWarehouse(data: { name: string; address?: string }, tenantSlug: string) {
        const schemaName = `tenant_${tenantSlug}`
        const result = await prisma.$queryRawUnsafe(
            `INSERT INTO "${schemaName}".warehouses (name, address)
             VALUES ($1, $2)
             RETURNING *`,
            data.name,
            data.address || null
        ) as any[]
        return result[0]
    },

    async updateWarehouse(id: string, data: { name?: string; address?: string; is_active?: boolean }, tenantSlug: string) {
        const schemaName = `tenant_${tenantSlug}`
        
        const fields: string[] = []
        const values: any[] = []
        let paramIndex = 1

        if (data.name !== undefined) {
            fields.push(`name = $${paramIndex++}`)
            values.push(data.name)
        }
        if (data.address !== undefined) {
            fields.push(`address = $${paramIndex++}`)
            values.push(data.address)
        }
        if (data.is_active !== undefined) {
            fields.push(`is_active = $${paramIndex++}`)
            values.push(data.is_active)
        }

        if (fields.length === 0) return this.getWarehouse(id, tenantSlug)

        fields.push(`updated_at = NOW()`)
        values.push(id)

        const result = await prisma.$queryRawUnsafe(
            `UPDATE "${schemaName}".warehouses SET ${fields.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
            ...values
        ) as any[]

        if (!result.length) {
            throw new NotFoundError('Entrepôt introuvable')
        }

        return result[0]
    },

    async deleteWarehouse(id: string, tenantSlug: string) {
        const schemaName = `tenant_${tenantSlug}`
        
        // On ne supprime pas physiquement s'il y a du stock ou des mouvements ? 
        // Pour l'instant, on désactive ou on vérifie.
        const stockCount = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*) as total FROM "${schemaName}".product_warehouses WHERE warehouse_id = $1::uuid AND quantity > 0`,
            id
        ) as any[]
        
        if (parseInt(stockCount[0].total) > 0) {
            throw new Error('Impossible de supprimer un entrepôt contenant encore du stock.')
        }

        await prisma.$executeRawUnsafe(
            `DELETE FROM "${schemaName}".warehouses WHERE id = $1::uuid`,
            id
        )
        return { success: true }
    },

    async getProductStock(productId: string, tenantSlug: string) {
        const schemaName = `tenant_${tenantSlug}`
        const stock = await prisma.$queryRawUnsafe(
            `SELECT pw.*, w.name as warehouse_name 
             FROM "${schemaName}".product_warehouses pw
             JOIN "${schemaName}".warehouses w ON pw.warehouse_id = w.id
             WHERE pw.product_id = $1::uuid`,
            productId
        ) as any[]
        return stock
    }
}
