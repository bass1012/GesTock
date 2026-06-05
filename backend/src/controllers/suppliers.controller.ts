import { Request, Response, NextFunction } from 'express'
import { supplierService } from '../services/supplier.service'
import { auditService } from '../services/audit.service'
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

      // Audit log supplier creation
      await auditService.log({
        action: 'SUPPLIER_CREATED',
        userId: req.userId!,
        tenantId: req.tenantId!,
        resource: 'supplier',
        resourceId: supplier.id,
        metadata: { name: supplier.name },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json(supplier)
    } catch (error) {
      next(error)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = supplierSchema.parse(req.body)
      const supplier = await supplierService.update(req.params.id, data, req.tenantSlug!)

      // Audit log supplier update
      await auditService.log({
        action: 'SUPPLIER_UPDATED',
        userId: req.userId!,
        tenantId: req.tenantId!,
        resource: 'supplier',
        resourceId: supplier.id,
        metadata: { name: supplier.name },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.json(supplier)
    } catch (error) {
      next(error)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.params.id
      await supplierService.delete(supplierId, req.tenantSlug!)

      // Audit log supplier deletion
      await auditService.log({
        action: 'SUPPLIER_DELETED',
        userId: req.userId!,
        tenantId: req.tenantId!,
        resource: 'supplier',
        resourceId: supplierId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.json({ message: 'Fournisseur supprimé' })
    } catch (error) {
      next(error)
    }
  },
}
