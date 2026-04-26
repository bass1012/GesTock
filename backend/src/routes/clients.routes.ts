import { Router } from 'express'
import { clientsService } from '../services/clients.service'
import { auditService } from '../services/audit.service'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
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

router.post('/', requireRole('admin', 'manager'), async (req: any, res, next) => {
  try {
    const validatedData = clientSchema.parse(req.body)
    const client = await clientsService.createClient(validatedData, req.tenantSlug)

    // Audit log client creation
    await auditService.log({
      action: 'CLIENT_CREATED',
      userId: req.userId!,
      tenantId: req.tenantId!,
      resource: 'client',
      resourceId: client.id,
      metadata: { name: client.name },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.status(201).json(client)
  } catch (error) { next(error) }
})

router.patch('/:id', requireRole('admin', 'manager'), async (req: any, res, next) => {
  try {
    const validatedData = clientSchema.partial().parse(req.body)
    const client = await clientsService.updateClient(req.params.id, validatedData, req.tenantSlug)

    // Audit log client update
    await auditService.log({
      action: 'CLIENT_UPDATED',
      userId: req.userId!,
      tenantId: req.tenantId!,
      resource: 'client',
      resourceId: client.id,
      metadata: { name: client.name },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json(client)
  } catch (error) { next(error) }
})

router.delete('/:id', requireRole('admin', 'manager'), async (req: any, res, next) => {
  try {
    const clientId = req.params.id
    await clientsService.deleteClient(clientId, req.tenantSlug)

    // Audit log client deletion
    await auditService.log({
      action: 'CLIENT_DELETED',
      userId: req.userId!,
      tenantId: req.tenantId!,
      resource: 'client',
      resourceId: clientId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.status(204).end()
  } catch (error) { next(error) }
})

export default router
