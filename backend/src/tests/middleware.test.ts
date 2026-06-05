// --- Mocks for authMiddleware (must be before imports) ---
const mockVerifyAccessToken = jest.fn()
const mockIsBlacklisted = jest.fn()
const mockGetActiveSession = jest.fn()

jest.mock('../utils/jwt', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}))

jest.mock('../services/jwtBlacklist.service', () => ({
  jwtBlacklistService: {
    isBlacklisted: mockIsBlacklisted,
    getActiveSession: mockGetActiveSession,
  },
}))

import { Request, Response, NextFunction } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'
import { errorHandler } from '../middleware/errorHandler'
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../utils/errors'
import { ZodError, ZodIssue } from 'zod'

function mockReq(overrides: Partial<Request> = {}): Request {
  return { headers: {}, hostname: 'localhost', ...overrides } as unknown as Request
}

function mockRes(): Response {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res as Response
}

describe('authMiddleware', () => {
  let req: Request
  let res: Response
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    req = mockReq()
    res = mockRes()
    next = jest.fn()
    // Setup default mock behavior
    mockIsBlacklisted.mockResolvedValue(false)
    mockGetActiveSession.mockResolvedValue(undefined)
  })

  it('passe si la requête est authentifiée par clé API', async () => {
    req.isApiRequest = true
    await authMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('rejette si aucun header Authorization', async () => {
    await authMiddleware(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
  })

  it('rejette si le header ne commence pas par Bearer', async () => {
    req.headers = { authorization: 'Basic token' }
    await authMiddleware(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
  })

  it('rejette si le token est blacklisté', async () => {
    req.headers = { authorization: 'Bearer blacklisted-token' }
    mockIsBlacklisted.mockResolvedValue(true)

    await authMiddleware(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
  })

  it('rejette si le token est invalide', async () => {
    req.headers = { authorization: 'Bearer invalid-token' }
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('jwt malformed')
    })

    await authMiddleware(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
  })

  it("rejette si la session n'est plus active", async () => {
    req.headers = { authorization: 'Bearer valid-token' }
    mockVerifyAccessToken.mockReturnValue({
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'admin',
      sessionId: 'sess-1',
    })
    mockGetActiveSession.mockResolvedValue('sess-2')

    await authMiddleware(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
  })

  it('injecte userId, tenantId, userRole et token dans la requête', async () => {
    req.headers = { authorization: 'Bearer valid-token' }
    mockVerifyAccessToken.mockReturnValue({
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'admin',
      sessionId: 'sess-1',
    })
    mockGetActiveSession.mockResolvedValue('sess-1')

    await authMiddleware(req, res, next)

    expect(req.userId).toBe('user-1')
    expect(req.tenantId).toBe('tenant-1')
    expect(req.userRole).toBe('admin')
    expect(req.token).toBe('valid-token')
    expect(next).toHaveBeenCalled()
  })
})

describe('requireRole', () => {
  let req: Request
  let res: Response
  let next: NextFunction

  beforeEach(() => {
    req = mockReq()
    res = mockRes()
    next = jest.fn()
  })

  it('passe si le rôle est dans la liste autorisée', () => {
    req.userRole = 'admin'
    const middleware = requireRole('admin', 'manager')
    middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it("rejette si le rôle n'est pas dans la liste", () => {
    req.userRole = 'lecteur'
    const middleware = requireRole('admin', 'manager')
    expect(() => middleware(req, res, next)).toThrow(ForbiddenError)
  })

  it('rejette si userRole est undefined', () => {
    const middleware = requireRole('admin')
    expect(() => middleware(req, res, next)).toThrow(ForbiddenError)
  })
})

// ─── Tenant Middleware ───

const mockPrismaTenantFindUnique = jest.fn()

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRawUnsafe: jest.fn(),
    tenant: { findUnique: mockPrismaTenantFindUnique },
  })),
}))

import { tenantMiddleware } from '../middleware/tenant.middleware'

describe('tenantMiddleware', () => {
  let req: Request
  let res: Response
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    req = mockReq()
    res = mockRes()
    next = jest.fn()
  })

  it('extrait le tenant du header X-Tenant-Id', async () => {
    req.headers = { 'x-tenant-id': 'ma-boutique' }
    mockPrismaTenantFindUnique.mockResolvedValue({
      id: 'tenant-1',
      slug: 'ma-boutique',
      isSuspended: false,
    })

    await tenantMiddleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.tenantSlug).toBe('ma-boutique')
    expect(req.tenantId).toBe('tenant-1')
  })

  it('extrait le tenant du JWT payload (req.tenantId)', async () => {
    req.tenantId = 'tenant-1'
    mockPrismaTenantFindUnique.mockResolvedValue({
      id: 'tenant-1',
      slug: 'slug-from-jwt',
      isSuspended: false,
    })

    await tenantMiddleware(req, res, next)

    expect(req.tenantSlug).toBe('slug-from-jwt')
  })

  it("retourne une erreur si aucun tenant n'est identifié", async () => {
    await tenantMiddleware(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError))
  })

  it('retourne 403 si le tenant est suspendu', async () => {
    req.headers = { 'x-tenant-id': 'suspendu' }
    mockPrismaTenantFindUnique.mockResolvedValue({
      id: 'tenant-suspended',
      slug: 'suspendu',
      isSuspended: true,
    })

    await tenantMiddleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
  })
})

// ─── Error Handler ───

describe('errorHandler', () => {
  let req: Request
  let res: Response
  let next: NextFunction

  beforeEach(() => {
    req = mockReq()
    res = mockRes()
    next = jest.fn()
  })

  it('formate les erreurs Zod en 400 avec les champs en erreur', () => {
    const zodIssues: ZodIssue[] = [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['email'],
        message: 'Required',
      },
    ]
    const zodError = new ZodError(zodIssues)
    errorHandler(zodError, req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 400,
      message: 'Données invalides',
      errors: [{ field: 'email', message: 'Required' }],
    })
  })

  it('formate les AppError avec leur statusCode', () => {
    errorHandler(new NotFoundError('Ressource non trouvée'), req, res, next)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      status: 404,
      message: 'Ressource non trouvée',
    })
  })

  it('formate les erreurs inconnues en 500', () => {
    errorHandler(new Error('Something broke'), req, res, next)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      status: 500,
      message: 'Erreur interne du serveur',
    })
  })

  it('formate BadRequestError en 400', () => {
    errorHandler(new BadRequestError('Données invalides'), req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('formate UnauthorizedError en 401', () => {
    errorHandler(new UnauthorizedError('Non autorisé'), req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('formate ForbiddenError en 403', () => {
    errorHandler(new ForbiddenError('Accès interdit'), req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('formate ConflictError en 409', () => {
    errorHandler(new ConflictError('Conflit'), req, res, next)
    expect(res.status).toHaveBeenCalledWith(409)
  })
})
