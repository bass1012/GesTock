import { ZodError } from 'zod'

// Mock the dependencies so imports don't fail or try to connect to the db
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  })),
}))

jest.mock('../services/cache.service', () => ({
  cacheService: {
    invalidateTags: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../services/notification.service', () => ({
  emailService: {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  },
}))

// Import AFTER mocks are set up
import { stockService } from '../services/stock.service'
import { warehouseService } from '../services/warehouse.service'
import { clientsService } from '../services/clients.service'
import { salesService } from '../services/sales.service'
import { orderService } from '../services/order.service'
import { supplierReturnService } from '../services/supplierReturn.service'
import { supplierService } from '../services/supplier.service'
import { userService } from '../services/user.service'

describe('Service Layer Zod Validations', () => {
  const TENANT = 'test-tenant'

  describe('stockService', () => {
    it('should throw ZodError on invalid product creation', async () => {
      await expect(stockService.createProduct({}, TENANT)).rejects.toThrow(ZodError)
      await expect(stockService.createProduct({ sku: '', name: 'Test' }, TENANT)).rejects.toThrow(ZodError)
    })

    it('should throw ZodError on invalid stock movement creation', async () => {
      await expect(stockService.createMovement({}, TENANT)).rejects.toThrow(ZodError)
      await expect(stockService.createMovement({ productId: 'p1', type: 'INVALID' }, TENANT)).rejects.toThrow(ZodError)
    })

    it('should throw ZodError on invalid transfer creation', async () => {
      await expect(stockService.createTransfer({} as any, TENANT)).rejects.toThrow(ZodError)
    })
  })

  describe('warehouseService', () => {
    it('should throw ZodError on invalid warehouse creation', async () => {
      await expect(warehouseService.createWarehouse({}, TENANT)).rejects.toThrow(ZodError)
    })
  })

  describe('clientsService', () => {
    it('should throw ZodError on invalid client creation', async () => {
      await expect(clientsService.createClient({}, TENANT)).rejects.toThrow(ZodError)
    })
  })

  describe('salesService', () => {
    it('should throw ZodError on invalid sale creation', async () => {
      await expect(salesService.createSale({}, 'user-1', TENANT)).rejects.toThrow(ZodError)
    })
  })

  describe('orderService', () => {
    it('should throw ZodError on invalid purchase order creation', async () => {
      await expect(orderService.create({}, TENANT)).rejects.toThrow(ZodError)
    })
  })

  describe('supplierReturnService', () => {
    it('should throw ZodError on invalid supplier return creation', async () => {
      await expect(supplierReturnService.create({}, TENANT)).rejects.toThrow(ZodError)
    })
  })

  describe('supplierService', () => {
    it('should throw ZodError on invalid supplier creation', async () => {
      await expect(supplierService.create({}, TENANT)).rejects.toThrow(ZodError)
    })

    it('should throw ZodError on invalid supplier update', async () => {
      await expect(supplierService.update('id', {}, TENANT)).rejects.toThrow(ZodError)
    })
  })

  describe('userService', () => {
    it('should throw ZodError on invalid user invitation', async () => {
      await expect(userService.inviteUser({}, 'tenant-1', 'admin')).rejects.toThrow(ZodError)
    })

    it('should throw ZodError on invalid user role update', async () => {
      await expect(userService.updateUserRole('u-1', 'invalid-role', 't-1', 'admin-1', 'admin')).rejects.toThrow(ZodError)
    })
  })
})
