import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';
import { useAuthStore } from '../store/authStore';
import { describe, it, expect, vi } from 'vitest';

// Mock de Zustand useAuthStore
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('Header Component', () => {
  it('Affiche correctement le rôle de l\'utilisateur et la barre de recherche', () => {
    // Fournir des données mockées à Zustand
    (useAuthStore as any).mockReturnValue({
      name: 'Admin User', 
      role: 'ADMIN'
    });

    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    // Vérifier que la barre de recherche est visible via le placeholder
    expect(screen.getByPlaceholderText('Rechercher produits, commandes...')).toBeInTheDocument();
    
    // Vérifier que le rôle/admin est présent dans l'interface
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });
});
