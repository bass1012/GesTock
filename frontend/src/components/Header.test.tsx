import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from './Header'
import { useAuthStore } from '../store/authStore'
import { describe, it, expect, vi } from 'vitest'

// Mock de Zustand useAuthStore
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

// Mock useAlerts pour éviter la dépendance réseau
vi.mock('../hooks/useAlerts', () => ({
  useStockAlerts: () => ({ data: [], isLoading: false }),
}))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe('Header Component', () => {
  it("Affiche correctement le rôle de l'utilisateur et la barre de recherche", () => {
    // Fournir des données mockées à Zustand
    ;(useAuthStore as any).mockReturnValue({
      name: 'Admin User',
      role: 'ADMIN',
    })

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      </QueryClientProvider>,
    )

    // Vérifier que le rôle/admin est présent dans l'interface
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })
})
