import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_KEY,
  beginCheckoutJourney,
  completeCheckoutJourney,
  trackCheckoutAbandonment,
  trackEvent,
} from '../services/analytics';
import { redactSensitiveData } from '../services/monitoring';

describe('privacidade do monitoramento', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('remove dados sensíveis de objetos aninhados', () => {
    expect(redactSensitiveData({
      order_id: 'order-1',
      customer: { email: 'maria@example.com', phone: '71999999999' },
      authorization: 'Bearer secret',
    })).toEqual({
      order_id: 'order-1',
      customer: { email: '[REDACTED]', phone: '[REDACTED]' },
      authorization: '[REDACTED]',
    });
  });

  it('não registra analytics sem consentimento', () => {
    const listener = vi.fn();
    window.addEventListener('palmco:analytics', listener);
    expect(trackEvent('checkout_started', { items_count: 2 })).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('registra analytics depois do consentimento', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    const listener = vi.fn();
    window.addEventListener('palmco:analytics', listener);
    expect(trackEvent('product_viewed', { product_id: 'product-1' })).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('registra abandono uma unica vez enquanto o checkout estiver aberto', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    const listener = vi.fn();
    window.addEventListener('palmco:analytics', listener);
    beginCheckoutJourney({ items_count: 2, value: 100 });

    expect(trackCheckoutAbandonment()).toBe(true);
    expect(trackCheckoutAbandonment()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('nao registra abandono depois de concluir a jornada', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    beginCheckoutJourney({ items_count: 1, value: 50 });
    completeCheckoutJourney();
    expect(trackCheckoutAbandonment()).toBe(false);
  });
});
