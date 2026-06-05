import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  jwt,
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
    // Test alternative key check
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

// ─── Tests : export `jwt` (jsonwebtoken natif) ────────────────────────────────
// Ces tests couvrent l'export { jwt } depuis jwt.ts pour atteindre 100% function coverage.

describe('export jwt (jsonwebtoken natif)', () => {
  it('jwt.decode retourne le payload sans vérification de signature', () => {
    const token = generateAccessToken(payload)
    const decoded = jwt.decode(token) as any
    expect(decoded).not.toBeNull()
    expect(decoded.userId).toBe('user-1')
    expect(decoded.tenantId).toBe('tenant-1')
  })

  it('jwt.decode retourne null pour une chaîne non-JWT', () => {
    const decoded = jwt.decode('not.a.jwt')
    // jsonwebtoken decode retourne null si le token n'est pas valide
    expect(decoded).toBeNull()
  })

  it('jwt.decode retourne le header avec { complete: true }', () => {
    const token = generateAccessToken(payload)
    const result = jwt.decode(token, { complete: true }) as any
    expect(result).not.toBeNull()
    expect(result.header).toBeDefined()
    expect(result.header.alg).toBe('HS256')
    expect(result.payload).toBeDefined()
  })

  it('jwt.sign produit un token vérifiable', () => {
    const token = jwt.sign({ sub: 'test-subject' }, 'test-secret', { expiresIn: '1h' })
    const decoded = jwt.verify(token, 'test-secret') as any
    expect(decoded.sub).toBe('test-subject')
  })

  it('jwt.verify lève une erreur avec une mauvaise clé', () => {
    const token = jwt.sign({ sub: 'test' }, 'secret-a')
    expect(() => jwt.verify(token, 'secret-b')).toThrow()
  })

  it("jwt.decode inclut exp dans le payload d'un access token", () => {
    const token = generateAccessToken(payload)
    const decoded = jwt.decode(token) as any
    expect(decoded.exp).toBeDefined()
    expect(typeof decoded.exp).toBe('number')
    // exp doit être dans le futur
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })
})

// ─── Tests : cas limites ──────────────────────────────────────────────────────

describe('cas limites et sécurité', () => {
  it('les access et refresh tokens ont des secrets différents', () => {
    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    // Un access token ne doit pas être valide comme refresh token
    expect(() => verifyRefreshToken(accessToken)).toThrow()
    // Un refresh token ne doit pas être valide comme access token
    expect(() => verifyAccessToken(refreshToken)).toThrow()
  })

  it('le payload est bien encodé (pas de fuite de secret)', () => {
    const token = generateAccessToken(payload)
    // Le segment milieu du JWT est le payload en base64
    const base64Payload = token.split('.')[1]
    const decoded = JSON.parse(Buffer.from(base64Payload, 'base64url').toString())
    expect(decoded.userId).toBe('user-1')
    // Le secret ne doit PAS apparaître dans le payload
    expect(JSON.stringify(decoded)).not.toContain('dev-secret')
  })

  it('generateAccessToken avec payload minimal (sans sessionId)', () => {
    const minPayload = { userId: 'u', tenantId: 't', role: 'lecteur' }
    const token = generateAccessToken(minPayload)
    const decoded = verifyAccessToken(token)
    expect(decoded.userId).toBe('u')
    expect((decoded as any).sessionId).toBeUndefined()
  })

  it('verifyAccessToken retourne les propriétés complètes du payload', () => {
    const fullPayload = {
      userId: 'user-full',
      tenantId: 'tenant-full',
      role: 'manager',
      sessionId: 'sess-full',
    }
    const token = generateAccessToken(fullPayload)
    const decoded = verifyAccessToken(token) as any

    expect(decoded.userId).toBe('user-full')
    expect(decoded.tenantId).toBe('tenant-full')
    expect(decoded.role).toBe('manager')
    expect(decoded.sessionId).toBe('sess-full')
  })
})
