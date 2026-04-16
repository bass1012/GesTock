import { Request, Response, NextFunction } from 'express'
import { orderService } from '../services/order.service'
import { purchaseOrderSchema } from '../utils/validators'

export const ordersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await orderService.list({ tenantSlug: req.tenantSlug! })
      res.json(result)
    } catch (error) {
      next(error)
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.get(req.params.id, req.tenantSlug!)
      res.json(order)
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = purchaseOrderSchema.parse(req.body)
      const order = await orderService.create(data, req.tenantSlug!)
      res.status(201).json(order)
    } catch (error) {
      next(error)
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body
      if (!['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide' })
      }
      const order = await orderService.updateStatus(req.params.id, status, req.tenantSlug!, req.userId)
      res.json(order)
    } catch (error) {
      next(error)
    }
  }
}
