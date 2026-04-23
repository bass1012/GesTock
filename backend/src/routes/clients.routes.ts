import { Router } from 'express'
import { clientsService } from '../services/clients.service'
import { authMiddleware } from '../middleware/auth.middleware'
import { tenantMiddleware } from '../middleware/tenant.middleware'
import { z } from 'zod'

const router = Router()
router.use(authMiddleware)
router.use(tenantMiddleware)

const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal(''))
})

router.get('/', async (req: any, res, next) => {
  try {
    const clients = await clientsService.getAllClients(req.tenantSlug)
    res.json(clients)
  } catch (error) { next(error) }
})

router.get('/:id', async (req: any, res, next) => {
  try {
    const client = await clientsService.getClientById(req.params.id, req.tenantSlug)
    if (!client) return res.status(404).json({ error: 'Client non trouvé' })
    res.json(client)
  } catch (error) { next(error) }
})

router.post('/', async (req: any, res, next) => {
  try {
    const validatedData = clientSchema.parse(req.body)
    const client = await clientsService.createClient(validatedData, req.tenantSlug)
    res.status(201).json(client)
  } catch (error) { next(error) }
})

router.patch('/:id', async (req: any, res, next) => {
  try {
    const validatedData = clientSchema.partial().parse(req.body)
    const client = await clientsService.updateClient(req.params.id, validatedData, req.tenantSlug)
    res.json(client)
  } catch (error) { next(error) }
})

router.delete('/:id', async (req: any, res, next) => {
  try {
    await clientsService.deleteClient(req.params.id, req.tenantSlug)
    res.status(204).end()
  } catch (error) { next(error) }
})

export default router
