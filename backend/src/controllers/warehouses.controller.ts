import { Request, Response, NextFunction } from 'express'
import { warehouseService } from '../services/warehouse.service'
import { auditService } from '../services/audit.service'
import { warehouseSchema, warehouseUpdateSchema } from '../utils/validators'

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

      // Audit log warehouse creation
      await auditService.log({
        action: 'WAREHOUSE_CREATED',
        userId: req.userId!,
        tenantId: req.tenantId!,
        resource: 'warehouse',
        resourceId: warehouse.id,
        metadata: { name: warehouse.name },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json(warehouse)
    } catch (error) {
      next(error)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = warehouseUpdateSchema.parse(req.body)
      const warehouse = await warehouseService.updateWarehouse(req.params.id, data, req.tenantSlug!)

      // Audit log warehouse update
      await auditService.log({
        action: 'WAREHOUSE_UPDATED',
        userId: req.userId!,
        tenantId: req.tenantId!,
        resource: 'warehouse',
        resourceId: warehouse.id,
        metadata: { name: warehouse.name },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.json(warehouse)
    } catch (error) {
      next(error)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const warehouseId = req.params.id
      await warehouseService.deleteWarehouse(warehouseId, req.tenantSlug!)

      // Audit log warehouse deletion
      await auditService.log({
        action: 'WAREHOUSE_DELETED',
        userId: req.userId!,
        tenantId: req.tenantId!,
        resource: 'warehouse',
        resourceId: warehouseId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

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
  },
}
