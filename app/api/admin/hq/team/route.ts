import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { listTeamMembers } from '@/lib/team-members';
import { resolveAdminTeamMember } from '@/lib/admin-partner';
import { normalizeEmail } from '@/lib/client-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The Partner Hub team directory. Everyone on the team can SEE everyone's
 * contact info (that is the point of a directory); an owner can edit anyone,
 * everyone can edit their own card. Partner-email changes carry entitlements
 * over, exactly like the Partner Admin update-email action.
 */

type DirectoryRow = {
  id: string;
  name: string;
  role: string;
  title: string | null;
  loginEmail: string;
  partnerEmail: string | null;
  affiliateId: string | null;
  phone: string | null;
  notifyEmail: string | null;
  code: string | null;
  active: boolean;
  isYou: boolean;
  canEdit: boolean;
};

export async function GET() {
  const me = await getAdminUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const [members, mine] = await Promise.all([listTeamMembers(), resolveAdminTeamMember(me)]);
  const codes = members.map((m) => m.affiliate_code).filter(Boolean) as string[];
  const affByCode: Record<string, { id: string; email: string }> = {};
  if (codes.length) {
    const { data } = await sb.from('affiliates').select('id,email,code').in('code', codes);
    for (const a of data ?? []) affByCode[a.code as string] = { id: a.id as string, email: a.email as string };
  }

  const rows: DirectoryRow[] = members.map((m) => {
    const aff = m.affiliate_code ? affByCode[m.affiliate_code] : undefined;
    const isYou = mine?.id === m.id;
    return {
      id: m.id,
      name: m.name,
      role: m.role,
      title: m.title,
      loginEmail: m.email,
      partnerEmail: aff?.email ?? null,
      affiliateId: aff?.id ?? null,
      phone: m.phone,
      notifyEmail: m.notify_email,
      code: m.affiliate_code,
      active: m.active,
      isYou,
      canEdit: me.role === 'owner' || isYou,
    };
  });

  return NextResponse.json({ rows, role: me.role });
}

export async function PATCH(req: Request) {
  const me = await getAdminUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: {
    id?: string;
    name?: string;
    title?: string;
    phone?: string;
    notify_email?: string;
    login_email?: string;
    partner_email?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: target } = await sb.from('team_members').select('*').eq('id', body.id).maybeSingle();
  if (!target) return NextResponse.json({ error: 'No such teammate' }, { status: 404 });

  const mine = await resolveAdminTeamMember(me);
  const isSelf = mine?.id === target.id;
  if (me.role !== 'owner' && !isSelf) {
    return NextResponse.json({ error: 'You can only edit your own card.' }, { status: 403 });
  }

  // ── team_members fields ──
  const patch: Record<string, string | null> = {};
  const clean = (v: string | undefined) => (v === undefined ? undefined : v.trim() || null);

  const name = clean(body.name);
  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
    patch.name = name;
  }
  if (body.title !== undefined) patch.title = clean(body.title) ?? null;
  if (body.phone !== undefined) patch.phone = clean(body.phone) ?? null;

  if (body.notify_email !== undefined) {
    const v = clean(body.notify_email);
    if (v && !EMAIL_RE.test(v)) return NextResponse.json({ error: 'Enter a valid notification email.' }, { status: 400 });
    patch.notify_email = v ? normalizeEmail(v) : null;
  }

  // Login email: owner only. Changing a login signs that person's next
  // session in under the new address, so the UI warns before saving.
  if (body.login_email !== undefined) {
    if (me.role !== 'owner') return NextResponse.json({ error: 'Only an owner can change a login email.' }, { status: 403 });
    const v = normalizeEmail(clean(body.login_email) ?? '');
    if (!v || !EMAIL_RE.test(v)) return NextResponse.json({ error: 'Enter a valid login email.' }, { status: 400 });
    if (v !== normalizeEmail(target.email)) {
      const { data: clash } = await sb.from('team_members').select('id').eq('email', v).neq('id', target.id).maybeSingle();
      if (clash) return NextResponse.json({ error: 'Another teammate already uses that login email.' }, { status: 409 });
      patch.email = v;
    }
  }

  if (Object.keys(patch).length) {
    const { error } = await sb.from('team_members').update(patch).eq('id', target.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Partner email (affiliates row): owner only, entitlements carry over,
  //    mirroring the Partner Admin update-email action. ──
  if (body.partner_email !== undefined) {
    if (me.role !== 'owner') return NextResponse.json({ error: 'Only an owner can change a partner email.' }, { status: 403 });
    if (!target.affiliate_code) return NextResponse.json({ error: 'This teammate has no partner code yet.' }, { status: 400 });
    const newEmail = normalizeEmail(clean(body.partner_email) ?? '');
    if (!newEmail || !EMAIL_RE.test(newEmail)) return NextResponse.json({ error: 'Enter a valid partner email.' }, { status: 400 });

    const { data: aff } = await sb.from('affiliates').select('id,email').eq('code', target.affiliate_code).maybeSingle();
    if (!aff) return NextResponse.json({ error: 'No partner row found for this code.' }, { status: 404 });

    if (newEmail !== normalizeEmail(aff.email as string)) {
      const { data: clash } = await sb.from('affiliates').select('id').eq('email', newEmail).neq('id', aff.id).maybeSingle();
      if (clash) return NextResponse.json({ error: 'Another partner already uses that email.' }, { status: 409 });
      await sb.from('entitlements').update({ email: newEmail }).eq('email', aff.email);
      const { error } = await sb.from('affiliates').update({ email: newEmail }).eq('id', aff.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
