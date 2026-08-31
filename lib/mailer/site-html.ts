/**
 * The preview site, as one self-contained HTML document.
 *
 * ONE function renders it, and both consumers call this function: Playwright
 * screenshots it for the postcard, and /y/<code> serves it into an iframe. That
 * is not tidiness, it is the product working. The recipient is holding a
 * picture of this page. If the paper and the screen disagree by so much as a
 * headline, the whole premise ("we already built this for you") dies on the
 * doormat.
 *
 * Self-contained on purpose: no external CSS, no webfont request, no script.
 * A print render must produce identical pixels on a laptop with no network, and
 * a hero photo that 404s must degrade into a designed surface rather than a
 * grey box. Fonts are system stacks that exist on Windows and macOS.
 */

import type { PreviewSpec } from '@/lib/mailer/preview';
import { prettyPhone } from '@/lib/mailer/preview';

const esc = (s: string): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** First letters of the business, for the mark. "On Time Plumbing" -> "OT". */
function monogram(business: string): string {
  const words = business.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const skip = new Set(['the', 'and', 'of', 'a', 'llc', 'inc', 'co']);
  const useful = words.filter((w) => !skip.has(w.toLowerCase()));
  const src = useful.length ? useful : words;
  return (src.slice(0, 2).map((w) => w[0]).join('') || 'M').toUpperCase();
}

/**
 * A long legal name has to fit a nav bar without wrapping into the hero.
 * "On Time Plumbing, Heating, Cooling & Electric" becomes "On Time Plumbing".
 */
export function shortName(business: string): string {
  const cut = business.split(/[,|·]/)[0].trim();
  if (cut.length >= 3 && cut.length <= 34) return cut;
  if (business.length <= 34) return business;
  const words = business.split(/\s+/);
  let out = '';
  for (const w of words) {
    if ((out + ' ' + w).trim().length > 32) break;
    out = (out + ' ' + w).trim();
  }
  return out || business.slice(0, 32);
}

/** Height of the top bar. Exported so a caller can frame the shot on the fold. */
export const NAV_HEIGHT = 88;

export type SiteHtmlOptions = {
  /** Absolute origin for the hero image, needed when Playwright renders from
   *  a file:// or a different host than the one serving /public. */
  assetOrigin?: string;
  /** Fixed viewport width baked into the document, so a headless render and a
   *  browser iframe lay out identically. */
  width?: number;
  /**
   * Override the hero height so the shot for the postcard ends exactly at the
   * bottom of the hero. Without it the fold lands mid-way through the proof
   * strip and the card prints a row of half-height letters, which reads as a
   * broken screenshot rather than a website.
   */
  heroHeight?: number;
};

export function previewSiteHtml(spec: PreviewSpec, opts: SiteHtmlOptions = {}): string {
  const { palette: p, layout } = spec;
  const width = opts.width ?? 1440;
  const hero = `${opts.assetOrigin || ''}${spec.heroImage}`;
  const phone = prettyPhone(spec.phone);
  const name = shortName(spec.business);
  const mono = monogram(spec.business);

  // Layout is the one axis that changes structure. Everything else is colour
  // and copy, so three layouts across six palettes across three headlines reads
  // as fifty-four different studios rather than one template.
  const heroAlign = layout === 'editorial' ? 'left' : layout === 'bold' ? 'center' : 'left';
  const heroHeight = opts.heroHeight ?? (layout === 'bold' ? 660 : 600);
  const overlay =
    layout === 'bold'
      ? `linear-gradient(180deg, rgba(0,0,0,.30) 0%, rgba(0,0,0,.62) 100%)`
      : `linear-gradient(96deg, rgba(0,0,0,.78) 0%, rgba(0,0,0,.55) 46%, rgba(0,0,0,.12) 100%)`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=${width}">
<title>${esc(spec.business)}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    width:${width}px; background:${p.paper}; color:${p.ink};
    font-family:"Segoe UI Variable Text","Segoe UI",Inter,system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
    -webkit-font-smoothing:antialiased; font-size:17px; line-height:1.55;
  }
  .display{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif; font-weight:700; letter-spacing:-.022em}
  .wrap{max-width:1180px;margin:0 auto;padding:0 56px}
  .eyebrow{font-size:12px;letter-spacing:.24em;text-transform:uppercase;font-weight:700}

  /* ---- top bar ---- */
  header{background:${p.paper};border-bottom:1px solid ${p.ink}14}
  .bar{display:flex;align-items:center;gap:28px;height:${NAV_HEIGHT}px}
  .mark{width:46px;height:46px;flex:0 0 46px;border-radius:11px;background:${p.accent};color:${p.onAccent};
        display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;letter-spacing:.03em}
  .brand{display:flex;flex-direction:column;line-height:1.15}
  .brand b{font-size:19px;font-weight:700;letter-spacing:-.012em}
  .brand span{font-size:11.5px;letter-spacing:.17em;text-transform:uppercase;color:${p.muted};font-weight:600}
  nav{margin-left:auto;display:flex;align-items:center;gap:30px;font-size:14.5px;font-weight:600;color:${p.muted}}
  .call{display:flex;align-items:center;gap:10px;background:${p.accent};color:${p.onAccent};
        padding:13px 22px;border-radius:9px;font-weight:700;font-size:15px;letter-spacing:.01em}

  /* ---- hero ---- */
  .hero{position:relative;height:${heroHeight}px;overflow:hidden;background:${p.ink}}
  .hero .photo{position:absolute;inset:0;background-image:url("${esc(hero)}");background-size:cover;background-position:center 42%}
  /* No photo? A designed surface, never an empty grey rectangle. */
  .hero .fallback{position:absolute;inset:0;
    background:
      radial-gradient(120% 90% at 78% 8%, ${p.accent}59 0%, transparent 58%),
      linear-gradient(155deg, ${p.ink} 0%, ${p.ink} 42%, ${p.accent}2E 100%);}
  .hero .veil{position:absolute;inset:0;background:${overlay}}
  .hero .inner{position:relative;height:100%;display:flex;flex-direction:column;justify-content:center;
    align-items:${heroAlign === 'center' ? 'center' : 'flex-start'};text-align:${heroAlign}}
  .hero .inner > *{max-width:${heroAlign === 'center' ? '860px' : '700px'}}
  .hero .eyebrow{color:#fff;opacity:.86;margin-bottom:20px}
  .hero h1{color:#fff;font-size:${layout === 'bold' ? 68 : 62}px;line-height:1.03;margin:0 0 22px}
  .hero p{color:#fff;opacity:.9;font-size:20px;line-height:1.5;margin:0 0 34px}
  .btns{display:flex;gap:14px;justify-content:${heroAlign === 'center' ? 'center' : 'flex-start'}}
  .btn{padding:17px 30px;border-radius:9px;font-weight:700;font-size:16px;letter-spacing:.01em}
  .btn.p{background:${p.accent};color:${p.onAccent}}
  .btn.s{background:rgba(255,255,255,.10);color:#fff;border:1.5px solid rgba(255,255,255,.55)}

  /* ---- proof strip ---- */
  .proof{background:${p.ink};color:#fff}
  .proof .wrap{display:flex;align-items:center;gap:46px;height:76px;font-size:14.5px;font-weight:600}
  .proof i{display:inline-block;width:7px;height:7px;border-radius:50%;background:${p.accent};margin-right:12px;vertical-align:2px}
  .proof span{opacity:.92}

  /* ---- services ---- */
  .services{padding:96px 0 100px}
  .services .eyebrow{color:${p.accent};margin-bottom:16px}
  .services h2{font-size:44px;line-height:1.1;margin:0 0 14px}
  .services .lede{color:${p.muted};font-size:18px;max-width:640px;margin:0 0 52px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .card{background:#fff;border:1px solid ${p.ink}12;border-radius:15px;padding:32px 30px 34px;
        box-shadow:0 1px 2px ${p.ink}0D, 0 12px 30px -20px ${p.ink}40}
  .card .n{font-size:12px;font-weight:800;letter-spacing:.2em;color:${p.accent};margin-bottom:16px}
  .card h3{font-size:21px;margin:0 0 9px;letter-spacing:-.012em;font-weight:700}
  .card p{margin:0;color:${p.muted};font-size:15px;line-height:1.55}

  /* ---- closing band ---- */
  .band{background:${p.accent};color:${p.onAccent}}
  .band .wrap{display:flex;align-items:center;gap:40px;padding:56px 56px}
  .band h2{font-size:38px;line-height:1.12;margin:0;flex:1}
  .band .cta{background:${p.ink};color:#fff;padding:19px 34px;border-radius:9px;font-weight:700;font-size:17px;white-space:nowrap}

  footer{background:${p.ink};color:#fff;padding:44px 0}
  footer .wrap{display:flex;align-items:center;gap:20px;font-size:14px;opacity:.75}
  footer .sp{margin-left:auto}
</style></head>
<body>

<header><div class="wrap"><div class="bar">
  <div class="mark">${esc(mono)}</div>
  <div class="brand"><b>${esc(name)}</b><span>${esc(spec.tradeLabel)}${spec.place ? ' · ' + esc(spec.place) : ''}</span></div>
  <nav><a>Services</a><a>About</a><a>Reviews</a><a>Contact</a>
    <span class="call">${phone ? esc(phone) : 'Request a quote'}</span></nav>
</div></div></header>

<section class="hero">
  <div class="fallback"></div>
  <div class="photo"></div>
  <div class="veil"></div>
  <div class="wrap inner">
    <div class="eyebrow">${esc(spec.tradeLabel)}${spec.place ? ' in ' + esc(spec.place) : ''}</div>
    <h1 class="display">${esc(spec.headline)}</h1>
    <p>${esc(spec.subhead)}</p>
    <div class="btns">
      <span class="btn p">${esc(spec.cta)}</span>
      ${phone ? `<span class="btn s">${esc(phone)}</span>` : ''}
    </div>
  </div>
</section>

<div class="proof"><div class="wrap">
  ${spec.proof.map((t) => `<span><i></i>${esc(t)}</span>`).join('')}
</div></div>

<section class="services"><div class="wrap">
  <div class="eyebrow">What we do</div>
  <h2 class="display">Everything ${esc(spec.tradeLabel.toLowerCase())}, under one roof.</h2>
  <p class="lede">${esc(spec.subhead)}</p>
  <div class="grid">
    ${spec.services
      .slice(0, 6)
      .map(
        (s, i) => `<div class="card">
      <div class="n">${String(i + 1).padStart(2, '0')}</div>
      <h3>${esc(s)}</h3>
      <p>Priced up front, scheduled around you, and finished by our own crew.</p>
    </div>`
      )
      .join('')}
  </div>
</div></section>

<div class="band"><div class="wrap">
  <h2 class="display">${esc(spec.cta)}.</h2>
  <span class="cta">${phone ? esc(phone) : 'Send a message'}</span>
</div></div>

<footer><div class="wrap">
  <span>© ${new Date().getFullYear()} ${esc(spec.business)}</span>
  ${spec.place ? `<span>· ${esc(spec.place)}</span>` : ''}
  <span class="sp">Licensed and insured</span>
</div></footer>

</body></html>`;
}
