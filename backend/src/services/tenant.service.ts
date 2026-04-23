import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const tenantService = {
    async createTenantSchema(slug: string) {
        const schemaName = `tenant_${slug}`

        // Create schema
        await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)

        // Create tables in the tenant schema
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        description TEXT,
        category_id UUID REFERENCES "${schemaName}".categories(id),
        unit VARCHAR DEFAULT 'unité',
        min_stock INT DEFAULT 0,
        current_stock INT DEFAULT 0,
        price DOUBLE PRECISION DEFAULT 0,
        expiry_date TIMESTAMP,
        batch_number VARCHAR,
        is_active BOOLEAN DEFAULT true,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".product_warehouses (
        product_id UUID NOT NULL REFERENCES "${schemaName}".products(id) ON DELETE CASCADE,
        warehouse_id UUID NOT NULL REFERENCES "${schemaName}".warehouses(id) ON DELETE CASCADE,
        quantity INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (product_id, warehouse_id)
      )
    `)

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES "${schemaName}".products(id) ON DELETE CASCADE,
        warehouse_id UUID REFERENCES "${schemaName}".warehouses(id),
        type VARCHAR NOT NULL,
        quantity INT NOT NULL,
        reference VARCHAR,
        note TEXT,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".suppliers (
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
      CREATE TABLE IF NOT EXISTS "${schemaName}".purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL REFERENCES "${schemaName}".suppliers(id),
        warehouse_id UUID REFERENCES "${schemaName}".warehouses(id),
        status VARCHAR DEFAULT 'DRAFT',
        total_amount DOUBLE PRECISION DEFAULT 0,
        expected_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".purchase_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id UUID NOT NULL REFERENCES "${schemaName}".purchase_orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES "${schemaName}".products(id),
        quantity INT NOT NULL,
        unit_price DOUBLE PRECISION NOT NULL
      )
    `)

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        email VARCHAR,
        phone VARCHAR,
        address TEXT,
        loyalty_points INT DEFAULT 0,
        total_spent DOUBLE PRECISION DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".loyalty_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES "${schemaName}".clients(id) ON DELETE CASCADE,
        sale_id UUID REFERENCES "${schemaName}".sales(id) ON DELETE SET NULL,
        type VARCHAR NOT NULL,
        points INT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES "${schemaName}".clients(id),
        warehouse_id UUID REFERENCES "${schemaName}".warehouses(id),
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

        return schemaName
    },

    async getTenantConfig(tenantId: string) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { config: true, plan: true },
        })
        return tenant
    },

    async updateTenantConfig(tenantId: string, config: any) {
        return prisma.tenant.update({
            where: { id: tenantId },
            data: { config },
        })
    },
}
