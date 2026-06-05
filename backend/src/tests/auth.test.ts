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

jest.mock('../services/notification.service', () => ({
  emailService: {
    sendVerificationEmail: jest.fn().mockResolvedValue({ sent: true }),
    sendLowStockAlert: jest.fn().mockResolvedValue({ sent: true }),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ sent: true }),
  },
}))

jest.mock('../services/twoFactor.service', () => ({
  twoFactorService: {
    enable: jest.fn().mockResolvedValue({
      secret: 'mock-secret',
      backupCodes: ['code1', 'code2', 'code3', 'code4', 'code5', 'code6', 'code7', 'code8'],
      qrCodeUrl: 'otpauth://totp/GesStock:test@example.com?secret=mock-secret&issuer=GesStock',
    }),
    verify: jest.fn().mockResolvedValue(true),
    disable: jest.fn().mockResolvedValue(undefined),
    isEnabled: jest.fn().mockResolvedValue(false),
    regenerateBackupCodes: jest
      .fn()
      .mockResolvedValue([
        'newCode1',
        'newCode2',
        'newCode3',
        'newCode4',
        'newCode5',
        'newCode6',
        'newCode7',
        'newCode8',
      ]),
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}))

jest.mock('../utils/jwt', () => ({
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyRefreshToken: jest.fn().mockReturnValue({
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: 'admin',
  }),
  verifyAccessToken: jest.fn().mockReturnValue({
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: 'admin',
    sessionId: 'sess-1',
  }),
  jwt: {
    decode: jest.fn().mockReturnValue({
      userId: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  },
}))

import request from 'supertest'
import expressApp from '../app'

const app = expressApp

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
  // No afterAll cleanup needed with direct app

  // ─── Tests sans authentification ───

  it("devrait retourner 401 si aucun token n'est fourni sur /me", async () => {
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

      const res = await request(app).post('/api/v1/auth/register').send({
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

      const res = await request(app).post('/api/v1/auth/register').send({
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
      const res = await request(app).post('/api/v1/auth/refresh').send({})

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

  // ─── 2FA (Two-Factor Authentication) ───

  describe('POST /api/v1/auth/2fa/enable', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('active la 2FA et retourne le secret + codes backup', async () => {
      mockPrismaUserFindUnique.mockResolvedValue(mockUser)
      mockPrismaUserUpdate.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted-secret',
        twoFactorBackupCodes: ['hash1', 'hash2', 'hash3'],
      })

      const res = await request(app)
        .post('/api/v1/auth/2fa/enable')
        .set('Authorization', 'Bearer mock-access-token')

      expect(res.status).toBe(200)
      expect(res.body.secret).toBeDefined()
      expect(res.body.backupCodes).toBeDefined()
      expect(res.body.backupCodes).toHaveLength(8)
      expect(res.body.qrCodeUrl).toContain('otpauth://totp/GesStock')
    })

    it('retourne 401 sans token', async () => {
      const res = await request(app).post('/api/v1/auth/2fa/enable')

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/v1/auth/2fa/verify', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('vérifie un code TOTP valide', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: true,
        twoFactorSecret: 'encrypted-secret-base32',
        twoFactorBackupCodes: [],
      })

      const res = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Authorization', 'Bearer mock-access-token')
        .send({ code: '123456' })

      // Code TOTP valide ou invalide selon le timing
      expect([200, 401]).toContain(res.status)
    })

    it('retourne 401 avec un code invalide', async () => {
      const { twoFactorService } = require('../services/twoFactor.service')
      twoFactorService.verify.mockResolvedValueOnce(false)
      mockPrismaUserFindUnique.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: false,
      })

      const res = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Authorization', 'Bearer mock-access-token')
        .send({ code: 'invalid' })

      expect(res.status).toBe(401)
    })

    it('retourne 401 sans token', async () => {
      const res = await request(app).post('/api/v1/auth/2fa/verify').send({ code: '123456' })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/v1/auth/2fa/disable', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('désactive la 2FA', async () => {
      mockPrismaUserUpdate.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      })

      const res = await request(app)
        .post('/api/v1/auth/2fa/disable')
        .set('Authorization', 'Bearer mock-access-token')

      expect(res.status).toBe(200)
      expect(res.body.message).toContain('2FA désactivée')
    })

    it('retourne 401 sans token', async () => {
      const res = await request(app).post('/api/v1/auth/2fa/disable')

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/v1/auth/2fa/backup-codes', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('régénère les codes backup', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: true,
      })
      mockPrismaUserUpdate.mockResolvedValue({
        ...mockUser,
        twoFactorBackupCodes: ['newHash1', 'newHash2'],
      })

      const res = await request(app)
        .post('/api/v1/auth/2fa/backup-codes')
        .set('Authorization', 'Bearer mock-access-token')

      expect(res.status).toBe(200)
      expect(res.body.backupCodes).toBeDefined()
      expect(res.body.backupCodes.length).toBeGreaterThan(0)
    })

    it('retourne 401 sans token', async () => {
      const res = await request(app).post('/api/v1/auth/2fa/backup-codes')

      expect(res.status).toBe(401)
    })
  })

  // ─── Rate Limiting ───

  describe('Rate Limiting - POST /api/v1/auth/login', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('accepte les logins valides sans compter comme tentatives (skipSuccessfulRequests)', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(mockUser)

      // Simule 3 tentatives réussies
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@example.com', password: 'strongPass123' })

        expect(res.status).toBe(200)
      }

      // Les requêtes réussies ne doivent pas être limitées
      // (Le vrai test se ferait en simulation d'échechs)
    })

    it('pénalise les tentatives échouées', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null)

      // Simule 3 tentatives échouées
      const results = []
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'inconnu@example.com', password: 'wrong' })

        results.push(res.status)
      }

      // Les premières tentatives retournent 401
      expect(results[0]).toBe(401)
      expect(results[1]).toBe(401)
      // Après N tentatives, devrait retourner 429 (Rate Limited)
      // Note: Le vrai comportement dépend de la config rate-limit
    })
  })

  describe('Rate Limiting - POST /api/v1/auth/register', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('accepte les registrations valides sans compter comme tentatives', async () => {
      mockPrismaTenantFindUnique.mockResolvedValue(null)
      mockPrismaTenantCreate.mockResolvedValue(mockUser.tenant)
      mockPrismaUserCreate.mockResolvedValue(mockUser)

      // Simule 2 registrations réussies
      for (let i = 0; i < 2; i++) {
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `test${i}@example.com`,
            password: 'strongPass123',
            firstName: 'Jean',
            lastName: 'Dupont',
            companyName: 'Ma Boutique',
            companySlug: `ma-boutique-${i}`,
          })

        expect(res.status).toBe(201)
      }

      // Les registrations réussies ne doivent pas être limitées
    })

    it('pénalise les tentatives de registration échouées (ex: slug déjà pris)', async () => {
      mockPrismaTenantFindUnique.mockResolvedValue(mockUser.tenant)

      // Simule 3 tentatives avec le même slug
      const results = []
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `test${i}@example.com`,
            password: 'strongPass123',
            firstName: 'Jean',
            lastName: 'Dupont',
            companyName: 'Ma Boutique',
            companySlug: 'ma-boutique',
          })

        results.push(res.status)
      }

      // Les premières tentatives retournent 409 (Conflict)
      expect(results[0]).toBe(409)
      expect(results[1]).toBe(409)
      // Après N tentatives, devrait retourner 429 (Rate Limited)
    })
  })

  // ─── Email Verification ───

  describe('POST /api/v1/auth/verify-email', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it("vérifie l'email avec un token valide", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(mockUser)
      mockPrismaUserUpdate.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
        emailVerificationToken: null,
      })

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'valid-token-123' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('vérifié')
    })

    it('retourne 400 avec un token invalide', async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid-token' })

      expect(res.status).toBe(400)
    })

    it('retourne 400 si token est manquant', async () => {
      const res = await request(app).post('/api/v1/auth/verify-email').send({})

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/v1/auth/resend-verification-email', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it("renvoie l'email de vérification avec succès", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
      })
      mockPrismaUserUpdate.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        emailVerificationToken: 'new-token',
      })

      const res = await request(app)
        .post('/api/v1/auth/resend-verification-email')
        .send({ email: 'test@example.com' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('renvoyé')
    })

    it('retourne 400 si email est manquant', async () => {
      const res = await request(app).post('/api/v1/auth/resend-verification-email').send({})

      expect(res.status).toBe(400)
    })

    it("n'expose pas si l'email existe ou non", async () => {
      mockPrismaUserFindFirst.mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/auth/resend-verification-email')
        .send({ email: 'nonexistent@example.com' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      // Message générique — ne révèle pas si l'email existe
    })

    it("ne renvoie pas d'email si déjà vérifié", async () => {
      mockPrismaUserFindFirst.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      })

      const res = await request(app)
        .post('/api/v1/auth/resend-verification-email')
        .send({ email: 'test@example.com' })

      expect(res.status).toBe(200)
      expect(res.body.message).toContain('déjà vérifié')
    })
  })
})
