/**
 * MUSTARD PRESS engine (server-side).
 *
 * parseCatalog: Claude turns a messy pasted price list into clean structured
 * JSON. Prices are preserved verbatim by prompt contract and then rendered
 * from the parsed data only, so the type can never invent or round a number.
 * (Prompt validated in the 2026-07-07 kill spike on diner/plumber/salon lists.)
 *
 * renderProofHtml: the shared BISTRO layout as a self-contained HTML string,
 * used by the on-page reveal (iframe srcDoc) so what the visitor sees is the
 * same layout the PDF sets.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { PressCatalog, PressProfile, PressItem } from '@/lib/press-store';

const PARSE_SYSTEM = `You parse a small business's pasted price list into clean JSON for typesetting. Output ONLY valid JSON, no prose, no markdown fences, matching:
{"sections":[{"title":string,"items":[{"name":string,"detail":string|null,"price":string,"note":string|null}]}],"footnotes":[string]}
Rules: preserve EVERY price exactly as written (normalize format to $X or $X.XX but never change the number; ranges and "from $X" stay as written; "call for rates" and "free quote" are valid prices). Multi-price items (short/full, cup/bowl) become one item whose price field shows the variants like "$5 cup / $8 bowl". Upsells ("add bacon 2") become that item's note. Policy lines (discounts, cancellation, no substitutions) become footnotes, cleaned up but faithful. Title-case section names; if the list has no sections, create ONE sensible section named after the trade. Cap at 48 items: if there are more, keep the first 48 and add a footnote "Full list continues; ask at the counter." Never invent items, prices, or sections. Item names in title case, details lowercase.`;

export async function parseCatalog(raw: string): Promise<PressCatalog | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4000,
      system: PARSE_SYSTEM,
      messages: [{ role: 'user', content: raw }],
    });
    if (response.stop_reason === 'max_tokens') {
      console.error('press parse truncated at max_tokens');
      return null;
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
      .replace(/^```(?:json)?\s*|\s*```$/g, '');
    const parsed = JSON.parse(text) as PressCatalog;
    return sanitizeCatalog(parsed);
  } catch (err) {
    console.error('press parse error', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Bound and clean a catalog (also applied to buyer edits from the client). */
export function sanitizeCatalog(input: unknown): PressCatalog | null {
  if (!input || typeof input !== 'object') return null;
  const cat = input as { sections?: unknown; footnotes?: unknown };
  if (!Array.isArray(cat.sections) || cat.sections.length === 0) return null;
  const clean = (s: unknown, max: number): string => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const sections = cat.sections.slice(0, 12).map((sec) => {
    const s = sec as { title?: unknown; items?: unknown };
    const items: PressItem[] = (Array.isArray(s.items) ? s.items : []).slice(0, 48).map((it) => {
      const i = it as { name?: unknown; detail?: unknown; price?: unknown; note?: unknown };
      return {
        name: clean(i.name, 80),
        detail: i.detail ? clean(i.detail, 100) : null,
        price: clean(i.price, 60),
        note: i.note ? clean(i.note, 120) : null,
      };
    }).filter((i) => i.name.length > 0);
    return { title: clean(s.title, 40) || 'Menu', items };
  }).filter((s) => s.items.length > 0);
  if (sections.length === 0) return null;
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  if (total === 0) return null;
  const footnotes = (Array.isArray(cat.footnotes) ? cat.footnotes : []).slice(0, 6).map((f) => clean(f, 140)).filter(Boolean);
  return { sections, footnotes };
}

function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The BISTRO proof, self-contained HTML (US Letter proportions, 816x1056). */
export function renderProofHtml(profile: PressProfile, catalog: PressCatalog, opts: { watermark: boolean }): string {
  const itemCount = catalog.sections.reduce((n, s) => n + s.items.length, 0);
  const sections = catalog.sections
    .map(
      (sec) => `
    <section>
      <h2>${esc(sec.title)}</h2>
      ${sec.items
        .map(
          (it) => `
        <div class="item">
          <div class="line">
            <span class="name">${esc(it.name)}${it.detail ? `<span class="detail"> · ${esc(it.detail)}</span>` : ''}</span>
            <span class="dots"></span>
            <span class="price">${esc(it.price)}</span>
          </div>
          ${it.note ? `<p class="note">${esc(it.note)}</p>` : ''}
        </div>`
        )
        .join('')}
    </section>`
    )
    .join('');
  const foots = catalog.footnotes.map((f) => `<span>${esc(f)}</span>`).join(' · ');
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,900;1,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 816px; min-height: 1056px; background: #FBF6EA; color: #161616; font-family: 'DM Sans', sans-serif; padding: 56px 64px 120px; position: relative; }
  .rule { border-top: 3px solid #161616; margin: 14px 0 0; }
  .rule.thin { border-top-width: 1px; margin-top: 3px; }
  header { text-align: center; }
  .est { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 5px; text-transform: uppercase; color: #B8860B; min-height: 14px; }
  h1 { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 46px; letter-spacing: -0.5px; margin-top: 8px; }
  .city { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; margin-top: 10px; }
  main { column-count: ${itemCount > 14 ? 2 : 1}; column-gap: 44px; margin-top: 26px; }
  section { break-inside: avoid; margin-bottom: 26px; }
  h2 { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 5px; text-transform: uppercase; color: #FBF6EA; background: #161616; display: inline-block; padding: 5px 12px; margin-bottom: 12px; }
  .item { margin-bottom: 10px; }
  .line { display: flex; align-items: baseline; gap: 8px; }
  .name { font-weight: 700; font-size: 15px; }
  .detail { font-weight: 400; color: #555; font-size: 13.5px; }
  .dots { flex: 1; border-bottom: 2px dotted #B8860B; transform: translateY(-3px); min-width: 24px; }
  .price { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 16px; white-space: nowrap; }
  .note { font-size: 12px; color: #666; font-style: italic; margin-top: 2px; }
  footer { position: absolute; left: 64px; right: 64px; bottom: 40px; }
  .foots { font-size: 11px; color: #555; text-align: center; line-height: 1.7; }
  .press { display: flex; justify-content: center; margin-top: 12px; }
  .press span { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #B8860B; }
  .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .watermark span { font-family: 'JetBrains Mono', monospace; font-size: 90px; font-weight: 700; letter-spacing: 20px; color: rgba(184,134,11,0.13); transform: rotate(-28deg); }
</style></head><body>
  <header>
    <div class="est">${esc(profile.tagline)}</div>
    <h1>${esc(profile.business)}</h1>
    <div class="city">${esc(profile.city)}</div>
    <div class="rule"></div><div class="rule thin"></div>
  </header>
  <main>${sections}</main>
  <footer>
    <div class="rule thin"></div>
    <p class="foots" style="margin-top:10px">${foots}</p>
    <div class="press"><span>set by hand at mustard press</span></div>
  </footer>
  ${opts.watermark ? '<div class="watermark"><span>PROOF</span></div>' : ''}
</body></html>`;
}
