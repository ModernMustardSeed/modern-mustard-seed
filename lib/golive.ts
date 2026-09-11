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

/** A hand-added step. Lives in its own column so rescans never wipe it. */
export type GoliveExtra = { id: string; group: string; who: GoliveWho; what: string };

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

type Row = GoliveRunbook & { extras: GoliveExtra[] };

const EXTRA_GROUP = 'Added By Hand';

/** Fold hand-added steps into their groups so everything downstream sees one plan. */
function mergeExtras(row: Row): GoliveRunbook {
  const { extras, ...rb } = row;
  if (!extras?.length) return rb;
  const groups = rb.data.map((g) => ({ ...g, items: [...g.items] }));
  for (const ex of extras) {
    const item: GoliveItem = { id: ex.id, who: ex.who, what: ex.what };
    const g = groups.find((x) => x.name === ex.group);
    if (g) g.items.push(item);
    else {
      let hand = groups.find((x) => x.name === EXTRA_GROUP);
      if (!hand) {
        hand = { name: EXTRA_GROUP, items: [] };
        groups.push(hand);
      }
      hand.items.push(item);
    }
  }
  return { ...rb, data: groups };
}

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
  return ((data ?? []) as Row[]).map(mergeExtras);
}

export async function getRunbook(slug: string): Promise<GoliveRunbook | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('golive_runbooks').select('*').eq('slug', slug).maybeSingle();
  if (error) {
    console.error('golive get error:', error);
    return null;
  }
  return data ? mergeExtras(data as Row) : null;
}

/** Flip one item (scanned or hand-added). Returns the fresh done map, or null. */
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

/** Append a hand-added step to a group. Returns the stored extra, or null. */
export async function addExtraItem(
  slug: string,
  group: string,
  who: GoliveWho,
  what: string
): Promise<GoliveExtra | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('golive_runbooks').select('data, extras').eq('slug', slug).maybeSingle();
  if (error || !data) return null;
  const row = data as Pick<Row, 'data' | 'extras'>;
  const taken = new Set([
    ...row.data.flatMap((g) => g.items.map((i) => i.id)),
    ...(row.extras ?? []).map((e) => e.id),
  ]);
  let id = 'hand-' + slugify(what).slice(0, 24);
  for (let n = 2; taken.has(id); n++) id = 'hand-' + slugify(what).slice(0, 24) + '-' + n;
  const extra: GoliveExtra = { id, group, who, what: what.trim() };
  const { error: upErr } = await sb
    .from('golive_runbooks')
    .update({ extras: [...(row.extras ?? []), extra], updated_at: new Date().toISOString() })
    .eq('slug', slug);
  if (upErr) {
    console.error('golive extra error:', upErr);
    return null;
  }
  return extra;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The starter checklist a hub-created project begins with. Stable st- ids; the
 * golive skill's deep scan REPLACES these with verified facts (checks on st-
 * ids drop then, by design: scanned items are different claims).
 */
function starterGroups(kind: 'ours' | 'client'): GoliveGroup[] {
  const groups: GoliveGroup[] = [
    {
      name: '1 · Accounts & Keys',
      note: 'Starter list. A deep scan replaces it with verified facts.',
      items: [
        { id: 'st-domain', who: 'You', what: 'Buy or point the domain', how: 'DNS at the registrar, bound to the host. Dead until this exists.' },
        { id: 'st-keys', who: 'You', what: 'Every env key the code needs, set in production', how: 'The repo’s env example file is the list. Missing keys fail silently more often than loudly.' },
        { id: 'st-analytics', who: 'You', what: 'Pick analytics', how: 'Vercel Analytics is the one-line default. Shipping with zero measurement is the common miss.' },
      ],
    },
    {
      name: '2 · Build & Deploy',
      items: [
        { id: 'st-build', who: 'Claude', what: 'Clean production build, zero type errors' },
        { id: 'st-deploy', who: 'Claude', what: 'Deploy, bind the domain, verify it serves anonymously', how: 'Deployment protection off for anything a client will open.' },
        { id: 'st-assets', who: 'Claude', what: 'Favicon, OG share image, sitemap, robots, per-page metadata', how: 'Blank shares and default icons read as unfinished.' },
      ],
    },
    {
      name: '3 · Content & Design',
      items: [
        { id: 'st-copy', who: 'Claude', what: 'Real copy end to end: zero placeholders, zero lorem, no dead links' },
        { id: 'st-visual', who: 'You', what: 'Visual sign-off on the direction', how: 'The moodboard-before-build law, applied.' },
        { id: 'st-imagery', who: kind === 'client' ? 'Client' : 'You', what: 'Real imagery in place of anything generated or temporary' },
      ],
    },
    {
      name: '4 · Revenue & Launch',
      items: [
        { id: 'st-convert', who: 'Claude', what: 'A working conversion path (form, booking, or checkout), walked end to end', how: 'Submit it for real. A page that cannot take a lead is a poster.' },
        { id: 'st-pricing', who: 'You', what: 'Prices approved before they face the public' },
        ...(kind === 'client'
          ? [
              { id: 'st-client-assets', who: 'Client' as GoliveWho, what: 'Client assets in hand: photos, logins, domain access' },
              { id: 'st-client-approve', who: 'Client' as GoliveWho, what: 'Client approves copy, pricing, and the launch date' },
            ]
          : []),
        { id: 'st-scan', who: 'Claude', what: 'Deep scan: run the golive skill on the repo so this starter list becomes verified facts' },
      ],
    },
  ];
  return groups;
}

/** Create a runbook from the hub. Returns the slug, or null. */
export async function createRunbook(args: {
  title: string;
  repo_path?: string | null;
  prod_url?: string | null;
  kind?: 'ours' | 'client';
}): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const title = args.title.trim();
  if (!title) return null;
  const base = slugify(title) || 'project';
  const { data: rows } = await sb.from('golive_runbooks').select('slug');
  const taken = new Set((rows ?? []).map((r: { slug: string }) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  const kind = args.kind === 'client' ? 'client' : 'ours';
  const { error } = await sb.from('golive_runbooks').insert({
    slug,
    title,
    subtitle:
      kind === 'client'
        ? 'Client build. Starter checklist until the deep scan runs.'
        : 'Starter checklist until the deep scan runs.',
    repo_path: args.repo_path?.trim() || null,
    prod_url: args.prod_url?.trim() || null,
    data: starterGroups(kind),
    done: {},
    extras: [],
  });
  if (error) {
    console.error('golive create error:', error);
    return null;
  }
  return slug;
}

/* ===========================================================================
 * THE STANDARD LAUNCH, AND ITS CLIENT SIDE
 * ======================================================================== */

/**
 * Create the standard launch runbook for a client who has no Google Business
 * Profile yet, which is most of them.
 *
 * Idempotent on client_email: calling it twice returns the existing slug rather
 * than creating a second list. Two runbooks for one person means two answers to
 * "am I done", and the one they are looking at is always the wrong one.
 */
export async function createStandardLaunch(args: {
  title: string;
  clientEmail: string;
  facts: import('@/data/launch-standard').LaunchFacts;
  repo_path?: string | null;
  prod_url?: string | null;
}): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const email = args.clientEmail.trim().toLowerCase();
  if (!email) return null;

  const { data: existing } = await sb
    .from('golive_runbooks')
    .select('slug')
    .eq('client_email', email)
    .eq('archived', false)
    .maybeSingle();
  if (existing?.slug) return existing.slug as string;

  const { standardLaunchGroups } = await import('@/data/launch-standard');
  const title = args.title.trim() || args.facts.business;
  const base = slugify(title) || 'launch';
  const { data: rows } = await sb.from('golive_runbooks').select('slug');
  const taken = new Set((rows ?? []).map((r: { slug: string }) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  const { error } = await sb.from('golive_runbooks').insert({
    slug,
    title,
    subtitle:
      'Standard launch for a business with no Google Business Profile yet. ' +
      'The Client steps are the ones only the owner can do; the portal shows them those.',
    repo_path: args.repo_path?.trim() || null,
    prod_url: args.prod_url?.trim() || args.facts.siteUrl || null,
    client_email: email,
    facts: args.facts,
    data: standardLaunchGroups(args.facts),
    done: {},
    extras: [],
  });
  if (error) {
    console.error('golive standard create error:', error);
    return null;
  }
  return slug;
}

/** The runbook belonging to a signed-in client, or null. */
export async function runbookForClient(email: string): Promise<GoliveRunbook | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const clean = (email || '').trim().toLowerCase();
  if (!clean) return null;
  const { data, error } = await sb
    .from('golive_runbooks')
    .select('*')
    .eq('client_email', clean)
    .eq('archived', false)
    .maybeSingle();
  if (error) {
    console.error('golive client lookup error:', error);
    return null;
  }
  return data ? mergeExtras(data as Row) : null;
}

/**
 * Tick one of the CLIENT's own steps, from the portal.
 *
 * Deliberately not setItemDone with a different caller: a client must never be
 * able to tick a step they do not own. The runbook is looked up by their email
 * and the item's who is checked before anything is written, so a hand-made
 * request naming somebody else's slug or our item id does nothing.
 */
export async function setClientItemDone(
  email: string,
  itemId: string,
  done: boolean,
): Promise<Record<string, GoliveDoneMark> | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const rb = await runbookForClient(email);
  if (!rb) return null;
  const item = rb.data.flatMap((g) => g.items).find((i) => i.id === itemId);
  if (!item || item.who !== 'Client') return null;

  const next = { ...rb.done };
  if (done) next[itemId] = { at: new Date().toISOString(), by: email.trim().toLowerCase() };
  else delete next[itemId];

  const { error } = await sb
    .from('golive_runbooks')
    .update({ done: next, updated_at: new Date().toISOString() })
    .eq('slug', rb.slug);
  if (error) {
    console.error('golive client toggle error:', error);
    return null;
  }
  return next;
}
