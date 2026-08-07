/**
 * THE HOSTESS TOUR.
 *
 * Sarah, 2026-08-06, after the Glimmer film: *"can we use that same voice as a
 * guide and hostess of the website almost. so its a real talking website. like
 * it still has the voice agent that can book you and help you, but theres also
 * a welcome and business tour that comes on when someone lands on the page."*
 *
 * So THE TALKING WEBSITE stops being a name for a bundle and starts being a
 * literal description. Two mouths, two jobs, and they must never speak at once:
 *
 *   - The VOICE AGENT is reactive and two-way. It answers, it books, it takes a
 *     name at 2am. It costs money per minute and it needs a live connection.
 *   - The HOSTESS is proactive and one-way. She welcomes a stranger, walks them
 *     through the place, and hands them to the agent. She is pre-rendered audio
 *     on the free Edge neural voices, so a thousand visitors cost exactly what
 *     one visitor costs: nothing.
 *
 * The script is built from the site's OWN words. Nothing here invents a fact
 * about the business: every spoken sentence is either a fixed bridge that
 * asserts nothing, or a quote lifted from the page the visitor is looking at.
 */

/** Strip tags and entities down to speakable prose. */
export function speakable(html) {
  return String(html || '')
    // Comments FIRST. A forged page carries the build's own art-direction notes
    // in an HTML comment ("Atelier Noir prescribes none; the tier requires
    // one..."), and a hostess reading that aloud is the worst output this file
    // could produce.
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, 'and')
    .replace(/&(?:middot|bull|sdot);/g, '. ')
    .replace(/&(?:rarr|larr|mdash|ndash);/g, ' ')
    .replace(/&(?:rsquo|apos|#39);/g, "'")
    .replace(/&(?:ldquo|rdquo|quot);/g, '')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ⛔ SENTENCES THE HOSTESS MUST NEVER SAY OUT LOUD.
 *
 * A forged page legitimately carries scaffolding copy aimed at the OWNER while
 * they are reviewing it. Glimmer's gallery says "Sample night portfolio... drops
 * straight into this grid when we build it for real", which is honest on the
 * page and catastrophic in the mouth of a hostess welcoming that business's own
 * customer. Reading it aloud would tell a homeowner the company's photographs
 * are fake.
 *
 * Same reflex as the film's law: nothing about how the thing was made
 * (memory: mms-suite-film). A line that trips this is DROPPED, never rewritten,
 * because a guess is how invented facts get spoken in the business's voice.
 */
const NEVER_SPEAK =
  /\b(?:sample|placeholder|demo|mock(?:up)?|example only|for real|stock photo|lorem|template|coming soon|your logo|replace this|dummy)\b|drop(?:s)? straight into|when we build it|built to show/i;

/** Sentences that are structurally useless spoken: nav dumps, phone strings. */
const NOT_PROSE = /^[\s.·|–-]*$/;

function sentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The first quotable sentences from a chunk of the page.
 * Returns '' rather than something risky: a shorter tour beats a false one.
 *
 * ⚠️ QUOTES `<p>` PROSE ONLY. Reading a chunk as flat text drags in the little
 * Title Case eyebrow labels that sit above headings ("The Night Walk", "What We
 * Light"). They carry no full stop, so they glue themselves onto the front of
 * the real sentence and come out as "The Night Walk A night walk is exactly
 * what it sounds like." Designers put eyebrows in spans and sentences in
 * paragraphs, so asking for paragraphs is the whole fix.
 */
function quote(chunk, { max = 2, minLen = 25 } = {}) {
  // Filter BEFORE joining. An eyebrow is sometimes marked up as its own short
  // <p> ("The Night Walk"), and joining first lets it glue onto the sentence
  // that follows, where a later length check can no longer see it.
  const paras = [...String(chunk || '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => speakable(m[1]))
    .filter((t) => t.length >= minLen);
  const text = paras.join(' ').trim();
  if (!text) return '';
  const out = [];
  for (const s of sentences(text)) {
    if (out.length >= max) break;
    if (s.length < minLen || s.length > 240 || NOT_PROSE.test(s)) continue;
    if (NEVER_SPEAK.test(s)) continue;
    // A line that is mostly digits or separators is a phone number or a
    // service-area list, both of which read as a robot reciting a directory.
    const letters = (s.match(/[a-z]/gi) || []).length;
    if (letters / s.length < 0.6) continue;
    // Belt and braces against encoded blobs and stray attribute soup: real
    // prose has spaces. A 40-character unbroken run of word characters is
    // base64, a filename, or a class list, never a sentence a person wrote.
    if (/[A-Za-z0-9+/=_-]{40,}/.test(s)) continue;
    // Every quoted sentence must read like English: mostly short words.
    const words = s.split(/\s+/);
    if (words.length < 4) continue;
    if (words.reduce((a, w) => a + w.length, 0) / words.length > 12) continue;
    out.push(s);
  }
  return out.join(' ');
}

/**
 * Pull `<section id="x">…` (or any element carrying the id) as a chunk.
 *
 * ⚠️ Slice from AFTER the opening tag closes, never from the id itself. Cutting
 * mid-tag leaves the rest of that tag (and, on a page with inlined artwork, an
 * entire base64 data URI) outside any `<...>` pair, so the tag stripper cannot
 * see it and it comes out the other end as "prose" for the narrator to read.
 * The first draft of this had the hostess reciting image data.
 */
function sectionChunk(html, id) {
  const i = html.search(new RegExp(`id=["']${id}["']`));
  if (i < 0) return '';
  const close = html.indexOf('>', i);
  return html.slice(close < 0 ? i : close + 1, (close < 0 ? i : close) + 6000);
}

function headingOf(chunk) {
  const m = chunk.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const h = speakable(m ? m[1] : '');
  return NEVER_SPEAK.test(h) ? '' : h;
}

/**
 * Which sections to stop at, in page order, and the bridge that introduces each.
 *
 * Bridges assert NOTHING about the business. They are pure stage directions
 * ("start here", "have a look"), so any one of them is true of any business.
 * The claims all come from the page.
 */
const STOPS = [
  { anchor: 'switch', bridge: 'Start here.' },
  { anchor: 'story', bridge: '' },
  { anchor: 'services', bridge: 'Here is what we actually do.' },
  { anchor: 'gallery', bridge: 'Have a look at the work.' },
  { anchor: 'menu', bridge: 'Here is what we serve.' },
  { anchor: 'rooms', bridge: '' },
  { anchor: 'crew', bridge: 'And the people you would be dealing with.' },
  { anchor: 'reviews', bridge: 'This is what people say afterwards.' },
];

/**
 * Build the whole spoken tour for one forged site.
 *
 * @param {string} html the site's own markup
 * @param {{business:string, phone?:string|null}} info
 * @returns {{palette:{bg:string,accent:string}, beats:Array<{id:string,anchor:string,text:string}>}}
 */
export function buildTour(html, { business, phone = null } = {}) {
  const palette = (() => {
    // Read the palette off the ORIGINAL markup: the meta tag lives in <head>,
    // which the body extraction below throws away.
    // The tag is `content='{"bg":"#0A0E13",...}'`: a single-quoted attribute
    // wrapping double-quoted JSON. A `content=['"]([^'"]+)['"]` pattern stops
    // dead at the first inner double quote and silently yields the fallback
    // palette, so the guide ends up themed for a different website.
    const m = html.match(/<meta\s+name=["']mms-palette["']\s+content='([^']+)'/i) ||
      html.match(/<meta\s+name=["']mms-palette["']\s+content="([^"]+)"/i);
    try {
      const p = JSON.parse(m[1]);
      if (/^#[0-9a-f]{6}$/i.test(p.bg) && /^#[0-9a-f]{6}$/i.test(p.accent)) return p;
    } catch { /* fall through */ }
    return { bg: '#0b0f14', accent: '#e4572e' };
  })();

  /*
   * Everything below reads the BODY only, with the page's own navigation
   * stripped out. <head> holds the <title>, which is written for a search
   * result ("... | Outdoor Lighting Design in Indianapolis, Carmel and
   * Zionsville") and reads as keyword stuffing when spoken aloud. Nav and skip
   * links are worse: they are a list of destinations, and the hostess reciting
   * "Skip to booking, The Switch, After Dark, Gallery" is the single most
   * robotic thing this feature could do.
   */
  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');

  /*
   * The page's own link labels, to subtract from quoted prose. Section eyebrows
   * repeat the nav wording ("What We Light" sits above "Design, installation
   * and service"), and because an eyebrow carries no full stop it merges into
   * the following sentence: "Design, installation and service. What We Light
   * Glimmer designs low voltage LED systems..."
   */
  const navLabels = [
    ...new Set(
      [...html.matchAll(/<a[^>]+href=["']#[\w-]+["'][^>]*>([\s\S]{0,60}?)<\/a>/g)]
        .map((m) => speakable(m[1]))
        .filter((t) => t.length > 2 && t.length < 40),
    ),
  ].sort((a, b) => b.length - a.length);
  /*
   * ⚠️ ONLY AT THE START, and NEVER the business's own name.
   *
   * A sweep-anywhere version ate the subject of two sentences: Glimmer's logo
   * links to #top with the label "Glimmer", so "Glimmer designs low voltage LED
   * systems..." came out as "designs low voltage LED systems...". An eyebrow
   * only ever sits in front of the prose it labels, so stripping there is
   * enough, and any label sharing a word with the business name is left alone
   * on principle (memory: feedback_name_the_business_exactly).
   */
  const bizWords = new Set(String(business || '').toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const strippable = navLabels.filter((l) => !l.toLowerCase().split(/\s+/).some((w) => bizWords.has(w)));
  const deNav = (text) => {
    let out = String(text || '').trim();
    for (let pass = 0; pass < 3; pass++) {
      const before = out;
      for (const label of strippable) {
        const re = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[\\s.:·|-]*`, 'i');
        out = out.replace(re, '').trim();
      }
      if (out === before) break;
    }
    return out.replace(/\s+/g, ' ').trim();
  };

  const beats = [];

  /* ---------------------------- the welcome ------------------------------ */
  // The hero's own promise, in the business's own words, is a far better
  // greeting than anything generic. Glimmer's is "Half of the year happens
  // after sunset. We make sure your home is still there when it does."
  // Start AFTER the <h1>. The hero's promise is the paragraph under the name,
  // and everything above it is the header bar: a phone number, a menu, and a
  // service-area list. Slicing from the top drags all of that in even after the
  // <nav> strip, because a forged header is not always a <nav> element.
  const firstStop = body.search(/id=["'](?:switch|story|services|about|menu)["']/);
  const h1End = body.search(/<\/h1>/i);
  const heroFrom = h1End > 0 ? h1End + 5 : 0;
  const heroTo = firstStop > heroFrom ? firstStop : heroFrom + 8000;
  const heroLine = deNav(quote(body.slice(heroFrom, heroTo), { max: 2, minLen: 30 }));
  beats.push({
    id: 'welcome',
    anchor: 'top',
    text: `Welcome to ${business}.${heroLine ? ` ${heroLine}` : ''} Let me show you around. This takes about a minute.`,
  });

  /* ----------------------------- the stops ------------------------------- */
  for (const stop of STOPS) {
    const chunk = sectionChunk(body, stop.anchor);
    if (!chunk) continue;
    const head = deNav(headingOf(chunk));
    // Skip the heading in the quote so she does not say the same line twice.
    const said_ = deNav(quote(chunk.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, ' '), { max: 2 }));
    // ⚠️ A HEADING ALONE IS NOT A STOP. Scrolling someone to a section to read
    // its title back to them is worse than skipping it: it burns three seconds
    // and tells them nothing they cannot see. A stop must carry real prose.
    if (said_.length < 45) continue;
    beats.push({ id: stop.anchor, anchor: stop.anchor, text: [stop.bridge, head, said_].filter(Boolean).join(' ').trim() });
    if (beats.length >= 5) break; // a tour, not a lecture
  }

  /* ------------------------------ the close ------------------------------ */
  // ⚠️ THE HANDOFF IS THE POINT. The tour is one-way; the agent is the thing
  // that can actually take their name. Ending anywhere else wastes the visit.
  const book = sectionChunk(body, 'book') || sectionChunk(body, 'contact');
  const bookLine = deNav(quote(book.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, ' '), { max: 2 }));
  beats.push({
    id: 'close',
    anchor: book ? 'book' : 'top',
    text:
      `${bookLine || 'When you are ready, we would love to hear from you.'} ` +
      `You can ask right here, or press the gold button any time and talk to us now, even if it is late.` +
      `${phone ? '' : ''}`,
  });

  return { palette, beats };
}
