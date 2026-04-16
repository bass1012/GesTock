import { PrismaClient } from '@prisma/client'
import { NotFoundError } from '../utils/errors'

const prisma = new PrismaClient()

export const supplierService = {
  async list({ tenantSlug }: { tenantSlug: string }) {
    const schemaName = `tenant_${tenantSlug}`
    const suppliers = await prisma.$queryRawUnsafe(
      `SELECT * FROM "${schemaName}".suppliers ORDER BY created_at DESC`
    ) as any[]
    
    return suppliers.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      address: s.address,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }))
  },

  async get(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const result = await prisma.$queryRawUnsafe(
      `SELECT * FROM "${schemaName}".suppliers WHERE id = $1`,
      id
    ) as any[]

    if (!result.length) throw new NotFoundError('Fournisseur introuvable')

    const s = result[0]
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      address: s.address,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }
  },

  async create(data: any, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO "${schemaName}".suppliers (name, email, phone, address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
       data.name,
       data.email || null,
       data.phone || null,
       data.address || null
    ) as any[]
    return result[0]
  },

  async update(id: string, data: any, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    const result = await prisma.$queryRawUnsafe(
      `UPDATE "${schemaName}".suppliers 
       SET name = $1, email = $2, phone = $3, address = $4, updated_at = NOW() 
       WHERE id = $5 RETURNING *`,
       data.name,
       data.email || null,
       data.phone || null,
       data.address || null,
       id
    ) as any[]

    if (!result.length) throw new NotFoundError('Fournisseur introuvable')
    return result[0]
  },

  async delete(id: string, tenantSlug: string) {
    const schemaName = `tenant_${tenantSlug}`
    
    // Simplistic delete (could fail if FK constraints are violated instead of CASCADE)
    const result = await prisma.$queryRawUnsafe(
      `DELETE FROM "${schemaName}".suppliers WHERE id = $1 RETURNING id`,
      id
    ) as any[]

    if (!result.length) throw new NotFoundError('Fournisseur introuvable')
    return { success: true }
  }
}
