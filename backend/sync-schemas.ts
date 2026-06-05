import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function sync() {
  const tenants = await prisma.tenant.findMany()
  for (const tenant of tenants) {
    const schemaName = `tenant_${tenant.slug}`
    console.log(`Syncing schema: ${schemaName}`)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        email VARCHAR,
        phone VARCHAR,
        address TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES "${schemaName}".clients(id),
        status VARCHAR DEFAULT 'DRAFT',
        total_amount DOUBLE PRECISION DEFAULT 0,
        tax_rate DOUBLE PRECISION DEFAULT 0,
        tax_amount DOUBLE PRECISION DEFAULT 0,
        reference VARCHAR UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".sale_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_id UUID NOT NULL REFERENCES "${schemaName}".sales(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES "${schemaName}".products(id),
        quantity INT NOT NULL,
        unit_price DOUBLE PRECISION NOT NULL
      )
    `)
  }
  console.log('Schemas synced successfully!')
  process.exit(0)
}

sync().catch((e) => {
  console.error(e)
  process.exit(1)
})
