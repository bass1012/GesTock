import rateLimit from 'express-rate-limit'

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
const authWindowMinutes = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES || 5)
const authWindowMs = authWindowMinutes * 60 * 1000
const authMaxAttempts = Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || 10)

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 1000,
  message: {
    status: 429,
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: isDev ? 100 : authMaxAttempts,
  message: {
    status: 429,
    message: `Trop de tentatives de connexion, veuillez reessayer dans ${authWindowMinutes} minutes.`,
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
})
