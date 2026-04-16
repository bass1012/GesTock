import rateLimit from 'express-rate-limit'

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 10000 : 100,
    message: {
        status: 429,
        message: 'Trop de requêtes, veuillez réessayer plus tard.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 100 : 5,
    message: {
        status: 429,
        message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})
