import { getSupabase } from '@/lib/supabase';
import { parseVerdict, routinesSecret, verdictSigOk, type VerdictInput } from '@/lib/routines';
import { prettyDate } from '@/lib/posting/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Keep or toss, from the morning brief.
 *
 * Every routine report the brief rolls up carries two signed links. GET only
 * ever renders a confirm page with one button: mail scanners open every link in
 * a message before a person does, so a GET that wrote would record a verdict
 * nobody gave. The button POSTs the same signed fields, and that is the write.
 * The last tap for a routine on a day wins.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FBF7EC;color:#161616;font:400 16px/1.55 -apple-system,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box}
  main{max-width:440px;width:100%;background:#fff;border:2px solid #161616;padding:28px 26px}
  .label{font:600 11px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:#5b5b5b;margin:0 0 14px}
  h1{font-size:24px;line-height:1.2;margin:0 0 10px}
  p{margin:0 0 16px}
  textarea{width:100%;box-sizing:border-box;min-height:84px;border:1.5px solid #161616;padding:10px;font:inherit;margin:0 0 16px;resize:vertical}
  button{appearance:none;border:2px solid #161616;background:#F5B700;color:#161616;font:inherit;font-weight:700;line-height:1;padding:14px 20px;cursor:pointer;width:100%}
  button.toss{background:#161616;color:#fff}
  .mark{display:inline-block;background:#F5B700;padding:0 6px}
</style></head><body><main>${body}</main></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}

function invalid(): Response {
  return page('Link not valid', `<p class="label">The Mustard Office</p><h1>This link is not valid.</h1><p>Open the keep or toss link straight from the morning brief. A link that was copied or edited will not record.</p>`, 400);
}

function check(v: VerdictInput | null): VerdictInput | Response {
  const secret = routinesSecret();
  if (!secret) return page('Not configured', `<p class="label">The Mustard Office</p><h1>Verdicts are not switched on yet.</h1>`, 503);
  if (!v || !verdictSigOk(secret, v.routine, v.date, v.verdict, v.sig)) return invalid();
  return v;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const v = check(parseVerdict((k) => url.searchParams.get(k)));
  if (v instanceof Response) return v;
  const keep = v.verdict === 'keep';
  return page(
    keep ? 'Keep this report' : 'Toss this report',
    `<p class="label">The Mustard Office</p>
<h1>${keep ? 'Keep' : 'Toss'} <span class="mark">${esc(v.routine)}</span></h1>
<p>The report from ${esc(prettyDate(v.date))}. ${keep ? 'Keep means it earned its slot.' : 'Toss means it did not help.'}</p>
<form method="post" action="/api/routines/verdict">
  <input type="hidden" name="r" value="${esc(v.routine)}"><input type="hidden" name="d" value="${esc(v.date)}"><input type="hidden" name="v" value="${esc(v.verdict)}"><input type="hidden" name="s" value="${esc(v.sig)}">
  <textarea name="note" maxlength="1000" placeholder="Why, in a line (optional)" aria-label="Why, in a line (optional)"></textarea>
  <button type="submit"${keep ? '' : ' class="toss"'}>${keep ? 'Record keep' : 'Record toss'}</button>
</form>`,
  );
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return invalid();
  }
  const get = (k: string) => {
    const x = form.get(k);
    return typeof x === 'string' ? x : null;
  };
  const v = check(parseVerdict(get));
  if (v instanceof Response) return v;

  const sb = getSupabase();
  if (!sb) return page('Not saved', `<p class="label">The Mustard Office</p><h1>Not saved.</h1><p>The database is not reachable. Tap the link in the brief again in a minute.</p>`, 500);
  const { error } = await sb
    .from('routine_verdicts')
    .upsert({ routine: v.routine, run_date: v.date, verdict: v.verdict, note: v.note, created_at: new Date().toISOString() }, { onConflict: 'routine,run_date' });
  if (error) return page('Not saved', `<p class="label">The Mustard Office</p><h1>Not saved.</h1><p>${esc(error.message)}</p>`, 500);

  return page(
    'Recorded',
    `<p class="label">The Mustard Office</p><h1>Recorded: ${v.verdict === 'keep' ? 'keep' : 'toss'}.</h1><p><span class="mark">${esc(v.routine)}</span> for ${esc(prettyDate(v.date))}. Tap the other link in the brief to change it.</p>`,
  );
}
