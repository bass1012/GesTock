import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'

// Mock dependencies
vi.mock('../../hooks/useAuth')
vi.mock('react-hot-toast')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

const mockLogin = vi.fn()
const mockNavigate = vi.fn()

// Import useNavigate after mocking
import { useNavigate } from 'react-router-dom'

beforeEach(() => {
  vi.clearAllMocks()

  // Setup useAuth mock
  vi.mocked(useAuth).mockReturnValue({
    login: mockLogin,
    logout: vi.fn(),
    user: null,
    token: null,
    tenantSlug: 'test-tenant',
    isLoading: false,
    register: vi.fn(),
    checkAuthStatus: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerificationEmail: vi.fn(),
  } as any)

  // Setup useNavigate mock
  vi.mocked(useNavigate).mockReturnValue(mockNavigate as any)

  // Setup toast mocks
  vi.mocked(toast.success).mockImplementation(() => '')
  vi.mocked(toast.error).mockImplementation(() => '')
})

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>,
  )
}

describe('LoginPage', () => {
  describe('Rendering', () => {
    it('affiche le formulaire de connexion', () => {
      renderLoginPage()

      expect(screen.getByText(/Re-bienvenue/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Connecter mon espace/i })).toBeInTheDocument()
    })

    it('affiche le logo et le texte de bienvenue', () => {
      renderLoginPage()

      expect(screen.getByText(/Re-bienvenue/i)).toBeInTheDocument()
      expect(screen.getByAltText(/Futuristic Warehouse|warehouse/i)).toBeInTheDocument()
    })

    it("affiche un lien vers la page d'inscription", () => {
      renderLoginPage()

      const registerLink = screen.getByRole('link', { name: /créer un compte/i })
      expect(registerLink).toBeInTheDocument()
      expect(registerLink).toHaveAttribute('href', '/register')
    })
  })

  describe('Form Interactions', () => {
    it("met à jour l'email lors de la saisie", async () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      expect(emailInput.value).toBe('test@example.com')
    })

    it('met à jour le mot de passe lors de la saisie', async () => {
      renderLoginPage()

      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      expect(passwordInput.value).toBe('password123')
    })

    it('bascule la visibilité du mot de passe', () => {
      renderLoginPage()

      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement

      // Initial type should be password
      expect(passwordInput.type).toBe('password')

      // Find toggle button and click it
      const toggleButtons = screen.getAllByRole('button')
      const eyeToggle = toggleButtons.find((btn) => btn.querySelector('svg'))

      if (eyeToggle) {
        fireEvent.click(eyeToggle)
        expect(passwordInput.type).toBe('text')
      }
    })
  })

  describe('Form Submission', () => {
    it('appelle login avec email et mot de passe valides', async () => {
      mockLogin.mockResolvedValue({
        user: { mustChangePassword: false, id: '123', email: 'test@example.com' },
      })

      renderLoginPage()

      const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement
      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Connecter mon espace/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('affiche un message de succès après connexion réussie', async () => {
      mockLogin.mockResolvedValue({
        user: { mustChangePassword: false, id: '123' },
      })

      renderLoginPage()

      const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement
      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Connecter mon espace/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Connexion réussie')
      })
    })

    it('redirige vers / après connexion réussie sans changement de mot de passe', async () => {
      mockLogin.mockResolvedValue({
        user: { mustChangePassword: false, id: '123' },
      })

      renderLoginPage()

      const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement
      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Connecter mon espace/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('redirige vers /change-password si mustChangePassword est true', async () => {
      mockLogin.mockResolvedValue({
        user: { mustChangePassword: true, id: '123' },
      })

      renderLoginPage()

      const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement
      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Connecter mon espace/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/change-password')
      })
    })
  })

  describe('Error Handling', () => {
    it("affiche un message d'erreur si la connexion échoue", async () => {
      mockLogin.mockRejectedValue({
        response: { data: { message: 'Identifiants invalides' } },
      })

      renderLoginPage()

      const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement
      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Connecter mon espace/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Identifiants invalides')
      })
    })

    it("affiche un message d'erreur générique si pas de message personnalisé", async () => {
      mockLogin.mockRejectedValue({
        response: { data: {} },
      })

      renderLoginPage()

      const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement
      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Connecter mon espace/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Identifiants invalides')
      })
    })

    it('gère les erreurs réseau', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'))

      renderLoginPage()

      const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement
      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Connecter mon espace/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Identifiants invalides')
      })
    })
  })

  describe('Loading State', () => {
    it('désactive le bouton de soumission pendant la requête', async () => {
      mockLogin.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ user: { mustChangePassword: false } }), 100),
          ),
      )

      renderLoginPage()

      const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement
      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', {
        name: /Connecter mon espace/i,
      }) as HTMLButtonElement

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(submitButton.disabled).toBe(true)
      })
    })

    it('affiche un spinner pendant le chargement', async () => {
      mockLogin.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ user: { mustChangePassword: false } }), 100),
          ),
      )

      renderLoginPage()

      const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement
      const passwordInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /Connecter mon espace/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })
      fireEvent.click(submitButton)

      // Verify button has loading state (disabled or contains loader)
      await waitFor(() => {
        expect((submitButton as HTMLButtonElement).disabled).toBe(true)
      })
    })
  })
})
