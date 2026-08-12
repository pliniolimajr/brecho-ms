export type CommerceEvent =
  | 'product_viewed'
  | 'product_added_to_cart'
  | 'checkout_started'
  | 'shipping_calculated'
  | 'coupon_applied'
  | 'payment_redirected'
  | 'purchase_confirmed'
  | 'checkout_abandoned';

export const ANALYTICS_CONSENT_KEY = 'palmco_cookie_consent';
const CHECKOUT_JOURNEY_KEY = 'palmco_checkout_journey';

export function hasAnalyticsConsent() {
  return localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'granted';
}

export function trackEvent(event: CommerceEvent, properties: Record<string, string | number | boolean | null> = {}) {
  if (!hasAnalyticsConsent()) return false;
  const detail = { event, properties, timestamp: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent('palmco:analytics', { detail }));
  const analyticsWindow = window as Window & { dataLayer?: unknown[] };
  analyticsWindow.dataLayer?.push(detail);
  return true;
}

export function beginCheckoutJourney(properties: { items_count: number; value: number }) {
  sessionStorage.setItem(CHECKOUT_JOURNEY_KEY, JSON.stringify({ ...properties, started_at: Date.now() }));
  return trackEvent('checkout_started', properties);
}

export function completeCheckoutJourney() {
  sessionStorage.removeItem(CHECKOUT_JOURNEY_KEY);
}

export function trackCheckoutAbandonment() {
  const rawJourney = sessionStorage.getItem(CHECKOUT_JOURNEY_KEY);
  if (!rawJourney) return false;
  sessionStorage.removeItem(CHECKOUT_JOURNEY_KEY);
  try {
    const journey = JSON.parse(rawJourney) as { items_count?: number; value?: number; started_at?: number };
    return trackEvent('checkout_abandoned', {
      items_count: Number(journey.items_count) || 0,
      value: Number(journey.value) || 0,
      duration_seconds: Math.max(0, Math.round((Date.now() - Number(journey.started_at || Date.now())) / 1000)),
    });
  } catch {
    return trackEvent('checkout_abandoned');
  }
}
