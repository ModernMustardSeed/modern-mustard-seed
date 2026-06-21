import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured', leads: [] }, { status: 500 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const limit = Number(url.searchParams.get('limit') ?? 100);

  let q = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(limit);
  if (type) q = q.eq('type', type);
  if (status) q = q.eq('status', status);
  if (search) {
    q = q.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,business_name.ilike.%${search}%,message.ilike.%${search}%,idea_description.ilike.%${search}%`
    );
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message, leads: [] }, { status: 500 });
  }
  return NextResponse.json({ leads: data ?? [] });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEAD_TYPES = ['build-queue', 'audit', 'contact', 'newsletter'];
const LEAD_STATUSES = ['new', 'replied', 'booked', 'won', 'lost', 'archived'];

/** Admin: manually add a lead to the pipeline (referrals, walk-ins, calls). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const s = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const email = s(body.email, 200).toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  const type = LEAD_TYPES.includes(s(body.type)) ? s(body.type) : 'contact';
  const status = LEAD_STATUSES.includes(s(body.status)) ? s(body.status) : 'new';

  const insert = {
    type,
    status,
    email,
    name: s(body.name, 200) || null,
    phone: s(body.phone, 60) || null,
    business_name: s(body.business_name, 200) || null,
    message: s(body.message) || null,
    notes: s(body.notes) || null,
    source: s(body.source, 80) || 'admin-manual',
  };

  const { data, error } = await supabase.from('leads').insert(insert).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ lead: data });
}
