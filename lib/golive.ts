import { getSupabase } from '@/lib/supabase';

export type GoliveWho = 'You' | 'Claude' | 'Client' | 'Done';

export type GoliveItem = {
  id: string;
  who: GoliveWho;
  what: string;
  how?: string;
  href?: string;
  label?: string;
};

export type GoliveGroup = { name: string; note?: string; items: GoliveItem[] };

export type GoliveDoneMark = { at: string; by: string };

export type GoliveRunbook = {
  slug: string;
  title: string;
  subtitle: string | null;
  repo_path: string | null;
  prod_url: string | null;
  data: GoliveGroup[];
  done: Record<string, GoliveDoneMark>;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export function itemDone(rb: Pick<GoliveRunbook, 'done'>, item: GoliveItem): boolean {
  return item.who === 'Done' || Boolean(rb.done[item.id]);
}

export function progressOf(rb: GoliveRunbook): { done: number; total: number; yoursDone: number; yoursTotal: number } {
  const items = rb.data.flatMap((g) => g.items);
  const done = items.filter((i) => itemDone(rb, i)).length;
  const yours = items.filter((i) => i.who === 'You' || i.who === 'Client');
  const yoursDone = yours.filter((i) => itemDone(rb, i)).length;
  return { done, total: items.length, yoursDone, yoursTotal: yours.length };
}

export async function listRunbooks(): Promise<GoliveRunbook[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('golive_runbooks')
    .select('*')
    .eq('archived', false)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('golive list error:', error);
    return [];
  }
  return (data ?? []) as GoliveRunbook[];
}

export async function getRunbook(slug: string): Promise<GoliveRunbook | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('golive_runbooks').select('*').eq('slug', slug).maybeSingle();
  if (error) {
    console.error('golive get error:', error);
    return null;
  }
  return (data as GoliveRunbook) ?? null;
}

/** Flip one item. Returns the fresh done map, or null on failure. */
export async function setItemDone(
  slug: string,
  itemId: string,
  done: boolean,
  by: string
): Promise<Record<string, GoliveDoneMark> | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const rb = await getRunbook(slug);
  if (!rb) return null;
  const ids = new Set(rb.data.flatMap((g) => g.items.map((i) => i.id)));
  if (!ids.has(itemId)) return null;
  const next = { ...rb.done };
  if (done) next[itemId] = { at: new Date().toISOString(), by };
  else delete next[itemId];
  const { error } = await sb
    .from('golive_runbooks')
    .update({ done: next, updated_at: new Date().toISOString() })
    .eq('slug', slug);
  if (error) {
    console.error('golive toggle error:', error);
    return null;
  }
  return next;
}
