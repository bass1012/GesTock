import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { useAuthStore } from '../store/authStore'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockUseAuthStore = vi.mocked(useAuthStore)

function renderWithRouter(
  isAuthenticated: boolean,
  user?: Partial<{ mustChangePassword: boolean }> | null,
) {
  mockUseAuthStore.mockReturnValue({
    isAuthenticated,
    user: user ?? null,
  })

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>Page Login</div>} />
        <Route path="/change-password" element={<div>Page Changement MDP</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Page Dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReset()
  })

  it("affiche le contenu si l'utilisateur est authentifié", () => {
    renderWithRouter(true, { mustChangePassword: false })
    expect(screen.getByText('Page Dashboard')).toBeInTheDocument()
  })

  it('redirige vers /login si non authentifié', () => {
    renderWithRouter(false)
    expect(screen.getByText('Page Login')).toBeInTheDocument()
    expect(screen.queryByText('Page Dashboard')).not.toBeInTheDocument()
  })

  it('redirige vers /change-password si mustChangePassword est true', () => {
    renderWithRouter(true, { mustChangePassword: true })
    expect(screen.getByText('Page Changement MDP')).toBeInTheDocument()
    expect(screen.queryByText('Page Dashboard')).not.toBeInTheDocument()
  })
})
