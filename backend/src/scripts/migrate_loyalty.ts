/**
 * migrate_loyalty.ts
 * Ajoute les colonnes fidélité à la table clients et crée la table loyalty_transactions
 * pour chaque tenant existant.
 * Idempotent : utilise ADD COLUMN IF NOT EXISTS et CREATE TABLE IF NOT EXISTS.
 * Usage : npx tsx src/scripts/migrate_loyalty.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  const tenants = await prisma.tenant.findMany()
  console.log(`Migrating ${tenants.length} tenant schema(s) for loyalty module...`)

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`
    console.log(`  → ${schema}`)

    // Add loyalty columns to clients table (idempotent)
    await prisma.$executeRawUnsafe(`
            ALTER TABLE "${schema}".clients
            ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_spent DOUBLE PRECISION DEFAULT 0
        `)

    // Create loyalty_transactions table (idempotent)
    await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${schema}".loyalty_transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID NOT NULL REFERENCES "${schema}".clients(id) ON DELETE CASCADE,
                sale_id UUID REFERENCES "${schema}".sales(id) ON DELETE SET NULL,
                type VARCHAR NOT NULL,
                points INT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `)

    console.log(`  ✓ ${schema} — loyalty columns & table ready`)
  }

  console.log('\nMigration fidélité terminée.')
  await prisma.$disconnect()
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
