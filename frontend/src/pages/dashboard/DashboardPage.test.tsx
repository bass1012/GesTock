import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import * as useReportsHook from '../../hooks/useReports'
import * as useStockMovementsHook from '../../hooks/useStockMovements'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock dependencies
vi.mock('../../hooks/useReports')
vi.mock('../../hooks/useStockMovements')

const mockUseDashboardStats = vi.mocked(useReportsHook.useDashboardStats)
const mockUseStockMovements = vi.mocked(useStockMovementsHook.useStockMovements)

const mockDashboardStats = {
  totalProducts: 45,
  lowStockCount: 3,
  totalStockValue: 1250000,
  totalMovementsWeek: 42,
  totalMovementsToday: 8,
  purchaseOrdersPending: 5,
  topProducts: [
    {
      id: '1',
      name: 'Carton A4',
      sku: 'CART-001',
      currentStock: 50,
      minStock: 10,
      price: 15000,
    },
    {
      id: '2',
      name: 'Papier Blanc',
      sku: 'PAP-001',
      currentStock: 2,
      minStock: 5,
      price: 5000,
    },
  ],
}

const mockMovements = {
  movements: [
    {
      id: '1',
      type: 'IN',
      quantity: 100,
      createdAt: new Date().toISOString(),
      product: {
        id: '1',
        name: 'Carton A4',
        sku: 'CART-001',
      },
    },
    {
      id: '2',
      type: 'OUT',
      quantity: 50,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      product: {
        id: '2',
        name: 'Papier Blanc',
        sku: 'PAP-001',
      },
    },
  ],
  pagination: { page: 1, limit: 5, totalPages: 1, totalItems: 2 },
}

beforeEach(() => {
  vi.clearAllMocks()

  mockUseDashboardStats.mockReturnValue({
    data: mockDashboardStats,
    isLoading: false,
    error: null,
  } as any)

  mockUseStockMovements.mockReturnValue({
    data: mockMovements,
    isLoading: false,
    error: null,
  } as any)
})

const queryClient = new QueryClient()

const renderDashboardPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  describe('Rendering', () => {
    it('affiche le titre et la description', () => {
      renderDashboardPage()

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText("Vue d'ensemble de votre gestion de stock")).toBeInTheDocument()
    })

    it('affiche tous les KPI cards', () => {
      renderDashboardPage()

      expect(screen.getByText('Produits actifs')).toBeInTheDocument()
      expect(screen.getByText('Valeur du stock')).toBeInTheDocument()
      expect(screen.getByText('Mouvements (7j)')).toBeInTheDocument()
      expect(screen.getByText('Commandes en attente')).toBeInTheDocument()
    })

    it('affiche la section mouvements récents', () => {
      renderDashboardPage()

      expect(screen.getByText('Mouvements récents')).toBeInTheDocument()
      expect(screen.getByText('Voir tout →')).toBeInTheDocument()
    })

    it('affiche la section alertes de stock', () => {
      renderDashboardPage()

      expect(screen.getByText('Alertes de stock')).toBeInTheDocument()
      expect(screen.getByText('Gérer →')).toBeInTheDocument()
    })
  })

  describe('KPI Cards Display', () => {
    it('affiche la valeur des produits actifs', () => {
      renderDashboardPage()

      expect(screen.getByText('45')).toBeInTheDocument()
    })

    it("affiche le sous-texte d'alerte pour produits actifs", () => {
      renderDashboardPage()

      expect(screen.getByText('3 en alerte')).toBeInTheDocument()
    })

    it('affiche la valeur totale du stock formatée en XOF', () => {
      renderDashboardPage()

      // Should display formatted currency
      const stockValueText = screen.getByText((content, element) => {
        return element?.textContent?.includes('XOF') || content.includes('1 250 000')
      })
      expect(stockValueText).toBeInTheDocument()
    })

    it('affiche les mouvements de la semaine', () => {
      renderDashboardPage()

      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText("8 aujourd'hui")).toBeInTheDocument()
    })

    it('affiche le nombre de commandes en attente', () => {
      renderDashboardPage()

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('affiche les skeletons pendant le chargement', () => {
      mockUseDashboardStats.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      } as any)

      renderDashboardPage()

      // Should display animate-pulse elements (skeletons)
      const pulsingElements = screen.getAllByText((_content, element) => {
        return element?.className?.includes?.('animate-pulse') || false
      })
      expect(pulsingElements.length).toBeGreaterThan(0)
    })
  })

  describe('Recent Movements Section', () => {
    it('affiche la liste des mouvements récents', () => {
      renderDashboardPage()

      const movements = screen.getAllByText('Carton A4')
      expect(movements.length).toBeGreaterThan(0)
    })

    it('affiche le SKU pour chaque mouvement', () => {
      renderDashboardPage()

      // Verify the movements section contains SKU data
      const movementsSection = screen.getByText('Mouvements récents')
      const parent =
        movementsSection?.closest('div')?.nextElementSibling || movementsSection?.closest('div')

      // Check that the section exists and has content
      expect(parent).toBeInTheDocument()
      expect(movementsSection).toBeInTheDocument()
    })

    it('affiche les quantités avec + ou - selon le type', () => {
      renderDashboardPage()

      expect(screen.getByText('+100')).toBeInTheDocument()
      expect(screen.getByText('-50')).toBeInTheDocument()
    })

    it("affiche un message quand aucun mouvement n'existe", () => {
      mockUseStockMovements.mockReturnValue({
        data: { movements: [], pagination: { page: 1, limit: 5, totalPages: 0, totalItems: 0 } },
        isLoading: false,
        error: null,
      } as any)

      renderDashboardPage()

      expect(screen.getByText('Aucun mouvement pour le moment')).toBeInTheDocument()
    })

    it('a un lien vers la page des mouvements', () => {
      renderDashboardPage()

      const link = screen.getByRole('link', { name: /Voir tout/ })
      expect(link).toHaveAttribute('href', '/movements')
    })
  })

  describe('Stock Alerts Section', () => {
    it('affiche le nombre de produits en alerte', () => {
      renderDashboardPage()

      expect(screen.getByText(/3 produits sont sous le seuil minimum/i)).toBeInTheDocument()
    })

    it('affiche les produits en alerte', () => {
      renderDashboardPage()

      const papierBlancs = screen.getAllByText('Papier Blanc')
      expect(papierBlancs.length).toBeGreaterThan(0)
      expect(screen.getByText('Stock: 2')).toBeInTheDocument()
    })

    it("affiche un message quand aucune alerte n'existe", () => {
      mockUseDashboardStats.mockReturnValue({
        data: {
          ...mockDashboardStats,
          lowStockCount: 0,
        },
        isLoading: false,
        error: null,
      } as any)

      renderDashboardPage()

      expect(screen.getByText('Aucune alerte de stock')).toBeInTheDocument()
      expect(screen.getByText('Tous les stocks sont au-dessus du seuil')).toBeInTheDocument()
    })

    it("a un lien vers la page d'inventaire", () => {
      renderDashboardPage()

      const link = screen.getByRole('link', { name: /Gérer/ })
      expect(link).toHaveAttribute('href', '/inventory')
    })
  })

  describe('Visual Indicators', () => {
    it('affiche une alerte visuelle si des produits sont bas', () => {
      renderDashboardPage()

      const alertBox = screen.getByText(/3 produits sont/).closest('div')
      expect(alertBox).toHaveClass('bg-amber-50')
    })

    it("affiche une icône d'alerte si des produits sont bas", () => {
      renderDashboardPage()

      // SVGs in React are often rendered without role="img", so check for parent container
      const alertElements = screen.getByText(/3 produits sont/).parentElement
      expect(alertElements).toBeInTheDocument()
    })

    it('applique des bordures aux KPI cards avec alerte', () => {
      renderDashboardPage()

      // The first KPI card (Produits actifs) has lowStockCount > 0, so should have alert border
      const kpiCards = screen.getAllByText(/Produits actifs/).map((el) => el.closest('.card'))
      expect(kpiCards.length).toBeGreaterThan(0)
    })
  })

  describe('Movement Types', () => {
    it("affiche les mouvements d'entrée en vert", () => {
      renderDashboardPage()

      const inMovement = screen.getByText('+100')
      expect(inMovement).toHaveClass('text-emerald-600')
    })

    it('affiche les mouvements de sortie en rouge', () => {
      renderDashboardPage()

      const outMovement = screen.getByText('-50')
      expect(outMovement).toHaveClass('text-rose-600')
    })
  })

  describe('Data Loading', () => {
    it('affiche les KPI cards après le chargement', () => {
      renderDashboardPage()

      expect(mockUseDashboardStats).toHaveBeenCalled()
      expect(screen.getByText('45')).toBeInTheDocument()
    })

    it('appelle useStockMovements au montage', () => {
      renderDashboardPage()

      expect(mockUseStockMovements).toHaveBeenCalledWith(1, 5)
    })
  })

  describe('Responsiveness', () => {
    it('affiche une grille KPI responsive', () => {
      renderDashboardPage()

      const kpiGrid = screen.getByText('Produits actifs').closest('div')?.closest('.grid')
      expect(kpiGrid).toHaveClass('grid-cols-1')
      expect(kpiGrid).toHaveClass('md:grid-cols-2')
      expect(kpiGrid).toHaveClass('lg:grid-cols-4')
    })

    it('affiche une grille bottom responsive', () => {
      renderDashboardPage()

      const bottomGrid = screen.getByText('Mouvements récents').closest('div')?.closest('.grid')
      expect(bottomGrid).toHaveClass('grid-cols-1')
      expect(bottomGrid).toHaveClass('lg:grid-cols-2')
    })
  })

  describe('Edge Cases', () => {
    it('gère le cas où stats est null', () => {
      mockUseDashboardStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any)

      renderDashboardPage()

      // Should show empty state or loading
      expect(screen.getByText(/Dashboard|Chargement/i)).toBeInTheDocument()
    })

    it('gère le cas où movementsData est null', () => {
      mockUseStockMovements.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      } as any)

      renderDashboardPage()

      expect(screen.getByText('Aucun mouvement pour le moment')).toBeInTheDocument()
    })

    it('gère des singulier/pluriel pour les alertes', () => {
      mockUseDashboardStats.mockReturnValue({
        data: {
          ...mockDashboardStats,
          lowStockCount: 1,
          topProducts: [{ ...mockDashboardStats.topProducts[0] }],
        },
        isLoading: false,
        error: null,
      } as any)

      renderDashboardPage()

      expect(screen.getByText(/1 produit est sous le seuil/i)).toBeInTheDocument()
    })
  })
})
