/**
 * migrate_supplier_returns.ts
 * Crée les tables supplier_returns et supplier_return_items pour chaque tenant.
 * Idempotent : utilise CREATE TABLE IF NOT EXISTS.
 * Usage : npx tsx src/scripts/migrate_supplier_returns.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  const tenants = await prisma.tenant.findMany()
  console.log(`Migrating ${tenants.length} tenant schema(s)...`)

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`
    console.log(`  → ${schema}`)

    await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${schema}".supplier_returns (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                supplier_id UUID NOT NULL REFERENCES "${schema}".suppliers(id),
                warehouse_id UUID REFERENCES "${schema}".warehouses(id),
                status VARCHAR DEFAULT 'PENDING',
                reason TEXT,
                reference VARCHAR,
                created_by UUID,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `)

    await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${schema}".supplier_return_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                return_id UUID NOT NULL REFERENCES "${schema}".supplier_returns(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES "${schema}".products(id),
                quantity INT NOT NULL,
                unit_price DOUBLE PRECISION DEFAULT 0
            )
        `)
  }

  console.log('Migration completed.')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
