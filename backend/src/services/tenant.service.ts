import { PrismaClient } from '@prisma/client'
import { getTenantSchemaQueries } from './tenantSchema.service'

const prisma = new PrismaClient()

export interface TenantConfig {
  [key: string]: unknown
}

export const tenantService = {
  async createTenantSchema(slug: string) {
    if (!/^[a-z0-9_-]+$/.test(slug)) {
      throw new Error(
        'Invalid tenant slug format. Only lowercase letters, numbers, hyphens, and underscores are allowed.',
      )
    }

    const schemaName = `tenant_${slug}`
    const queries = getTenantSchemaQueries(schemaName)

    // Execute all queries in a single transaction
    await prisma.$transaction(queries.map((query) => prisma.$executeRawUnsafe(query)))

    return schemaName
  },

  async getTenantConfig(tenantId: string) {
    return await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { config: true, plan: true },
    })
  },

  async updateTenantConfig(tenantId: string, config: TenantConfig) {
    return prisma.tenant.update({
      where: { id: tenantId },
      data: { config: config as any }, // Assuming Prisma schema expects Json object
    })
  },
}
