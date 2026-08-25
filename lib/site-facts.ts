/**
 * SITE FACTS: what a business's own website actually says, read live.
 *
 * Sarah, 2026-08-25, on the Murrell Dental suite: "the demo suite says the site
 * does not even show hours or an address, which is untrue. You also could not
 * find their email, but the address, email and hours were all there on the
 * contact page." The research note was written by hand, the hub printed it as
 * a finding, and the audit graded a Google profile nobody had read. Three
 * surfaces, one wrong sentence, in front of the prospect.
 *
 * The rule now: NO PUBLIC SURFACE MAY CLAIM THAT A WEBSITE IS MISSING SOMETHING
 * UNLESS THIS MODULE READ THE SITE AND DID NOT FIND IT. Research notes remain
 * the story; this is the evidence. Every consumer (the demo hub's "what we
 * noticed" label, the presence audit, the site brief the build works from, the
 * printed game plan) runs its claims through `scrubClaims` against these facts.
 *
 * What it reads: the homepage plus up to four pages that look like contact,
 * about, location or hours pages, following links the homepage itself offers.
 * What it extracts: street address, weekly hours, email, phone, and whether
 * there is a way to book online. Deterministic, no model, so the owner can
 * check every line of it against their own site in ten seconds.
 *
 * Facts persist on the lead as one notes line, `SITE FACTS (verified DATE):`,
 * so nothing has to fetch twice and a stored line can be corrected by hand.
 */

export type SiteFacts = {
  /** The URL that was read, after redirects. */
  url: string;
  /** ISO date (day precision) the site was read. */
  verified: string;
  /** False when nothing could be fetched. Every other field is null then. */
  reachable: boolean;
  /** Set when the fetch failed on TLS, which is itself a finding. */
  ssl_error: boolean;
  address: string | null;
  /** Distinct weekdays that appear next to a time or "closed". 0 means none found. */
  hours_days: number;
  /** A short sample of the hours text, for the receipts footer. */
  hours_sample: string | null;
  email: string | null;
  phone: string | null;
  /** A booking link or the button text that offered one. */
  booking: string | null;
  /** Site-relative paths that were read, homepage first. */
  pages: string[];
};

const MARKER = /^SITE FACTS \(verified (\d{4}-\d{2}-\d{2})\):\s*(.*)$/m;

const DAY = /\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(day|nesday|rsday|urday|sday)?\b/gi;
const TIME = /\b\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)\b|\bclosed\b|\b\d{1,2}(:\d{2})?\s*[-–]\s*\d{1,2}(:\d{2})?\b/i;
const STREET =
  /\b\d{1,6}[A-Za-z]?\s+(?:[NSEW]\.?\s+)?[A-Za-z0-9.'\-]+(?:\s+[A-Za-z0-9.'\-]+){0,4}\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Highway|Hwy|Court|Ct|Circle|Cir|Place|Pl|Parkway|Pkwy|Trail|Trl|Loop|Terrace|Ter|Plaza|Route|Rte)\b\.?(?:,?\s*(?:Suite|Ste|Unit|#)\s*[A-Za-z0-9-]+)?(?:,?\s+[A-Z][A-Za-z.'\- ]{1,30},?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?)?/;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const BOOKING_HOSTS =
  /calendly|acuityscheduling|squareup\.com\/appointments|square\.site\/book|schedulicity|opentable|resy\.com|vagaro|booksy|zocdoc|healow|nexhealth|localmed|mindbody|jane\.app|housecallpro|servicetitan|setmore|simplybook|appointlet|booking\.com|campspot|resnexus|cloudbeds|tock\.com|yelp\.com\/reservations|toasttab|clover\.com\/online-ordering|dentrix|solutionreach|patientpop|weave|kareo|tebra|getjobber|joinsecure|book\.thryv|thryv\.com|hostfully|lodgify|airbnb|vrbo|reservations\./i;
const BOOKING_TEXT =
  /\b(book (online|now|an? (appointment|visit|table|room|consult(ation)?))|schedule (online|now|an? (appointment|visit|consult(ation)?))|request an? appointment|make an? (appointment|reservation)|reserve (online|now|a table)|online (booking|scheduling|reservations?)|book your (appointment|stay|visit)|schedule your (appointment|visit))\b/i;
const STRONG_PAGE = /^(contact(-?us)?|contacts|hours|our-hours|location|locations|our-location|find-us|findus|directions|visit-us|plan-your-visit|get-in-touch|reach-us)(\.[a-z]+)?$/i;
const WEAK_PAGE = /^(about(-?us)?|our-office|office|our-practice|the-practice|our-team|team|new-patients?|patient-info(rmation)?)(\.[a-z]+)?$/i;

/** Which weekday a token is, normalised, so "Tues" and "Tuesday" count once. */
function dayKey(tok: string): string {
  return tok.slice(0, 3).toLowerCase();
}

/** Turn an HTML page into readable lines plus the hrefs it offered. */
function textOf(html: string): { lines: string[]; hrefs: string[]; ldjson: string[] } {
  const hrefs = Array.from(html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)).map((m) => m[1]);
  const ldjson = Array.from(html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)).map((m) => m[1]);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|td|th|h[1-6]|address|section|article|header|footer|dd|dt)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/[ \t ]+/g, ' ');
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return { lines, hrefs, ldjson };
}

function pickAddress(lines: string[], ldjson: string[]): string | null {
  for (const raw of ldjson) {
    try {
      const walk = (v: unknown): string | null => {
        if (!v || typeof v !== 'object') return null;
        if (Array.isArray(v)) {
          for (const x of v) {
            const r = walk(x);
            if (r) return r;
          }
          return null;
        }
        const o = v as Record<string, unknown>;
        const a = o.address as Record<string, unknown> | string | undefined;
        if (a && typeof a === 'object' && typeof a.streetAddress === 'string' && a.streetAddress.trim()) {
          return [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode].filter(Boolean).join(', ');
        }
        if (typeof a === 'string' && STREET.test(a)) return a.trim();
        for (const k of Object.keys(o)) {
          const r = walk(o[k]);
          if (r) return r;
        }
        return null;
      };
      const r = walk(JSON.parse(raw));
      if (r) return r.slice(0, 160);
    } catch {
      /* not JSON, keep reading */
    }
  }
  // Prefer a line that carries a state and zip alongside the street, then fall
  // back to any street line. Two neighbouring lines are joined first because
  // most sites print the street and the city on separate lines.
  const joined = lines.map((l, i) => `${l}${lines[i + 1] ? `, ${lines[i + 1]}` : ''}`);
  const withZip = joined.find((l) => STREET.test(l) && /\b[A-Z]{2}\s+\d{5}\b/.test(l));
  const hit = STREET.exec(withZip ?? '') ?? lines.map((l) => STREET.exec(l)).find(Boolean) ?? null;
  return hit ? hit[0].replace(/\s+/g, ' ').trim().slice(0, 160) : null;
}

function pickHours(lines: string[], ldjson: string[]): { days: number; sample: string | null } {
  const days = new Set<string>();
  let sample: string | null = null;
  for (const raw of ldjson) {
    const spec = raw.match(/"(openingHours|openingHoursSpecification|dayOfWeek)"\s*:\s*(\[[^\]]*\]|"[^"]*")/g) ?? [];
    for (const s of spec) for (const d of s.matchAll(DAY)) days.add(dayKey(d[0]));
    if (days.size && !sample) sample = 'structured hours on the page';
  }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const look = `${l} ${lines[i + 1] ?? ''}`;
    const dayHits = Array.from(l.matchAll(DAY));
    if (dayHits.length && TIME.test(look)) {
      for (const d of dayHits) days.add(dayKey(d[0]));
      if (!sample) sample = look.slice(0, 90);
    }
  }
  return { days: days.size, sample };
}

/** Free mailboxes an owner plausibly runs their business from. */
const FREE_MAIL = /^(gmail|yahoo|outlook|hotmail|live|icloud|me|aol|msn|protonmail|proton|comcast|att|bellsouth|charter|cox|verizon|sbcglobal|earthlink|centurylink|bresnan|mac)\.(com|net|me)$/i;
/** Addresses that belong to a platform or a country we will never cold-email. */
const JUNK_MAIL = /(qq\.com|163\.com|126\.com|sina\.|mail\.ru|yandex|booksy\.com|wix\.com|wixpress|squarespace|godaddy|weebly|duda|wordpress\.com|shopify|sentry|example\.|noreply|no-reply|donotreply|@\d)/i;

/** The registrable part of a host: www.murrelldental.com -> murrelldental.com */
function siteDomain(url: string): string {
  try {
    const h = new URL(url).hostname.toLowerCase();
    const parts = h.split('.');
    return parts.length > 2 && !/^(co|com|org|net|gov|edu)$/.test(parts[parts.length - 2]) ? parts.slice(-2).join('.') : parts.slice(-3).join('.');
  } catch {
    return '';
  }
}

/**
 * Is this email one we would write to as THE business? Same domain as the
 * site, or a free mailbox. An address on some other company's domain (the web
 * agency in the footer, the booking platform's help desk) is not the business.
 */
export function emailTrusted(email: string | null, siteUrl: string): boolean {
  if (!email) return false;
  const dom = email.split('@')[1]?.toLowerCase() ?? '';
  if (!dom || JUNK_MAIL.test(email)) return false;
  const site = siteDomain(siteUrl);
  return (site !== '' && (dom === site || dom.endsWith(`.${site}`))) || FREE_MAIL.test(dom);
}

function pickEmail(lines: string[], hrefs: string[], siteUrl: string): string | null {
  const STRICT = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const found: string[] = [];
  for (const h of hrefs) {
    const raw = /^mailto:(.+)$/i.exec(h)?.[1];
    if (!raw) continue;
    let v = raw.split('?')[0];
    try {
      v = decodeURIComponent(v);
    } catch {
      v = v.replace(/%20/g, '');
    }
    // "mailto:mail:someone@x.com" and "mailto: someone@x.com" both happen.
    v = v.replace(/\s+/g, '').split(':').pop()?.toLowerCase() ?? '';
    if (STRICT.test(v)) found.push(v);
  }
  for (const l of lines) for (const m of l.matchAll(EMAIL)) found.push(m[0].toLowerCase());
  const clean = found.filter((e) => !JUNK_MAIL.test(e) && !/\.(png|jpg|jpeg|svg|gif|webp)$/i.test(e));
  if (!clean.length) return null;
  // Rank: the site's own domain, then a free mailbox, then whatever is left.
  const site = siteDomain(siteUrl);
  const rank = (e: string) => {
    const dom = e.split('@')[1] ?? '';
    return site && (dom === site || dom.endsWith(`.${site}`)) ? 0 : FREE_MAIL.test(dom) ? 1 : 2;
  };
  return clean.sort((a, b) => rank(a) - rank(b))[0];
}

function pickPhone(lines: string[], hrefs: string[]): string | null {
  const pretty = (v: string) => {
    const d = v.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : v.trim();
  };
  const fromTel = hrefs.map((h) => /^tel:(.+)/i.exec(h)?.[1]).find((t) => t && t.replace(/\D/g, '').length >= 10);
  if (fromTel) return pretty(decodeURIComponent(fromTel));
  for (const l of lines) {
    const m = PHONE.exec(l);
    if (m) return pretty(m[0]);
  }
  return null;
}

function pickBooking(lines: string[], hrefs: string[]): string | null {
  const host = hrefs.find((h) => BOOKING_HOSTS.test(h));
  if (host) return host.slice(0, 120);
  const text = lines.find((l) => l.length < 80 && BOOKING_TEXT.test(l));
  return text ? (BOOKING_TEXT.exec(text)?.[0] ?? text).slice(0, 60) : null;
}

async function fetchPage(url: string, timeoutMs: number): Promise<{ html: string; url: string } | { error: 'ssl' | 'other' }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', Accept: 'text/html,*/*' },
    });
    if (!res.ok) return { error: 'other' };
    const html = await res.text();
    return { html: html.slice(0, 1_500_000), url: res.url || url };
  } catch (err) {
    const msg = err instanceof Error ? `${err.message} ${(err as { cause?: { code?: string; message?: string } }).cause?.code ?? ''} ${(err as { cause?: { message?: string } }).cause?.message ?? ''}` : String(err);
    return { error: /cert|ssl|tls|self.signed|handshake|ERR_TLS|UNABLE_TO_VERIFY|altname/i.test(msg) ? 'ssl' : 'other' };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Read a website and report what is on it. Never throws: an unreachable site
 * comes back `reachable: false` with every fact null, which every consumer must
 * treat as "unknown", never as "missing".
 */
export async function fetchSiteFacts(website: string, opts: { timeoutMs?: number; maxPages?: number } = {}): Promise<SiteFacts> {
  const verified = new Date().toISOString().slice(0, 10);
  // Legacy dental and law sites routinely take ten seconds to answer; a short
  // clock reads them as unreachable, which is the exact wrong answer here.
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const maxPages = opts.maxPages ?? 6;
  const start = website.trim().replace(/^(?!https?:\/\/)/, 'https://');
  const empty: SiteFacts = {
    url: start,
    verified,
    reachable: false,
    ssl_error: false,
    address: null,
    hours_days: 0,
    hours_sample: null,
    email: null,
    phone: null,
    booking: null,
    pages: [],
  };

  let home = await fetchPage(start, timeoutMs);
  if ('error' in home && home.error === 'ssl') {
    // Plain HTTP is a real fallback for the many legacy sites whose certificate
    // lapsed. The lapse itself is recorded so the audit can say so truthfully.
    const plain = await fetchPage(start.replace(/^https:/, 'http:'), timeoutMs);
    if ('error' in plain) return { ...empty, ssl_error: true };
    home = plain;
    empty.ssl_error = true;
  }
  if ('error' in home) return empty;

  let base: URL;
  try {
    base = new URL(home.url);
  } catch {
    return empty;
  }

  const pages: { path: string; html: string }[] = [{ path: base.pathname || '/', html: home.html }];
  const { hrefs } = textOf(home.html);
  const seen = new Set<string>([base.pathname || '/']);
  // Ranked, because the page budget is small and a blog post called
  // "back-to-school-dental-visits" must never outrank /contact-us. Strong
  // names first, well-known paths next, weaker matches last.
  const strong: string[] = [];
  const weak: string[] = [];
  for (const h of hrefs) {
    let u: URL;
    try {
      u = new URL(h, base);
    } catch {
      continue;
    }
    if (u.host !== base.host) continue;
    if (/\.(pdf|jpg|png|gif|svg|webp|mp4|zip|xml)$/i.test(u.pathname)) continue;
    const p = u.pathname.replace(/\/+$/, '') || '/';
    if (seen.has(p)) continue;
    const last = p.split('/').pop() ?? '';
    if (STRONG_PAGE.test(last)) {
      seen.add(p);
      strong.push(u.toString());
    } else if (WEAK_PAGE.test(last) && !/\/(blog|news|post|posts|procedures|articles?)\//i.test(p)) {
      seen.add(p);
      weak.push(u.toString());
    }
  }
  // Well-known paths, tried when the homepage did not link them. Cheap, and it
  // is how a site like murrelldental.com (contact at /contact-us, unlinked from
  // the crawlable nav) still gets read.
  const known: string[] = [];
  for (const p of ['/contact', '/contact-us', '/contactus', '/hours', '/location', '/locations', '/about', '/about-us']) {
    if (!seen.has(p)) {
      seen.add(p);
      known.push(new URL(p, base).toString());
    }
  }
  for (const c of [...strong, ...known, ...weak]) {
    if (pages.length >= maxPages) break;
    const r = await fetchPage(c, Math.min(timeoutMs, 10_000));
    if ('error' in r) continue;
    pages.push({ path: new URL(c).pathname, html: r.html });
    // Enough. Once the strong pages have given up an address, hours and an
    // email there is nothing left to learn from /about, and every extra page
    // on a slow legacy host is another five seconds in front of a prospect.
    const sofar = readAll(pages, home.url);
    if (sofar.address && sofar.email && sofar.hours_days >= 5) break;
  }

  return { ...readAll(pages, home.url), url: home.url, verified, reachable: true, ssl_error: empty.ssl_error };
}

/** Everything the pages read say, pooled. Pure, so it can run after every page. */
function readAll(pages: { path: string; html: string }[], siteUrl: string): Pick<SiteFacts, 'address' | 'hours_days' | 'hours_sample' | 'email' | 'phone' | 'booking' | 'pages'> {
  const lines: string[] = [];
  const allHrefs: string[] = [];
  const ldjson: string[] = [];
  for (const p of pages) {
    const t = textOf(p.html);
    lines.push(...t.lines);
    allHrefs.push(...t.hrefs);
    ldjson.push(...t.ldjson);
  }
  const hours = pickHours(lines, ldjson);
  return {
    address: pickAddress(lines, ldjson),
    hours_days: hours.days,
    hours_sample: hours.sample,
    email: pickEmail(lines, allHrefs, siteUrl),
    phone: pickPhone(lines, allHrefs),
    booking: pickBooking(lines, allHrefs),
    pages: pages.map((p) => p.path),
  };
}

/* ────────────────────── the notes line: store and read ────────────────────── */

/** One line, stable order, so it can be read back and edited by hand. */
export function siteFactsLine(f: SiteFacts): string {
  const kv = [
    `url=${f.url}`,
    `reachable=${f.reachable ? 'yes' : 'no'}`,
    f.ssl_error ? 'ssl=broken' : null,
    `address=${f.address ?? 'none found'}`,
    `hours=${f.hours_days ? `${f.hours_days} days listed` : 'none found'}`,
    `email=${f.email ?? 'none found'}`,
    `phone=${f.phone ?? 'none found'}`,
    `booking=${f.booking ?? 'none found'}`,
    `pages=${f.pages.join(' ') || '-'}`,
  ].filter(Boolean);
  return `SITE FACTS (verified ${f.verified}): ${kv.join(' | ')}`;
}

/** Read the stored line back. Null when the lead has never been read. */
export function parseSiteFacts(notes: string | null | undefined): SiteFacts | null {
  const m = MARKER.exec(notes ?? '');
  if (!m) return null;
  const kv = new Map<string, string>();
  for (const part of m[2].split(' | ')) {
    const i = part.indexOf('=');
    if (i > 0) kv.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  const none = (v: string | undefined) => (!v || v === 'none found' ? null : v);
  const hoursDays = Number(/^(\d+) days/.exec(kv.get('hours') ?? '')?.[1] ?? 0);
  return {
    url: kv.get('url') ?? '',
    verified: m[1],
    reachable: kv.get('reachable') === 'yes',
    ssl_error: kv.get('ssl') === 'broken',
    address: none(kv.get('address')),
    hours_days: hoursDays,
    hours_sample: null,
    email: none(kv.get('email')),
    phone: none(kv.get('phone')),
    booking: none(kv.get('booking')),
    pages: (kv.get('pages') ?? '').split(' ').filter((p) => p && p !== '-'),
  };
}

/** Put the line on the notes, replacing any earlier one. */
export function withSiteFactsLine(notes: string | null | undefined, f: SiteFacts): string {
  const line = siteFactsLine(f);
  const cur = notes ?? '';
  if (MARKER.test(cur)) return cur.replace(MARKER, line);
  // OWNER NOTES swallows everything after it (see buildSiteBrief), so the line
  // goes above that marker, never below it.
  const idx = cur.search(/^OWNER NOTES:/m);
  if (idx >= 0) return `${cur.slice(0, idx)}${line}\n${cur.slice(idx)}`;
  return cur ? `${cur.replace(/\s+$/, '')}\n${line}` : line;
}

/** Facts older than this are re-read before a public surface trusts them. */
export const FACTS_MAX_AGE_DAYS = 30;

export function siteFactsFresh(f: SiteFacts | null): f is SiteFacts {
  if (!f) return false;
  const age = (Date.now() - new Date(`${f.verified}T00:00:00Z`).getTime()) / 86_400_000;
  return age <= FACTS_MAX_AGE_DAYS;
}

/* ─────────────────────── the claim scrubber (the law) ─────────────────────── */

type Subject = 'hours' | 'address' | 'email' | 'phone' | 'booking';

const SUBJECT: Record<Subject, RegExp> = {
  hours: /\b(hours|open(ing)? times?)\b/i,
  address: /\b(address|front door|where (they|you) are|location|street|find (them|you))\b/i,
  email: /\b(e-?mail)\b/i,
  // "phone traffic with no capture" and "cannot answer the phone" are about
  // answering, not about whether a number is printed. Only a claim about the
  // NUMBER being absent counts here.
  phone: /\b(phone number|contact number|number to call|tap-to-call|no phone\b|without a phone\b|phone (is )?(missing|hidden|buried|absent|unlisted|not (shown|listed|published|on)))/i,
  booking: /\b(online (booking|scheduling|reservations?|quoting|appointments?)|book(ing)? online|schedul(e|ing) online|scheduler|booking (link|button|calendar))\b/i,
};

/** "There is none" in all the ways research notes say it. */
const ABSENT =
  /\b(no|not|without|missing|lack(s|ing)?|absent|hidden|buried|nowhere|cannot|can't|does not|doesn't|do not|don't|never|zero|unlisted|isn't|is not|aren't|are not)\b/i;

/**
 * Does this clause claim the website is MISSING something the facts found?
 *
 * A claim needs three things to be a contradiction: a word of absence, a
 * subject the facts cover, and a fact that says it is present. "No online
 * booking" with a Calendly link on the site is a contradiction. "Clean modern
 * site" is not a claim about presence. "No hours" on a site we could not reach
 * is UNVERIFIED, and unverified claims are treated as contradicted on public
 * surfaces, because a sentence we cannot back is not one we print.
 */
export function contradicts(clause: string, facts: SiteFacts | null, mode: 'public' | 'notes' = 'public'): Subject | null {
  if (!ABSENT.test(clause)) return null;
  for (const s of Object.keys(SUBJECT) as Subject[]) {
    if (!SUBJECT[s].test(clause)) continue;
    if (!facts || !facts.reachable) {
      if (mode === 'public') return s;
      continue;
    }
    const present =
      s === 'hours' ? facts.hours_days >= 1 : s === 'address' ? Boolean(facts.address) : s === 'email' ? Boolean(facts.email) : s === 'phone' ? Boolean(facts.phone) : Boolean(facts.booking);
    if (present) return s;
  }
  return null;
}

/**
 * Remove every clause that contradicts the facts and hand back what is left.
 *
 * Works at clause level (split on `.`, `;`, `,`, and " but "/" and "), so a
 * line like "clean enough design, but no address, no hours, and no online
 * quoting" keeps its true parts when only the hours turn out to be published.
 * Returns '' when nothing true remains. Grammar after surgery is tidied
 * (dangling conjunctions, doubled separators) but never rewritten.
 */
export function scrubClaims(text: string, facts: SiteFacts | null, mode: 'public' | 'notes' = 'public'): { text: string; removed: string[] } {
  const removed: string[] = [];
  const sentences = text.split(/(?<=[.;!?])\s+/);
  const kept: string[] = [];
  for (const sentence of sentences) {
    const clauses = sentence.split(/(,\s+|\s+but\s+|\s+and\s+|;\s*)/);
    // clauses alternates [text, sep, text, sep, ...]
    const out: string[] = [];
    for (let i = 0; i < clauses.length; i += 2) {
      const c = clauses[i];
      const sep = clauses[i + 1] ?? '';
      if (c.trim() && contradicts(c, facts, mode)) {
        removed.push(c.trim());
        continue;
      }
      out.push(c, sep);
    }
    let s = out
      .join('')
      .replace(/(\s*,\s*|\s+but\s*|\s+and\s*)+$/g, '')
      .replace(/^(\s*(,|but|and)\s+)+/i, '')
      .replace(/(,\s+)(but|and)\s+(,\s+)/g, '$1')
      .replace(/,\s*,/g, ',')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.;,])/g, '$1')
      .trim();
    if (!s || !/[A-Za-z0-9]/.test(s)) continue;
    // A sentence reduced to a bare fragment ("and", "but") is gone, not kept.
    if (/^(and|but|or|with|no)$/i.test(s)) continue;
    if (!/[.;!?]$/.test(s) && /[.;!?]$/.test(sentence)) s += sentence.slice(-1);
    kept.push(s);
  }
  return { text: kept.join(' ').trim(), removed };
}

/**
 * The facts as a short list for a brief or a report, ONLY the ones found.
 * Never says "none": absence belongs to `scrubClaims`, presence belongs here.
 */
export function siteFactsSummary(f: SiteFacts | null): string[] {
  if (!f || !f.reachable) return [];
  const out: string[] = [];
  if (f.address) out.push(`Street address on their site: ${f.address}`);
  if (f.hours_days) out.push(`Hours on their site: ${f.hours_days} days listed${f.hours_sample ? ` ("${f.hours_sample}")` : ''}`);
  if (f.email) out.push(`Email on their site: ${f.email}`);
  if (f.phone) out.push(`Phone on their site: ${f.phone}`);
  if (f.booking) out.push(`Online booking on their site: ${f.booking}`);
  if (f.ssl_error) out.push('Their certificate is broken: browsers warn before the site loads');
  return out;
}
