import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedAdminRoute } from '../components/ProtectedAdminRoute';
import { useAuth } from '../hooks/useAuth';

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/login" element={<div>Tela de login</div>} />
        <Route path="/admin" element={
          <ProtectedAdminRoute><div>Painel privado</div></ProtectedAdminRoute>
        } />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedAdminRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exibe carregamento enquanto valida as credenciais', () => {
    mockedUseAuth.mockReturnValue({ user: null, isAdmin: false, loading: true, adminLoading: true } as ReturnType<typeof useAuth>);
    renderRoute();
    expect(screen.getByText('Verificando credenciais...')).toBeInTheDocument();
  });

  it('redireciona visitante para o login', () => {
    mockedUseAuth.mockReturnValue({ user: null, isAdmin: false, loading: false, adminLoading: false } as ReturnType<typeof useAuth>);
    renderRoute();
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('nega acesso a cliente autenticado sem permissão', () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'cliente-1' }, isAdmin: false, loading: false, adminLoading: false } as ReturnType<typeof useAuth>);
    renderRoute();
    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    expect(screen.queryByText('Painel privado')).not.toBeInTheDocument();
  });

  it('libera o painel para administrador', () => {
    mockedUseAuth.mockReturnValue({ user: { id: 'admin-1' }, isAdmin: true, loading: false, adminLoading: false } as ReturnType<typeof useAuth>);
    renderRoute();
    expect(screen.getByText('Painel privado')).toBeInTheDocument();
  });
});

