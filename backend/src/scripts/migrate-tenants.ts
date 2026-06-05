import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { tenantService } from '../services/tenant.service'

const prisma = new PrismaClient()

async function migrate() {
  const tenants = await prisma.tenant.findMany()
  console.log(`Migrating ${tenants.length} tenant schema(s)...`)

  for (const tenant of tenants) {
    const schema = `tenant_${tenant.slug}`
    console.log(`  → ${schema}`)
    try {
      await tenantService.createTenantSchema(tenant.slug)
      console.log(`    ✓ schema synchronized`)
    } catch (error) {
      console.error(`    ✗ failed to sync ${schema}:`, error)
    }
  }

  await prisma.$disconnect()
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
