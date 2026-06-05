// --- Mocks ---
const mockQueryRawUnsafe = jest.fn()

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRawUnsafe: mockQueryRawUnsafe,
  })),
}))

// Import AFTER mocks
import { salesService } from '../services/sales.service'

const TENANT = 'test'

describe('SalesService', () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset()
  })

  // ──────────────────────────────────────────────
  // getAllSales
  // ──────────────────────────────────────────────
  describe('getAllSales', () => {
    it('retourne une liste de ventes', async () => {
      const fakeSales = [
        {
          id: 'sale-1',
          client_id: null,
          status: 'COMPLETED',
          total_amount: 200,
          tax_rate: 0,
          tax_amount: 0,
          reference: 'FAC-001',
          created_at: new Date(),
          updated_at: new Date(),
          _count_items: '2',
        },
      ]

      mockQueryRawUnsafe.mockResolvedValueOnce(fakeSales)

      const result = await salesService.getAllSales(TENANT)

      expect(result).toHaveLength(1)
      expect(result[0].reference).toBe('FAC-001')
      expect(result[0].status).toBe('COMPLETED')
      expect(result[0]._count.items).toBe(2)
    })

    it('retourne un tableau vide si aucune vente', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([])

      const result = await salesService.getAllSales(TENANT)

      expect(result).toEqual([])
    })
  })

  // ──────────────────────────────────────────────
  // getSaleById
  // ──────────────────────────────────────────────
  describe('getSaleById', () => {
    it('retourne la vente avec ses items', async () => {
      const fakeSale = {
        id: 'sale-1',
        client_id: null,
        status: 'COMPLETED',
        total_amount: 200,
        reference: 'FAC-001',
        created_at: new Date(),
      }
      const fakeItems = [{ quantity: 2, unit_price: 100, product_name: 'Produit A' }]

      mockQueryRawUnsafe.mockResolvedValueOnce([fakeSale]).mockResolvedValueOnce(fakeItems)

      const result = await salesService.getSaleById('sale-1', TENANT)

      expect(result).not.toBeNull()
      expect(result!.reference).toBe('FAC-001')
      expect(result!.items).toHaveLength(1)
      expect(result!.items[0].product.name).toBe('Produit A')
    })

    it("retourne null si la vente n'existe pas", async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([])

      const result = await salesService.getSaleById('sale-999', TENANT)

      expect(result).toBeNull()
    })
  })

  // ──────────────────────────────────────────────
  // createSale — Vente (FAC)
  // ──────────────────────────────────────────────
  describe('createSale — FAC (vente complète)', () => {
    const userId = 'user-1'
    const saleData = {
      type: 'FAC',
      clientId: null,
      taxRate: 0,
      items: [{ productId: 'prod-1', quantity: 2 }],
    }

    it('crée une vente et déduit le stock', async () => {
      const fakeProduct = { id: 'prod-1', name: 'Produit A', price: 100, current_stock: 10 }
      const fakeSale = {
        id: 'sale-new',
        reference: 'FAC-123',
        status: 'COMPLETED',
        total_amount: 200,
      }

      mockQueryRawUnsafe
        .mockResolvedValueOnce([fakeProduct]) // SELECT product pour item[0]
        .mockResolvedValueOnce([fakeSale]) // INSERT INTO sales
        .mockResolvedValueOnce([]) // INSERT INTO sale_items
        .mockResolvedValueOnce([]) // UPDATE products (stock deduction)
        .mockResolvedValueOnce([]) // INSERT INTO stock_movements

      const result = await salesService.createSale(saleData, userId, TENANT)

      expect(result.id).toBe('sale-new')
      expect(result.status).toBe('COMPLETED')

      // Vérifie que la déduction de stock a été appelée
      const updateCall = mockQueryRawUnsafe.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('current_stock = current_stock -'),
      )
      expect(updateCall).toBeDefined()
    })

    it('lève une erreur si le stock est insuffisant', async () => {
      const lowStockProduct = { id: 'prod-1', name: 'Produit A', price: 100, current_stock: 1 }

      mockQueryRawUnsafe.mockResolvedValueOnce([lowStockProduct])

      await expect(
        salesService.createSale(
          { ...saleData, items: [{ productId: 'prod-1', quantity: 5 }] },
          userId,
          TENANT,
        ),
      ).rejects.toThrow('Stock insuffisant')
    })

    it("lève une erreur si le produit n'existe pas", async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([]) // produit introuvable

      await expect(salesService.createSale(saleData, userId, TENANT)).rejects.toThrow(
        'Produit introuvable',
      )
    })

    it('applique la TVA correctement', async () => {
      const fakeProduct = { id: 'prod-1', name: 'Produit A', price: 100, current_stock: 10 }
      const fakeSale = {
        id: 'sale-new',
        reference: 'FAC-124',
        status: 'COMPLETED',
        total_amount: 220,
      }

      mockQueryRawUnsafe
        .mockResolvedValueOnce([fakeProduct])
        .mockResolvedValueOnce([fakeSale])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      await salesService.createSale({ ...saleData, taxRate: 20 }, userId, TENANT)

      // Vérifier que l'INSERT INTO sales utilise le bon montant TTC et TVA
      const insertSaleCall = mockQueryRawUnsafe.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('INSERT INTO') &&
          call[0].includes('sales'),
      )
      expect(insertSaleCall).toBeDefined()
      // taxAmount = 100*2 * 20/100 = 40
      const callArgs = insertSaleCall!
      expect(callArgs).toContain(40) // tax_amount
      expect(callArgs).toContain(240) // total_amount (200 + 40)
    })
  })

  // ──────────────────────────────────────────────
  // createSale — Devis (DEV)
  // ──────────────────────────────────────────────
  describe('createSale — DEV (devis)', () => {
    it('crée un devis sans déduire le stock', async () => {
      const fakeProduct = { id: 'prod-1', name: 'Produit A', price: 100, current_stock: 0 }
      const fakeSale = { id: 'sale-dev', reference: 'DEV-001', status: 'DRAFT', total_amount: 100 }

      mockQueryRawUnsafe
        .mockResolvedValueOnce([fakeProduct]) // SELECT product
        .mockResolvedValueOnce([fakeSale]) // INSERT INTO sales
        .mockResolvedValueOnce([]) // INSERT INTO sale_items

      const result = await salesService.createSale(
        { type: 'DEV', items: [{ productId: 'prod-1', quantity: 1 }] },
        'user-1',
        TENANT,
      )

      expect(result.status).toBe('DRAFT')

      // Vérifier qu'aucune déduction de stock n'a été faite
      const stockUpdate = mockQueryRawUnsafe.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('current_stock = current_stock -'),
      )
      expect(stockUpdate).toBeUndefined()
    })
  })
})
