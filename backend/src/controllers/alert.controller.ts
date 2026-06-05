import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const alertsController = {
  async getStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const schemaName = `tenant_${req.tenantSlug!}`

      const alerts = (await prisma.$queryRawUnsafe(
        `SELECT id, sku, name, min_stock, current_stock, unit 
         FROM "${schemaName}".products 
         WHERE current_stock <= min_stock AND is_active = true
         ORDER BY (min_stock - current_stock) DESC`,
      )) as any[]

      res.json(alerts)
    } catch (error) {
      next(error)
    }
  },
}
