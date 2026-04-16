import { Request, Response, NextFunction } from 'express'
import { stockService } from '../services/stock.service'
import { stockMovementSchema } from '../utils/validators'

export const stockMovementsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const productId = req.query.productId as string | undefined

      const result = await stockService.listMovements({
        page,
        limit,
        productId,
        tenantSlug: req.tenantSlug!,
      })

      res.json(result)
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = stockMovementSchema.parse(req.body)
      const movement = await stockService.createMovement(data, req.tenantSlug!, req.userId)
      res.status(201).json(movement)
    } catch (error) {
      next(error)
    }
  },
}
