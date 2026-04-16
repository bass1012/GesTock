import { Request, Response, NextFunction } from 'express'
import { stockService } from '../services/stock.service'
import { productSchema, productUpdateSchema } from '../utils/validators'

export const productsController = {
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 20
            const search = (req.query.search as string) || ''

            const result = await stockService.listProducts({
                page,
                limit,
                search,
                tenantSlug: req.tenantSlug!,
            })

            res.json(result)
        } catch (error) {
            next(error)
        }
    },

    async get(req: Request, res: Response, next: NextFunction) {
        try {
            const product = await stockService.getProduct(req.params.id, req.tenantSlug!)
            res.json(product)
        } catch (error) {
            next(error)
        }
    },

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const data = productSchema.parse(req.body)
            const product = await stockService.createProduct(data, req.tenantSlug!)
            res.status(201).json(product)
        } catch (error) {
            next(error)
        }
    },

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const data = productUpdateSchema.parse(req.body)
            const product = await stockService.updateProduct(req.params.id, data, req.tenantSlug!)
            res.json(product)
        } catch (error) {
            next(error)
        }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await stockService.deleteProduct(req.params.id, req.tenantSlug!)
            res.json({ message: 'Produit supprimé' })
        } catch (error) {
            next(error)
        }
    },
}
