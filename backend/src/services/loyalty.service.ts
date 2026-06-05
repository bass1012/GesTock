import { PrismaClient } from '@prisma/client'
import { NotFoundError, BadRequestError } from '../utils/errors'

const prisma = new PrismaClient()

// Règles : 1 point par 1 000 F CFA dépensés / 1 point = 50 F CFA de remise
const POINTS_PER_1000 = 1
const VALUE_PER_POINT = 50 // F CFA

export interface DbLoyaltyClient {
  id: string
  name: string
  email: string | null
  phone: string | null
  loyalty_points: number | string
  total_spent: number | string
}

export interface DbLoyaltyTransaction {
  id: string
  client_id: string
  sale_id: string | null
  type: 'EARN' | 'REDEEM'
  points: number | string
  description: string
  created_at: Date
  sale_reference: string | null
}

export interface DbClientPoints {
  loyalty_points: number | string
}

export const loyaltyService = {
  /**
   * Calcule les points gagnés pour un montant d'achat donné.
   */
  calculatePointsEarned(amount: number): number {
    return Math.floor(amount / 1000) * POINTS_PER_1000
  },

  /**
   * Calcule la remise en F CFA pour un nombre de points donnés.
   */
  calculateDiscount(points: number): number {
    return points * VALUE_PER_POINT
  },

  /**
   * Retourne les infos fidélité d'un client + historique récent.
   */
  async getClientLoyalty(clientId: string, tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`

    const clients = (await prisma.$queryRawUnsafe(
      `SELECT id, name, email, phone, loyalty_points, total_spent FROM "${schema}".clients WHERE id = $1::uuid`,
      clientId,
    )) as DbLoyaltyClient[]

    if (!clients.length) return null

    const transactions = (await prisma.$queryRawUnsafe(
      `SELECT lt.*, s.reference as sale_reference
             FROM "${schema}".loyalty_transactions lt
             LEFT JOIN "${schema}".sales s ON lt.sale_id = s.id
             WHERE lt.client_id = $1::uuid
             ORDER BY lt.created_at DESC
             LIMIT 20`,
      clientId,
    )) as DbLoyaltyTransaction[]

    const client = clients[0]
    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      loyaltyPoints: Number(client.loyalty_points || 0),
      totalSpent: Number(client.total_spent || 0),
      discountAvailable: Number(client.loyalty_points || 0) * VALUE_PER_POINT,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        points: Number(t.points),
        description: t.description,
        saleReference: t.sale_reference,
        createdAt: t.created_at,
      })),
    }
  },

  /**
   * Crédite les points gagnés lors d'une vente.
   * Appelé après la validation d'une vente (type FAC).
   */
  async earnPoints(clientId: string, saleId: string, saleAmount: number, tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`
    const points = this.calculatePointsEarned(saleAmount)
    if (points === 0) return 0

    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".clients
             SET loyalty_points = loyalty_points + $1,
                 total_spent    = total_spent + $2,
                 updated_at     = NOW()
             WHERE id = $3::uuid`,
      points,
      saleAmount,
      clientId,
    )

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".loyalty_transactions (client_id, sale_id, type, points, description)
             VALUES ($1::uuid, $2::uuid, 'EARN', $3, $4)`,
      clientId,
      saleId,
      points,
      `Achat ${saleAmount.toLocaleString('fr-FR')} F CFA — +${points} pts`,
    )

    return points
  },

  /**
   * Débite des points de fidélité (remise en caisse).
   * Appelé lors d'une vente qui utilise des points.
   */
  async redeemPoints(clientId: string, saleId: string, pointsToRedeem: number, tenantSlug: string) {
    const schema = `tenant_${tenantSlug}`

    const clients = (await prisma.$queryRawUnsafe(
      `SELECT loyalty_points FROM "${schema}".clients WHERE id = $1::uuid`,
      clientId,
    )) as DbClientPoints[]

    if (!clients.length) throw new NotFoundError('Client introuvable')
    const available = Number(clients[0].loyalty_points)
    if (available < pointsToRedeem)
      throw new BadRequestError(
        `Points insuffisants (disponible: ${available}, demandé: ${pointsToRedeem})`,
      )

    const discount = this.calculateDiscount(pointsToRedeem)

    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".clients
             SET loyalty_points = loyalty_points - $1,
                 updated_at     = NOW()
             WHERE id = $2::uuid`,
      pointsToRedeem,
      clientId,
    )

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".loyalty_transactions (client_id, sale_id, type, points, description)
             VALUES ($1::uuid, $2::uuid, 'REDEEM', $3, $4)`,
      clientId,
      saleId,
      -pointsToRedeem,
      `Remise fidélité -${pointsToRedeem} pts = -${discount.toLocaleString('fr-FR')} F CFA`,
    )

    return discount
  },
}
