import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_CONSENT_KEY, trackEvent } from '../services/analytics';
import { redactSensitiveData } from '../services/monitoring';

describe('privacidade do monitoramento', () => {
  afterEach(() => localStorage.clear());

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
});
