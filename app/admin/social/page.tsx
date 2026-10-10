import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import { addDays, mtDate, type SocialPost } from '@/lib/social-calendar';
import { SOCIAL_LIST_COLUMNS } from '@/lib/social-calendar-server';
import SocialCalendar from '@/components/admin/social/SocialCalendar';

export const metadata = buildMetadata({ title: 'Social', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The social calendar: every post that goes out, the day it goes and where.
 * Rows come from social_posts (migration 159), loaded by
 * scripts/social-calendar-import.mjs and marked posted through
 * PATCH /api/admin/social/<id>. Reads the last seven days, everything ahead,
 * and the whole backlog (undated, unscheduled or failed, however old).
 * Captions stay out of the first paint; the desk fetches one when a post is
 * opened.
 */
export default async function SocialAdminPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin');

  const today = mtDate();
  let rows: SocialPost[] = [];
  let loadError = '';
  const sb = getSupabase();
  if (!sb) {
    loadError = 'Supabase is not configured, so the calendar cannot load.';
  } else {
    const { data, error } = await sb
      .from('social_posts')
      .select(SOCIAL_LIST_COLUMNS)
      .or(`date.gte.${addDays(today, -7)},date.is.null,status.eq.unscheduled,status.eq.failed`)
      .order('date', { ascending: true, nullsFirst: false })
      .order('time_mt', { ascending: true })
      .limit(5000);
    if (error) loadError = `Could not read social_posts: ${error.message}`;
    else rows = ((data ?? []) as Omit<SocialPost, 'caption'>[]).map((r) => ({ ...r, caption: null }));
  }

  return <SocialCalendar rows={rows} today={today} loadError={loadError} />;
}
