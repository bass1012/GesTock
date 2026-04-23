import { NotFoundError } from '../utils/errors'

// --- Mocks ---
const mockQueryRawUnsafe = jest.fn()

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRawUnsafe: mockQueryRawUnsafe,
  })),
}))

jest.mock('../services/cache.service', () => ({
  cacheService: {
    invalidateTags: jest.fn(),
  },
}))

// Import AFTER mocks are set up
import { stockService } from '../services/stock.service'

const TENANT = 'test'
const SCHEMA = 'tenant_test'

describe('stockService', () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset()
  })

  // ──────────────────────────────────────────────
  // listProducts
  // ──────────────────────────────────────────────
  describe('listProducts', () => {
    it('retourne une liste paginée de produits', async () => {
      const fakeProducts = [
        {
          id: 'uuid-1',
          sku: 'SKU-001',
          name: 'Produit A',
          description: null,
          category_id: null,
          category_name: null,
          unit: 'unité',
          min_stock: 5,
          current_stock: 20,
          price: 100,
          expiry_date: null,
          batch_number: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]
      const fakeCount = [{ total: '1' }]

      mockQueryRawUnsafe
        .mockResolvedValueOnce(fakeProducts) // SELECT products
        .mockResolvedValueOnce(fakeCount)    // COUNT

      const result = await stockService.listProducts({ page: 1, limit: 10, tenantSlug: TENANT })

      expect(result.total).toBe(1)
      expect(result.products).toHaveLength(1)
      expect(result.products[0].sku).toBe('SKU-001')
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('inclut le filtre de recherche quand search est fourni', async () => {
      mockQueryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }])

      await stockService.listProducts({ page: 1, limit: 10, search: 'test', tenantSlug: TENANT })

      // Le 1er appel doit contenir ILIKE pour la recherche
      const firstCall = mockQueryRawUnsafe.mock.calls[0][0] as string
      expect(firstCall).toContain('ILIKE')
    })
  })

  // ──────────────────────────────────────────────
  // getProduct
  // ──────────────────────────────────────────────
  describe('getProduct', () => {
    it('retourne le produit quand il existe', async () => {
      const fake = {
        id: 'uuid-1',
        sku: 'SKU-001',
        name: 'Produit A',
        description: null,
        category_id: null,
        unit: 'unité',
        min_stock: 5,
        current_stock: 20,
        price: 100,
        expiry_date: null,
        batch_number: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }

      mockQueryRawUnsafe.mockResolvedValueOnce([fake])

      const result = await stockService.getProduct('uuid-1', TENANT)

      expect(result.id).toBe('uuid-1')
      expect(result.name).toBe('Produit A')
    })

    it('lève NotFoundError si le produit n\'existe pas', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([])

      await expect(stockService.getProduct('uuid-999', TENANT)).rejects.toThrow(NotFoundError)
    })
  })

  // ──────────────────────────────────────────────
  // createProduct
  // ──────────────────────────────────────────────
  describe('createProduct', () => {
    it('crée un produit et retourne le résultat', async () => {
      const fakeProduct = {
        id: 'uuid-new',
        sku: 'SKU-NEW',
        name: 'Nouveau Produit',
        current_stock: 10,
        price: 50,
      }

      mockQueryRawUnsafe.mockResolvedValueOnce([fakeProduct])

      const result = await stockService.createProduct(
        { sku: 'SKU-NEW', name: 'Nouveau Produit', currentStock: 10, price: 50 },
        TENANT
      )

      expect(result.id).toBe('uuid-new')
      const query = mockQueryRawUnsafe.mock.calls[0][0] as string
      expect(query).toContain(`"${SCHEMA}".products`)
      expect(query).toContain('INSERT')
    })

    it('crée aussi une entrée product_warehouses si warehouseId fourni', async () => {
      const fakeProduct = { id: 'uuid-new', sku: 'SKU-NEW', name: 'Produit' }

      mockQueryRawUnsafe
        .mockResolvedValueOnce([fakeProduct])  // INSERT products
        .mockResolvedValueOnce([])             // INSERT product_warehouses

      await stockService.createProduct(
        { sku: 'SKU-NEW', name: 'Produit', warehouseId: 'wh-1', currentStock: 5 },
        TENANT
      )

      expect(mockQueryRawUnsafe).toHaveBeenCalledTimes(2)
      const secondQuery = mockQueryRawUnsafe.mock.calls[1][0] as string
      expect(secondQuery).toContain('product_warehouses')
    })
  })

  // ──────────────────────────────────────────────
  // deleteProduct
  // ──────────────────────────────────────────────
  describe('deleteProduct', () => {
    it('marque le produit comme supprimé (soft delete)', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([{ id: 'uuid-1' }])

      const result = await stockService.deleteProduct('uuid-1', TENANT)

      expect(result.success).toBe(true)
      const query = mockQueryRawUnsafe.mock.calls[0][0] as string
      expect(query).toContain('is_deleted = true')
    })

    it('lève NotFoundError si le produit n\'existe pas', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([])

      await expect(stockService.deleteProduct('uuid-999', TENANT)).rejects.toThrow(NotFoundError)
    })
  })

  // ──────────────────────────────────────────────
  // updateProduct
  // ──────────────────────────────────────────────
  describe('updateProduct', () => {
    it('met à jour le produit et retourne le résultat', async () => {
      const fakeUpdated = { id: 'uuid-1', sku: 'SKU-001', name: 'Produit Modifié', current_stock: 15 }

      mockQueryRawUnsafe.mockResolvedValueOnce([fakeUpdated])

      const result = await stockService.updateProduct('uuid-1', { name: 'Produit Modifié', currentStock: 15 }, TENANT)

      expect(result.name).toBe('Produit Modifié')
      const query = mockQueryRawUnsafe.mock.calls[0][0] as string
      expect(query).toContain('UPDATE')
      expect(query).toContain(`"${SCHEMA}".products`)
    })

    it('sanitise les champs date et uuid vides en null', async () => {
      const fakeUpdated = { id: 'uuid-1', name: 'Produit', category_id: null, expiry_date: null }

      mockQueryRawUnsafe.mockResolvedValueOnce([fakeUpdated])

      await stockService.updateProduct('uuid-1', { categoryId: '', expiryDate: '' }, TENANT)

      // Les valeurs null doivent être passées à la requête
      const callArgs = mockQueryRawUnsafe.mock.calls[0]
      expect(callArgs).toContain(null)
    })

    it('lève NotFoundError si le produit n\'existe pas', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([])

      await expect(stockService.updateProduct('uuid-999', { name: 'X' }, TENANT)).rejects.toThrow(NotFoundError)
    })
  })

  // ──────────────────────────────────────────────
  // listMovements
  // ──────────────────────────────────────────────
  describe('listMovements', () => {
    const fakeMovements = [
      {
        id: 'mv-1',
        product_id: 'prod-1',
        product_name: 'Produit A',
        product_sku: 'SKU-001',
        warehouse_id: 'wh-1',
        warehouse_name: 'Entrepôt A',
        type: 'IN',
        quantity: 10,
        reference: 'REF-001',
        note: null,
        created_by: 'user-1',
        created_at: new Date(),
      },
    ]

    it('retourne une liste paginée de mouvements', async () => {
      mockQueryRawUnsafe
        .mockResolvedValueOnce(fakeMovements)
        .mockResolvedValueOnce([{ total: '1' }])

      const result = await stockService.listMovements({ page: 1, limit: 10, tenantSlug: TENANT })

      expect(result.total).toBe(1)
      expect(result.movements).toHaveLength(1)
      expect(result.movements[0].type).toBe('IN')
      expect(result.movements[0].product.name).toBe('Produit A')
    })

    it('filtre par productId quand fourni', async () => {
      mockQueryRawUnsafe
        .mockResolvedValueOnce(fakeMovements)
        .mockResolvedValueOnce([{ total: '1' }])

      await stockService.listMovements({ page: 1, limit: 10, tenantSlug: TENANT, productId: 'prod-1' })

      const query = mockQueryRawUnsafe.mock.calls[0][0] as string
      expect(query).toContain('product_id = $3::uuid')
    })

    it('retourne un warehouse null si pas d\'entrepôt associé', async () => {
      const movementWithoutWarehouse = [{ ...fakeMovements[0], warehouse_id: null, warehouse_name: null }]

      mockQueryRawUnsafe
        .mockResolvedValueOnce(movementWithoutWarehouse)
        .mockResolvedValueOnce([{ total: '1' }])

      const result = await stockService.listMovements({ page: 1, limit: 10, tenantSlug: TENANT })

      expect(result.movements[0].warehouse).toBeNull()
    })
  })
})
