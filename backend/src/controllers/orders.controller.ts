import { Request, Response, NextFunction } from 'express'
import { orderService } from '../services/order.service'
import { auditService } from '../services/audit.service'
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
      const order = await orderService.updateStatus(
        req.params.id,
        status,
        req.tenantSlug!,
        req.userId,
      )

      // Audit réception commande fournisseur
      if (status === 'RECEIVED' && req.userId) {
        auditService
          .log({
            action: 'ORDER_RECEIVED',
            userId: req.userId,
            resource: 'purchase_order',
            resourceId: req.params.id,
            metadata: { orderId: req.params.id, status },
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          })
          .catch((err) => console.error('[Audit] orderReceived:', err))
      }

      res.json(order)
    } catch (error) {
      next(error)
    }
  },
}
