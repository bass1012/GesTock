import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
    console.log('--- Démarrage de la migration multi-entrepôts ---')
    
    // 1. Récupérer tous les tenants
    const tenants = await prisma.tenant.findMany()
    console.log(`${tenants.length} tenants à migrer.`)

    for (const tenant of tenants) {
        const schemaName = `tenant_${tenant.slug}`
        console.log(`Migration du tenant: ${tenant.slug} (${schemaName})`)

        try {
            // A. Création des tables si manquantes (en utilisant la logique de tenant.service)
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
                CREATE TABLE IF NOT EXISTS "${schemaName}".product_warehouses (
                    product_id UUID NOT NULL REFERENCES "${schemaName}".products(id) ON DELETE CASCADE,
                    warehouse_id UUID NOT NULL REFERENCES "${schemaName}".warehouses(id) ON DELETE CASCADE,
                    quantity INT DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (product_id, warehouse_id)
                )
            `)

            // B. Ajout des colonnes warehouse_id (avec vérification existence via Postgres)
            await prisma.$executeRawUnsafe(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${schemaName}' AND table_name='stock_movements' AND column_name='warehouse_id') THEN
                        ALTER TABLE "${schemaName}".stock_movements ADD COLUMN warehouse_id UUID REFERENCES "${schemaName}".warehouses(id);
                    END IF;
                    
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${schemaName}' AND table_name='purchase_orders' AND column_name='warehouse_id') THEN
                        ALTER TABLE "${schemaName}".purchase_orders ADD COLUMN warehouse_id UUID REFERENCES "${schemaName}".warehouses(id);
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${schemaName}' AND table_name='sales' AND column_name='warehouse_id') THEN
                        ALTER TABLE "${schemaName}".sales ADD COLUMN warehouse_id UUID REFERENCES "${schemaName}".warehouses(id);
                    END IF;
                END $$;
            `)

            // C. Créer l'entrepôt par défaut
            const warehouses = await prisma.$queryRawUnsafe(`SELECT id FROM "${schemaName}".warehouses WHERE name = 'Dépôt Principal'`) as any[]
            let warehouseId: string

            if (warehouses.length === 0) {
                const newWarehouse = await prisma.$queryRawUnsafe(`
                    INSERT INTO "${schemaName}".warehouses (name, address) 
                    VALUES ('Dépôt Principal', 'Siège Social') 
                    RETURNING id
                `) as any[]
                warehouseId = newWarehouse[0].id
                console.log(`  - Entrepôt principal créé: ${warehouseId}`)
            } else {
                warehouseId = warehouses[0].id
                console.log(`  - Entrepôt principal déjà existant: ${warehouseId}`)
            }

            // D. Migrer les stocks actuels vers product_warehouses
            const products = await prisma.$queryRawUnsafe(`SELECT id, current_stock FROM "${schemaName}".products`) as any[]
            for (const product of products) {
                // Vérifier si déjà présent pour éviter doublon Primary Key
                const existing = await prisma.$queryRawUnsafe(`
                    SELECT 1 FROM "${schemaName}".product_warehouses 
                    WHERE product_id = $1::uuid AND warehouse_id = $2::uuid
                `, product.id, warehouseId) as any[]

                if (existing.length === 0) {
                    await prisma.$queryRawUnsafe(`
                        INSERT INTO "${schemaName}".product_warehouses (product_id, warehouse_id, quantity)
                        VALUES ($1::uuid, $2::uuid, $3)
                    `, product.id, warehouseId, product.current_stock || 0)
                }
            }
            console.log(`  - Stock de ${products.length} produits migré vers l'entrepôt principal.`)

            // E. Rattacher les mouvements de stock, ventes et commandes existantes
            await prisma.$executeRawUnsafe(`UPDATE "${schemaName}".stock_movements SET warehouse_id = $1::uuid WHERE warehouse_id IS NULL`, warehouseId)
            await prisma.$executeRawUnsafe(`UPDATE "${schemaName}".sales SET warehouse_id = $1::uuid WHERE warehouse_id IS NULL`, warehouseId)
            await prisma.$executeRawUnsafe(`UPDATE "${schemaName}".purchase_orders SET warehouse_id = $1::uuid WHERE warehouse_id IS NULL`, warehouseId)
            
            console.log(`  - Historique (mouvements/ventes) rattaché à l'entrepôt principal.`)

        } catch (err) {
            console.error(`Erreur lors de la migration du tenant ${tenant.slug}:`, err)
        }
    }

    console.log('--- Migration terminée ---')
}

migrate()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
