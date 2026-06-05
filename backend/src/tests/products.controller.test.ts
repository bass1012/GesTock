// ─── Mocks (avant tout import) ────────────────────────────────────────────────

// Mock JWT + session (auth middleware)
const mockVerifyAccessToken = jest.fn().mockReturnValue({
  userId: 'user-1',
  tenantId: 'tenant-1',
  role: 'admin',
  sessionId: 'sess-1',
})
const mockIsBlacklisted = jest.fn().mockResolvedValue(false)
const mockGetActiveSession = jest.fn().mockResolvedValue('sess-1')

jest.mock('../utils/jwt', () => ({ verifyAccessToken: mockVerifyAccessToken }))

jest.mock('../services/jwtBlacklist.service', () => ({
  jwtBlacklistService: {
    isBlacklisted: mockIsBlacklisted,
    getActiveSession: mockGetActiveSession,
  },
}))

// Mock Prisma (pour tenant middleware)
const mockPrismaTenantFindUnique = jest.fn().mockResolvedValue({
  id: 'tenant-1',
  slug: 'ma-boutique',
  isSuspended: false,
})
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    tenant: { findUnique: mockPrismaTenantFindUnique },
  })),
}))

// Mock stockService
const mockStockService = {
  listProducts: jest.fn(),
  getProduct: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
}
jest.mock('../services/stock.service', () => ({ stockService: mockStockService }))

// Mock userService
const mockUserService = {
  listUsers: jest.fn(),
  inviteUser: jest.fn(),
  updateUserRole: jest.fn(),
  removeUser: jest.fn(),
}
jest.mock('../services/user.service', () => ({ userService: mockUserService }))

// Mock warehouseService
const mockWarehouseService = {
  listWarehouses: jest.fn(),
  getWarehouse: jest.fn(),
  createWarehouse: jest.fn(),
  updateWarehouse: jest.fn(),
  deleteWarehouse: jest.fn(),
  getProductStock: jest.fn(),
}
jest.mock('../services/warehouse.service', () => ({ warehouseService: mockWarehouseService }))

// Mock auditService
jest.mock('../services/audit.service', () => ({
  auditService: { log: jest.fn().mockResolvedValue(undefined) },
}))

// Mock planLimit middleware (passe directement, pas de quota check en test)
jest.mock('../middleware/planLimit.middleware', () => ({
  checkPlanLimit: () => (req: any, res: any, next: any) => next(),
  requirePlan: () => (req: any, res: any, next: any) => next(),
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import request from 'supertest'
import expressApp from '../app'

const app = expressApp

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AUTH_HEADER = { Authorization: 'Bearer mock-token' }
const TENANT_HEADER = { 'X-Tenant-Id': 'ma-boutique' }
const AUTH_HEADERS = { ...AUTH_HEADER, ...TENANT_HEADER }

const mockProduct = {
  id: 'prod-1',
  name: 'Riz 25kg',
  sku: 'RIZ-25',
  description: 'Sac de riz',
  price: 12500,
  current_stock: 100,
  min_stock: 10,
  unit: 'sac',
  category_id: null,
  supplier_id: null,
  is_active: true,
}

// ─── Products Controller ───────────────────────────────────────────────────────

describe('Products Controller — GET /api/v1/products', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/v1/products')
    expect(res.status).toBe(401)
  })

  it('retourne la liste des produits avec pagination', async () => {
    mockStockService.listProducts.mockResolvedValue({
      data: [mockProduct],
      pagination: { page: 1, limit: 20, totalPages: 1, totalItems: 1 },
    })

    const res = await request(app).get('/api/v1/products').set(AUTH_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.pagination.totalItems).toBe(1)
  })

  it('passe la recherche au service', async () => {
    mockStockService.listProducts.mockResolvedValue({ data: [], pagination: {} })

    await request(app).get('/api/v1/products?search=riz&page=2&limit=5').set(AUTH_HEADERS)

    expect(mockStockService.listProducts).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'riz', page: 2, limit: 5 }),
    )
  })

  it('retourne 500 si le service lève une erreur', async () => {
    mockStockService.listProducts.mockRejectedValue(new Error('DB error'))

    const res = await request(app).get('/api/v1/products').set(AUTH_HEADERS)

    expect(res.status).toBe(500)
  })
})

describe('Products Controller — GET /api/v1/products/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne le produit par ID', async () => {
    mockStockService.getProduct.mockResolvedValue(mockProduct)

    const res = await request(app).get('/api/v1/products/prod-1').set(AUTH_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('prod-1')
    expect(res.body.name).toBe('Riz 25kg')
  })

  it("retourne 404 si le produit n'existe pas", async () => {
    const { NotFoundError } = require('../utils/errors')
    mockStockService.getProduct.mockRejectedValue(new NotFoundError('Produit non trouvé'))

    const res = await request(app).get('/api/v1/products/unknown-id').set(AUTH_HEADERS)

    expect(res.status).toBe(404)
  })
})

describe('Products Controller — POST /api/v1/products', () => {
  beforeEach(() => jest.clearAllMocks())

  it('crée un produit avec des données valides', async () => {
    mockStockService.createProduct.mockResolvedValue(mockProduct)

    const res = await request(app).post('/api/v1/products').set(AUTH_HEADERS).send({
      name: 'Riz 25kg',
      sku: 'RIZ-25',
      price: 12500,
      current_stock: 100,
      min_stock: 10,
      unit: 'sac',
    })

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('prod-1')
  })

  it('retourne 400 si les données sont invalides (nom manquant)', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set(AUTH_HEADERS)
      .send({ sku: 'RIZ-25', price: 12500 }) // name manquant

    expect(res.status).toBe(400)
  })

  it('retourne 403 pour un lecteur (rôle insuffisant)', async () => {
    mockVerifyAccessToken.mockReturnValueOnce({
      userId: 'user-2',
      tenantId: 'tenant-1',
      role: 'lecteur',
      sessionId: 'sess-1',
    })

    const res = await request(app).post('/api/v1/products').set(AUTH_HEADERS).send({
      name: 'Test',
      sku: 'TST-01',
      price: 100,
      current_stock: 0,
      min_stock: 0,
      unit: 'pcs',
    })

    expect(res.status).toBe(403)
  })
})

describe('Products Controller — PUT /api/v1/products/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('met à jour un produit', async () => {
    mockStockService.updateProduct.mockResolvedValue({ ...mockProduct, name: 'Riz modifié' })

    const res = await request(app)
      .put('/api/v1/products/prod-1')
      .set(AUTH_HEADERS)
      .send({ name: 'Riz modifié' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Riz modifié')
  })
})

describe('Products Controller — DELETE /api/v1/products/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('supprime un produit', async () => {
    mockStockService.deleteProduct.mockResolvedValue(undefined)

    const res = await request(app).delete('/api/v1/products/prod-1').set(AUTH_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Produit supprimé')
  })

  it("passe l'ID correct au service", async () => {
    mockStockService.deleteProduct.mockResolvedValue(undefined)

    await request(app).delete('/api/v1/products/prod-42').set(AUTH_HEADERS)

    expect(mockStockService.deleteProduct).toHaveBeenCalledWith('prod-42', 'ma-boutique')
  })
})

// ─── Alerts Controller ────────────────────────────────────────────────────────

describe('Alerts Controller — GET /api/v1/alerts/stock', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/v1/alerts/stock')
    expect(res.status).toBe(401)
  })

  it('retourne les alertes de stock bas', async () => {
    // Le contrôleur utilise Prisma.$queryRawUnsafe directement
    // On met à jour le mock Prisma pour simuler des alertes
    const mockPrisma = require('@prisma/client').PrismaClient
    mockPrisma.mockImplementation(() => ({
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          id: 'prod-1',
          sku: 'RIZ-25',
          name: 'Riz 25kg',
          min_stock: 10,
          current_stock: 3,
          unit: 'sac',
        },
      ]),
      tenant: { findUnique: mockPrismaTenantFindUnique },
    }))

    const res = await request(app).get('/api/v1/alerts/stock').set(AUTH_HEADERS)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

// ─── Users Controller ─────────────────────────────────────────────────────────

const mockUserRecord = {
  id: 'user-2',
  email: 'user@example.com',
  firstName: 'Marie',
  lastName: 'Martin',
  role: 'manager',
  tenantId: 'tenant-1',
}

describe('Users Controller — GET /api/v1/users', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/v1/users')
    expect(res.status).toBe(401)
  })

  it('liste les utilisateurs', async () => {
    mockUserService.listUsers.mockResolvedValue([mockUserRecord])

    const res = await request(app).get('/api/v1/users').set(AUTH_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].email).toBe('user@example.com')
  })
})

describe('Users Controller — POST /api/v1/users/invite', () => {
  beforeEach(() => jest.clearAllMocks())

  it('invite un utilisateur avec des données valides', async () => {
    mockUserService.inviteUser.mockResolvedValue(mockUserRecord)

    const res = await request(app).post('/api/v1/users/invite').set(AUTH_HEADERS).send({
      email: 'user@example.com',
      firstName: 'Marie',
      lastName: 'Martin',
      role: 'manager',
      password: 'Password123',
    })

    expect(res.status).toBe(201)
    expect(res.body.email).toBe('user@example.com')
  })

  it('retourne 400 si email est invalide', async () => {
    const res = await request(app).post('/api/v1/users/invite').set(AUTH_HEADERS).send({
      email: 'not-an-email',
      firstName: 'Marie',
      lastName: 'Martin',
      role: 'manager',
      password: 'Password123',
    })

    expect(res.status).toBe(400)
  })

  it('retourne 400 si le rôle est invalide', async () => {
    const res = await request(app).post('/api/v1/users/invite').set(AUTH_HEADERS).send({
      email: 'ok@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'superadmin', // rôle inexistant
      password: 'Password123',
    })

    expect(res.status).toBe(400)
  })

  it('retourne 400 si le mot de passe est trop court', async () => {
    const res = await request(app).post('/api/v1/users/invite').set(AUTH_HEADERS).send({
      email: 'ok@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'lecteur',
      password: 'short',
    })

    expect(res.status).toBe(400)
  })
})

describe('Users Controller — PUT /api/v1/users/:id/role', () => {
  beforeEach(() => jest.clearAllMocks())

  it("change le rôle d'un utilisateur", async () => {
    mockUserService.updateUserRole.mockResolvedValue({ ...mockUserRecord, role: 'admin' })

    const res = await request(app)
      .put('/api/v1/users/user-2/role')
      .set(AUTH_HEADERS)
      .send({ role: 'admin' })

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('admin')
  })

  it('retourne 400 si le rôle est invalide', async () => {
    const res = await request(app)
      .put('/api/v1/users/user-2/role')
      .set(AUTH_HEADERS)
      .send({ role: 'invalid_role' })

    expect(res.status).toBe(400)
  })
})

describe('Users Controller — DELETE /api/v1/users/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('supprime un utilisateur', async () => {
    mockUserService.removeUser.mockResolvedValue(undefined)

    const res = await request(app).delete('/api/v1/users/user-2').set(AUTH_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('supprimé')
  })
})

// ─── Warehouses Controller ────────────────────────────────────────────────────

const mockWarehouse = { id: 'wh-1', name: 'Dépôt Central', address: '12 rue Kolda' }

describe('Warehouses Controller — GET /api/v1/warehouses', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/api/v1/warehouses')
    expect(res.status).toBe(401)
  })

  it('liste les entrepôts', async () => {
    mockWarehouseService.listWarehouses.mockResolvedValue([mockWarehouse])

    const res = await request(app).get('/api/v1/warehouses').set(AUTH_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Dépôt Central')
  })
})

describe('Warehouses Controller — POST /api/v1/warehouses', () => {
  beforeEach(() => jest.clearAllMocks())

  it('crée un entrepôt avec des données valides', async () => {
    mockWarehouseService.createWarehouse.mockResolvedValue(mockWarehouse)

    const res = await request(app)
      .post('/api/v1/warehouses')
      .set(AUTH_HEADERS)
      .send({ name: 'Dépôt Central', address: '12 rue Kolda' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Dépôt Central')
  })

  it('retourne 400 si le nom est manquant', async () => {
    const res = await request(app)
      .post('/api/v1/warehouses')
      .set(AUTH_HEADERS)
      .send({ address: 'sans nom' })

    expect(res.status).toBe(400)
  })
})

describe('Warehouses Controller — PUT /api/v1/warehouses/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('met à jour un entrepôt', async () => {
    mockWarehouseService.updateWarehouse.mockResolvedValue({
      ...mockWarehouse,
      name: 'Nouveau Dépôt',
    })

    const res = await request(app)
      .put('/api/v1/warehouses/wh-1')
      .set(AUTH_HEADERS)
      .send({ name: 'Nouveau Dépôt' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Nouveau Dépôt')
  })
})

describe('Warehouses Controller — DELETE /api/v1/warehouses/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('supprime un entrepôt', async () => {
    mockWarehouseService.deleteWarehouse.mockResolvedValue(undefined)

    const res = await request(app).delete('/api/v1/warehouses/wh-1').set(AUTH_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('supprimé')
  })
})

describe('Warehouses Controller — GET /api/v1/warehouses/product/:productId', () => {
  beforeEach(() => jest.clearAllMocks())

  it("retourne le stock d'un produit par entrepôt", async () => {
    const stockData = [{ warehouse_id: 'wh-1', warehouse_name: 'Dépôt Central', quantity: 50 }]
    mockWarehouseService.getProductStock.mockResolvedValue(stockData)

    const res = await request(app).get('/api/v1/warehouses/product/prod-1').set(AUTH_HEADERS)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].quantity).toBe(50)
  })
})
