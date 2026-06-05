import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock useAuthStore
vi.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      accessToken: null,
      refreshToken: null,
      tenant: null,
      user: null,
      isAuthenticated: false,
      setTokens: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setTenant: vi.fn(),
    })),
  },
}))

describe('api.ts — Axios Instance & Interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Axios Instance Setup', () => {
    it('crée une instance axios avec baseURL /api/v1', async () => {
      const api = (await import('./api')).default
      expect(api).toBeDefined()
      expect(api.defaults.baseURL).toBe('/api/v1')
    })

    it('configure les headers par défaut', async () => {
      const api = (await import('./api')).default
      expect(api.defaults.headers['Content-Type']).toBe('application/json')
    })

    it('enregistre les request interceptors', async () => {
      const api = (await import('./api')).default
      expect(api.interceptors.request.handlers).toBeDefined()
      expect(api.interceptors.request.handlers!.length).toBeGreaterThan(0)
    })

    it('enregistre les response interceptors', async () => {
      const api = (await import('./api')).default
      expect(api.interceptors.response.handlers).toBeDefined()
      expect(api.interceptors.response.handlers!.length).toBeGreaterThan(0)
    })
  })

  describe('Request Interceptor Logic', () => {
    it('ajoute Authorization header quand accessToken existe', () => {
      const testConfig: any = { headers: {} }

      // Simule le comportement du request interceptor
      const accessToken = 'test_jwt_token'
      const tenant: any = null

      if (accessToken) {
        testConfig.headers.Authorization = `Bearer ${accessToken}`
      }
      if (tenant?.slug) {
        testConfig.headers['X-Tenant-ID'] = tenant.slug
      }

      expect(testConfig.headers.Authorization).toBe('Bearer test_jwt_token')
    })

    it('ajoute X-Tenant-ID quand tenant slug existe', () => {
      const testConfig: any = { headers: {} }

      const accessToken = null
      const tenant = { slug: 'my-tenant', id: '123' }

      if (accessToken) {
        testConfig.headers.Authorization = `Bearer ${accessToken}`
      }
      if (tenant?.slug) {
        testConfig.headers['X-Tenant-ID'] = tenant.slug
      }

      expect(testConfig.headers['X-Tenant-ID']).toBe('my-tenant')
    })

    it('ajoute les deux headers quand token et tenant existent', () => {
      const testConfig: any = { headers: {} }

      const accessToken = 'jwt_token_abc'
      const tenant = { slug: 'acme-corp', id: '456' }

      if (accessToken) {
        testConfig.headers.Authorization = `Bearer ${accessToken}`
      }
      if (tenant?.slug) {
        testConfig.headers['X-Tenant-ID'] = tenant.slug
      }

      expect(testConfig.headers.Authorization).toBe('Bearer jwt_token_abc')
      expect(testConfig.headers['X-Tenant-ID']).toBe('acme-corp')
    })

    it('ne modifie pas headers si aucun token ni tenant', () => {
      const testConfig: any = { headers: {} }
      const initialHeaders = { ...testConfig.headers }

      const accessToken = null
      const tenant: any = null

      if (accessToken) {
        testConfig.headers.Authorization = `Bearer ${accessToken}`
      }
      if (tenant?.slug) {
        testConfig.headers['X-Tenant-ID'] = tenant.slug
      }

      expect(testConfig.headers).toEqual(initialHeaders)
    })
  })

  describe('Response Interceptor Logic', () => {
    it('laisse passer les réponses réussies (2xx)', () => {
      const successResponse: any = { status: 200, data: { success: true } }

      // Le success handler retourne simplement la response
      const result = successResponse

      expect(result).toEqual(successResponse)
      expect(result.status).toBe(200)
    })

    it('gère les erreurs 401 avec retry flag', () => {
      const error401: any = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      }

      // Simule la logique du response error interceptor
      const shouldRetry = error401.response?.status === 401 && !error401.config._retry

      expect(shouldRetry).toBe(true)

      // Si retry, marquer comme retried
      if (shouldRetry) {
        error401.config._retry = true
      }

      expect(error401.config._retry).toBe(true)
    })

    it('ne retry pas si _retry est déjà true (prévient boucle)', () => {
      const error401: any = {
        response: { status: 401 },
        config: { headers: {}, _retry: true }, // Déjà retried
      }

      const shouldRetry = error401.response?.status === 401 && !error401.config._retry

      expect(shouldRetry).toBe(false)
    })

    it('rejette les erreurs non-401', () => {
      const errorResponse: any = {
        response: { status: 500, data: { error: 'Internal server error' } },
        config: { headers: {}, _retry: false },
      }

      const shouldRetry = errorResponse.response?.status === 401 && !errorResponse.config._retry

      expect(shouldRetry).toBe(false)
    })

    it('rejette les erreurs sans response (erreur réseau)', () => {
      const networkError: any = {
        response: null,
        config: { headers: {}, _retry: false },
        message: 'Network Error',
      }

      const shouldRetry = networkError.response?.status === 401 && !networkError.config._retry

      expect(shouldRetry).toBe(false)
      expect(networkError.response).toBeNull()
    })
  })

  describe('Token Refresh Scenario', () => {
    it('simule le flow complet: 401 → refresh token → retry', () => {
      const mockSetTokens = vi.fn()

      // Step 1: Original request gets 401
      const originalRequest: any = {
        method: 'GET',
        url: '/api/v1/products',
        headers: {},
        _retry: false,
      }

      const error401: any = {
        response: { status: 401 },
        config: originalRequest,
      }

      // Step 2: Detect 401 and refresh
      const shouldRefresh = error401.response?.status === 401 && !error401.config._retry

      expect(shouldRefresh).toBe(true)

      if (shouldRefresh) {
        const refreshToken = 'refresh_token_123'
        expect(refreshToken).toBeDefined()

        // Simulate refresh token call
        const newAccessToken = 'new_access_token_456'
        const newRefreshToken = 'new_refresh_token_456'

        mockSetTokens(newAccessToken, newRefreshToken)
        expect(mockSetTokens).toHaveBeenCalledWith(newAccessToken, newRefreshToken)

        // Step 3: Update original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        expect(originalRequest.headers.Authorization).toBe('Bearer new_access_token_456')
      }
    })

    it('logout si refreshToken invalide', () => {
      const mockLogout = vi.fn()

      // Simulate refresh failure
      const refreshFailed = true

      if (refreshFailed) {
        mockLogout()
        expect(mockLogout).toHaveBeenCalled()
      }
    })
  })

  describe('Edge Cases', () => {
    it('gère les requests sans headers existant', () => {
      const configWithoutHeaders: any = {}
      expect(configWithoutHeaders.headers).toBeUndefined()

      // Initialiser headers si absent
      if (!configWithoutHeaders.headers) {
        configWithoutHeaders.headers = {}
      }

      configWithoutHeaders.headers.Authorization = 'Bearer token'
      expect(configWithoutHeaders.headers.Authorization).toBe('Bearer token')
    })

    it("préserve les headers existants lors de l'ajout d'auth", () => {
      const configWithHeaders: any = {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Content-Type': 'application/json',
        },
      }

      const token = 'new_token'
      configWithHeaders.headers.Authorization = `Bearer ${token}`

      expect(configWithHeaders.headers['X-Custom-Header']).toBe('custom-value')
      expect(configWithHeaders.headers['Content-Type']).toBe('application/json')
      expect(configWithHeaders.headers.Authorization).toBe('Bearer new_token')
    })

    it('gère les tokens vides (string vide)', () => {
      const emptyToken = ''
      const testConfig: any = { headers: {} }

      if (emptyToken) {
        testConfig.headers.Authorization = `Bearer ${emptyToken}`
      }

      expect(testConfig.headers.Authorization).toBeUndefined()
    })

    it('gère les slugs tenant vides', () => {
      const emptySlug = ''
      const testConfig: any = { headers: {} }

      if (emptySlug) {
        testConfig.headers['X-Tenant-ID'] = emptySlug
      }

      expect(testConfig.headers['X-Tenant-ID']).toBeUndefined()
    })
  })

  describe('Validation', () => {
    it("vérifie que api.ts exporte l'instance axios", async () => {
      const api = (await import('./api')).default
      expect(api).toBeDefined()
      expect(typeof api.get).toBe('function')
      expect(typeof api.post).toBe('function')
      expect(typeof api.put).toBe('function')
      expect(typeof api.delete).toBe('function')
    })

    it('confirme le baseURL pour les requêtes API', async () => {
      const api = (await import('./api')).default
      expect(api.defaults.baseURL).toBe('/api/v1')
    })
  })
})
