/**
 * Centralized client-side conversion tracking for GA4, Google Ads, and Meta Pixel.
 *
 * Every ID is read from a NEXT_PUBLIC_* env var. If an ID is missing the matching
 * platform silently no-ops, so this is safe to ship BEFORE the ad accounts exist.
 * Fill the env vars in Vercel (Production + Preview) to switch each channel on.
 *
 * Required env vars (all optional, set what you use):
 *   NEXT_PUBLIC_GA4_ID                    G-XXXXXXXXXX   (Google Analytics 4)
 *   NEXT_PUBLIC_GOOGLE_ADS_ID             AW-XXXXXXXXX   (Google Ads tag)
 *   NEXT_PUBLIC_GOOGLE_ADS_LABEL_LEAD     conversion label for a lead
 *   NEXT_PUBLIC_GOOGLE_ADS_LABEL_BOOKING  conversion label for a booked call
 *   NEXT_PUBLIC_GOOGLE_ADS_LABEL_PURCHASE conversion label for a store purchase
 *   NEXT_PUBLIC_META_PIXEL_ID             Meta (Facebook) Pixel ID
 */

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || '';
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

/** Google Ads conversion labels. The send_to value is `AW-XXXX/label`. */
export const ADS_LABELS = {
  lead: process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_LEAD || '',
  booking: process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_BOOKING || '',
  purchase: process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_PURCHASE || '',
};

export const analyticsEnabled = Boolean(GA4_ID || GOOGLE_ADS_ID || META_PIXEL_ID);

type Params = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtagEvent(name: string, params: Params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

function fbqTrack(name: string, params: Params = {}) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', name, params);
}

function adsConversion(label: string, params: Params = {}) {
  if (!GOOGLE_ADS_ID || !label) return;
  gtagEvent('conversion', { send_to: `${GOOGLE_ADS_ID}/${label}`, ...params });
}

/** A captured lead: contact form submit or AI-audit lead capture. */
export function trackLead(detail: { source: string; value?: number } = { source: 'unknown' }) {
  const value = detail.value ?? 0;
  gtagEvent('generate_lead', { event_source: detail.source, value, currency: 'USD' });
  adsConversion(ADS_LABELS.lead, { value, currency: 'USD' });
  fbqTrack('Lead', { content_name: detail.source, value, currency: 'USD' });
}

/** A booked discovery call: the highest-intent top-of-funnel conversion. */
export function trackBooking(detail: { source?: string } = {}) {
  const source = detail.source ?? 'book';
  gtagEvent('schedule', { event_source: source });
  adsConversion(ADS_LABELS.booking);
  fbqTrack('Schedule', { content_name: source });
}

/** A completed store purchase. value is in whole currency units (dollars). */
export function trackPurchase(detail: {
  value: number;
  currency?: string;
  id?: string;
  itemName?: string;
}) {
  const currency = detail.currency ?? 'USD';
  gtagEvent('purchase', {
    transaction_id: detail.id,
    value: detail.value,
    currency,
    items: detail.itemName ? [{ item_name: detail.itemName }] : undefined,
  });
  adsConversion(ADS_LABELS.purchase, {
    value: detail.value,
    currency,
    transaction_id: detail.id,
  });
  fbqTrack('Purchase', { value: detail.value, currency, content_name: detail.itemName });
}

/** Escape hatch for any other custom GA4 event. */
export function trackEvent(name: string, params: Params = {}) {
  gtagEvent(name, params);
}
