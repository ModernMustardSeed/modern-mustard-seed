import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load' }, { status: 500 });
  return NextResponse.json({ testimonials: data ?? [] });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(b.name ?? '').trim();
  const quote = String(b.quote ?? '').trim();
  if (!name || !quote) return NextResponse.json({ error: 'Name and quote are required.' }, { status: 400 });

  const { data, error } = await supabase
    .from('testimonials')
    .insert({
      name,
      quote,
      role: (b.role as string)?.trim() || null,
      company: (b.company as string)?.trim() || null,
      outcome: (b.outcome as string)?.trim() || null,
      rating: Math.max(1, Math.min(5, Math.round(Number(b.rating) || 5))),
      featured: !!b.featured,
      sort: Math.round(Number(b.sort) || 0),
      status: b.status === 'hidden' ? 'hidden' : 'published',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
