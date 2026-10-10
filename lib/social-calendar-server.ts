import { getAdminUser } from '@/lib/admin-auth';
import { bearerOk, routinesSecret } from '@/lib/routines';

/** The columns the desk and the API read. */
export const SOCIAL_COLUMNS =
  'id,date,time_mt,platform,account,series,title,kind,status,ref,caption,cover_url,source,verified,note,updated_at';

/**
 * Who is calling the social API: a signed-in admin (the desk, or a session
 * using mms-admin.mjs) or a standing routine holding the ROUTINES_SECRET
 * bearer it already uses for heartbeats. Null means refuse.
 */
export async function socialCaller(req: Request): Promise<string | null> {
  const user = await getAdminUser();
  if (user) return user.email;
  const secret = routinesSecret();
  if (secret && bearerOk(req.headers.get('authorization'), secret)) return 'routine';
  return null;
}
