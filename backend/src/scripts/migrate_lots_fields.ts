/**
 * migrate_lots_fields.ts
 * Ajoute batch_number et expiry_date sur la table stock_movements de chaque tenant.
 * Idempotent : utilise ADD COLUMN IF NOT EXISTS.
 * Usage : npx tsx src/scripts/migrate_lots_fields.ts
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
            ALTER TABLE "${schema}".stock_movements
            ADD COLUMN IF NOT EXISTS batch_number VARCHAR,
            ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP
        `)
    }

    console.log('Migration completed.')
    process.exit(0)
}

migrate().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
})
