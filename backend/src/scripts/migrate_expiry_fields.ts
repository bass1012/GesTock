import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
    console.log('--- Démarrage de la migration des champs de péremption ---')
    
    // 1. Récupérer tous les tenants
    const tenants = await prisma.tenant.findMany()
    console.log(`${tenants.length} tenants à migrer.`)

    for (const tenant of tenants) {
        const schemaName = `tenant_${tenant.slug}`
        console.log(`Migration du tenant: ${tenant.slug} (${schemaName})`)

        try {
            // Ajout des colonnes expiry_date et batch_number
            await prisma.$executeRawUnsafe(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${schemaName}' AND table_name='products' AND column_name='expiry_date') THEN
                        ALTER TABLE "${schemaName}".products ADD COLUMN expiry_date TIMESTAMP;
                        RAISE NOTICE 'Colonne expiry_date ajoutée.';
                    END IF;
                    
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='${schemaName}' AND table_name='products' AND column_name='batch_number') THEN
                        ALTER TABLE "${schemaName}".products ADD COLUMN batch_number VARCHAR;
                        RAISE NOTICE 'Colonne batch_number ajoutée.';
                    END IF;
                END $$;
            `)
            console.log(`  - Colonnes ajoutées avec succès pour ${tenant.slug}.`)

        } catch (err) {
            console.error(`Erreur lors de la migration du tenant ${tenant.slug}:`, err)
        }
    }

    console.log('--- Migration terminée ---')
}

migrate()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
