import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function migrate() {
    const tenants = await (prisma as any).$queryRawUnsafe(`
        SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'
    `)

    for (const t of tenants as any[]) {
        const schema = t.schema_name
        console.log(`Migrating schema: ${schema}`)
        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "${schema}".products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false
            `)
            console.log(`Successfully migrated ${schema}`)
        } catch (error) {
            console.error(`Failed to migrate ${schema}:`, error)
        }
    }
    await prisma.$disconnect()
    process.exit(0)
}

migrate()
