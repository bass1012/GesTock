/**
 * migrate_account_lockout.ts
 * Ajoute les colonnes de verrouillage de compte au modèle User.
 * Idempotent : utilise ADD COLUMN IF NOT EXISTS.
 * Usage : npx tsx src/scripts/migrate_account_lockout.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  console.log('Migrating account lockout fields on users...')

  await prisma.$executeRawUnsafe(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMP
    `)

  console.log('Migration completed.')
  await prisma.$disconnect()
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
