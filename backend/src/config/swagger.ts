import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GesStock SaaS API',
      version: '1.0.0',
      description:
        'API REST multi-tenant pour la gestion de stock, ventes et facturation.\n\n' +
        '**Authentification** : Bearer JWT (header `Authorization: Bearer <token>`)\n\n' +
        '**Tenant** : Identifié automatiquement depuis le token JWT (`tenantId`).',
      contact: {
        name: 'GesStock Support',
        email: 'support@gestock.allsite.cloud',
      },
    },
    servers: [{ url: '/api/v1', description: 'Production / Local' }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: "Message d'erreur" },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 150 },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'lecteur'] },
            mustChangePassword: { type: 'boolean' },
          },
        },
        Tenant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            slug: { type: 'string', example: 'ma-boutique' },
            name: { type: 'string', example: 'Ma Boutique SARL' },
            plan: { type: 'string', enum: ['starter', 'pro', 'enterprise'] },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
            tenant: { $ref: '#/components/schemas/Tenant' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sku: { type: 'string', example: 'SKU-001' },
            name: { type: 'string', example: 'Farine de blé 50kg' },
            description: { type: 'string', nullable: true },
            categoryId: { type: 'string', format: 'uuid', nullable: true },
            unit: { type: 'string', example: 'sac' },
            minStock: { type: 'integer', example: 10 },
            currentStock: { type: 'integer', example: 45 },
            price: { type: 'number', format: 'float', example: 18500 },
            expiryDate: { type: 'string', format: 'date', nullable: true },
            batchNumber: { type: 'string', nullable: true },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        StockMovement: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid' },
            product: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                sku: { type: 'string' },
              },
            },
            warehouseId: { type: 'string', format: 'uuid', nullable: true },
            type: { type: 'string', enum: ['IN', 'OUT', 'ADJUSTMENT'] },
            quantity: { type: 'integer', example: 20 },
            reference: { type: 'string', example: 'BL-2024-001' },
            note: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Sale: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reference: { type: 'string', example: 'FAC-240001' },
            status: { type: 'string', enum: ['DRAFT', 'COMPLETED', 'CANCELLED'] },
            totalAmount: { type: 'number', example: 55500 },
            taxRate: { type: 'number', example: 18 },
            taxAmount: { type: 'number', example: 8496 },
            clientId: { type: 'string', format: 'uuid', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SaleItem: {
          type: 'object',
          properties: {
            productId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', example: 3 },
          },
        },
        Supplier: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Fournisseur Sahel SARL' },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            address: { type: 'string', nullable: true },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reference: { type: 'string', example: 'BC-240001' },
            supplierId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'RECEIVED', 'CANCELLED'] },
            totalAmount: { type: 'number', example: 125000 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Warehouse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Dépôt Principal' },
            location: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
          },
        },
        Alert: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            sku: { type: 'string' },
            currentStock: { type: 'integer' },
            minStock: { type: 'integer' },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalProducts: { type: 'integer' },
            lowStockCount: { type: 'integer' },
            totalMovements: { type: 'integer' },
            totalSalesThisMonth: { type: 'number' },
            recentMovements: {
              type: 'array',
              items: { $ref: '#/components/schemas/StockMovement' },
            },
            topProducts: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
