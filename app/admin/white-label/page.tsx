import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata, SITE } from '@/lib/seo';
import WhiteLabelDesk, { type Prep, type Inquiry } from '@/components/admin/WhiteLabelDesk';
import { WL_GROUPS, WL_LINES, WL_PROGRAM, WL_SAMPLE_CLIENTS, wlLadderHolds } from '@/data/white-label';
import { wlLinks } from '@/lib/white-label/key';

export const metadata = buildMetadata({ title: 'White Label', noindex: true });
export const dynamic = 'force-dynamic';

export default async function WhiteLabelAdminPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin');

  const db = getSupabase();
  let preps: Prep[] = [];
  let inquiries: Inquiry[] = [];
  let callsToday = 0;

  if (db) {
    const [p, i, d] = await Promise.all([
      db.from('app_state').select('value').like('key', 'white-label:agency:%').order('updated_at', { ascending: false }).limit(50),
      db
        .from('leads')
        .select('id, name, email, message, created_at, status')
        .eq('source', 'inquiry-white-label')
        .order('created_at', { ascending: false })
        .limit(50),
      db.from('app_state').select('value').eq('key', `white-label:day:${new Date().toISOString().slice(0, 10)}`).maybeSingle(),
    ]);
    preps = (p.data ?? []).map((r) => {
      const v = r.value as Omit<Prep, 'links'>;
      return { ...v, links: wlLinks(SITE.url, v) };
    });
    inquiries = (i.data ?? []) as Inquiry[];
    callsToday = ((d.data?.value as { count?: number } | null)?.count ?? 0);
  }

  return (
    <WhiteLabelDesk
      lines={WL_LINES}
      groups={WL_GROUPS.map((g) => ({ key: g.key, sheetTitle: g.sheetTitle }))}
      program={{ foundingAgencies: WL_PROGRAM.foundingAgencies, foundingMonths: WL_PROGRAM.foundingMonths, answeredMinutes: WL_PROGRAM.answeredMinutes }}
      ladderHolds={wlLadderHolds()}
      samples={WL_SAMPLE_CLIENTS.map((s) => ({ id: s.id, label: s.label }))}
      preps={preps}
      inquiries={inquiries}
      callsToday={callsToday}
    />
  );
}
