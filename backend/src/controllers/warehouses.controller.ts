import { Request, Response, NextFunction } from 'express'
import { warehouseService } from '../services/warehouse.service'
import { z } from 'zod'

const warehouseSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  address: z.string().optional(),
})

export const warehouseController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const warehouses = await warehouseService.listWarehouses(req.tenantSlug!)
      res.json(warehouses)
    } catch (error) {
      next(error)
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const warehouse = await warehouseService.getWarehouse(req.params.id, req.tenantSlug!)
      res.json(warehouse)
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = warehouseSchema.parse(req.body)
      const warehouse = await warehouseService.createWarehouse(data, req.tenantSlug!)
      res.status(201).json(warehouse)
    } catch (error) {
      next(error)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = warehouseSchema.partial().parse(req.body)
      const warehouse = await warehouseService.updateWarehouse(req.params.id, data, req.tenantSlug!)
      res.json(warehouse)
    } catch (error) {
      next(error)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await warehouseService.deleteWarehouse(req.params.id, req.tenantSlug!)
      res.json({ message: 'Entrepôt supprimé' })
    } catch (error) {
      next(error)
    }
  },

  async getProductStock(req: Request, res: Response, next: NextFunction) {
    try {
      const stock = await warehouseService.getProductStock(req.params.productId, req.tenantSlug!)
      res.json(stock)
    } catch (error) {
      next(error)
    }
  }
}
