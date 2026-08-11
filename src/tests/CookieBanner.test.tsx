import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import CookieBanner from '../components/CookieBanner';
import { ANALYTICS_CONSENT_KEY } from '../services/analytics';

describe('consentimento de analytics', () => {
  beforeEach(() => localStorage.clear());

  it('permite continuar somente com cookies essenciais', async () => {
    render(<MemoryRouter><CookieBanner /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Somente essenciais' }));
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('denied');
  });

  it('registra consentimento explícito', async () => {
    render(<MemoryRouter><CookieBanner /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar' }));
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('granted');
  });
});
