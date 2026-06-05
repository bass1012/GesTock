import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { tenantService } from '../services/tenant.service'
import { encryptionService } from '../services/encryption.service'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create system HQ tenant
  const hqTenant = await prisma.tenant.upsert({
    where: { slug: 'hq' },
    update: {},
    create: {
      slug: 'hq',
      name: 'Quartier Général',
      plan: 'enterprise',
      config: {
        modules: {
          stock: true,
          fournisseurs: true,
          facturation: true,
          rapports: true,
          multi_entrepot: true,
        },
      },
    },
  })
  console.log(`✅ Tenant système créé: ${hqTenant.name} (${hqTenant.slug})`)

  // Create superadmin user
  const superPassword = await bcrypt.hash('Remples1210', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email_tenantId: { email: 'bassirou2010@gmail.com', tenantId: hqTenant.id } },
    update: {},
    create: {
      email: 'bassirou2010@gmail.com',
      password: superPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'superadmin',
      tenantId: hqTenant.id,
      twoFactorEnabled: true,
      twoFactorSecret: encryptionService.encryptForStorage('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'),
      twoFactorBackupCodes: [encryptionService.hash('BACKUP123')],
    },
  })
  console.log(`✅ Utilisateur Super Admin créé: ${superAdmin.email}`)

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Entreprise Démo',
      plan: 'pro',
      config: {
        modules: {
          stock: true,
          fournisseurs: true,
          facturation: false,
          rapports: true,
          multi_entrepot: false,
        },
        theme: {
          primaryColor: '#2563EB',
        },
      },
    },
  })

  console.log(`✅ Tenant créé: ${tenant.name} (${tenant.slug})`)

  // Create tenant schema
  await tenantService.createTenantSchema('demo')
  console.log('✅ Schema tenant_demo créé')

  // Create admin user
  const hashedPassword = await bcrypt.hash('password123', 12)
  const admin = await prisma.user.upsert({
    where: { email_tenantId: { email: 'admin@demo.com', tenantId: tenant.id } },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Demo',
      role: 'admin',
      tenantId: tenant.id,
    },
  })

  console.log(`✅ Utilisateur créé: ${admin.email} (${admin.role})`)

  // Seed demo products
  const demoProducts = [
    {
      sku: 'CIM-001',
      name: 'Ciment Portland 50kg',
      unit: 'sac',
      minStock: 20,
      currentStock: 150,
      price: 8.5,
    },
    {
      sku: 'FER-001',
      name: 'Fer à béton 12mm',
      unit: 'barre',
      minStock: 50,
      currentStock: 200,
      price: 12.0,
    },
    {
      sku: 'BRQ-001',
      name: 'Brique creuse 15',
      unit: 'unité',
      minStock: 500,
      currentStock: 3000,
      price: 0.45,
    },
    {
      sku: 'SAB-001',
      name: 'Sable fin 0/2',
      unit: 'tonne',
      minStock: 5,
      currentStock: 25,
      price: 35.0,
    },
    {
      sku: 'GRV-001',
      name: 'Gravier 5/15',
      unit: 'tonne',
      minStock: 5,
      currentStock: 18,
      price: 42.0,
    },
    { sku: 'PLT-001', name: 'Plâtre 25kg', unit: 'sac', minStock: 10, currentStock: 8, price: 6.5 },
    {
      sku: 'TUB-001',
      name: 'Tube PVC 100mm',
      unit: 'mètre',
      minStock: 30,
      currentStock: 120,
      price: 3.8,
    },
    {
      sku: 'PNT-001',
      name: 'Peinture blanche 15L',
      unit: 'pot',
      minStock: 5,
      currentStock: 45,
      price: 55.0,
    },
  ]

  for (const product of demoProducts) {
    await prisma.$queryRawUnsafe(
      `INSERT INTO "tenant_demo".products (sku, name, unit, min_stock, current_stock, price)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      product.sku,
      product.name,
      product.unit,
      product.minStock,
      product.currentStock,
      product.price,
    )
  }

  console.log(`✅ ${demoProducts.length} produits démo créés`)
  console.log('')
  console.log('🎉 Seed terminé! Identifiants de connexion:')
  console.log('   Email: admin@demo.com')
  console.log('   Mot de passe: password123')
  console.log('   Tenant: demo')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
