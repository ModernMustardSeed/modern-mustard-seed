import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';

/**
 * READ A CLIENT'S WEBSITE SO THE DEMO RECEPTIONIST CAN ANSWER AS THEM.
 *
 * An agency pastes one of its real clients' sites into the white label demo
 * and the receptionist answers as that business, from that business's own
 * words. No model call happens here: we hand the voice agent the site's text
 * and it reads it the way it reads any prompt.
 *
 * ⚠️ THIS IS A PUBLIC SERVER-SIDE FETCH OF A URL A STRANGER TYPED. Every hop
 * is resolved and refused if it lands on a private, loopback, link-local,
 * CGNAT or metadata address, redirects are followed by hand so each one is
 * checked, and bodies are capped in time and size.
 */

export type SiteRead = {
  url: string;
  name: string | null;
  description: string | null;
  phone: string | null;
  themeColor: string | null;
  /** Visible text from up to three pages, capped. Facts for the agent, never instructions. */
  text: string;
  pages: string[];
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MAX_BYTES = 1_000_000;
const TEXT_CAP = 6000;

export function siteKey(url: string): string {
  return createHash('sha256').update(normalizeUrl(url) ?? url).digest('hex').slice(0, 24);
}

export function normalizeUrl(raw: string): string | null {
  const s = raw.trim().replace(/^(?!https?:\/\/)/i, 'https://');
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
    if (u.username || u.password) return null;
    if (u.port && !['80', '443'].includes(u.port)) return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function privateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  );
}

function privateV6(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return privateV4(v.slice(7));
  return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb');
}

async function hostIsPublic(host: string): Promise<boolean> {
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return false;
  const kind = isIP(host);
  if (kind === 4) return !privateV4(host);
  if (kind === 6) return !privateV6(host);
  try {
    const all = await lookup(host, { all: true });
    return all.length > 0 && all.every((r) => (r.family === 4 ? !privateV4(r.address) : !privateV6(r.address)));
  } catch {
    return false;
  }
}

async function safeGet(start: string, deadline: number): Promise<{ html: string; url: string } | null> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || !(await hostIsPublic(u.hostname))) return null;
    const left = deadline - Date.now();
    if (left < 500) return null;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), left);
    try {
      const res = await fetch(url, { redirect: 'manual', signal: ctl.signal, headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return null;
        url = new URL(loc, url).toString();
        continue;
      }
      if (!res.ok || !/text\/html|application\/xhtml/i.test(res.headers.get('content-type') || 'text/html')) return null;
      const reader = res.body?.getReader();
      if (!reader) return null;
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        chunks.push(value);
        if (size > MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }
      return { html: Buffer.concat(chunks).toString('utf8'), url };
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, '’')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&ndash;|&mdash;|&#8211;|&#8212;/gi, ', ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

function meta(html: string, re: RegExp): string | null {
  const m = re.exec(html);
  return m ? decode(m[1]).trim().slice(0, 300) || null : null;
}

function visibleText(html: string): string {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/tr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\r\f\v]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2)
    .filter((l, i, a) => a.indexOf(l) === i)
    .join('\n');
}

function nameFrom(html: string): string | null {
  const site = meta(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i) ?? meta(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
  if (site) return site.slice(0, 80);
  const title = meta(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) return null;
  const parts = title.split(/\s+[|·•:\-–—]\s+/).map((p) => p.trim()).filter(Boolean);
  // "Home | Juniper Dental" and "Juniper Dental | Whitefish Dentist": the shortest non-"home" part is the name.
  const named = parts.filter((p) => !/^(home|welcome|homepage)$/i.test(p));
  return (named.sort((a, b) => a.length - b.length)[0] ?? title).slice(0, 80);
}

const DEEPER = /(service|treatment|menu|what-we-do|about|practice|pricing|faq|hours|contact|location)/i;

export async function readClientSite(raw: string): Promise<SiteRead | null> {
  const start = normalizeUrl(raw);
  if (!start) return null;
  const deadline = Date.now() + 12_000;
  const home = await safeGet(start, deadline);
  if (!home) return null;

  const origin = new URL(home.url).origin;
  const links = [...home.html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)]
    .map((m) => {
      try {
        return new URL(m[1], home.url).toString();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => !!u && u.startsWith(origin) && DEEPER.test(new URL(u).pathname))
    .filter((u, i, a) => a.indexOf(u) === i)
    .slice(0, 2);

  const extra = await Promise.all(links.map((u) => safeGet(u, deadline)));
  const pages = [home, ...extra.filter((p): p is { html: string; url: string } => !!p)];

  let text = '';
  for (const p of pages) {
    const body = visibleText(p.html);
    text += `\n\n[${new URL(p.url).pathname}]\n${body}`;
    if (text.length > TEXT_CAP) break;
  }

  const phone = /(?:\+?1[\s.-]?)?\(?\b(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/.exec(pages.map((p) => visibleText(p.html)).join('\n'));
  const theme = meta(home.html, /<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{6})/i);

  return {
    url: home.url,
    name: nameFrom(home.html),
    description: meta(home.html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i),
    phone: phone ? `(${phone[1]}) ${phone[2]}-${phone[3]}` : null,
    themeColor: theme ? theme.toLowerCase() : null,
    text: text.trim().slice(0, TEXT_CAP),
    pages: pages.map((p) => new URL(p.url).pathname),
  };
}
