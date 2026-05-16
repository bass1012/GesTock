import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface TenantConfig {
    [key: string]: unknown;
}

export const tenantService = {
    async createTenantSchema(slug: string) {
        if (!/^[a-z0-9_]+$/.test(slug)) {
            throw new Error("Invalid tenant slug format. Only lowercase letters, numbers, and underscores are allowed.");
        }

        const schemaName = `tenant_${slug}`

        const queries = [
            `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,
            
            `CREATE TABLE IF NOT EXISTS "${schemaName}".warehouses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR NOT NULL,
                address TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".products (
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
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".product_warehouses (
                product_id UUID NOT NULL REFERENCES "${schemaName}".products(id) ON DELETE CASCADE,
                warehouse_id UUID NOT NULL REFERENCES "${schemaName}".warehouses(id) ON DELETE CASCADE,
                quantity INT DEFAULT 0,
                updated_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (product_id, warehouse_id)
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".stock_movements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL REFERENCES "${schemaName}".products(id) ON DELETE CASCADE,
                warehouse_id UUID REFERENCES "${schemaName}".warehouses(id),
                type VARCHAR NOT NULL,
                quantity INT NOT NULL,
                batch_number VARCHAR,
                expiry_date TIMESTAMP,
                reference VARCHAR,
                note TEXT,
                created_by UUID,
                created_at TIMESTAMP DEFAULT NOW()
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".suppliers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR NOT NULL,
                email VARCHAR,
                phone VARCHAR,
                address TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".purchase_orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                supplier_id UUID NOT NULL REFERENCES "${schemaName}".suppliers(id),
                warehouse_id UUID REFERENCES "${schemaName}".warehouses(id),
                status VARCHAR DEFAULT 'DRAFT',
                total_amount DOUBLE PRECISION DEFAULT 0,
                expected_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".purchase_order_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                purchase_order_id UUID NOT NULL REFERENCES "${schemaName}".purchase_orders(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES "${schemaName}".products(id),
                quantity INT NOT NULL,
                unit_price DOUBLE PRECISION NOT NULL
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".clients (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR NOT NULL,
                email VARCHAR,
                phone VARCHAR,
                address TEXT,
                loyalty_points INT DEFAULT 0,
                total_spent DOUBLE PRECISION DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".loyalty_transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID NOT NULL REFERENCES "${schemaName}".clients(id) ON DELETE CASCADE,
                sale_id UUID REFERENCES "${schemaName}".sales(id) ON DELETE SET NULL,
                type VARCHAR NOT NULL,
                points INT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".sales (
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
            )`,

            `CREATE TABLE IF NOT EXISTS "${schemaName}".sale_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sale_id UUID NOT NULL REFERENCES "${schemaName}".sales(id) ON DELETE CASCADE,
                product_id UUID NOT NULL REFERENCES "${schemaName}".products(id),
                quantity INT NOT NULL,
                unit_price DOUBLE PRECISION NOT NULL
            )`,

            // Adding indexes for foreign keys to improve join/delete performance
            `CREATE INDEX IF NOT EXISTS idx_products_category ON "${schemaName}".products(category_id)`,
            `CREATE INDEX IF NOT EXISTS idx_product_warehouses_warehouse ON "${schemaName}".product_warehouses(warehouse_id)`,
            `CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON "${schemaName}".stock_movements(product_id)`,
            `CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON "${schemaName}".stock_movements(warehouse_id)`,
            `CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON "${schemaName}".purchase_orders(supplier_id)`,
            `CREATE INDEX IF NOT EXISTS idx_purchase_orders_warehouse ON "${schemaName}".purchase_orders(warehouse_id)`,
            `CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON "${schemaName}".purchase_order_items(purchase_order_id)`,
            `CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON "${schemaName}".purchase_order_items(product_id)`,
            `CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_client ON "${schemaName}".loyalty_transactions(client_id)`,
            `CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_sale ON "${schemaName}".loyalty_transactions(sale_id)`,
            `CREATE INDEX IF NOT EXISTS idx_sales_client ON "${schemaName}".sales(client_id)`,
            `CREATE INDEX IF NOT EXISTS idx_sales_warehouse ON "${schemaName}".sales(warehouse_id)`,
            `CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON "${schemaName}".sale_items(sale_id)`,
            `CREATE INDEX IF NOT EXISTS idx_sale_items_product ON "${schemaName}".sale_items(product_id)`
        ]

        // Execute all queries in a single transaction
        await prisma.$transaction(
            queries.map(query => prisma.$executeRawUnsafe(query))
        )

        return schemaName
    },

    async getTenantConfig(tenantId: string) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { config: true, plan: true },
        })
        return tenant
    },

    async updateTenantConfig(tenantId: string, config: TenantConfig) {
        return prisma.tenant.update({
            where: { id: tenantId },
            data: { config: config as any }, // Assuming Prisma schema expects Json object
        })
    },
}
