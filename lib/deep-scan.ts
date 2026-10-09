/**
 * THE DEEP SCAN.
 *
 * The presence audit grades what a stranger sees: the listing, the stars, the
 * website's argument. The deep scan reads what sits underneath it, the parts an
 * owner never looks at and pays for anyway: how fast the page answers, whether
 * the certificate and the domain are about to lapse, whether anyone on earth can
 * send email that looks like it came from them, whether Google and the AI
 * engines are allowed to read the site at all, and whether the page gives a
 * visitor a way to call, book or write.
 *
 * EVERY CHECK IS MEASURED, NONE IS JUDGED. No model runs here. Each line prints
 * what we found (the actual title tag, the actual DMARC record, the actual
 * expiry date) so the owner, or whoever built their site, can confirm it in a
 * minute. The deep scan does not move the presence grade: it is the engineering
 * under the grade, reported as found, and the report says so.
 *
 * THE SAME HONESTY RULES AS THE REST OF THE AUDIT.
 *   - A check we could not run is left off, never failed. A DNS timeout is not
 *     "your email is unprotected"; it is no line at all.
 *   - An absence is only ever claimed about the page we read, and the line
 *     says which page ("on your homepage"). The contact page facts come from
 *     lib/site-facts.ts, which reads the contact and hours pages too.
 *   - A page whose words arrive by script (very little readable text, a lot of
 *     JavaScript) cannot be read for absences, so content absences on it are
 *     reported as "could not read", never as missing.
 *
 * `collectDeepScan` does the network work; `evaluateDeepScan` is pure and
 * unit tested in scripts/acq-test.mts.
 */

import { parse, type HTMLElement } from 'node-html-parser';
import type { SiteFacts } from '@/lib/site-facts';

/* ────────────────────────────── the shapes ──────────────────────────────── */

export type ScanStatus = 'pass' | 'warn' | 'fail' | 'info';
export type Effort = 'minutes' | 'afternoon' | 'build';

export type ScanCheck = {
  id: string;
  label: string;
  status: ScanStatus;
  /** What we actually found, quoted where we can. Printed on every line. */
  found: string;
  /** Why it matters, in the owner's language. */
  why: string;
  /** The fix, when there is one. Only set on warn and fail. */
  fix?: string;
  effort?: Effort;
  /** A real emergency: it goes to the top of the fix list. */
  urgent?: boolean;
};

export type SectionKey = 'speed' | 'security' | 'domain' | 'email' | 'search' | 'ai' | 'conversion';

export type ScanSection = {
  key: SectionKey;
  label: string;
  /** One line about what this section is for. */
  blurb: string;
  checks: ScanCheck[];
};

export type SearchSnapshot = {
  /** The page title as Google would most likely print it. */
  title: string | null;
  description: string | null;
  /** Breadcrumb-style display URL, the way a result shows it. */
  display_url: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  favicon: string | null;
  site_name: string | null;
};

export type DeepScan = {
  version: 1;
  url: string;
  final_url: string;
  scanned_at: string;
  /** The website builder, when the page says so (Wix, Squarespace, WordPress...). */
  platform: string | null;
  /** True when the page's words arrive by script and absences cannot be claimed. */
  script_rendered: boolean;
  snapshot: SearchSnapshot;
  /** Lab numbers from Google PageSpeed when a key is configured, else null. */
  vitals: {
    source: 'pagespeed';
    performance: number | null;
    lcp_ms: number | null;
    cls: number | null;
    tbt_ms: number | null;
    /** Field data from real Chrome visitors, when Google has enough of it. */
    field: { lcp_ms: number | null; inp_ms: number | null; cls: number | null } | null;
  } | null;
  sections: ScanSection[];
  counts: { pass: number; warn: number; fail: number; info: number; total: number };
};

/* ─────────────────────────── what the network hands us ──────────────────── */

export type RawScan = {
  url: string;
  final_url: string;
  /** Null when the homepage could not be fetched at all. */
  status: number | null;
  ttfb_ms: number | null;
  html_bytes: number;
  html: string;
  headers: Record<string, string>;
  /** Where http:// ended up, or null when it could not be fetched. */
  http_redirect_to: string | null;
  http_checked: boolean;
  cert: { valid_to: string; issuer: string | null; authorized: boolean } | null;
  cert_checked: boolean;
  robots_txt: string | null;
  robots_checked: boolean;
  sitemap_found: boolean | null;
  llms_txt_found: boolean | null;
  dns: { mx: string[]; spf: string[]; dmarc: string | null } | null;
  rdap: { expires: string | null; registered: string | null; registrar: string | null } | null;
  vitals: DeepScan['vitals'];
};

export type ScanContext = {
  town?: string | null;
  business?: string | null;
  facts?: SiteFacts | null;
  /** Today, injectable so tests do not rot. */
  now?: Date;
};

/* ───────────────────────────── small helpers ────────────────────────────── */

const DAY_MS = 86_400_000;

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&ndash;|&#8211;/gi, '-')
    .replace(/&mdash;|&#8212;/gi, ', ')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)));
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function kb(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

const TWO_LEVEL = /^(co|com|org|net|gov|edu|ac)\.[a-z]{2}$/;

/** murrelldental.com from https://www.murrelldental.com/contact */
export function registrableDomain(url: string): string {
  try {
    const parts = new URL(url).hostname.toLowerCase().replace(/\.$/, '').split('.');
    if (parts.length <= 2) return parts.join('.');
    return TWO_LEVEL.test(parts.slice(-2).join('.')) ? parts.slice(-3).join('.') : parts.slice(-2).join('.');
  } catch {
    return '';
  }
}

/** Hosted-platform domains whose DNS and registration belong to the platform, not the owner. */
const PLATFORM_HOSTS = /\.(wixsite\.com|squarespace\.com|godaddysites\.com|weebly\.com|wordpress\.com|webflow\.io|myshopify\.com|square\.site|business\.site|carrd\.co|vercel\.app|netlify\.app|duda\.co|site123\.me|jimdosite\.com|mailchimpsites\.com|ueniweb\.com)$/i;

export function ownsDomain(url: string): boolean {
  try {
    return !PLATFORM_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** tel:+14065085860 -> (406) 508-5860. Anything that is not ten US digits prints as written. */
function prettyPhone(tel: string): string {
  let raw = tel.replace(/^tel:/i, '');
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep it as written */
  }
  const d = raw.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw.trim();
}

/* ─────────────────────────────── platform ───────────────────────────────── */

export function detectPlatform(html: string, headers: Record<string, string>): string | null {
  const gen = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ?? '';
  const h = (k: string) => headers[k.toLowerCase()] ?? '';
  if (/wix\.com/i.test(gen) || /static\.wixstatic\.com|wix-bolt|_wixCssImports/i.test(html) || h('x-wix-request-id')) return 'Wix';
  if (/squarespace/i.test(gen) || /static1\.squarespace\.com|Static\.SQUARESPACE_CONTEXT/i.test(html)) return 'Squarespace';
  if (/shopify/i.test(gen) || /cdn\.shopify\.com|Shopify\.theme/i.test(html)) return 'Shopify';
  if (/webflow/i.test(gen) || /data-wf-site|assets\.website-files\.com|cdn\.prod\.website-files\.com/i.test(html)) return 'Webflow';
  if (/godaddy|go daddy|starfield/i.test(gen) || /img1\.wsimg\.com|websites\.godaddy\.com/i.test(html)) return 'GoDaddy Website Builder';
  if (/weebly/i.test(gen) || /editmysite\.com|weebly\.com/i.test(html)) return 'Weebly / Square Online';
  if (/duda/i.test(gen) || /irp\.cdn-website\.com|dmAlbum|duda_website/i.test(html)) return 'Duda';
  if (/wordpress/i.test(gen) || /\/wp-content\/|\/wp-includes\//i.test(html)) {
    if (/elementor/i.test(html)) return 'WordPress (Elementor)';
    if (/et_pb_|divi/i.test(html)) return 'WordPress (Divi)';
    return 'WordPress';
  }
  if (/hubspot/i.test(gen) || /hs-scripts\.com|hubspot\.net/i.test(html)) return 'HubSpot';
  if (/__NEXT_DATA__|\/_next\/static\//.test(html)) return 'Next.js';
  if (/joomla/i.test(gen)) return 'Joomla';
  return gen ? clip(gen, 40) : null;
}

/* ───────────────────────────────── vitals ───────────────────────────────── */

function vitalsChecks(v: NonNullable<DeepScan['vitals']>): ScanCheck[] {
  const out: ScanCheck[] = [];
  if (v.performance !== null) {
    const p = v.performance;
    out.push({
      id: 'psi-performance',
      label: 'Google PageSpeed score on a phone',
      status: p >= 90 ? 'pass' : p >= 50 ? 'warn' : 'fail',
      found: `${p} out of 100 on Google's mobile test.`,
      why: 'Google runs this exact test on a mid-range phone over a mobile connection. It is the closest thing to how your page feels in a parking lot.',
      ...(p < 90 ? { fix: 'Compress and resize the largest images, defer the scripts that are not needed to show the first screen, and drop any plugin or widget nobody uses.', effort: p < 50 ? ('build' as const) : ('afternoon' as const) } : {}),
    });
  }
  const lcp = v.field?.lcp_ms ?? v.lcp_ms;
  if (lcp !== null && lcp !== undefined) {
    const s = lcp / 1000;
    out.push({
      id: 'lcp',
      label: 'Time until the main thing on screen appears',
      status: lcp <= 2500 ? 'pass' : lcp <= 4000 ? 'warn' : 'fail',
      found: `${s.toFixed(1)} seconds${v.field?.lcp_ms ? ' for real visitors on Chrome' : ' on Google\'s phone test'}. Google's line for good is 2.5.`,
      why: 'This is the moment a visitor decides the page works. Every second past two and a half loses a share of the people who tapped.',
      ...(lcp > 2500 ? { fix: 'Serve the hero image in a modern format at the size it is shown, and stop it waiting on fonts and scripts.', effort: 'afternoon' as const } : {}),
    });
  }
  const cls = v.field?.cls ?? v.cls;
  if (cls !== null && cls !== undefined) {
    out.push({
      id: 'cls',
      label: 'Does the page jump while it loads',
      status: cls <= 0.1 ? 'pass' : cls <= 0.25 ? 'warn' : 'fail',
      found: `Layout shift of ${cls.toFixed(2)}. Google's line for good is 0.10.`,
      why: 'A page that shifts under a thumb is how people tap the wrong thing and leave.',
      ...(cls > 0.1 ? { fix: 'Give images and embeds a fixed width and height, and reserve space for banners before they load.', effort: 'afternoon' as const } : {}),
    });
  }
  if (v.field?.inp_ms !== null && v.field?.inp_ms !== undefined) {
    const inp = v.field.inp_ms;
    out.push({
      id: 'inp',
      label: 'How fast the page reacts to a tap',
      status: inp <= 200 ? 'pass' : inp <= 500 ? 'warn' : 'fail',
      found: `${inp} ms for real visitors on Chrome. Google's line for good is 200.`,
      why: 'A button that takes half a second to respond feels broken, and people tap twice or give up.',
      ...(inp > 200 ? { fix: 'Cut the heavy scripts that run on every tap: chat widgets, sliders and trackers are the usual three.', effort: 'afternoon' as const } : {}),
    });
  }
  return out;
}

/* ───────────────────────────── the evaluation ───────────────────────────── */

type Doc = {
  root: HTMLElement;
  text: string;
  words: number;
  scripts: number;
  hrefs: string[];
  ldTypes: string[];
  ldRaw: string[];
};

function readDoc(html: string): Doc {
  const root = parse(html, { comment: false, blockTextElements: { script: true, noscript: true, style: true, pre: true } });
  const ldRaw = root.querySelectorAll('script[type="application/ld+json"]').map((s) => s.rawText);
  const ldTypes = new Set<string>();
  for (const raw of ldRaw) {
    for (const m of raw.matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)) {
      for (const t of m[1].matchAll(/"([^"]+)"/g)) ldTypes.add(t[1]);
    }
  }
  const body = root.querySelector('body') ?? root;
  const clone = parse(body.toString(), { comment: false, blockTextElements: { script: true, noscript: true, style: true } });
  for (const el of clone.querySelectorAll('script, style, noscript, svg, template')) el.remove();
  const text = decode(clone.textContent.replace(/\s+/g, ' ').trim());
  const words = text ? text.split(' ').filter((w) => /[a-z]/i.test(w)).length : 0;
  return {
    root,
    text,
    words,
    scripts: root.querySelectorAll('script[src]').length,
    hrefs: root.querySelectorAll('a[href]').map((a) => a.getAttribute('href') ?? ''),
    ldTypes: [...ldTypes],
    ldRaw,
  };
}

const LOCAL_TYPES = /LocalBusiness|Store|Restaurant|Dentist|Physician|MedicalBusiness|MedicalClinic|LegalService|Attorney|HomeAndConstructionBusiness|Contractor|Plumber|Electrician|RoofingContractor|HVACBusiness|GeneralContractor|HousePainter|Locksmith|MovingCompany|AutoRepair|AutomotiveBusiness|BeautySalon|HairSalon|DaySpa|HealthClub|ExerciseGym|FoodEstablishment|CafeOrCoffeeShop|Bakery|BarOrPub|LodgingBusiness|Hotel|ProfessionalService|AccountingService|FinancialService|RealEstateAgent|VeterinaryCare|ChildCare|Optician|Organization|Corporation/;

const AI_BOTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Applebot-Extended'];

/** Which named user agents a robots.txt shuts out of the whole site. */
export function robotsBlocks(robots: string): { all: boolean; bots: string[] } {
  const groups: { agents: string[]; disallowAll: boolean }[] = [];
  let cur: { agents: string[]; disallowAll: boolean; sawRule: boolean } | null = null;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === 'user-agent') {
      if (!cur || cur.sawRule) {
        cur = { agents: [], disallowAll: false, sawRule: false };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
    } else if (cur && (key === 'disallow' || key === 'allow')) {
      cur.sawRule = true;
      if (key === 'disallow' && val === '/') cur.disallowAll = true;
    }
  }
  const blocked = (agent: string) => {
    const own = groups.find((g) => g.agents.includes(agent.toLowerCase()));
    if (own) return own.disallowAll;
    const star = groups.find((g) => g.agents.includes('*'));
    return Boolean(star?.disallowAll);
  };
  return { all: blocked('Googlebot'), bots: AI_BOTS.filter((b) => blocked(b)) };
}

function mailProvider(mx: string[]): string | null {
  const all = mx.join(' ').toLowerCase();
  if (/google\.com|googlemail/.test(all)) return 'Google Workspace';
  if (/outlook\.com|protection\.outlook/.test(all)) return 'Microsoft 365';
  if (/zoho/.test(all)) return 'Zoho Mail';
  if (/secureserver\.net/.test(all)) return 'GoDaddy email';
  if (/emailsrvr|rackspace/.test(all)) return 'Rackspace';
  if (/icloud|me\.com/.test(all)) return 'iCloud';
  if (/protonmail/.test(all)) return 'Proton Mail';
  if (/titan\.email/.test(all)) return 'Titan';
  if (/mimecast|pphosted|proofpoint|barracuda/.test(all)) return 'a filtered corporate mail service';
  return null;
}

const ANALYTICS: [RegExp, string][] = [
  [/googletagmanager\.com\/gtag\/js|gtag\(\s*['"]config['"]\s*,\s*['"]G-/i, 'Google Analytics 4'],
  [/googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/i, 'Google Tag Manager'],
  [/connect\.facebook\.net\/[^"']+\/fbevents\.js|fbq\(\s*['"]init/i, 'Meta Pixel'],
  [/plausible\.io\/js/i, 'Plausible'],
  [/static\.hotjar\.com|hotjar/i, 'Hotjar'],
  [/clarity\.ms/i, 'Microsoft Clarity'],
  [/\/_vercel\/insights|va\.vercel-scripts/i, 'Vercel Analytics'],
  [/wix-analytics|frog\.wix\.com/i, 'Wix Analytics'],
  [/squarespace-cdn\.com\/.*analytics|Static\.SQUARESPACE_CONTEXT/i, 'Squarespace Analytics'],
  [/stats\.wp\.com|jetpack/i, 'Jetpack Stats'],
  [/callrail|calltrk/i, 'CallRail call tracking'],
];

const SOCIAL: [RegExp, string][] = [
  [/facebook\.com\/(?!sharer|share|dialog|tr\b|plugins)/i, 'Facebook'],
  [/instagram\.com\//i, 'Instagram'],
  [/linkedin\.com\/(company|in)\//i, 'LinkedIn'],
  [/youtube\.com\/(@|c\/|channel|user)|youtu\.be/i, 'YouTube'],
  [/tiktok\.com\/@/i, 'TikTok'],
  [/(twitter|x)\.com\/(?!intent|share)[A-Za-z0-9_]+/i, 'X'],
  [/pinterest\.com\/(?!pin\/create)/i, 'Pinterest'],
  [/yelp\.com\/biz\//i, 'Yelp'],
  [/nextdoor\.com\//i, 'Nextdoor'],
  [/houzz\.com\//i, 'Houzz'],
  [/g\.page\/|maps\.app\.goo\.gl|google\.com\/maps|business\.google\.com/i, 'Google'],
];

const REVIEW_WIDGETS = /elfsight|trustindex|birdeye|podium|nicejob|grade\.us|reviewsonmywebsite|embedsocial|trustpilot|yotpo|judge\.me|stamped\.io|sociablekit|widget\.reviews|featurable|shapo/i;
const CHAT_WIDGETS = /intercom|drift\.com|tawk\.to|crisp\.chat|livechatinc|zendesk|hubspot.*conversations|podium|birdeye.*webchat|tidio|olark|freshchat|smartsupp|chatra|gorgias|vapi|elevenlabs|voiceflow|botpress|wix-chat|manychat/i;

export function evaluateDeepScan(raw: RawScan, ctx: ScanContext = {}): DeepScan {
  const now = ctx.now ?? new Date();
  const year = now.getUTCFullYear();
  const doc = readDoc(raw.html || '<html></html>');
  const html = raw.html || '';
  const facts = ctx.facts && ctx.facts.reachable ? ctx.facts : null;
  const platform = detectPlatform(html, raw.headers);
  // Very little readable text and a pile of scripts: the words arrive by
  // JavaScript and our reader cannot see them, so no content absence may be
  // claimed. Wix and Squarespace render on the server and are not caught here.
  const scriptRendered = raw.status !== null && doc.words < 80 && doc.scripts >= 4;
  const finalUrl = raw.final_url || raw.url;
  const host = (() => {
    try {
      return new URL(finalUrl).hostname.replace(/^www\./, '');
    } catch {
      return finalUrl;
    }
  })();
  const onHome = 'on your homepage';
  const could = (c: ScanCheck): ScanCheck =>
    scriptRendered && (c.status === 'fail' || c.status === 'warn')
      ? { id: c.id, label: c.label, status: 'info', found: 'Your homepage draws its words with JavaScript, so our reader could not see enough of it to check this. Nothing here counts against you.', why: c.why }
      : c;

  const meta = (sel: string) => doc.root.querySelector(sel)?.getAttribute('content')?.trim() || null;
  const titleRaw = doc.root.querySelector('title')?.text?.trim() || null;
  const title = titleRaw ? decode(titleRaw) : null;
  const description = meta('meta[name="description"]') ? decode(meta('meta[name="description"]')!) : null;
  const ogTitle = meta('meta[property="og:title"]');
  const ogDesc = meta('meta[property="og:description"]');
  const ogImage = meta('meta[property="og:image"]') ?? meta('meta[name="twitter:image"]');
  const siteName = meta('meta[property="og:site_name"]');
  const iconHref = doc.root.querySelector('link[rel~="icon"]')?.getAttribute('href') ?? doc.root.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ?? doc.root.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ?? null;
  const abs = (u: string | null) => {
    if (!u) return null;
    try {
      return new URL(u, finalUrl).toString();
    } catch {
      return null;
    }
  };
  const displayUrl = (() => {
    try {
      const u = new URL(finalUrl);
      const path = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
      return [u.origin, ...path].join(' › ');
    } catch {
      return finalUrl;
    }
  })();

  const snapshot: SearchSnapshot = {
    title: title ? clip(title, 70) : null,
    description: description ? clip(description, 170) : null,
    display_url: displayUrl,
    og_title: ogTitle ? clip(decode(ogTitle), 90) : null,
    og_description: ogDesc ? clip(decode(ogDesc), 200) : null,
    og_image: abs(ogImage),
    favicon: abs(iconHref),
    site_name: siteName ? clip(decode(siteName), 60) : null,
  };

  const sections: ScanSection[] = [];

  /* ── speed ── */
  {
    const checks: ScanCheck[] = [];
    if (raw.vitals) checks.push(...vitalsChecks(raw.vitals));
    if (raw.ttfb_ms !== null) {
      const t = raw.ttfb_ms;
      checks.push({
        id: 'ttfb',
        label: 'How fast your server answers',
        status: t <= 800 ? 'pass' : t <= 1800 ? 'warn' : 'fail',
        found: `${(t / 1000).toFixed(2)} seconds before the first byte came back, measured from our server.`,
        why: 'Nothing can appear on screen until the server answers. Under a second is healthy; past two, every other speed fix is fighting uphill.',
        ...(t > 800 ? { fix: 'Turn on page caching or a CDN in your host or builder. On WordPress, a caching plugin and a better host usually cut this in half.', effort: 'afternoon' as const } : {}),
      });
    }
    if (raw.status !== null && html) {
      const b = raw.html_bytes;
      checks.push({
        id: 'html-weight',
        label: 'Weight of the homepage itself',
        status: b <= 300_000 ? 'pass' : b <= 900_000 ? 'warn' : 'fail',
        found: `${kb(b)} of HTML before a single image loads.`,
        why: 'A heavy page is slow on a phone with two bars, which is where most people find a local business.',
        ...(b > 300_000 ? { fix: 'Page builders pile up inline code. Removing unused sections and builder add-ons trims it; a hand-built page is usually under 100 KB.', effort: b > 900_000 ? ('build' as const) : ('afternoon' as const) } : {}),
      });
      const s = doc.scripts;
      checks.push({
        id: 'scripts',
        label: 'Separate scripts the page loads',
        status: s <= 20 ? 'pass' : s <= 40 ? 'warn' : 'fail',
        found: `${s} script file${s === 1 ? '' : 's'} referenced by the homepage.`,
        why: 'Every script is another download a phone has to finish, and most of them are trackers, widgets and plugins doing nothing for the visitor.',
        ...(s > 20 ? { fix: 'List what each script is for and remove the ones nobody can name. Chat, review and booking widgets can load after the page instead of before it.', effort: 'afternoon' as const } : {}),
      });
      const imgs = doc.root.querySelectorAll('img');
      const srcs = imgs.map((i) => `${i.getAttribute('src') ?? ''} ${i.getAttribute('srcset') ?? ''} ${i.getAttribute('data-src') ?? ''}`);
      const modern = srcs.filter((s2) => /\.(webp|avif)\b|format=(webp|avif)|fm=(webp|avif)|\/_next\/image|wixstatic\.com\/media\/.*\/v1\/|squarespace-cdn\.com.*format=|cdn\.shopify\.com|img1\.wsimg\.com\/isteam|irp\.cdn-website\.com|images\.squarespace-cdn\.com/i.test(s2)).length;
      const legacy = srcs.filter((s2) => /\.(jpe?g|png)\b/i.test(s2)).length;
      if (imgs.length >= 3) {
        const share = modern / imgs.length;
        checks.push({
          id: 'image-format',
          label: 'Images in a modern format',
          status: share >= 0.6 || legacy === 0 ? 'pass' : share >= 0.2 ? 'warn' : 'fail',
          found: `${modern} of ${imgs.length} images on your homepage are served as WebP or AVIF, or through a builder that converts them.`,
          why: 'WebP and AVIF are the same picture at a third to a half of the size. Images are usually most of what a page weighs.',
          ...(share < 0.6 && legacy > 0 ? { fix: 'Convert the photos to WebP (most builders and WordPress image plugins do it with one switch) and size them to the width they are shown at.', effort: 'minutes' as const } : {}),
        });
        const lazy = imgs.filter((i) => /lazy/i.test(i.getAttribute('loading') ?? '') || /lazy/i.test(i.getAttribute('class') ?? '') || ['data-src', 'data-srclazy', 'data-lazy-src', 'data-srcset', 'data-lazy'].some((a) => i.getAttribute(a))).length;
        if (imgs.length >= 6) {
          checks.push({
            id: 'lazy',
            label: 'Images below the fold wait their turn',
            status: lazy >= Math.floor(imgs.length / 3) ? 'pass' : 'warn',
            found: `${lazy} of ${imgs.length} images are set to load only when scrolled to.`,
            why: 'Images nobody has scrolled to yet should not compete with the first screen for a phone\'s bandwidth.',
            ...(lazy < Math.floor(imgs.length / 3) ? { fix: 'Add loading="lazy" to every image below the first screen. Most builders have a setting for it.', effort: 'minutes' as const } : {}),
          });
        }
      }
    }
    if (checks.length) sections.push({ key: 'speed', label: 'Speed', blurb: 'How long a stranger on a phone waits before they see you.', checks });
  }

  /* ── security and trust ── */
  {
    const checks: ScanCheck[] = [];
    const https = /^https:/i.test(finalUrl) && raw.status !== null;
    if (raw.status !== null || raw.cert_checked) {
      checks.push({
        id: 'https',
        label: 'Secure connection (HTTPS)',
        status: https ? 'pass' : 'fail',
        found: https ? `Your site loads over HTTPS at ${host}.` : `Your site did not load over HTTPS. Browsers label it "Not secure" next to your name.`,
        why: 'Chrome and Safari print "Not secure" on any page without it, right where a customer is deciding whether to trust you.',
        ...(https ? {} : { fix: 'Turn on the free SSL certificate in your host or builder and force every visit to https. It is a switch, not a project.', effort: 'minutes' as const, urgent: true }),
      });
    }
    if (raw.http_checked && https) {
      const ok = raw.http_redirect_to !== null && /^https:/i.test(raw.http_redirect_to);
      checks.push({
        id: 'http-redirect',
        label: 'The old http:// address forwards to the secure one',
        status: ok ? 'pass' : 'warn',
        found: ok ? 'Typing http:// sends people to the secure page.' : 'Typing http:// did not forward to the secure page.',
        why: 'Old links, printed cards and some apps still use http://. Without the forward those visitors see a warning or a dead page.',
        ...(ok ? {} : { fix: 'Turn on "force HTTPS" (sometimes called "always use HTTPS") in your host, builder or Cloudflare.', effort: 'minutes' as const }),
      });
    }
    if (raw.cert) {
      const days = Math.floor((new Date(raw.cert.valid_to).getTime() - now.getTime()) / DAY_MS);
      // Auto-renewing issuers (Let's Encrypt, Google, Cloudflare, Amazon) renew
      // inside the last 30 days on their own, so a short runway there is normal.
      const auto = /let'?s encrypt|google trust|cloudflare|amazon|sectigo.*cpanel|zerossl|wix|squarespace|godaddy/i.test(raw.cert.issuer ?? '');
      const status: ScanStatus = !raw.cert.authorized || days < 0 ? 'fail' : days <= 7 && !auto ? 'fail' : days <= 21 && !auto ? 'warn' : 'pass';
      checks.push({
        id: 'cert',
        label: 'Security certificate',
        status,
        found: !raw.cert.authorized || days < 0
          ? `The certificate did not validate${days < 0 ? `: it expired on ${fmtDate(raw.cert.valid_to)}` : ''}.`
          : `Valid until ${fmtDate(raw.cert.valid_to)} (${days} day${days === 1 ? '' : 's'})${raw.cert.issuer ? `, issued by ${raw.cert.issuer}` : ''}${auto ? ', which renews itself' : ''}.`,
        why: 'When a certificate lapses, every browser shows a full-page warning instead of your site. Nobody clicks through it.',
        ...(status !== 'pass' ? { fix: 'Renew the certificate with your host today, or move to one that renews itself (Let\'s Encrypt is free and automatic on almost every host).', effort: 'minutes' as const, urgent: status === 'fail' } : {}),
      });
    }
    if (raw.status !== null && https) {
      const hsts = Boolean(raw.headers['strict-transport-security']);
      const headerHits = ['strict-transport-security', 'x-content-type-options', 'content-security-policy', 'x-frame-options', 'referrer-policy'].filter((k) => raw.headers[k]);
      checks.push({
        id: 'headers',
        label: 'Security headers',
        status: headerHits.length >= 3 ? 'pass' : headerHits.length >= 1 ? 'warn' : 'fail',
        found: headerHits.length ? `${headerHits.length} of 5 standard headers sent (${headerHits.join(', ')}).` : 'None of the 5 standard security headers were sent.',
        why: 'These are a few lines of server settings that stop your site being framed by a lookalike page, and they are what an insurance or vendor security questionnaire asks about.',
        ...(headerHits.length < 3 ? { fix: `Add ${hsts ? '' : 'Strict-Transport-Security, '}X-Content-Type-Options, Referrer-Policy and X-Frame-Options in your host or Cloudflare. Your web person can do it in ten minutes.`, effort: 'minutes' as const } : {}),
      });
      const mixed = (html.match(/<(img|script|iframe|link)[^>]+(src|href)=["']http:\/\/(?!localhost)[^"']+/gi) ?? []).length;
      checks.push({
        id: 'mixed',
        label: 'Everything on the page loads securely',
        status: mixed === 0 ? 'pass' : 'warn',
        found: mixed === 0 ? 'Every image, script and frame on your homepage loads over HTTPS.' : `${mixed} item${mixed === 1 ? '' : 's'} on your homepage still load${mixed === 1 ? 's' : ''} over plain http://.`,
        why: 'Browsers block or flag insecure pieces on a secure page, which is how images go missing and padlocks disappear.',
        ...(mixed ? { fix: 'Change those http:// links to https://. A search-and-replace in the builder or a WordPress plugin does it.', effort: 'minutes' as const } : {}),
      });
    }
    // A copyright line that stopped counting reads as a business that stopped.
    if (doc.text && !scriptRendered) {
      const m = /(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/i.exec(doc.text) ?? /(\d{4})\s*©/.exec(doc.text);
      const y = m ? Number(m[1]) : null;
      if (y && y > 1990 && y <= year) {
        checks.push({
          id: 'copyright',
          label: 'The site looks looked-after',
          status: y >= year - 1 ? 'pass' : 'warn',
          found: `The footer says © ${y}.`,
          why: 'An old year in the footer is the first thing a careful customer notices, and it reads as a business that stopped paying attention.',
          ...(y < year - 1 ? { fix: 'Set the footer year to update itself, or just change it. Two minutes.', effort: 'minutes' as const } : {}),
        });
      }
    }
    if (checks.length) sections.push({ key: 'security', label: 'Security and trust', blurb: 'The padlock, the certificate and the little signals that say somebody is minding the store.', checks });
  }

  /* ── domain ── */
  if (ownsDomain(finalUrl) && raw.rdap) {
    const checks: ScanCheck[] = [];
    const domain = registrableDomain(finalUrl);
    if (raw.rdap.expires) {
      const days = Math.floor((new Date(raw.rdap.expires).getTime() - now.getTime()) / DAY_MS);
      const status: ScanStatus = days < 30 ? 'fail' : days < 60 ? 'warn' : 'pass';
      checks.push({
        id: 'domain-expiry',
        label: 'Your domain name is paid up',
        status,
        found: `${domain} is registered until ${fmtDate(raw.rdap.expires)}${days >= 0 ? `, ${days} days from today` : ', which has passed'}${raw.rdap.registrar ? `, with ${raw.rdap.registrar}` : ''}.`,
        why: 'When a domain lapses, the website and every email address on it stop working the same day, and expired names get bought by squatters within hours.',
        ...(status !== 'pass'
          ? {
              fix: `Log in to ${raw.rdap.registrar ?? 'your registrar'} and check that auto-renew is on for ${domain}, with a card that will not expire first. If it is, this renews itself; if it is not, renew for several years while you are there.`,
              effort: 'minutes' as const,
              urgent: status === 'fail',
            }
          : {}),
      });
    }
    if (raw.rdap.registered) {
      const yrs = Math.floor((now.getTime() - new Date(raw.rdap.registered).getTime()) / (365.25 * DAY_MS));
      checks.push({
        id: 'domain-age',
        label: 'How long the name has been yours',
        status: 'info',
        found: `${domain} was first registered on ${fmtDate(raw.rdap.registered)}${yrs >= 1 ? `, ${yrs} year${yrs === 1 ? '' : 's'} ago` : ''}.`,
        why: 'An established domain carries history with search engines. Keep it: moving to a new name starts that clock again.',
      });
    }
    if (checks.length) sections.push({ key: 'domain', label: 'Your domain', blurb: 'The name everything else hangs on, and when it comes due.', checks });
  }

  /* ── email ── */
  if (ownsDomain(finalUrl) && raw.dns) {
    const checks: ScanCheck[] = [];
    const domain = registrableDomain(finalUrl);
    const provider = mailProvider(raw.dns.mx);
    const hasMail = raw.dns.mx.length > 0;
    checks.push({
      id: 'mx',
      label: 'Email at your own domain',
      status: hasMail ? 'pass' : 'info',
      found: hasMail ? `${domain} receives email${provider ? ` through ${provider}` : ''}.` : `${domain} is not set up to receive email.`,
      why: 'An address at your own name (you@yourbusiness.com) is read as more established than a free mailbox, and it stays yours if you change providers.',
    });
    const spf = raw.dns.spf;
    const sendsMail = hasMail || spf.length > 0;
    if (sendsMail) {
      checks.push({
        id: 'spf',
        label: 'SPF: the list of who may send as you',
        status: spf.length === 1 ? (/[~-]all\b/.test(spf[0]) ? 'pass' : 'warn') : 'fail',
        found: spf.length === 0 ? `No SPF record on ${domain}.` : spf.length > 1 ? `${spf.length} SPF records on ${domain}. Mail servers treat two as none.` : `"${clip(spf[0], 120)}"`,
        why: 'Without one, Gmail and Outlook cannot tell your real invoices and quotes from a forgery, and they send both to spam.',
        ...(spf.length === 1 && /[~-]all\b/.test(spf[0]) ? {} : { fix: spf.length > 1 ? 'Merge the SPF records into one TXT record that lists every service that sends for you.' : `Add one TXT record at ${domain}: v=spf1 include:(your email provider) ~all. Your provider's help page has the exact line.`, effort: 'minutes' as const }),
      });
      const dmarc = raw.dns.dmarc;
      const policy = dmarc ? (/\bp\s*=\s*(none|quarantine|reject)/i.exec(dmarc)?.[1]?.toLowerCase() ?? null) : null;
      checks.push({
        id: 'dmarc',
        label: 'DMARC: what happens to forged email in your name',
        status: !dmarc ? 'fail' : policy === 'none' || !policy ? 'warn' : 'pass',
        found: dmarc ? `"${clip(dmarc, 120)}"` : `No DMARC record at _dmarc.${domain}.`,
        why: !dmarc
          ? 'Anyone can send an email that says it is from you, a fake invoice to your customers included, and nothing tells their inbox to stop it. Google and Yahoo have also required DMARC from bulk senders since February 2024.'
          : policy === 'none'
            ? 'Your record watches but does not act: forged mail in your name still gets delivered. It is the right first step and it should not be the last one.'
            : 'Forged mail in your name gets quarantined or refused. This is the setting most small businesses never reach.',
        ...(policy === 'quarantine' || policy === 'reject' ? {} : { fix: dmarc ? 'Once your real mail passes for a few weeks, move the policy from p=none to p=quarantine.' : `Add a TXT record at _dmarc.${domain}: v=DMARC1; p=none; rua=mailto:(your address). Move to p=quarantine once reports show your own mail passing.`, effort: 'minutes' as const }),
      });
    }
    // A free mailbox printed on a site that owns its own domain.
    const shownEmail = facts?.email ?? null;
    if (shownEmail && /@(gmail|yahoo|hotmail|outlook|aol|icloud|live|msn|comcast)\./i.test(shownEmail)) {
      checks.push({
        id: 'free-mailbox',
        label: 'The address customers see',
        status: 'warn',
        found: `Your site lists ${shownEmail}.`,
        why: `You already own ${domain}. An address on it reads as an established business; a free mailbox next to it reads as a side project, and it is the account you lose if that one login is ever taken.`,
        fix: hasMail ? `Use an address at ${domain} on the site; you already receive mail there.` : `Add email to ${domain} (Google Workspace, Microsoft 365 or Zoho), then forward the old mailbox to it.`,
        effort: 'minutes',
      });
    }
    sections.push({ key: 'email', label: 'Email you can trust', blurb: 'Whether your mail lands, and whether somebody else can send mail as you.', checks });
  }

  /* ── search basics ── */
  if (raw.status !== null && html) {
    const checks: ScanCheck[] = [];
    const town = (ctx.town ?? '').trim();
    const titleLen = title?.length ?? 0;
    const titleHasTown = Boolean(town && title && title.toLowerCase().includes(town.toLowerCase()));
    checks.push({
      id: 'title',
      label: 'Page title (the blue link in Google)',
      status: !title ? 'fail' : titleLen < 15 || titleLen > 70 ? 'warn' : town && !titleHasTown ? 'warn' : 'pass',
      found: title ? `"${clip(title, 90)}" (${titleLen} characters).` : 'Your homepage has no title tag.',
      why: town
        ? `This is the headline of your Google result. The ones that win name the service and the town, because that is what people type: "${town}" belongs in it.`
        : 'This is the headline of your Google result, and the one line every search engine and AI reads first.',
      ...(title && titleLen >= 15 && titleLen <= 70 && (!town || titleHasTown) ? {} : { fix: `Write it as: What you do in ${town || 'your town'} | ${ctx.business ?? 'Your Business Name'}. Keep it under 60 characters.`, effort: 'minutes' as const }),
    });
    const dLen = description?.length ?? 0;
    checks.push({
      id: 'description',
      label: 'Meta description (the grey text under the link)',
      status: !description ? 'fail' : dLen < 70 || dLen > 170 ? 'warn' : 'pass',
      found: description ? `"${clip(description, 170)}" (${dLen} characters).` : 'No meta description, so Google writes its own from whatever text it finds.',
      why: 'It is your two-line ad on the results page. Left blank, Google often picks a cookie notice or a menu.',
      ...(description && dLen >= 70 && dLen <= 170 ? {} : { fix: 'Write 140 to 160 characters: what you do, where, one proof point (years, reviews, a guarantee), and how to reach you.', effort: 'minutes' as const }),
    });
    const h1s = doc.root.querySelectorAll('h1').map((h) => decode(h.text.replace(/\s+/g, ' ').trim())).filter(Boolean);
    checks.push(could({
      id: 'h1',
      label: 'One clear main heading',
      status: h1s.length === 1 ? 'pass' : h1s.length === 0 ? 'fail' : 'warn',
      found: h1s.length === 0 ? `No H1 heading ${onHome}.` : h1s.length === 1 ? `"${clip(h1s[0], 100)}"` : `${h1s.length} H1 headings ${onHome}, starting "${clip(h1s[0], 60)}".`,
      why: 'Search engines and screen readers use the main heading to decide what the page is about. One, and it should say what you do.',
      ...(h1s.length === 1 ? {} : { fix: 'Make exactly one H1 on the homepage, and make it say what you do and where.', effort: 'minutes' as const }),
    }));
    const viewport = Boolean(doc.root.querySelector('meta[name="viewport"]'));
    checks.push({
      id: 'viewport',
      label: 'Built for phones',
      status: viewport ? 'pass' : 'fail',
      found: viewport ? 'The page tells phones to fit it to the screen.' : 'No mobile viewport tag: phones draw the desktop page shrunk to fit.',
      why: 'Most people who find a local business find it on a phone. Google ranks the phone version of your site, not the desktop one.',
      ...(viewport ? {} : { fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> and test the site on a phone. If it was not designed for phones, it needs to be.', effort: 'build' as const }),
    });
    const noindexMeta = /noindex/i.test(meta('meta[name="robots"]') ?? '') || /noindex/i.test(meta('meta[name="googlebot"]') ?? '');
    const noindexHeader = /noindex/i.test(raw.headers['x-robots-tag'] ?? '');
    const robots = raw.robots_txt ? robotsBlocks(raw.robots_txt) : null;
    if (noindexMeta || noindexHeader || robots?.all) {
      checks.push({
        id: 'indexable',
        label: 'Google is allowed to list you',
        status: 'fail',
        found: noindexMeta || noindexHeader ? 'Your homepage tells search engines "noindex": do not list this page.' : 'Your robots.txt blocks search engines from the whole site.',
        why: 'This one line keeps you out of Google entirely. It is usually left on by accident when a site launches.',
        fix: noindexMeta || noindexHeader ? 'Remove the noindex setting (in WordPress: Settings, Reading, uncheck "Discourage search engines"), then request indexing in Google Search Console.' : 'Remove the "Disallow: /" line from robots.txt, then request indexing in Google Search Console.',
        effort: 'minutes',
        urgent: true,
      });
    } else {
      checks.push({
        id: 'indexable',
        label: 'Google is allowed to list you',
        status: 'pass',
        found: raw.robots_checked ? 'No noindex tag, and robots.txt lets search engines in.' : 'No noindex tag on your homepage.',
        why: 'The most expensive mistake in this whole report is a site that tells Google to stay away. Yours does not.',
      });
    }
    const canonical = doc.root.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
    checks.push({
      id: 'canonical',
      label: 'One official address for the page',
      status: canonical ? 'pass' : 'warn',
      found: canonical ? `Canonical set to ${clip(canonical, 80)}.` : 'No canonical tag.',
      why: 'Without it, Google can split your ranking between the www and non-www, http and https copies of the same page.',
      ...(canonical ? {} : { fix: 'Add a canonical link tag pointing at the one address you want ranked. Most SEO plugins and builders have it as a setting.', effort: 'minutes' as const }),
    });
    if (raw.sitemap_found !== null) {
      checks.push({
        id: 'sitemap',
        label: 'A sitemap for search engines',
        status: raw.sitemap_found ? 'pass' : 'warn',
        found: raw.sitemap_found ? 'A sitemap is published.' : 'No sitemap at /sitemap.xml or in robots.txt.',
        why: 'A sitemap is the list of pages you hand Google so it finds the new ones without guessing.',
        ...(raw.sitemap_found ? {} : { fix: 'Turn on the sitemap in your builder or SEO plugin, then submit it in Google Search Console.', effort: 'minutes' as const }),
      });
    }
    const imgs = doc.root.querySelectorAll('img');
    if (imgs.length >= 3) {
      const withAlt = imgs.filter((i) => (i.getAttribute('alt') ?? '').trim().length > 0).length;
      const share = withAlt / imgs.length;
      checks.push({
        id: 'alt',
        label: 'Photos described in words',
        status: share >= 0.8 ? 'pass' : share >= 0.5 ? 'warn' : 'fail',
        found: `${withAlt} of ${imgs.length} images ${onHome} have alt text.`,
        why: 'Alt text is how Google Images, screen readers and AI engines know your photo shows a finished kitchen in Kalispell rather than "IMG_4471".',
        ...(share >= 0.8 ? {} : { fix: 'Give every real photo a short, plain description of what it shows and where. Skip it only on decorative shapes.', effort: 'minutes' as const }),
      });
    }
    const lang = doc.root.querySelector('html')?.getAttribute('lang') ?? /<html[^>]+lang=["']([^"']+)/i.exec(html)?.[1] ?? null;
    checks.push({
      id: 'lang',
      label: 'Page language declared',
      status: lang ? 'pass' : 'warn',
      found: lang ? `Declared as "${lang}".` : 'No language declared on the page.',
      why: 'Screen readers and translators use it to read the page aloud correctly, and search engines use it to match you to searchers.',
      ...(lang ? {} : { fix: 'Add lang="en" to the <html> tag.', effort: 'minutes' as const }),
    });
    checks.push({
      id: 'og',
      label: 'A picture when your link is shared',
      status: ogImage ? 'pass' : 'warn',
      found: ogImage ? 'Your homepage sets a share image and title.' : 'No share image: a text or Facebook post with your link shows a blank box.',
      why: 'When a happy customer texts your link to a friend, this image is the first impression. Blank looks broken.',
      ...(ogImage ? {} : { fix: 'Set an Open Graph image (1200 by 630, your best job photo with your name on it) in the builder or SEO plugin.', effort: 'minutes' as const }),
    });
    checks.push({
      id: 'favicon',
      label: 'Your icon in the browser tab',
      status: iconHref ? 'pass' : 'warn',
      found: iconHref ? 'A site icon is set.' : 'No site icon: tabs and Google results show a generic globe.',
      why: 'Google prints the icon next to your result on phones. A blank globe beside four competitors\' logos is noticed.',
      ...(iconHref ? {} : { fix: 'Upload a square version of your logo as the site icon.', effort: 'minutes' as const }),
    });
    sections.push({ key: 'search', label: 'Search basics', blurb: 'What Google reads first, and whether it is allowed to read you at all.', checks });
  }

  /* ── AI search ── */
  if (raw.status !== null && html) {
    const checks: ScanCheck[] = [];
    const local = doc.ldTypes.filter((t) => LOCAL_TYPES.test(t));
    checks.push({
      id: 'schema',
      label: 'Business details in machine-readable form',
      status: local.length ? 'pass' : doc.ldTypes.length ? 'warn' : 'fail',
      found: doc.ldTypes.length ? `Structured data found: ${doc.ldTypes.slice(0, 6).join(', ')}.` : `No structured data (JSON-LD) ${onHome}.`,
      why: 'Structured data is the business card you hand to Google, ChatGPT and Perplexity: name, trade, address, hours, phone and reviews in a form they can quote without guessing.',
      ...(local.length ? {} : { fix: 'Add a LocalBusiness JSON-LD block (the most specific type for your trade) with name, address, phone, hours, service area and a link to your Google profile.', effort: 'afternoon' as const }),
    });
    if (local.length) {
      const blob = doc.ldRaw.join(' ');
      const has = (k: string) => new RegExp(`"${k}"\\s*:`).test(blob);
      const fields = ['telephone', 'address', 'openingHours|openingHoursSpecification', 'geo', 'sameAs', 'aggregateRating|review', 'areaServed'].filter((k) => k.split('|').some(has));
      checks.push({
        id: 'schema-depth',
        label: 'How complete that business card is',
        status: fields.length >= 5 ? 'pass' : fields.length >= 3 ? 'warn' : 'fail',
        found: `${fields.length} of 7 key fields filled (${fields.map((f) => f.split('|')[0]).join(', ') || 'none'}).`,
        why: 'Every missing field is a question an AI answers with a guess or with a competitor who filled it in.',
        ...(fields.length >= 5 ? {} : { fix: 'Fill in phone, address, hours, service area, map coordinates, your social and Google profile links (sameAs) and your rating.', effort: 'minutes' as const }),
      });
    }
    const robots = raw.robots_txt ? robotsBlocks(raw.robots_txt) : null;
    if (robots) {
      checks.push({
        id: 'ai-bots',
        label: 'AI assistants are allowed to read you',
        status: robots.bots.length === 0 ? 'pass' : robots.bots.length >= 4 ? 'fail' : 'warn',
        found: robots.bots.length ? `Your robots.txt blocks ${robots.bots.join(', ')}.` : 'Your robots.txt lets ChatGPT, Claude, Perplexity and Google\'s AI read the site.',
        why: 'More people now ask an AI "who is the best in town" than scroll ten blue links. A blocked assistant cannot recommend a business it is not allowed to read.',
        ...(robots.bots.length ? { fix: 'Remove the Disallow lines for those AI crawlers (often added by a security plugin with a default you never chose).', effort: 'minutes' as const } : {}),
      });
    }
    if (raw.llms_txt_found !== null) {
      checks.push({
        id: 'llms',
        label: 'An llms.txt guide for AI engines',
        status: raw.llms_txt_found ? 'pass' : 'warn',
        found: raw.llms_txt_found ? 'An llms.txt file is published.' : 'No llms.txt file.',
        why: 'llms.txt is a short plain-text summary of who you are and what you do, written for AI engines. Few local businesses have one yet, which is exactly why it is worth having.',
        ...(raw.llms_txt_found ? {} : { fix: 'Publish /llms.txt: your name, trade, towns served, services, hours, phone and the five questions customers ask most, answered.', effort: 'minutes' as const }),
      });
    }
    const faq = doc.ldTypes.includes('FAQPage') || /\b(faq|frequently asked|common questions)\b/i.test(doc.text);
    checks.push(could({
      id: 'faq',
      label: 'Questions answered in your own words',
      status: faq ? 'pass' : 'warn',
      found: faq ? `Your homepage answers common questions${doc.ldTypes.includes('FAQPage') ? ', marked up as FAQ data' : ''}.` : `No questions-and-answers section ${onHome}.`,
      why: 'AI answers are built from sentences that answer questions. A page that already says "Yes, we serve Whitefish, and estimates are free" gets quoted.',
      ...(faq ? {} : { fix: 'Add six real customer questions with short, specific answers (price ranges, areas served, timelines), marked up as FAQPage.', effort: 'afternoon' as const }),
    }));
    checks.push(could({
      id: 'words',
      label: 'Enough words for a machine to quote',
      status: doc.words >= 300 ? 'pass' : doc.words >= 120 ? 'warn' : 'fail',
      found: `About ${doc.words.toLocaleString('en-US')} readable words ${onHome}.`,
      why: 'Search engines and AI can only repeat what is written as text. A homepage of photos and three headlines gives them nothing to say about you.',
      ...(doc.words >= 300 ? {} : { fix: 'Write what you do, where, for whom, how it works and why you, in plain sentences. 400 to 800 words on the homepage is the healthy range.', effort: 'afternoon' as const }),
    }));
    sections.push({ key: 'ai', label: 'AI search', blurb: 'Whether ChatGPT, Claude, Perplexity and Google\'s AI can read you, and quote you.', checks });
  }

  /* ── conversion plumbing ── */
  if (raw.status !== null && html) {
    const checks: ScanCheck[] = [];
    const tel = doc.hrefs.find((h) => /^tel:/i.test(h)) ?? null;
    const phoneShown = facts?.phone ?? null;
    checks.push(could({
      id: 'tap-to-call',
      label: 'Tap to call',
      status: tel ? 'pass' : 'fail',
      found: tel ? `Your number is a tap-to-call link (${prettyPhone(tel)}).` : phoneShown ? `${phoneShown} is printed ${onHome} but is not a tap-to-call link.` : `No tap-to-call link ${onHome}.`,
      why: 'On a phone, a number that is not a link has to be memorised or copied. Most people do neither; they call the next result.',
      ...(tel ? {} : { fix: 'Wrap the phone number in a tel: link and put it in the header so it is on every page.', effort: 'minutes' as const }),
    }));
    const forms = doc.root.querySelectorAll('form').filter((f) => f.querySelectorAll('input, textarea').length >= 2 && !/search/i.test(f.getAttribute('role') ?? '') && !/search/i.test(f.getAttribute('action') ?? ''));
    const formEmbed = /(jotform|typeform|wufoo|formstack|hsforms|hubspot.*forms|gravityforms|wpforms|ninja-forms|contact-form-7|wpcf7|cognitoforms|formspree|getform|tally\.so|fillout|google\.com\/forms|wix-forms|sqs-block-form|fluentform|elementor-form)/i.test(html);
    const booking = facts?.booking ?? null;
    checks.push(could({
      id: 'capture',
      label: 'A way to reach you without calling',
      status: forms.length || formEmbed || booking ? 'pass' : 'warn',
      found: forms.length || formEmbed ? `A contact or quote form is ${onHome}.` : booking ? `No form ${onHome}, but your site offers online booking.` : `No contact form or booking ${onHome}.`,
      why: 'A third of people will not phone a business they have not used before, and most searches happen when you cannot pick up. A form catches them; without one they are gone.',
      ...(forms.length || formEmbed || booking ? {} : { fix: 'Put a three-field form (name, phone, what you need) on the homepage, and have it text you the moment it is sent.', effort: 'afternoon' as const }),
    }));
    if (facts) {
      checks.push({
        id: 'booking',
        label: 'Book online',
        status: booking ? 'pass' : 'info',
        found: booking ? (/^https?:/i.test(booking) ? 'Your site links to online booking.' : `Your site offers it: "${clip(booking, 60)}".`) : 'We did not find online booking on your homepage or contact pages.',
        why: 'For any business that books appointments, a calendar that takes bookings at 10pm is a second receptionist who never sleeps.',
      });
    }
    const analytics = ANALYTICS.filter(([re]) => re.test(html)).map(([, n]) => n);
    checks.push(could({
      id: 'analytics',
      label: 'You can see who visits',
      status: analytics.length ? 'pass' : 'warn',
      found: analytics.length ? `Installed: ${[...new Set(analytics)].join(', ')}.` : `No analytics found ${onHome}.`,
      why: 'Without it you cannot tell which ad, post or listing sends the calls, so every marketing dollar is a guess.',
      ...(analytics.length ? {} : { fix: 'Install Google Analytics 4 (free) and mark a phone tap and a form send as conversions.', effort: 'minutes' as const }),
    }));
    const socials = [...new Set(SOCIAL.filter(([re]) => doc.hrefs.some((h) => re.test(h))).map(([, n]) => n))];
    checks.push(could({
      id: 'social',
      label: 'Your other profiles, linked',
      status: socials.length >= 2 ? 'pass' : socials.length === 1 ? 'pass' : 'warn',
      found: socials.length ? `Linked from your homepage: ${socials.join(', ')}.` : `No links to your social or review profiles ${onHome}.`,
      why: 'Links between your site and your profiles tell Google and the AI engines they are the same business, which is how a name gets trusted.',
      ...(socials.length ? {} : { fix: 'Link your Google profile, Facebook and any review sites from the footer, and link back to the site from each of them.', effort: 'minutes' as const }),
    }));
    const reviewsShown = REVIEW_WIDGETS.test(html) || /\b(testimonials?|what (our )?(customers|clients|patients) say|reviews?)\b/i.test(doc.text) || doc.ldTypes.some((t) => /Review|AggregateRating/.test(t));
    checks.push(could({
      id: 'reviews-on-site',
      label: 'Your reviews, on your own site',
      status: reviewsShown ? 'pass' : 'warn',
      found: reviewsShown ? `Reviews or testimonials appear ${onHome}.` : `No reviews or testimonials ${onHome}.`,
      why: 'People land on your site to check you out. The reviews they just read on Google should be there to meet them, not two clicks away.',
      ...(reviewsShown ? {} : { fix: 'Put three real reviews, with first names and the job, right under the first screen, and link to the rest on Google.', effort: 'minutes' as const }),
    }));
    const chat = CHAT_WIDGETS.test(html);
    checks.push({
      id: 'after-hours',
      label: 'Something answers after hours',
      status: chat ? 'pass' : 'info',
      found: chat ? 'A chat or assistant widget is installed.' : `No chat or answering assistant ${onHome}.`,
      why: 'Most searches for a local business happen evenings and weekends. Whatever answers then gets the job.',
    });
    sections.push({ key: 'conversion', label: 'Turning visits into calls', blurb: 'Once somebody is on the page, how easily can they reach you.', checks });
  }

  const all = sections.flatMap((s) => s.checks);
  const counts = {
    pass: all.filter((c) => c.status === 'pass').length,
    warn: all.filter((c) => c.status === 'warn').length,
    fail: all.filter((c) => c.status === 'fail').length,
    info: all.filter((c) => c.status === 'info').length,
    total: all.length,
  };

  return {
    version: 1,
    url: raw.url,
    final_url: finalUrl,
    scanned_at: now.toISOString(),
    platform,
    script_rendered: scriptRendered,
    snapshot,
    vitals: raw.vitals,
    sections,
    counts,
  };
}

/** Every warn and fail with a fix, urgent first, then by effort (cheapest first). */
export function scanFixes(scan: DeepScan | null | undefined): (ScanCheck & { section: string })[] {
  if (!scan) return [];
  const order: Record<Effort, number> = { minutes: 0, afternoon: 1, build: 2 };
  return scan.sections
    .flatMap((s) => s.checks.map((c) => ({ ...c, section: s.label })))
    .filter((c) => (c.status === 'fail' || c.status === 'warn') && c.fix)
    .sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)) || (a.status === 'fail' ? 0 : 1) - (b.status === 'fail' ? 0 : 1) || order[a.effort ?? 'afternoon'] - order[b.effort ?? 'afternoon']);
}

/* ─────────────────────────────── the network ────────────────────────────── */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 ModernMustardSeedAudit/1.0';

async function timed<T>(ms: number, work: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await work(ac.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchText(url: string, ms: number, maxBytes = 2_500_000): Promise<{ status: number; text: string; finalUrl: string } | null> {
  return timed(ms, async (signal) => {
    const res = await fetch(url, { signal, redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,text/plain,*/*' } });
    const text = (await res.text()).slice(0, maxBytes);
    return { status: res.status, text, finalUrl: res.url || url };
  });
}

async function readCert(host: string, ms: number): Promise<RawScan['cert']> {
  const tls = await import('node:tls');
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: RawScan['cert']) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    try {
      const sock = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false, timeout: ms }, () => {
        const c = sock.getPeerCertificate();
        const issuer = c?.issuer ? String((c.issuer as Record<string, unknown>).O ?? (c.issuer as Record<string, unknown>).CN ?? '') || null : null;
        finish(c?.valid_to ? { valid_to: new Date(c.valid_to).toISOString(), issuer, authorized: sock.authorized } : null);
        sock.end();
      });
      sock.on('error', () => finish(null));
      sock.on('timeout', () => {
        sock.destroy();
        finish(null);
      });
    } catch {
      finish(null);
    }
  });
}

async function readDns(domain: string, ms: number): Promise<RawScan['dns']> {
  const dns = await import('node:dns');
  const r = dns.promises;
  const txt = async (name: string) => {
    try {
      return (await r.resolveTxt(name)).map((parts) => parts.join(''));
    } catch (e) {
      const code = (e as { code?: string }).code;
      // No record is an answer. A timeout or SERVFAIL is not.
      if (code === 'ENODATA' || code === 'ENOTFOUND') return [];
      throw e;
    }
  };
  const mx = async () => {
    try {
      return (await r.resolveMx(domain)).sort((a, b) => a.priority - b.priority).map((m) => m.exchange.toLowerCase());
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'ENODATA' || code === 'ENOTFOUND') return [];
      throw e;
    }
  };
  return timed(ms, async () => {
    const [m, root, dm] = await Promise.all([mx(), txt(domain), txt(`_dmarc.${domain}`)]);
    return {
      mx: m,
      spf: root.filter((t) => /^v=spf1\b/i.test(t.trim())),
      dmarc: dm.find((t) => /^v=DMARC1\b/i.test(t.trim())) ?? null,
    };
  });
}

let rdapBootstrap: Promise<[string[], string[]][] | null> | null = null;

async function rdapBase(domain: string, signal: AbortSignal): Promise<string | null> {
  const tld = domain.split('.').pop() ?? '';
  if (tld === 'com' || tld === 'net') return `https://rdap.verisign.com/${tld}/v1/`;
  rdapBootstrap ??= fetch('https://data.iana.org/rdap/dns.json', { signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { services?: [string[], string[]][] } | null) => j?.services ?? null)
    .catch(() => null);
  const services = await rdapBootstrap;
  if (!services) {
    rdapBootstrap = null;
    return null;
  }
  const hit = services.find(([tlds]) => tlds.includes(tld));
  const url = hit?.[1]?.[0] ?? null;
  return url ? (url.endsWith('/') ? url : `${url}/`) : null;
}

async function readRdap(domain: string, ms: number): Promise<RawScan['rdap']> {
  return timed(ms, async (signal) => {
    // The registry's own RDAP server, from IANA's bootstrap list. rdap.org
    // sits behind a bot wall that refuses server-side fetches.
    const base = await rdapBase(domain, signal);
    const res = await fetch(`${base ?? 'https://rdap.org/'}domain/${encodeURIComponent(domain)}`, { signal, redirect: 'follow', headers: { accept: 'application/rdap+json, application/json', 'user-agent': UA } });
    if (!res.ok) return null;
    const j = (await res.json()) as { events?: { eventAction?: string; eventDate?: string }[]; entities?: { roles?: string[]; vcardArray?: unknown[] }[] };
    const ev = (a: string) => j.events?.find((e) => e.eventAction === a)?.eventDate ?? null;
    const reg = j.entities?.find((e) => e.roles?.includes('registrar'));
    let registrar: string | null = null;
    const card = reg?.vcardArray?.[1];
    if (Array.isArray(card)) {
      const fn = card.find((x) => Array.isArray(x) && x[0] === 'fn') as unknown[] | undefined;
      if (fn && typeof fn[3] === 'string') registrar = fn[3];
    }
    if (registrar) registrar = registrar.replace(/,?\s*(LLC|Inc\.?|Ltd\.?|Corp\.?|d\/b\/a.*)$/i, '').trim();
    return { expires: ev('expiration'), registered: ev('registration'), registrar };
  });
}

async function readPageSpeed(url: string, ms: number): Promise<RawScan['vitals']> {
  const key = process.env.PAGESPEED_API_KEY?.trim();
  if (!key) return null;
  return timed(ms, async (signal) => {
    const q = new URLSearchParams({ url, strategy: 'mobile', category: 'performance', key });
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { signal });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      lighthouseResult?: { categories?: { performance?: { score?: number } }; audits?: Record<string, { numericValue?: number }> };
      loadingExperience?: { metrics?: Record<string, { percentile?: number }> };
    };
    const a = j.lighthouseResult?.audits ?? {};
    const m = j.loadingExperience?.metrics ?? {};
    const field = m.LARGEST_CONTENTFUL_PAINT_MS || m.INTERACTION_TO_NEXT_PAINT || m.CUMULATIVE_LAYOUT_SHIFT_SCORE
      ? {
          lcp_ms: m.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
          inp_ms: m.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
          cls: m.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile !== undefined ? m.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : null,
        }
      : null;
    const perf = j.lighthouseResult?.categories?.performance?.score;
    return {
      source: 'pagespeed' as const,
      performance: typeof perf === 'number' ? Math.round(perf * 100) : null,
      lcp_ms: a['largest-contentful-paint']?.numericValue ? Math.round(a['largest-contentful-paint'].numericValue) : null,
      cls: typeof a['cumulative-layout-shift']?.numericValue === 'number' ? Number(a['cumulative-layout-shift'].numericValue.toFixed(3)) : null,
      tbt_ms: a['total-blocking-time']?.numericValue !== undefined ? Math.round(a['total-blocking-time'].numericValue) : null,
      field,
    };
  });
}

/**
 * Read everything, in parallel, inside a budget. Never throws: a scan that
 * cannot reach the site returns null and the report simply has no deep scan.
 */
export async function collectDeepScan(website: string, ctx: ScanContext & { budgetMs?: number } = {}): Promise<DeepScan | null> {
  const budget = ctx.budgetMs ?? 40_000;
  const start = Date.now();
  let url = website.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  const domain = registrableDomain(url);
  const own = ownsDomain(url);

  // The homepage, timed. Falls back to http:// when https will not answer.
  const t0 = Date.now();
  let home = await timed(15_000, async (signal) => {
    const res = await fetch(url, { signal, redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*' } });
    const ttfb = Date.now() - t0;
    const buf = await res.arrayBuffer();
    return { status: res.status, finalUrl: res.url || url, headers: Object.fromEntries([...res.headers.entries()].map(([k, v]) => [k.toLowerCase(), v])), bytes: buf.byteLength, html: new TextDecoder().decode(buf.slice(0, 2_500_000)), ttfb };
  });
  if (!home && /^https:/i.test(url)) {
    const httpUrl = url.replace(/^https:/i, 'http:');
    const t1 = Date.now();
    home = await timed(12_000, async (signal) => {
      const res = await fetch(httpUrl, { signal, redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*' } });
      const ttfb = Date.now() - t1;
      const buf = await res.arrayBuffer();
      return { status: res.status, finalUrl: res.url || httpUrl, headers: Object.fromEntries([...res.headers.entries()].map(([k, v]) => [k.toLowerCase(), v])), bytes: buf.byteLength, html: new TextDecoder().decode(buf.slice(0, 2_500_000)), ttfb };
    });
  }
  // A 4xx/5xx from a bot wall is not their homepage. Read nothing off it.
  const usable = home && home.status < 400 && /<html|<body|<head/i.test(home.html) ? home : null;
  const finalUrl = usable?.finalUrl ?? url;
  const origin = (() => {
    try {
      return new URL(finalUrl).origin;
    } catch {
      return `https://${host}`;
    }
  })();
  const left = () => Math.max(3_000, budget - (Date.now() - start));

  const [httpHop, cert, robots, sitemapXml, llms, dnsRes, rdap, vitals] = await Promise.all([
    timed(8_000, async (signal) => {
      const res = await fetch(`http://${new URL(finalUrl).host}/`, { signal, redirect: 'manual', headers: { 'user-agent': UA } });
      return { location: res.status >= 300 && res.status < 400 ? res.headers.get('location') ?? null : null };
    }),
    readCert(new URL(finalUrl).hostname, 8_000),
    usable ? fetchText(`${origin}/robots.txt`, 8_000, 200_000) : Promise.resolve(null),
    usable ? fetchText(`${origin}/sitemap.xml`, 8_000, 50_000) : Promise.resolve(null),
    usable ? fetchText(`${origin}/llms.txt`, 8_000, 50_000) : Promise.resolve(null),
    own && domain ? readDns(domain, 8_000).catch(() => null) : Promise.resolve(null),
    own && domain ? readRdap(domain, 10_000) : Promise.resolve(null),
    usable ? readPageSpeed(finalUrl, Math.min(left(), 45_000)) : Promise.resolve(null),
  ]);

  const robotsTxt = robots && robots.status === 200 && !/<html/i.test(robots.text) && /user-agent|disallow|allow|sitemap/i.test(robots.text) ? robots.text : null;
  const sitemapFound = sitemapXml
    ? (sitemapXml.status === 200 && /<(urlset|sitemapindex)/i.test(sitemapXml.text)) || Boolean(robotsTxt && /^\s*sitemap\s*:/im.test(robotsTxt))
    : robotsTxt
      ? /^\s*sitemap\s*:/im.test(robotsTxt)
      : null;
  const llmsFound = llms ? llms.status === 200 && !/<html|<!doctype/i.test(llms.text.slice(0, 500)) && llms.text.trim().length > 40 : null;

  const raw: RawScan = {
    url,
    final_url: finalUrl,
    status: usable?.status ?? null,
    ttfb_ms: usable?.ttfb ?? null,
    html_bytes: usable?.bytes ?? 0,
    html: usable?.html ?? '',
    headers: usable?.headers ?? {},
    http_redirect_to: httpHop?.location ? new URL(httpHop.location, `http://${host}/`).toString() : null,
    // A timeout on the http:// probe is no answer, so it is not graded.
    http_checked: httpHop !== null,
    cert,
    cert_checked: cert !== null,
    robots_txt: robotsTxt,
    robots_checked: robots !== null,
    sitemap_found: sitemapFound,
    llms_txt_found: llmsFound,
    dns: dnsRes,
    rdap,
    vitals,
  };
  // Nothing of theirs answered. No scan beats a scan of nothing.
  if (!usable && !cert && !rdap) return null;
  return evaluateDeepScan(raw, ctx);
}
