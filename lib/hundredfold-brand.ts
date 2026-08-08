/**
 * THE MEMBER'S BRAND KIT.
 *
 * Sarah, 2026-08-08: *"i do want all the things that are built or generated to
 * match the colors and aesthetic ... we always want it hyper customized."*
 *
 * Before this, the factory handed the model the sentence "pick a palette and a
 * type scale that fit the trade and commit to them". It committed, alright, to
 * a different palette every single build. Two assets made for the same business
 * on the same afternoon did not match each other, which is the exact opposite
 * of what a brand is.
 *
 * ⚠️ THE PALETTE IS ENFORCED BY CONSTRUCTION, NOT BY INSTRUCTION. `brandCss()`
 * emits real CSS custom properties that are prepended into every generated
 * document, and the build law tells the model it may only reference those
 * variables. A prompt that politely asks for a colour gets a colour the model
 * likes; a `:root` block that already defines the colour gets the member's.
 * Same principle as the film camera taking a speed rather than a distance: make
 * the wrong output inexpressible instead of asking nicely for the right one.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Member } from './hundredfold-store';

export type BrandContact = {
  phone?: string;
  email?: string;
  address?: string;
  booking_url?: string;
  hours?: string;
};

export type Brand = {
  member_id: string;
  ink: string;
  paper: string;
  accent: string;
  accent_soft: string;
  line: string;
  display_font: string;
  body_font: string;
  logo_url: string | null;
  logo_dark_url: string | null;
  photo_direction: string | null;
  voice: string | null;
  avoid: string | null;
  contact: BrandContact;
  legal: string | null;
  source: 'extracted' | 'member' | 'admin' | 'default';
  extracted_from: string | null;
  extracted_at: string | null;
  updated_at?: string;
  updated_by?: string | null;
};

/**
 * The fallback, used only until a real one is extracted or typed.
 *
 * Deliberately NEUTRAL, not Modern Mustard Seed's. A member's lead magnet
 * carrying our mustard and our ink would be worse than a generic one: it would
 * be someone else's brand on their asset.
 */
export const DEFAULT_BRAND: Omit<Brand, 'member_id'> = {
  ink: '#1A1A1A',
  paper: '#FFFFFF',
  accent: '#1F5C4B',
  accent_soft: '#EDF3F1',
  line: '#E4E4E1',
  display_font: "Georgia, 'Times New Roman', serif",
  body_font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  logo_url: null,
  logo_dark_url: null,
  photo_direction: null,
  voice: null,
  avoid: null,
  contact: {},
  legal: null,
  source: 'default',
  extracted_from: null,
  extracted_at: null,
};

const HEX = /^#[0-9a-f]{6}$/i;
/** A colour we will actually paint with, or nothing. Never a half-parsed value. */
const safeHex = (v: unknown, fallback: string): string =>
  typeof v === 'string' && HEX.test(v.trim()) ? v.trim().toUpperCase() : fallback;

/** Fonts land in a `style` attribute and a PDF; strip anything that could break out. */
const safeFont = (v: unknown, fallback: string): string => {
  const s = typeof v === 'string' ? v.replace(/[<>{}\\;]/g, '').trim() : '';
  return s.length > 3 && s.length < 200 ? s : fallback;
};

export function normalizeBrand(row: Partial<Brand> | null, memberId: string): Brand {
  const d = DEFAULT_BRAND;
  return {
    member_id: memberId,
    ink: safeHex(row?.ink, d.ink),
    paper: safeHex(row?.paper, d.paper),
    accent: safeHex(row?.accent, d.accent),
    accent_soft: safeHex(row?.accent_soft, d.accent_soft),
    line: safeHex(row?.line, d.line),
    display_font: safeFont(row?.display_font, d.display_font),
    body_font: safeFont(row?.body_font, d.body_font),
    logo_url: typeof row?.logo_url === 'string' ? row.logo_url : null,
    logo_dark_url: typeof row?.logo_dark_url === 'string' ? row.logo_dark_url : null,
    photo_direction: row?.photo_direction ?? null,
    voice: row?.voice ?? null,
    avoid: row?.avoid ?? null,
    contact: (row?.contact as BrandContact) ?? {},
    legal: row?.legal ?? null,
    source: (row?.source as Brand['source']) ?? 'default',
    extracted_from: row?.extracted_from ?? null,
    extracted_at: row?.extracted_at ?? null,
    updated_at: row?.updated_at,
    updated_by: row?.updated_by ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

export async function getBrand(sb: SupabaseClient, memberId: string): Promise<Brand> {
  const { data } = await sb.from('hundredfold_brand').select('*').eq('member_id', memberId).maybeSingle();
  return normalizeBrand((data as Partial<Brand>) ?? null, memberId);
}

export async function saveBrand(
  sb: SupabaseClient,
  memberId: string,
  patch: Partial<Brand>,
  by: string,
): Promise<Brand> {
  const current = await getBrand(sb, memberId);
  // Normalised BEFORE the write, so a bad hex from a form or a model can never
  // reach a generated document.
  const next = normalizeBrand({ ...current, ...patch }, memberId);
  const { error } = await sb.from('hundredfold_brand').upsert(
    {
      ...next,
      updated_at: new Date().toISOString(),
      updated_by: by,
    },
    { onConflict: 'member_id' },
  );
  if (error) console.error('hundredfold-brand: save failed', error.message);
  return next;
}

/* -------------------------------------------------------------------------- */
/* What the generators consume                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The block prepended into every generated HTML document.
 *
 * The model is told it may only use these variables, which is enforceable in
 * review and, more importantly, is what makes two artifacts built weeks apart
 * look like the same company made them.
 */
export function brandCss(b: Brand): string {
  return `:root{--ink:${b.ink};--paper:${b.paper};--accent:${b.accent};--accent-soft:${b.accent_soft};--line:${b.line};--display:${b.display_font};--body:${b.body_font}}`;
}

/** The brand, said to the model in words, for the parts CSS cannot carry. */
export function brandBrief(b: Brand, business: string): string {
  const c = b.contact ?? {};
  const contact = [
    c.phone && `phone ${c.phone}`,
    c.email && `email ${c.email}`,
    c.address && `address ${c.address}`,
    c.hours && `hours ${c.hours}`,
    c.booking_url && `booking link ${c.booking_url}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return [
    `BRAND: ${business}.`,
    `Palette (already defined for you as CSS variables, use ONLY these): --ink ${b.ink}, --paper ${b.paper}, --accent ${b.accent}, --accent-soft ${b.accent_soft}, --line ${b.line}.`,
    `Type: display font var(--display) = ${b.display_font}; body font var(--body) = ${b.body_font}.`,
    b.logo_url ? `Logo (use it, do not draw a new one): ${b.logo_url}` : 'No logo file, so set the business name in the display font instead of inventing a mark.',
    b.voice ? `Voice: ${b.voice}` : '',
    b.avoid ? `NEVER: ${b.avoid}` : '',
    contact ? `Real contact details, use these verbatim and invent nothing: ${contact}` : 'No contact details on file, so leave an obvious [FILL IN] rather than inventing one.',
    b.legal ? `Required legal line: ${b.legal}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Art direction for stills, so separate image builds read as one shoot. */
export function photoBrief(b: Brand): string {
  return (
    b.photo_direction?.trim() ||
    'Editorial commercial photography, natural light, muted and true to life, shallow depth of field, no heavy colour grading.'
  );
}

/**
 * Prepend the brand's variables into a generated document.
 *
 * ⚠️ Injected AFTER generation as well as declared before it. The model is told
 * the variables exist, but a model that redefines `:root` in its own style tag
 * would quietly win by cascade order. Putting ours last means the member's
 * palette is what actually paints, whatever the model wrote.
 */
export function applyBrandCss(html: string, b: Brand): string {
  const block = `<style data-brand="hundredfold">${brandCss(b)}</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${block}</head>`);
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, (m) => `${m}${block}`);
  return block + html;
}

/* -------------------------------------------------------------------------- */
/* Reading a brand off their real website                                      */
/* -------------------------------------------------------------------------- */

/**
 * Pull the raw material for an extraction: the homepage HTML plus whatever
 * stylesheets it links, capped hard.
 *
 * Capped because this runs on a serverless function against a stranger's
 * website: a 12MB stylesheet or a redirect loop is somebody else's bug that
 * becomes our timeout.
 */
export async function fetchSiteSource(url: string): Promise<{ html: string; css: string; finalUrl: string } | null> {
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const res = await fetch(target, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MustardSeedBrandReader/1.0)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 400_000);
    const finalUrl = res.url || target;

    const hrefs = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
      .map((m) => /href=["']([^"']+)["']/i.exec(m[0])?.[1])
      .filter(Boolean)
      .slice(0, 3) as string[];

    let css = '';
    for (const href of hrefs) {
      try {
        const abs = new URL(href, finalUrl).toString();
        const r = await fetch(abs, { signal: AbortSignal.timeout(12_000) });
        if (r.ok) css += (await r.text()).slice(0, 300_000);
      } catch {
        /* a missing stylesheet is not a failed extraction */
      }
      if (css.length > 500_000) break;
    }
    // Inline styles carry the brand more often than not on modern builds.
    for (const m of html.matchAll(/<style[^>]*>([\s\S]{0,120000}?)<\/style>/gi)) css += m[1];

    return { html, css: css.slice(0, 600_000), finalUrl };
  } catch {
    return null;
  }
}

/** Every hex in the source, most frequent first. The model picks from real ones. */
export function paletteCandidates(css: string, html: string): { hex: string; count: number }[] {
  const counts = new Map<string, number>();
  const src = `${css}\n${html}`;
  for (const m of src.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const hex = `#${m[1].toUpperCase()}`;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  // rgb() is as common as hex in compiled CSS and is invisible to a hex scan.
  for (const m of src.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g)) {
    const hex = `#${[m[1], m[2], m[3]]
      .map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([hex, count]) => ({ hex, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);
}

/** The font stacks the site actually declares. */
export function fontCandidates(css: string): string[] {
  const out = new Set<string>();
  for (const m of css.matchAll(/font-family\s*:\s*([^;}\n]{3,160})/gi)) {
    const v = m[1].replace(/!important/i, '').trim();
    if (v && !/^var\(/.test(v) && !/inherit|initial|unset/i.test(v)) out.add(v);
  }
  return [...out].slice(0, 14);
}

/** Best guess at their logo, preferring a real mark over a social preview. */
export function logoCandidate(html: string, baseUrl: string): string | null {
  const patterns = [
    /<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']*logo[^"']*)["']/i,
    /<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) {
      try {
        return new URL(m[1], baseUrl).toString();
      } catch {
        /* keep looking */
      }
    }
  }
  return null;
}

export const brandIsSet = (b: Brand): boolean => b.source !== 'default';

/** Where a member's brand should be read from, if we have anything to read. */
export const brandSourceUrl = (member: Member): string | null =>
  member.host?.trim() ? member.host.trim() : null;
