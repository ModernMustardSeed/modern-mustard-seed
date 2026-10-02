import { wlKeyValid } from '@/lib/white-label/key';
import { getAgencyBySlug, type Agency } from '@/lib/white-label/store';

/**
 * The agency portal is a signed link, not an account: /white-label/hq/<slug>?k=<key>,
 * where the key is the HMAC of the slug (lib/white-label/key.ts). It opens only
 * for an approved or active agency, so pausing or declining an agency closes it.
 */
export async function agencyFromKey(slug: string, key: string | null | undefined): Promise<Agency | null> {
  if (!/^[a-z0-9-]{1,70}$/.test(slug) || !wlKeyValid(slug, key)) return null;
  const a = await getAgencyBySlug(slug);
  return a && (a.status === 'approved' || a.status === 'active') ? a : null;
}
