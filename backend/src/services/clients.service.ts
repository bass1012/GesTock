import { PrismaClient } from '@prisma/client'
import { BadRequestError } from '../utils/errors'

const prisma = new PrismaClient()

export class ClientsService {
  async getAllClients(tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, name, email, phone, address, loyalty_points, total_spent, created_at, updated_at
       FROM "${schema}".clients ORDER BY created_at DESC`
    ) as any[]
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      address: r.address,
      loyaltyPoints: Number(r.loyalty_points || 0),
      totalSpent: Number(r.total_spent || 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  }

  async getClientById(id: string, tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`
    const rows = await prisma.$queryRawUnsafe(
      `SELECT id, name, email, phone, address, loyalty_points, total_spent, created_at, updated_at
       FROM "${schema}".clients WHERE id = $1::uuid`,
      id
    ) as any[]
    if (!rows.length) return null
    const c = rows[0]
    const sales = await prisma.$queryRawUnsafe(
      `SELECT id, reference, status, total_amount, created_at FROM "${schema}".sales
       WHERE client_id = $1::uuid ORDER BY created_at DESC LIMIT 10`,
      id
    ) as any[]
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      loyaltyPoints: Number(c.loyalty_points || 0),
      totalSpent: Number(c.total_spent || 0),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      sales: sales.map(s => ({
        id: s.id,
        reference: s.reference,
        status: s.status,
        totalAmount: Number(s.total_amount),
        createdAt: s.created_at,
      })),
    }
  }

  async createClient(data: { name: string; email?: string; phone?: string; address?: string }, tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "${schema}".clients (name, email, phone, address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      data.name, data.email || null, data.phone || null, data.address || null
    ) as any[]
    return rows[0]
  }

  async updateClient(id: string, data: any, tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`
    const fields: string[] = []
    const values: any[] = []
    let idx = 1
    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name) }
    if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email || null) }
    if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone || null) }
    if (data.address !== undefined) { fields.push(`address = $${idx++}`); values.push(data.address || null) }
    if (!fields.length) throw new Error('Aucun champ à mettre à jour')
    fields.push(`updated_at = NOW()`)
    values.push(id)
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE "${schema}".clients SET ${fields.join(', ')} WHERE id = $${idx}::uuid RETURNING *`,
      ...values
    ) as any[]
    return rows[0]
  }

  async deleteClient(id: string, tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`
    
    // Check for linked sales
    const linkedSales = await prisma.$queryRawUnsafe(
      `SELECT id FROM "${schema}".sales WHERE client_id = $1::uuid LIMIT 1`,
      id
    ) as any[]

    if (linkedSales.length > 0) {
      throw new BadRequestError('Impossible de supprimer ce client car il possède des ventes liées.')
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM "${schema}".clients WHERE id = $1::uuid`, id
    )
  }
}

export const clientsService = new ClientsService()
