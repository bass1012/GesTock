import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { emailService } from '../services/notification.service'

const prisma = new PrismaClient()

/**
 * Vérifie les stocks bas pour tous les tenants et envoie des alertes email
 * Exécuté tous les jours à 8h00
 */
export function startStockAlertJob() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[StockAlertJob] Vérification des stocks bas...')

    try {
      // Récupérer tous les tenants actifs
      const tenants = await prisma.tenant.findMany({
        include: {
          users: {
            where: { role: 'admin' },
            select: { email: true, firstName: true },
          },
        },
      })

      for (const tenant of tenants) {
        // Récupérer les produits sous le seuil minimum dans le schéma du tenant
        const schemaName = `tenant_${tenant.slug}`

        try {
          const lowStockProducts = (await prisma.$queryRawUnsafe(
            `SELECT id, name, sku, current_stock, min_stock
             FROM "${schemaName}".products
             WHERE current_stock <= min_stock AND is_active = true
             ORDER BY (min_stock - current_stock) DESC`,
          )) as Array<{
            id: string
            name: string
            sku: string
            current_stock: number
            min_stock: number
          }>

          if (lowStockProducts.length === 0) continue

          // Envoyer un email à chaque admin du tenant
          for (const admin of tenant.users) {
            await emailService.sendLowStockAlert({
              to: admin.email,
              tenantName: tenant.name,
              products: lowStockProducts.map((p) => ({
                name: p.name,
                sku: p.sku,
                currentStock: p.current_stock,
                minStock: p.min_stock,
              })),
            })
          }

          console.log(
            `[StockAlertJob] Tenant "${tenant.slug}" — ${lowStockProducts.length} alerte(s) envoyée(s)`,
          )
        } catch (schemaErr) {
          // Le schéma peut ne pas exister pour les tenants très récents
          console.warn(`[StockAlertJob] Schéma "${schemaName}" inaccessible :`, schemaErr)
        }
      }

      console.log('[StockAlertJob] Terminé.')
    } catch (err) {
      console.error('[StockAlertJob] Erreur :', err)
    }
  })

  console.log('[StockAlertJob] Planifié — Exécution tous les jours à 8h00')
}

/**
 * Vérification manuelle (pour test ou déclenchement via API)
 */
export async function runStockAlertNow(tenantSlug?: string) {
  const where = tenantSlug ? { slug: tenantSlug } : {}

  const tenants = await prisma.tenant.findMany({
    where,
    include: {
      users: {
        where: { role: 'admin' },
        select: { email: true, firstName: true },
      },
    },
  })

  const results: Record<string, number> = {}

  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.slug}`
    try {
      const lowStockProducts = (await prisma.$queryRawUnsafe(
        `SELECT name, sku, current_stock, min_stock
         FROM "${schemaName}".products
         WHERE current_stock <= min_stock AND is_active = true`,
      )) as any[]

      results[tenant.slug] = lowStockProducts.length

      if (lowStockProducts.length > 0 && tenant.users.length > 0) {
        for (const admin of tenant.users) {
          await emailService.sendLowStockAlert({
            to: admin.email,
            tenantName: tenant.name,
            products: lowStockProducts.map((p: any) => ({
              name: p.name,
              sku: p.sku,
              currentStock: p.current_stock,
              minStock: p.min_stock,
            })),
          })
        }
      }
    } catch {
      results[tenant.slug] = -1
    }
  }

  return results
}
