import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { wlHostFor } from '@/data/white-label-hosts';

/**
 * Metadata a white label page needs so its head never points at our domain.
 * On an agency host, absolute URLs (the og:image a text message unfurls) are
 * built on that host, and our canonical and web manifest are dropped. On our
 * own domain the canonical is still dropped: these pages are noindex and are
 * nobody's canonical copy of modernmustardseed.com.
 */
export async function wlHostMeta(): Promise<Pick<Metadata, 'metadataBase' | 'alternates' | 'manifest'>> {
  const wl = wlHostFor((await headers()).get('host'));
  if (!wl) return { alternates: { canonical: null } };
  return { metadataBase: new URL(`https://${wl.host}`), alternates: { canonical: null }, manifest: null };
}
