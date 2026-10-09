import type { SupabaseClient } from '@supabase/supabase-js';
import { regKeyValid } from '@/lib/bootcamp/key';
import { getRegistrationById, type RegistrationRow } from '@/lib/bootcamp/store';

/**
 * The one check every room route makes: a registration id and the key signed
 * for it. A wrong key and a missing row answer the same, so the routes never
 * tell anyone which ids exist.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function roomRegistration(
  sb: SupabaseClient | null,
  id: unknown,
  key: unknown,
): Promise<RegistrationRow | null> {
  const rid = typeof id === 'string' ? id.trim() : '';
  const k = typeof key === 'string' ? key.trim() : '';
  if (!UUID_RE.test(rid) || !regKeyValid(rid, k)) return null;
  return getRegistrationById(sb, rid);
}
