import jwt, { SignOptions } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-change-me' : (() => { throw new Error('JWT_SECRET environment variable is required') })())
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-refresh-secret-change-me' : (() => { throw new Error('JWT_REFRESH_SECRET environment variable is required') })())
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m'
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'

interface TokenPayload {
    userId: string
    tenantId: string
    role: string
    sessionId?: string
}

export const generateAccessToken = (payload: TokenPayload): string => {
    const options: SignOptions = { expiresIn: ACCESS_EXPIRY as any }
    return jwt.sign(payload, JWT_SECRET, options)
}

export const generateRefreshToken = (payload: TokenPayload): string => {
    const options: SignOptions = { expiresIn: REFRESH_EXPIRY as any }
    return jwt.sign(payload, JWT_REFRESH_SECRET, options)
}

export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
}

export const verifyRefreshToken = (token: string): TokenPayload => {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload
}
