// --- Mocks Prisma (must be before imports) ---
const mockPrismaTenantFindUnique = jest.fn()
const mockPrismaTenantCreate = jest.fn()
const mockPrismaUserFindUnique = jest.fn()
const mockPrismaUserFindFirst = jest.fn()
const mockPrismaUserCreate = jest.fn()
const mockPrismaUserUpdate = jest.fn()
const mockPrismaRefreshTokenFindUnique = jest.fn()
const mockPrismaRefreshTokenCreate = jest.fn()
const mockPrismaRefreshTokenDeleteMany = jest.fn()
const mockPrismaRefreshTokenUpsert = jest.fn()
const mockPrismaRefreshTokenDelete = jest.fn()

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRawUnsafe: jest.fn(),
    tenant: {
      findUnique: mockPrismaTenantFindUnique,
      create: mockPrismaTenantCreate,
    },
    user: {
      findUnique: mockPrismaUserFindUnique,
      findFirst: mockPrismaUserFindFirst,
      create: mockPrismaUserCreate,
      update: mockPrismaUserUpdate,
    },
    refreshToken: {
      findUnique: mockPrismaRefreshTokenFindUnique,
      create: mockPrismaRefreshTokenCreate,
      deleteMany: mockPrismaRefreshTokenDeleteMany,
      upsert: mockPrismaRefreshTokenUpsert,
      delete: mockPrismaRefreshTokenDelete,
    },
  })),
}))

jest.mock('../services/jwtBlacklist.service', () => ({
  jwtBlacklistService: {
    getActiveSession: jest.fn().mockResolvedValue(null),
    setActiveSession: jest.fn(),
    removeActiveSession: jest.fn(),
    isRefreshTokenBlacklisted: jest.fn().mockResolvedValue(false),
    blacklistRefreshToken: jest.fn(),
    blacklistToken: jest.fn(),
    isBlacklisted: jest.fn().mockResolvedValue(false),
  },
}))

jest.mock('../services/tenant.service', () => ({
  tenantService: { createTenantSchema: jest.fn() },
}))

jest.mock('../services/audit.service', () => ({
  auditService: { log: jest.fn() },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}))

jest.mock('../utils/jwt', () => ({
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyRefreshToken: jest.fn().mockReturnValue({
    userId: 'user-1', tenantId: 'tenant-1', role: 'admin',
  }),
  verifyAccessToken: jest.fn().mockReturnValue({
    userId: 'user-1', tenantId: 'tenant-1', role: 'admin', sessionId: 'sess-1',
  }),
  jwt: {
    decode: jest.fn().mockReturnValue({
      userId: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  },
}))

import request from 'supertest'
import app from '../app'

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashed-password',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'admin',
  tenantId: 'tenant-1',
  mustChangePassword: false,
  tenant: {
    id: 'tenant-1',
    slug: 'ma-boutique',
    name: 'Ma Boutique',
    plan: 'starter',
    config: {},
    isSuspended: false,
  },
}

describe('Authentification API', () => {
  // ─── Tests sans authentification ───

  it('devrait retourner 401 si aucun token n\'est fourni sur /me', async () => {
    const res = await request(app).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })

  it('devrait échouer à la connexion avec des identifiants invalides', async () => {
    mockPrismaUserFindFirst.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'inconnu@example.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  // ─── Register ───

  describe('POST /api/v1/auth/register', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('crée un compte avec succès', async () => {
      mockPrismaTenantFindUnique.mockResolvedValue(null)
      mockPrismaTenantCreate.mockResolvedValue(mockUser.tenant)
      mockPrismaUserCreate.mockResolvedValue(mockUser)

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'strongPass123',
          firstName: 'Jean',
          lastName: 'Dupont',
          companyName: 'Ma Boutique',
          companySlug: 'ma-boutique',
        })

      expect(res.status).toBe(201)
      expect(res.body.user.email).toBe('test@example.com')
      expect(res.body.user.role).toBe('admin')
      expect(res.body.accessToken).toBe('mock-access-token')
      expect(res.body.refreshToken).toBe('mock-refresh-token')
    })

    it('retourne 409 si le slug est déjà pris', async () => {
      mockPrismaTenantFindUnique.mockResolvedValue(mockUser.tenant)

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'autre@example.com',
          password: 'strongPass123',
          firstName: 'Autre',
          lastName: 'User',
          companyName: 'Ma Boutique',
          companySlug: 'ma-boutique',
        })

      expect(res.status).toBe(409)
    })
  })

  // ─── Login ───

  describe('POST /api/v1/auth/login', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('connecte un utilisateur avec des identifiants valides', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(mockUser)

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'strongPass123' })

      expect(res.status).toBe(200)
      expect(res.body.user.email).toBe('test@example.com')
      expect(res.body.accessToken).toBe('mock-access-token')
    })

    it('retourne 401 si le mot de passe est invalide', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(mockUser)
      const bcrypt = require('bcryptjs')
      bcrypt.compare.mockResolvedValueOnce(false)

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })

      expect(res.status).toBe(401)
    })

    it('retourne 401 si le tenant est suspendu', async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        ...mockUser,
        tenant: { ...mockUser.tenant, isSuspended: true },
      })

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'pass' })

      expect(res.status).toBe(401)
      expect(res.body.message).toContain('COMPTE SUSPENDU')
    })

    it('connecte via X-Tenant-Id header', async () => {
      mockPrismaTenantFindUnique.mockResolvedValue(mockUser.tenant)
      mockPrismaUserFindUnique.mockResolvedValue(mockUser)

      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-Id', 'ma-boutique')
        .send({ email: 'test@example.com', password: 'pass' })

      expect(res.status).toBe(200)
    })
  })

  // ─── Refresh ───

  describe('POST /api/v1/auth/refresh', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('renouvelle les tokens avec un refresh token valide', async () => {
      mockPrismaRefreshTokenFindUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-refresh-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser,
      })

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })

      expect(res.status).toBe(200)
      expect(res.body.accessToken).toBe('mock-access-token')
      expect(res.body.refreshToken).toBe('mock-refresh-token')
    })

    it('retourne 401 avec un refresh token invalide', async () => {
      mockPrismaRefreshTokenFindUnique.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })

      expect(res.status).toBe(401)
    })

    it('retourne 400 si le refresh token est manquant', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})

      expect(res.status).toBe(400)
    })
  })

  // ─── Logout ───

  describe('POST /api/v1/auth/logout', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('déconnecte avec un token valide', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer mock-access-token')
        .send({ refreshToken: 'mock-refresh-token' })

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('Déconnexion réussie')
    })
  })

  // ─── Me (authenticated) ───

  describe('GET /api/v1/auth/me', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('retourne le profil avec un token valide', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer mock-access-token')

      expect(res.status).toBe(200)
      expect(res.body.userId).toBe('user-1')
      expect(res.body.role).toBe('admin')
    })
  })

  // ─── Change Password Mandatory ───

  describe('POST /api/v1/auth/change-password-mandatory', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('change le mot de passe avec un token valide', async () => {
      mockPrismaUserUpdate.mockResolvedValue({
        ...mockUser,
        mustChangePassword: false,
        password: 'new-hashed',
      })

      const res = await request(app)
        .post('/api/v1/auth/change-password-mandatory')
        .set('Authorization', 'Bearer mock-access-token')
        .send({ newPassword: 'newPassword123' })

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('Mot de passe mis à jour avec succès')
    })

    it('retourne 401 sans token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password-mandatory')
        .send({ newPassword: 'newPassword123' })

      expect(res.status).toBe(401)
    })
  })
})
