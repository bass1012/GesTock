import { Request, Response, NextFunction } from 'express'
import { supplierService } from '../services/supplier.service'
import { supplierSchema } from '../utils/validators'

export const suppliersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await supplierService.list({ tenantSlug: req.tenantSlug! })
      res.json(result)
    } catch (error) {
      next(error)
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.get(req.params.id, req.tenantSlug!)
      res.json(supplier)
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = supplierSchema.parse(req.body)
      const supplier = await supplierService.create(data, req.tenantSlug!)
      res.status(201).json(supplier)
    } catch (error) {
      next(error)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = supplierSchema.parse(req.body)
      const supplier = await supplierService.update(req.params.id, data, req.tenantSlug!)
      res.json(supplier)
    } catch (error) {
      next(error)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await supplierService.delete(req.params.id, req.tenantSlug!)
      res.json({ message: 'Fournisseur supprimé' })
    } catch (error) {
      next(error)
    }
  },
}
