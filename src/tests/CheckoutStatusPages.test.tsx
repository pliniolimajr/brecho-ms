import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutFailure } from '../pages/CheckoutFailure';
import { CheckoutPending } from '../pages/CheckoutPending';
import { CheckoutSuccess } from '../pages/CheckoutSuccess';

const { single, eq, select, from } = vi.hoisted(() => {
  const single = vi.fn();
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { single, eq, select, from };
});

vi.mock('../services/supabaseClient', () => ({ supabase: { from } }));

describe('páginas de retorno do pagamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    single.mockResolvedValue({ data: { total_amount: 277.81 }, error: null });
  });

  it('leva pagamento pendente para Meus Pedidos', () => {
    render(
      <MemoryRouter initialEntries={['/checkout-pending']}>
        <Routes>
          <Route path="/checkout-pending" element={<CheckoutPending />} />
          <Route path="/minha-conta" element={<div>Minha conta</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Acompanhar Pedido' }));
    expect(screen.getByText('Minha conta')).toBeInTheDocument();
  });

  it('permite retornar ao checkout depois de falha', () => {
    render(
      <MemoryRouter initialEntries={['/checkout-failure']}>
        <Routes>
          <Route path="/checkout-failure" element={<CheckoutFailure />} />
          <Route path="/checkout" element={<div>Novo checkout</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tentar Novamente' }));
    expect(screen.getByText('Novo checkout')).toBeInTheDocument();
  });

  it('consulta o pedido aprovado sem tentar alterar seu status', async () => {
    render(
      <MemoryRouter initialEntries={['/checkout-success?payment_id=123&external_reference=order-abc']}>
        <Routes>
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Pagamento Aprovado!')).toBeInTheDocument());
    expect(screen.getByText('R$ 277,81')).toBeInTheDocument();
    expect(from).toHaveBeenCalledWith('orders');
    expect(select).toHaveBeenCalledWith('total_amount');
    expect(eq).toHaveBeenCalledWith('id', 'order-abc');
  });
});
