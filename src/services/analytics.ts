export type CommerceEvent =
  | 'product_viewed'
  | 'product_added_to_cart'
  | 'checkout_started'
  | 'shipping_calculated'
  | 'coupon_applied'
  | 'payment_redirected'
  | 'purchase_confirmed';

export const ANALYTICS_CONSENT_KEY = 'palmco_cookie_consent';

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
