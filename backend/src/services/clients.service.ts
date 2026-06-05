import { PrismaClient } from '@prisma/client'
import { BadRequestError } from '../utils/errors'
import { clientSchema, clientUpdateSchema } from '../utils/validators'
import { mapRow, mapRows } from '../utils/mapper'

const prisma = new PrismaClient()

export interface DbClient {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  loyalty_points: number | string
  total_spent: number | string
  created_at: Date
  updated_at: Date
}

export interface DbLinkedSale {
  id: string
  reference: string
  status: string
  total_amount: number | string
  created_at: Date
}

export interface DbClientCheck {
  id: string
}

export class ClientsService {
  async getAllClients(tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, name, email, phone, address, loyalty_points, total_spent, created_at, updated_at
       FROM "${schema}".clients ORDER BY created_at DESC`,
    )) as DbClient[]
    return mapRows(rows).map((c: any) => ({
      ...c,
      loyaltyPoints: Number(c.loyaltyPoints || 0),
      totalSpent: Number(c.totalSpent || 0),
    }))
  }

  async getClientById(id: string, tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, name, email, phone, address, loyalty_points, total_spent, created_at, updated_at
       FROM "${schema}".clients WHERE id = $1::uuid`,
      id,
    )) as DbClient[]
    if (!rows.length) return null
    const c = mapRow(rows[0]) as any
    const sales = (await prisma.$queryRawUnsafe(
      `SELECT id, reference, status, total_amount, created_at FROM "${schema}".sales
       WHERE client_id = $1::uuid ORDER BY created_at DESC LIMIT 10`,
      id,
    )) as DbLinkedSale[]
    return {
      ...c,
      loyaltyPoints: Number(c.loyaltyPoints || 0),
      totalSpent: Number(c.totalSpent || 0),
      sales: mapRows(sales).map((s: any) => ({
        ...s,
        totalAmount: Number(s.totalAmount),
      })),
    }
  }

  async createClient(
    data: any,
    tenantSlug: string,
  ) {
    const validatedData = clientSchema.parse(data)
    const schema = `tenant_${tenantSlug}`
    const rows = (await prisma.$queryRawUnsafe(
      `INSERT INTO "${schema}".clients (name, email, phone, address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      validatedData.name,
      validatedData.email || null,
      validatedData.phone || null,
      validatedData.address || null,
    )) as DbClient[]
    return rows[0]
  }

  async updateClient(id: string, data: any, tenantSlug: string) {
    const validatedData = clientUpdateSchema.parse(data)
    const schema = `tenant_${tenantSlug}`
    const fields: string[] = []
    const values: any[] = []
    let idx = 1
    if (validatedData.name !== undefined) {
      fields.push(`name = $${idx++}`)
      values.push(validatedData.name)
    }
    if (validatedData.email !== undefined) {
      fields.push(`email = $${idx++}`)
      values.push(validatedData.email || null)
    }
    if (validatedData.phone !== undefined) {
      fields.push(`phone = $${idx++}`)
      values.push(validatedData.phone || null)
    }
    if (validatedData.address !== undefined) {
      fields.push(`address = $${idx++}`)
      values.push(validatedData.address || null)
    }
    if (!fields.length) throw new Error('Aucun champ à mettre à jour')
    fields.push(`updated_at = NOW()`)
    values.push(id)
    const rows = (await prisma.$queryRawUnsafe(
      `UPDATE "${schema}".clients SET ${fields.join(', ')} WHERE id = $${idx}::uuid RETURNING *`,
      ...values,
    )) as DbClient[]
    return rows[0]
  }

  async deleteClient(id: string, tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`

    // Check for linked sales
    const linkedSales = (await prisma.$queryRawUnsafe(
      `SELECT id FROM "${schema}".sales WHERE client_id = $1::uuid LIMIT 1`,
      id,
    )) as DbClientCheck[]

    if (linkedSales.length > 0) {
      throw new BadRequestError(
        'Impossible de supprimer ce client car il possède des ventes liées.',
      )
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".clients WHERE id = $1::uuid`, id)
  }
}

export const clientsService = new ClientsService()
