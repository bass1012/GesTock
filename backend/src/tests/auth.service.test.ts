// --- Mocks Prisma ---
const mockTenantFindUnique = jest.fn()
const mockTenantCreate = jest.fn()
const mockUserFindUnique = jest.fn()
const mockUserFindFirst = jest.fn()
const mockUserCreate = jest.fn()
const mockUserUpdate = jest.fn()
const mockRefreshTokenFindUnique = jest.fn()
const mockRefreshTokenCreate = jest.fn()
const mockRefreshTokenDeleteMany = jest.fn()
const mockRefreshTokenUpsert = jest.fn()
const mockRefreshTokenDelete = jest.fn()

const mockVerifyRefreshToken = jest.fn(() => ({
  userId: 'user-1',
  tenantId: 'tenant-1',
  role: 'admin',
}))
const mockJwtDecode = jest.fn(() => ({
  userId: 'user-1',
  exp: Math.floor(Date.now() / 1000) + 3600,
}))
const mockIsRefreshTokenBlacklisted = jest.fn().mockResolvedValue(false)
const mockGetActiveSession = jest.fn()
const mockSetActiveSession = jest.fn()
const mockRemoveActiveSession = jest.fn()
const mockBlacklistRefreshToken = jest.fn()
const mockBlacklistToken = jest.fn()

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRawUnsafe: jest.fn(),
    tenant: {
      findUnique: mockTenantFindUnique,
      create: mockTenantCreate,
    },
    user: {
      findUnique: mockUserFindUnique,
      findFirst: mockUserFindFirst,
      create: mockUserCreate,
      update: mockUserUpdate,
    },
    refreshToken: {
      findUnique: mockRefreshTokenFindUnique,
      create: mockRefreshTokenCreate,
      deleteMany: mockRefreshTokenDeleteMany,
      upsert: mockRefreshTokenUpsert,
      delete: mockRefreshTokenDelete,
    },
  })),
}))

jest.mock('../services/jwtBlacklist.service', () => ({
  jwtBlacklistService: {
    getActiveSession: mockGetActiveSession,
    setActiveSession: mockSetActiveSession,
    removeActiveSession: mockRemoveActiveSession,
    isRefreshTokenBlacklisted: mockIsRefreshTokenBlacklisted,
    blacklistRefreshToken: mockBlacklistRefreshToken,
    blacklistToken: mockBlacklistToken,
  },
}))

jest.mock('../services/tenant.service', () => ({
  tenantService: { createTenantSchema: jest.fn() },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}))

jest.mock('../utils/jwt', () => ({
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyRefreshToken: mockVerifyRefreshToken,
  jwt: { decode: mockJwtDecode },
}))

import { authService } from '../services/auth.service'

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  password: 'hashed-password',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'admin',
  tenantId: 'tenant-1',
  mustChangePassword: false,
  failedLoginAttempts: 0,
  lockoutUntil: null,
  tenant: {
    id: 'tenant-1',
    slug: 'ma-boutique',
    name: 'Ma Boutique',
    plan: 'starter',
    config: {},
    isSuspended: false,
  },
}

const mockTenant = {
  id: 'tenant-1',
  slug: 'ma-boutique',
  name: 'Ma Boutique',
  plan: 'starter',
  config: {},
}

const registerData = {
  email: 'test@example.com',
  password: 'strongPass123',
  firstName: 'Jean',
  lastName: 'Dupont',
  companyName: 'Ma Boutique',
  companySlug: 'ma-boutique',
}

describe('authService.register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('crée un tenant, un utilisateur et retourne des tokens', async () => {
    mockTenantFindUnique.mockResolvedValue(null)
    mockTenantCreate.mockResolvedValue(mockTenant)
    mockUserCreate.mockResolvedValue(mockUser)

    const result = await authService.register(registerData)

    expect(result.user.email).toBe('test@example.com')
    expect(result.user.role).toBe('admin')
    expect(result.tenant.slug).toBe('ma-boutique')
    expect(result.accessToken).toBe('mock-access-token')
    expect(result.refreshToken).toBe('mock-refresh-token')

    const { tenantService } = require('../services/tenant.service')
    expect(tenantService.createTenantSchema).toHaveBeenCalledWith('ma-boutique')
  })

  it('lève ConflictError si le slug est déjà pris', async () => {
    mockTenantFindUnique.mockResolvedValue(mockTenant)

    await expect(authService.register(registerData)).rejects.toThrow(
      "Cet identifiant d'entreprise est déjà pris",
    )
  })

  it('hache le mot de passe avec bcrypt', async () => {
    mockTenantFindUnique.mockResolvedValue(null)
    mockTenantCreate.mockResolvedValue(mockTenant)
    mockUserCreate.mockResolvedValue(mockUser)

    await authService.register(registerData)

    const bcrypt = require('bcryptjs')
    expect(bcrypt.hash).toHaveBeenCalledWith('strongPass123', 12)
  })
})

describe('authService.login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('connecte un utilisateur avec email/mot de passe valides', async () => {
    mockUserFindFirst.mockResolvedValue(mockUser)

    const result = await authService.login('test@example.com', 'strongPass123')

    expect(result.user.email).toBe('test@example.com')
    expect(result.accessToken).toBe('mock-access-token')
    expect(result.refreshToken).toBe('mock-refresh-token')
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    })
  })

  it('connecte un utilisateur scoped à un tenant', async () => {
    mockTenantFindUnique.mockResolvedValue(mockTenant)
    mockUserFindUnique.mockResolvedValue(mockUser)

    const result = await authService.login('test@example.com', 'strongPass123', 'ma-boutique')

    expect(result.user.email).toBe('test@example.com')
    expect(mockTenantFindUnique).toHaveBeenCalledWith({ where: { slug: 'ma-boutique' } })
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email_tenantId: { email: 'test@example.com', tenantId: 'tenant-1' } },
      include: { tenant: true },
    })
  })

  it('lève NotFoundError si le tenant slug est invalide', async () => {
    mockTenantFindUnique.mockResolvedValue(null)

    await expect(authService.login('test@example.com', 'strongPass123', 'inconnu')).rejects.toThrow(
      'Tenant introuvable',
    )
  })

  it("lève UnauthorizedError si l'utilisateur n'existe pas", async () => {
    mockUserFindFirst.mockResolvedValue(null)

    await expect(authService.login('inconnu@example.com', 'pass')).rejects.toThrow(
      'Email ou mot de passe incorrect',
    )
  })

  it('incrémente les échecs de login quand le mot de passe est invalide', async () => {
    mockUserFindFirst.mockResolvedValue(mockUser)
    const bcrypt = require('bcryptjs')
    bcrypt.compare.mockResolvedValueOnce(false)

    await expect(authService.login('test@example.com', 'wrong-password')).rejects.toThrow(
      'Email ou mot de passe incorrect',
    )

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { failedLoginAttempts: 1 },
    })
  })

  it('verrouille le compte après le nombre maximal de tentatives', async () => {
    mockUserFindFirst.mockResolvedValue({ ...mockUser, failedLoginAttempts: 4 })
    const bcrypt = require('bcryptjs')
    bcrypt.compare.mockResolvedValueOnce(false)

    await expect(authService.login('test@example.com', 'wrong-password')).rejects.toThrow(
      'Email ou mot de passe incorrect',
    )

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        failedLoginAttempts: 0,
        lockoutUntil: expect.any(Date),
      }),
    })
  })

  it('lève UnauthorizedError si le compte est verrouillé', async () => {
    mockUserFindFirst.mockResolvedValue({
      ...mockUser,
      lockoutUntil: new Date(Date.now() + 10 * 60 * 1000),
    })

    await expect(authService.login('test@example.com', 'strongPass123')).rejects.toThrow(
      'Compte verrouillé',
    )
  })

  it('lève UnauthorizedError si le tenant est suspendu', async () => {
    mockUserFindFirst.mockResolvedValue({
      ...mockUser,
      tenant: { ...mockUser.tenant, isSuspended: true },
    })

    await expect(authService.login('test@example.com', 'strongPass123')).rejects.toThrow(
      'COMPTE SUSPENDU',
    )
  })

  it('remplace la session active existante', async () => {
    mockUserFindFirst.mockResolvedValue(mockUser)
    mockGetActiveSession.mockResolvedValue('old-session')

    await authService.login('test@example.com', 'strongPass123')

    expect(mockRefreshTokenDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(mockRemoveActiveSession).toHaveBeenCalledWith('user-1')
  })
})

describe('authService.refresh', () => {
  const mockRefreshTokenRecord = {
    id: 'rt-1',
    token: 'old-refresh-token',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    user: mockUser,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsRefreshTokenBlacklisted.mockResolvedValue(false)
  })

  it('émet de nouveaux tokens avec un refresh token valide', async () => {
    mockRefreshTokenFindUnique.mockResolvedValue(mockRefreshTokenRecord)

    const result = await authService.refresh('old-refresh-token')

    expect(result.accessToken).toBe('mock-access-token')
    expect(result.refreshToken).toBe('mock-refresh-token')
    expect(mockBlacklistRefreshToken).toHaveBeenCalled()
    expect(mockRefreshTokenUpsert).toHaveBeenCalled()
  })

  it('lève UnauthorizedError si le refresh token est blacklisté', async () => {
    mockIsRefreshTokenBlacklisted.mockResolvedValue(true)

    await expect(authService.refresh('blacklisted-token')).rejects.toThrow('Refresh token révoqué')
  })

  it('lève UnauthorizedError si le refresh token est expiré', async () => {
    mockRefreshTokenFindUnique.mockResolvedValue({
      ...mockRefreshTokenRecord,
      expiresAt: new Date(Date.now() - 1000),
    })

    await expect(authService.refresh('expired-token')).rejects.toThrow(
      'Refresh token invalide ou expiré',
    )
  })

  it('lève UnauthorizedError si le tenant est suspendu', async () => {
    mockRefreshTokenFindUnique.mockResolvedValue({
      ...mockRefreshTokenRecord,
      user: { ...mockUser, tenant: { ...mockUser.tenant, isSuspended: true } },
    })

    await expect(authService.refresh('suspended-tenant-token')).rejects.toThrow('COMPTE SUSPENDU')
  })
})

describe('authService.logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('blackliste le token et supprime la session', async () => {
    mockJwtDecode.mockReturnValue({
      userId: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    await authService.logout('mock-access-token', 'mock-refresh-token')

    expect(mockBlacklistToken).toHaveBeenCalled()
    expect(mockBlacklistRefreshToken).toHaveBeenCalled()
    expect(mockRefreshTokenDeleteMany).toHaveBeenCalledWith({
      where: { token: 'mock-refresh-token' },
    })
    expect(mockRemoveActiveSession).toHaveBeenCalledWith('user-1')
  })

  it('fonctionne sans refresh token', async () => {
    mockJwtDecode.mockReturnValue({
      userId: 'user-1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    await authService.logout('mock-access-token')

    expect(mockBlacklistToken).toHaveBeenCalled()
    expect(mockRefreshTokenDeleteMany).not.toHaveBeenCalled()
  })

  it('ne plante pas si le token est invalide (jwt.decode retourne null)', async () => {
    mockJwtDecode.mockReturnValue(null as any)

    await expect(authService.logout('invalid-token')).resolves.not.toThrow()
  })
})

describe('authService.changePasswordMandatory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('met à jour le mot de passe et désactive mustChangePassword', async () => {
    mockUserUpdate.mockResolvedValue({
      ...mockUser,
      password: 'new-hashed-password',
      mustChangePassword: false,
    })

    const result = await authService.changePasswordMandatory('user-1', 'newPassword123')

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'hashed-password', mustChangePassword: false },
    })
    expect(result.mustChangePassword).toBe(false)
  })
})
