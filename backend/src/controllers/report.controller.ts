import { Request, Response, NextFunction } from 'express'
import { reportService } from '../services/report.service'

export const reportController = {
    async getDashboardStats(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantSlug = req.tenantSlug as string
            const stats = await reportService.getDashboardStats(tenantSlug)
            res.json({ success: true, data: stats })
        } catch (error) {
            next(error)
        }
    },

    async getInventoryReport(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantSlug = req.tenantSlug as string
            const { categoryId, status, page, limit } = req.query
            const report = await reportService.getInventoryReport(tenantSlug, {
                categoryId: categoryId as string | undefined,
                status: status as string | undefined,
                page: page ? parseInt(page as string, 10) : 1,
                limit: limit ? parseInt(limit as string, 10) : 50
            })
            res.json({ success: true, data: report })
        } catch (error) {
            next(error)
        }
    },

    async getMovementReport(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantSlug = req.tenantSlug as string
            const { startDate, endDate, productId, type, page, limit } = req.query
            const report = await reportService.getMovementReport(tenantSlug, {
                startDate: startDate as string | undefined,
                endDate: endDate as string | undefined,
                productId: productId as string | undefined,
                type: type as string | undefined,
                page: page ? parseInt(page as string, 10) : 1,
                limit: limit ? parseInt(limit as string, 10) : 50
            })
            res.json({ success: true, data: report })
        } catch (error) {
            next(error)
        }
    },

    async exportInventoryCSV(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantSlug = req.tenantSlug as string
            const csv = await reportService.exportInventoryToCSV(tenantSlug)
            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', 'attachment; filename="inventaire.csv"')
            res.send(csv)
        } catch (error) {
            next(error)
        }
    },

    async exportMovementsCSV(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantSlug = req.tenantSlug as string
            const { startDate, endDate } = req.query
            const csv = await reportService.exportMovementsToCSV(tenantSlug, {
                startDate: startDate as string | undefined,
                endDate: endDate as string | undefined
            })
            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', 'attachment; filename="mouvements.csv"')
            res.send(csv)
        } catch (error) {
            next(error)
        }
    },

    async getExpiryAlerts(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantSlug = req.tenantSlug as string
            const { days } = req.query
            const alerts = await reportService.getExpiryAlerts(
                tenantSlug, 
                days ? parseInt(days as string, 10) : undefined
            )
            res.json({ success: true, data: alerts })
        } catch (error) {
            next(error)
        }
    },

    async getSlowRotationReport(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantSlug = req.tenantSlug as string
            const { days } = req.query
            const report = await reportService.getSlowRotationReport(
                tenantSlug,
                days ? parseInt(days as string, 10) : undefined
            )
            res.json({ success: true, data: report })
        } catch (error) {
            next(error)
        }
    },

    async getRestockForecasts(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantSlug = req.tenantSlug as string
            const { days } = req.query
            const report = await reportService.getRestockForecasts(
                tenantSlug,
                days ? parseInt(days as string, 10) : undefined
            )
            res.json({ success: true, data: report })
        } catch (error) {
            next(error)
        }
    }
}
