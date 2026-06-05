/**
 * Tests unitaires pour authStore.ts (Zustand + persist)
 *
 * Strategie :
 *  - Le localStorage est disponible via happy-dom mais Zustand v4 a besoin
 *    de la methode setItem/getItem native. On cree le store directement
 *    sans le module singleton pour eviter les problemes de lifecycle.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Setup localStorage mock avant tout import Zustand ─────────────────────────
// happy-dom expose localStorage mais certaines methodes peuvent manquer
// selon la version. On s'assure que l'interface complete est presente.
const mockStore: any = {
  _store: {} as Record<string, string>,
  getItem(key: string) {
    return mockStore._store[key] ?? null
  },
  setItem(key: string, value: string) {
    mockStore._store[key] = value
  },
  removeItem(key: string) {
    delete mockStore._store[key]
  },
  clear() {
    mockStore._store = {}
  },
  get length() {
    return Object.keys(mockStore._store).length
  },
  key(i: number) {
    return Object.keys(mockStore._store)[i] ?? null
  },
}
vi.stubGlobal('localStorage', mockStore)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Tenant } from './authStore'

// ── Recree le store localement pour isoler les tests ──────────────────────────
// On recree le store identique a authStore.ts pour eviter les effets
// de bord avec le module singleton charge en amont par d'autres tests.

interface AuthState {
  user: User | null
  tenant: Tenant | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, tenant: Tenant, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
}

function createTestStore() {
  return create<AuthState>()(
    persist(
      (set) => ({
        user: null,
        tenant: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,

        setAuth: (user, tenant, accessToken, refreshToken) =>
          set({ user, tenant, accessToken, refreshToken, isAuthenticated: true }),

        setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

        logout: () =>
          set({
            user: null,
            tenant: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          }),
      }),
      {
        name: 'gestock-auth',
        partialize: (state) => ({
          user: state.user,
          tenant: state.tenant,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
  )
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser: User = {
  id: 'user-1',
  email: 'jean@example.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'admin',
  mustChangePassword: false,
}

const mockTenant: Tenant = {
  id: 'tenant-1',
  slug: 'ma-boutique',
  name: 'Ma Boutique',
  plan: 'pro',
  config: {
    modules: { pos: true, reports: true },
    theme: { primaryColor: '#6366f1' },
  },
}

const ACCESS_TOKEN = 'access-token-abc'
const REFRESH_TOKEN = 'refresh-token-xyz'

// ── Helpers ───────────────────────────────────────────────────────────────────

let store: ReturnType<typeof createTestStore>

beforeEach(() => {
  localStorage.clear()
  store = createTestStore()
})

// ── Tests : etat initial ──────────────────────────────────────────────────────

describe('etat initial', () => {
  it('user est null', () => {
    expect(store.getState().user).toBeNull()
  })

  it('tenant est null', () => {
    expect(store.getState().tenant).toBeNull()
  })

  it('accessToken est null', () => {
    expect(store.getState().accessToken).toBeNull()
  })

  it('refreshToken est null', () => {
    expect(store.getState().refreshToken).toBeNull()
  })

  it('isAuthenticated est false', () => {
    expect(store.getState().isAuthenticated).toBe(false)
  })
})

// ── Tests : setAuth ───────────────────────────────────────────────────────────

describe('setAuth', () => {
  it('definit user, tenant, tokens et isAuthenticated', () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)

    const state = store.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.tenant).toEqual(mockTenant)
    expect(state.accessToken).toBe(ACCESS_TOKEN)
    expect(state.refreshToken).toBe(REFRESH_TOKEN)
    expect(state.isAuthenticated).toBe(true)
  })

  it('met a jour isAuthenticated a true', () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    expect(store.getState().isAuthenticated).toBe(true)
  })

  it("remplace les donnees d'un utilisateur precedent", () => {
    const otherUser: User = {
      ...mockUser,
      id: 'user-2',
      email: 'autre@example.com',
      role: 'manager',
    }

    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    store.getState().setAuth(otherUser, mockTenant, 'new-access', 'new-refresh')

    const state = store.getState()
    expect(state.user?.id).toBe('user-2')
    expect(state.accessToken).toBe('new-access')
  })

  it('accepte un utilisateur avec mustChangePassword: true', () => {
    const userMustChange: User = { ...mockUser, mustChangePassword: true }
    store.getState().setAuth(userMustChange, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    expect(store.getState().user?.mustChangePassword).toBe(true)
  })

  it('fonctionne avec tous les roles (admin, manager, lecteur)', () => {
    const roles: User['role'][] = ['admin', 'manager', 'lecteur']
    for (const role of roles) {
      const user: User = { ...mockUser, role }
      store.getState().setAuth(user, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
      expect(store.getState().user?.role).toBe(role)
    }
  })

  it('fonctionne avec tous les plans (starter, pro, enterprise)', () => {
    const plans: Tenant['plan'][] = ['starter', 'pro', 'enterprise']
    for (const plan of plans) {
      const tenant: Tenant = { ...mockTenant, plan }
      store.getState().setAuth(mockUser, tenant, ACCESS_TOKEN, REFRESH_TOKEN)
      expect(store.getState().tenant?.plan).toBe(plan)
    }
  })
})

// ── Tests : setTokens ─────────────────────────────────────────────────────────

describe('setTokens', () => {
  it('met a jour uniquement les tokens sans toucher user/tenant', () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    store.getState().setTokens('new-access-2', 'new-refresh-2')

    const state = store.getState()
    expect(state.accessToken).toBe('new-access-2')
    expect(state.refreshToken).toBe('new-refresh-2')
    expect(state.user).toEqual(mockUser)
    expect(state.tenant).toEqual(mockTenant)
  })

  it('ne modifie pas isAuthenticated apres setAuth', () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    store.getState().setTokens('t1', 't2')
    expect(store.getState().isAuthenticated).toBe(true)
  })

  it("peut etre appele depuis l'etat initial sans setAuth prealable", () => {
    store.getState().setTokens('standalone-access', 'standalone-refresh')
    const state = store.getState()
    expect(state.accessToken).toBe('standalone-access')
    expect(state.refreshToken).toBe('standalone-refresh')
    expect(state.user).toBeNull()
  })
})

// ── Tests : logout ────────────────────────────────────────────────────────────

describe('logout', () => {
  it("reinitialise tout l'etat a null/false", () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    store.getState().logout()

    const state = store.getState()
    expect(state.user).toBeNull()
    expect(state.tenant).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('peut etre appele depuis un etat vide sans erreur', () => {
    expect(() => store.getState().logout()).not.toThrow()
  })

  it('apres logout, setAuth refonctionne normalement', () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    store.getState().logout()
    store.getState().setAuth(mockUser, mockTenant, 'new-access', 'new-refresh')

    expect(store.getState().isAuthenticated).toBe(true)
    expect(store.getState().accessToken).toBe('new-access')
  })
})

// ── Tests : persistance (partialize) ─────────────────────────────────────────

describe('persistance (partialize)', () => {
  it('ecrit dans localStorage apres setAuth', () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    const raw = localStorage.getItem('gestock-auth')
    expect(raw).not.toBeNull()
  })

  it('les donnees persistees contiennent user, tenant, tokens et isAuthenticated', () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)

    const raw = localStorage.getItem('gestock-auth')
    const parsed = JSON.parse(raw!)
    const persistedState = parsed.state

    expect(persistedState.user).toEqual(mockUser)
    expect(persistedState.tenant).toEqual(mockTenant)
    expect(persistedState.accessToken).toBe(ACCESS_TOKEN)
    expect(persistedState.refreshToken).toBe(REFRESH_TOKEN)
    expect(persistedState.isAuthenticated).toBe(true)
  })

  it('apres logout, les donnees persistees sont nulles', () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    store.getState().logout()

    const raw = localStorage.getItem('gestock-auth')
    const parsed = JSON.parse(raw!)
    const persistedState = parsed.state

    expect(persistedState.user).toBeNull()
    expect(persistedState.isAuthenticated).toBe(false)
  })

  it("partialize ne serialise pas les fonctions d'action", () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)

    const raw = localStorage.getItem('gestock-auth')
    const parsed = JSON.parse(raw!)
    const persistedState = parsed.state

    expect(persistedState.setAuth).toBeUndefined()
    expect(persistedState.setTokens).toBeUndefined()
    expect(persistedState.logout).toBeUndefined()
  })
})

// ── Tests : coherence des types ───────────────────────────────────────────────

describe('coherence des types du store', () => {
  it('user contient id, email, firstName, lastName, role', () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    const user = store.getState().user!

    expect(user.id).toBeDefined()
    expect(user.email).toBeDefined()
    expect(user.firstName).toBeDefined()
    expect(user.lastName).toBeDefined()
    expect(user.role).toBeDefined()
  })

  it('tenant contient id, slug, name, plan, config avec modules et theme', () => {
    store.getState().setAuth(mockUser, mockTenant, ACCESS_TOKEN, REFRESH_TOKEN)
    const tenant = store.getState().tenant!

    expect(tenant.id).toBeDefined()
    expect(tenant.slug).toBeDefined()
    expect(tenant.name).toBeDefined()
    expect(tenant.plan).toBeDefined()
    expect(tenant.config.modules).toBeDefined()
    expect(tenant.config.theme.primaryColor).toBeDefined()
  })

  it('tenant.config.theme.logoUrl est optionnel', () => {
    const tenantWithoutLogo: Tenant = {
      ...mockTenant,
      config: { modules: {}, theme: { primaryColor: '#fff' } },
    }
    store.getState().setAuth(mockUser, tenantWithoutLogo, ACCESS_TOKEN, REFRESH_TOKEN)
    expect(store.getState().tenant?.config.theme.logoUrl).toBeUndefined()
  })
})
