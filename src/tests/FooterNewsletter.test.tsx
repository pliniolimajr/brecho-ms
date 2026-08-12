import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Footer from '../components/Footer';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ session: null, isAdmin: false }),
}));

describe('newsletter do rodapé', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  function renderFooter() {
    return render(<MemoryRouter><Footer onLinkClick={vi.fn()} /></MemoryRouter>);
  }

  it('envia dados normalizados para a Edge Function', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    renderFooter();
    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: '  Maria  ' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: ' MARIA@EXAMPLE.COM ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assinar' }));

    await waitFor(() => expect(screen.getByText('Cadastro realizado com sucesso!')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/functions/v1/subscribe-newsletter'), expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Maria', email: 'maria@example.com' }),
    }));
  });

  it('mostra a mensagem pública devolvida pelo rate limiting', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde um pouco e tente novamente.' },
    }), { status: 429 }));
    renderFooter();
    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail'), { target: { value: 'maria@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assinar' }));

    await waitFor(() => expect(screen.getByText('Muitas tentativas. Aguarde um pouco e tente novamente.')).toBeInTheDocument());
  });

  it('exibe somente os contatos sociais configurados', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: /Instagram @aperte\.f1/i })).toHaveAttribute(
      'href',
      'https://www.instagram.com/aperte.f1/',
    );
    expect(screen.getByRole('link', { name: /99329-0895/ })).toHaveAttribute(
      'href',
      'https://wa.me/5571993290895',
    );
    expect(screen.queryByText('TikTok')).not.toBeInTheDocument();
  });
});
