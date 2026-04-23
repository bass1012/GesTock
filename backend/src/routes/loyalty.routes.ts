import { Router } from 'express'
import { loyaltyService } from '../services/loyalty.service'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { z } from 'zod'

const router = Router()
router.use(authMiddleware)
router.use(tenantMiddleware)

/** GET /api/v1/loyalty/clients/:id — Infos fidélité d'un client */
router.get('/clients/:id', async (req: any, res, next) => {
    try {
        const loyalty = await loyaltyService.getClientLoyalty(req.params.id, req.tenantSlug)
        if (!loyalty) return res.status(404).json({ error: 'Client introuvable' })
        res.json(loyalty)
    } catch (error) { next(error) }
})

const redeemSchema = z.object({
    clientId: z.string().uuid(),
    saleId: z.string().uuid(),
    pointsToRedeem: z.number().int().positive().min(1),
})

/** POST /api/v1/loyalty/redeem — Utilise des points de fidélité */
router.post('/redeem', async (req: any, res, next) => {
    try {
        const { clientId, saleId, pointsToRedeem } = redeemSchema.parse(req.body)
        const discount = await loyaltyService.redeemPoints(clientId, saleId, pointsToRedeem, req.tenantSlug)
        res.json({ discount, message: `Remise de ${discount.toLocaleString('fr-FR')} F CFA appliquée` })
    } catch (error) { next(error) }
})

export default router
