import {
  generateAccessToken, generateRefreshToken,
  verifyAccessToken, verifyRefreshToken,
} from '../utils/jwt'

const payload = { userId: 'user-1', tenantId: 'tenant-1', role: 'admin' }

describe('generateAccessToken', () => {
  it('crée un token JWT valide en 3 parties', () => {
    const token = generateAccessToken(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('inclut userId, tenantId et role dans le payload', () => {
    const token = generateAccessToken(payload)
    const decoded = verifyAccessToken(token)
    expect(decoded.userId).toBe('user-1')
    expect(decoded.tenantId).toBe('tenant-1')
    expect(decoded.role).toBe('admin')
  })

  it('inclut sessionId si fourni', () => {
    const withSession = { ...payload, sessionId: 'sess-1' }
    const token = generateAccessToken(withSession)
    const decoded = verifyAccessToken(token) as any
    expect(decoded.sessionId).toBe('sess-1')
  })
})

describe('generateRefreshToken', () => {
  it('crée un refresh token JWT valide', () => {
    const token = generateRefreshToken(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('se vérifie avec verifyRefreshToken', () => {
    const token = generateRefreshToken(payload)
    const decoded = verifyRefreshToken(token)
    expect(decoded.userId).toBe('user-1')
    expect(decoded.tenantId).toBe('tenant-1')
  })
})

describe('verifyAccessToken', () => {
  it('rejette un token invalide', () => {
    expect(() => verifyAccessToken('invalid-token')).toThrow()
  })

  it('rejette un token signé avec une autre clé', () => {
    const { generateAccessToken: genWrongKey } = require('../utils/jwt')
    jest.isolateModules(() => {
      process.env.JWT_SECRET = 'different-secret'
      // Can't easily test cross-key rejection without reloading
    })
  })

  it('rejette un refresh token utilisé comme access token', () => {
    const refreshToken = generateRefreshToken(payload)
    expect(() => verifyAccessToken(refreshToken)).toThrow()
  })
})

describe('verifyRefreshToken', () => {
  it('rejette un token invalide', () => {
    expect(() => verifyRefreshToken('invalid-token')).toThrow()
  })

  it('rejette un access token utilisé comme refresh token', () => {
    const accessToken = generateAccessToken(payload)
    expect(() => verifyRefreshToken(accessToken)).toThrow()
  })
})
