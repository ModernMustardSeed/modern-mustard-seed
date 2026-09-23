/**
 * THE TOWN ON THE LEAD IS THE TOWN IN THE ADDRESS.
 *
 * Maps sourcing searches "<category> <town>" and files every card it gets back
 * under that town, but the feed answers with the whole area: a Bigfork search
 * returns Kalispell, Somers, Lakeside and West Glacier businesses too. The
 * 2026-09-20 Bigfork run built 288 pieces of which only 171 were in Bigfork, so
 * the route sheet said 219 miles for a village walk.
 *
 * The address is the truth, and it is printed on the flyer either way, so this
 * reads the town out of it and corrects the row. Only when the address names a
 * town we know: anything ambiguous is left alone and reported.
 *
 *   node --import tsx scripts/door-drop/fix-town.mts --region montana
 *   node --import tsx scripts/door-drop/fix-town.mts --region montana --apply
 */
import { REGIONS, loadEnv, supabase, type Region } from './select.mts';

const argv = process.argv.slice(2);
const flag = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? d);
};
const REGION: Region = REGIONS[(flag('region', 'montana') || 'montana').toLowerCase()] ?? REGIONS.montana;
const APPLY = argv.includes('--apply');

loadEnv(process.cwd());
const sb = supabase();

/** Towns we are willing to move a lead into: the region's own, plus the near ones a search drags in. */
const KNOWN = [...new Set([...REGION.towns, 'Somers', 'Lakeside', 'West Glacier', 'Coram', 'Martin City', 'Swan Lake', 'Marion', 'Kila', 'Proctor', 'Rollins', 'Elmo', 'Ferndale', 'Creston'])];

const { data, error } = await sb
  .from('outbound_leads')
  .select('id,business_name,city,address,state')
  .eq('state', REGION.state === 'Montana' ? 'MT' : REGION.state)
  .not('address', 'is', null)
  .range(0, 9999);
if (error) throw new Error(error.message);

const moves: { id: string; name: string; from: string; to: string }[] = [];
const unknown: string[] = [];
for (const l of data ?? []) {
  const addr = String(l.address ?? '');
  // "836 Holt Dr Ste 300, Bigfork, MT 59911" -> Bigfork
  const hit = KNOWN.find((t) => new RegExp(`(^|,\\s*)${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,?\\s*(MT|Montana|\\d{5})`, 'i').test(addr))
    ?? KNOWN.find((t) => new RegExp(`,\\s*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i').test(addr.trim()));
  if (!hit) { if (!/,\s*MT/i.test(addr)) unknown.push(`${l.business_name}: ${addr}`); continue; }
  if ((l.city ?? '').trim().toLowerCase() === hit.toLowerCase()) continue;
  moves.push({ id: l.id as string, name: l.business_name as string, from: (l.city as string) ?? '', to: hit });
}

const byMove: Record<string, number> = {};
for (const m of moves) byMove[`${m.from} -> ${m.to}`] = (byMove[`${m.from} -> ${m.to}`] ?? 0) + 1;
console.log(`${moves.length} leads whose town does not match their address:`);
for (const [k, n] of Object.entries(byMove).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
if (unknown.length) console.log(`\n${unknown.length} addresses with no town we recognise (left alone), e.g. ${unknown.slice(0, 3).join(' | ')}`);

if (APPLY) {
  for (const m of moves) {
    const { error: e } = await sb.from('outbound_leads').update({ city: m.to }).eq('id', m.id);
    if (e) console.log(`  FAILED ${m.name}: ${e.message}`);
  }
  console.log(`\nMoved ${moves.length}.`);
} else {
  console.log('\nDry run. Pass --apply to write.');
}
