'use client';

import { track } from '@vercel/analytics';
import { bookingUrl } from '@/data/socials';
import { trackEvent } from '@/lib/analytics';

/**
 * The discovery-call link, counted. Every SEO page ends in a booking link, and
 * Sarah needs to see which page produced the click, so the click fires a
 * Vercel Analytics event (cookieless, no consent gate) plus the GA4 escape hatch
 * (consent-gated) with the source that names the page and the placement.
 */
export default function BookCallLink({
  source,
  className,
  children,
}: {
  source: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        track('book_call_click', { source });
        trackEvent('book_call_click', { location: source });
      }}
    >
      {children}
    </a>
  );
}
