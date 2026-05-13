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
