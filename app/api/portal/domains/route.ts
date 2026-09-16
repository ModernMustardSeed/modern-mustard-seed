import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { visibleProject } from '@/lib/command-center/visible';
import { daysUntil, mailProvider, readMx, readNs, refreshDomains, type DomainRow } from '@/lib/domains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * THE CLIENT'S DOMAINS AND THEIR EMAIL, scoped by the signed-in email.
 * GET lists every domain with its expiry and job, and reads the live state
 * of the email domain (registered? mail at Google yet?). POST re-reads the
 * registry for all of them, which a person may do whenever they like.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project) return NextResponse.json({ domains: [], email: null });

  let rows: DomainRow[] = [];
  try {
    const { data } = await sb.from('client_domains').select('*').eq('client_email', session.email).order('role').order('domain');
    rows = (data ?? []) as DomainRow[];
  } catch {
    /* not migrated yet */
  }
  const order: Record<string, number> = { primary: 0, email: 1, forward: 2, held: 3 };
  rows.sort((a, b) => order[a.role] - order[b.role] || a.domain.localeCompare(b.domain));
  const domains = rows.map((r) => ({ ...r, days: daysUntil(r.expires_on), mailProvider: mailProvider(r.mx) }));

  let email: { domain: string; registered: boolean; mx: string | null; provider: ReturnType<typeof mailProvider> } | null = null;
  if (project.emailDomain) {
    const [ns, mx] = await Promise.all([readNs(project.emailDomain), readMx(project.emailDomain)]);
    email = { domain: project.emailDomain, registered: ns.length > 0, mx, provider: mailProvider(mx) };
  }
  return NextResponse.json({ domains, email, checkedAt: rows.find((r) => r.checked_at)?.checked_at ?? null });
}

export async function POST() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { checked } = await refreshDomains(sb, session.email);
  return NextResponse.json({ ok: true, checked });
}
