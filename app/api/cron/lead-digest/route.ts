/**
 * Daily pipeline digest. The no-stale-lead safety net.
 *
 * Runs every weekday morning via Vercel Cron and emails the admin team a
 * short list of leads that need attention:
 *   - Unanswered: still "new" 24h+ after they arrived (excludes newsletter).
 *   - Follow-ups due: leads with a follow_up_at on or before today (migration
 *     026; ignored gracefully until that column exists).
 *
 * Sends nothing when there is nothing to chase, so it never becomes noise.
 *
 * Auth: standard Vercel cron secret (Authorization: Bearer ${CRON_SECRET}).
 */

import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSupabase } from '@/lib/supabase';
import { listAdminUsers } from '@/lib/admin-auth';
import { leadNotification } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ADMIN_URL = 'https://modernmustardseed.com/admin/leads';

type DigestLead = {
  id: string;
  name: string | null;
  email: string;
  type: string;
  status?: string;
  created_at?: string;
  follow_up_at?: string | null;
  owner?: string | null;
  business_name?: string | null;
  company?: string | null;
};

function recipients(): string[] {
  const set = new Set<string>();
  try {
    listAdminUsers().forEach((u) => set.add(u.email));
  } catch {
    /* env not set */
  }
  set.add('sarah@modernmustardseed.com');
  return [...set];
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, sent: 0, note: 'supabase not configured' });

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

  // Unanswered: still "new" after 24h, excluding newsletter subscribers.
  const { data: staleRows } = await supabase
    .from('leads')
    .select('id, name, email, type, created_at, business_name, company')
    .eq('status', 'new')
    .neq('type', 'newsletter')
    .lt('created_at', dayAgo)
    .order('created_at', { ascending: true })
    .limit(50);
  const stale = (staleRows ?? []) as DigestLead[];

  // Follow-ups due (migration 026). Best-effort: empty if the column is missing.
  let due: DigestLead[] = [];
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, email, type, status, follow_up_at, owner')
      .lte('follow_up_at', now.toISOString())
      .order('follow_up_at', { ascending: true })
      .limit(50);
    if (!error) {
      due = ((data ?? []) as DigestLead[]).filter(
        (l) => !['won', 'lost', 'archived'].includes(l.status ?? '')
      );
    }
  } catch {
    /* follow_up_at not migrated yet */
  }

  if (stale.length === 0 && due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, stale: 0, due: 0 });
  }

  const ageDays = (iso?: string) =>
    iso ? Math.max(1, Math.round((now.getTime() - new Date(iso).getTime()) / 86_400_000)) : 0;
  const who = (l: DigestLead) =>
    `${l.name || l.email}${l.business_name || l.company ? ` (${l.business_name || l.company})` : ''}`;

  const parts: string[] = [];
  if (stale.length) {
    parts.push(`UNANSWERED (still "new" after 24h): ${stale.length}`);
    parts.push(...stale.map((l) => `- ${who(l)} . ${l.type} . ${ageDays(l.created_at)}d old . ${l.email}`));
  }
  if (due.length) {
    if (parts.length) parts.push('');
    parts.push(`FOLLOW-UPS DUE: ${due.length}`);
    parts.push(...due.map((l) => `- ${who(l)} . ${l.type} . due${l.owner ? ` . ${l.owner}` : ''} . ${l.email}`));
  }

  const apiKey = process.env.RESEND_API_KEY;
  let sent = 0;
  if (apiKey) {
    const resend = resendClient();
    const { error } = await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: recipients(),
      subject: `Pipeline: ${stale.length} unanswered, ${due.length} follow-ups due`,
      html: leadNotification({
        type: 'Contact',
        name: 'Daily pipeline digest',
        email: 'sarah@modernmustardseed.com',
        fields: [
          { label: 'Unanswered (24h+)', value: String(stale.length) },
          { label: 'Follow-ups due', value: String(due.length) },
        ],
        message: parts.join('\n'),
        suggestedAction: `Work them here: ${ADMIN_URL}`,
      }),
    });
    if (!error) sent = 1;
    else console.error('lead-digest email failed', error);
  }

  return NextResponse.json({ ok: true, sent, stale: stale.length, due: due.length });
}
