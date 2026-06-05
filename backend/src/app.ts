import 'dotenv/config'
// v1.2.1 - Force reload for superadmin routes
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import swaggerUi from 'swagger-ui-express'
import authRoutes from './routes/auth.routes'
import productsRoutes from './routes/products.routes'
import stockMovementsRoutes from './routes/stockMovements.routes'
import alertsRoutes from './routes/alerts.routes'
import suppliersRoutes from './routes/suppliers.routes'
import ordersRoutes from './routes/orders.routes'
import reportsRoutes from './routes/reports.routes'
import billingRoutes from './routes/billing.routes'
import usersRoutes from './routes/users.routes'
import superadminRoutes from './routes/superadmin.routes'
import warehouseRouter from './routes/warehouses.routes'
import apiKeyKeysRoutes from './routes/api-keys.routes'
import transfersRoutes from './routes/transfers.routes'
import lotsRoutes from './routes/lots.routes'
import supplierReturnsRoutes from './routes/supplierReturns.routes'
import loyaltyRoutes from './routes/loyalty.routes'
import clientsRoutes from './routes/clients.routes'
import salesRoutes from './routes/sales.routes'
import { apiKeyMiddleware } from './middleware/apiKey.middleware'
import { startStockAlertJob } from './jobs/stockAlert.job'
import { errorHandler } from './middleware/errorHandler'
import { apiLimiter } from './middleware/rateLimiter'
import { connectRedis } from './config/redis'
import { swaggerSpec } from './config/swagger'

const app = express()
const PORT = process.env.PORT || 3001

// Trust Nginx reverse proxy (needed for rate-limiter X-Forwarded-For)
app.set('trust proxy', 1)

// Global middleware
app.use(helmet())
app.use(compression())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))
app.use('/api', apiLimiter)
app.use(apiKeyMiddleware) // Authentifier via clé API si le header X-API-Key est présent

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Swagger UI — uniquement hors production ou si explicitement activé
if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'GesStock API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
      },
    }),
  )
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })
}

// API v1 routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/products', productsRoutes)
app.use('/api/v1/stock/movements', stockMovementsRoutes)
app.use('/api/v1/alerts', alertsRoutes)

app.use('/api/v1/suppliers', suppliersRoutes)
app.use('/api/v1/orders', ordersRoutes)
app.use('/api/v1/reports', reportsRoutes)
app.use('/api/v1/billing', billingRoutes)
app.use('/api/v1/users', usersRoutes)
app.use('/api/v1/superadmin', superadminRoutes)
app.use('/api/v1/clients', clientsRoutes)
app.use('/api/v1/sales', salesRoutes)
app.use('/api/v1/warehouses', warehouseRouter)
app.use('/api/v1/api-keys', apiKeyKeysRoutes)
app.use('/api/v1/stock/transfers', transfersRoutes)
app.use('/api/v1/stock/lots', lotsRoutes)
app.use('/api/v1/suppliers/returns', supplierReturnsRoutes)
app.use('/api/v1/loyalty', loyaltyRoutes)

// Error handler (must be last)
app.use(errorHandler)

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`🚀 GesStock API running on http://localhost:${PORT}`)
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
    await connectRedis()
    startStockAlertJob()
  })
}

export default app
