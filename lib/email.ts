/**
 * Modern Mustard Seed email system.
 *
 * One design language for every email we send. Rooted in the real brand:
 * a deep-sky sunrise header crowned by a brass hairline, a warm cream card,
 * editorial serif headlines (designed to look right even when web fonts are
 * stripped and Georgia carries it), gold reserved for accents and the CTA,
 * and the founding scripture in the footer.
 *
 * Every template shares the same shell:
 *   sky header (mark + wordmark + subtitle)
 *   cream card body
 *   footer (gold rule, wordmark, scripture, citation)
 *
 * No em dashes anywhere. Periods, commas, parentheses. Period.
 *
 * Public API is unchanged. The token object `C` carries the brand palette;
 * the legacy `skyShell` split is gone, every email now flows through `shell`.
 */

// Pop-art comic palette. Cream page, white card, bold black ink, mustard
// header, red accents. Inline-safe hexes for email clients.
const C = {
  // Surfaces
  page: '#FBF6EA',      // cream page (frames the card)
  card: '#FFFFFF',      // white comic card surface
  panel: '#FFFDF6',     // inset panel
  panelWarm: '#FFF3CC', // yellow-tinted inset

  // Header (mustard, comic)
  sky: '#F5B700',       // mustard header + primary fills
  skyDeep: '#E8A800',   // deeper mustard
  skyMid: '#FFC400',    // mid mustard
  skyLo: '#FFD23F',     // light mustard

  // Accents
  gold: '#C2261A',      // red, legible link/accent on cream (bold)
  goldDeep: '#9A1C12',  // deeper red
  goldBrand: '#F5B700', // mustard (CTA fill, rules)
  goldLite: '#FFD23F',  // light mustard

  // Ink
  ink: '#161616',       // comic black ink (headlines, max contrast)
  body: '#3A3733',      // comfortable body copy
  muted: '#8A8378',     // taupe for labels and fine print
  ghost: '#A7A091',     // ghost copy

  // Hairlines
  line: '#E7DECC',      // soft warm hairline (inner rules)
  lineGold: '#161616',  // comic black rule
};

// Font names use SINGLE quotes so they never break a double-quoted style="..."
// attribute. Double quotes here would close the attribute early and drop every
// CSS property after font-family (color, text-decoration, borders).
const SERIF = "'Playfair Display','Hoefler Text','Iowan Old Style','Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";

const SITE = 'https://modernmustardseed.com';
// "Book a discovery call" opens the Mustard Seed chatbot straight into the
// guided slot picker (?book=1 is handled by components/MustardSeedChat).
const BOOKING_URL = `${SITE}/?book=1`;
const AUDIT_URL = `${SITE}/audit`;
const WEBSITE_AUDIT_URL = `${SITE}/website-audit`;
const BUILD_QUEUE_URL = `${SITE}/build-queue`;
const WORK_URL = `${SITE}/work`;
const ENGAGEMENTS_URL = `${SITE}/work-with-us`;

export function escape(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ────────────────────────── SHELL ────────────────────────── */

type ShellArgs = {
  preheader?: string;
  subtitle?: string;   // italic serif line under the wordmark in the header
  inner: string;
  showSocial?: boolean;
};

function header(subtitle?: string): string {
  return `
    <!-- Mustard comic header with the mascot -->
    <tr><td align="center" bgcolor="${C.sky}" style="background:${C.sky};padding:34px 40px 28px;border-bottom:3px solid ${C.ink}">
      <img src="${SITE}/brand/mascot.png" width="56" height="75" alt="Modern Mustard Seed" style="display:block;margin:0 auto 14px;border:0;outline:none;text-decoration:none;height:auto;max-width:56px" />
      <div style="font-family:${SANS};font-size:13px;font-weight:800;letter-spacing:5px;text-transform:uppercase;color:${C.ink}">Modern Mustard Seed</div>
      ${subtitle ? `<div style="font-family:${SERIF};font-style:italic;font-weight:600;font-size:17px;color:${C.ink};margin-top:10px;letter-spacing:0.2px">${escape(subtitle)}</div>` : ''}
    </td></tr>`;
}

function footer(showSocial: boolean): string {
  const socialRow = showSocial
    ? `<tr><td align="center" style="padding:0 0 16px">
        <a href="https://x.com/sarahmscarano" style="color:${C.gold};text-decoration:none;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700">X</a>
        <span style="color:${C.ghost};margin:0 12px">&middot;</span>
        <a href="https://www.linkedin.com/in/sarahmscarano/" style="color:${C.gold};text-decoration:none;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700">LinkedIn</a>
        <span style="color:${C.ghost};margin:0 12px">&middot;</span>
        <a href="https://instagram.com/modernmustardseed" style="color:${C.gold};text-decoration:none;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700">Instagram</a>
      </td></tr>`
    : '';

  return `<tr><td style="padding:30px 16px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${showSocial ? `<tr><td align="center" style="padding:0 0 24px">
        <a href="${BOOKING_URL}" style="display:inline-block;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.gold};text-decoration:none;border:1px solid ${C.lineGold};border-radius:999px;padding:12px 26px">Book a 30 min call with Sarah &rarr;</a>
      </td></tr>` : ''}
      <tr><td align="center" style="padding:0 0 18px">
        <table role="presentation" width="110" cellpadding="0" cellspacing="0" border="0"><tr>
          <td height="1" bgcolor="${C.goldBrand}" style="height:1px;line-height:1px;font-size:0;background:${C.goldBrand};background-image:linear-gradient(to right,transparent,${C.goldBrand},transparent)">&nbsp;</td>
        </tr></table>
      </td></tr>
      ${socialRow}
      <tr><td align="center" style="padding:0 0 14px">
        <a href="${SITE}" style="color:${C.gold};text-decoration:none;font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700">modernmustardseed.com</a>
      </td></tr>
      <tr><td align="center" style="padding:0 0 12px">
        <p style="margin:0;color:${C.body};font-family:${SERIF};font-size:15px;font-style:italic;line-height:1.55">
          &ldquo;If you have faith as small as a mustard seed, nothing will be impossible for you.&rdquo;
        </p>
      </td></tr>
      <tr><td align="center">
        <p style="margin:0;color:${C.muted};font-family:${SANS};font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700">
          Matthew 17:20 &nbsp;&middot;&nbsp; Kalispell, Montana
        </p>
      </td></tr>
    </table>
  </td></tr>`;
}

function shell({ preheader = '', subtitle, inner, showSocial = true }: ShellArgs): string {
  return `<!DOCTYPE html>
<html lang="en" style="background:${C.page}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<title>Modern Mustard Seed</title>
<style>
  :root { color-scheme: light only; supported-color-schemes: light; }
  [data-ogsc] body, [data-ogsb] body { background:${C.page} !important; }
  [data-ogsc] .mms-card, [data-ogsb] .mms-card { background:${C.card} !important; }
  [data-ogsc] .mms-ink, [data-ogsb] .mms-ink { color:${C.ink} !important; }
  [data-ogsc] .mms-body, [data-ogsb] .mms-body { color:${C.body} !important; }
  @media (prefers-color-scheme: dark) {
    body { background:${C.page} !important; }
    .mms-card { background:${C.card} !important; }
    .mms-ink { color:${C.ink} !important; }
    .mms-body { color:${C.body} !important; }
  }
</style>
</head>
<body class="body" style="margin:0;padding:0;background:${C.page};font-family:${SANS};color:${C.ink};line-height:1.6;-webkit-font-smoothing:antialiased;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}">
  <tr><td align="center" style="padding:40px 16px 36px">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">

      <!-- The card -->
      <tr><td style="padding:0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" class="mms-card" style="background:${C.card};border:2px solid ${C.ink};border-radius:18px;overflow:hidden">
          ${header(subtitle)}
          ${inner}
        </table>
      </td></tr>

      ${footer(showSocial)}

    </table>

  </td></tr>
</table>
</body></html>`;
}

/* ────────────────────────── SHARED BLOCKS ────────────────────────── */

function overline(text: string): string {
  return `<div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${C.gold}">${escape(text)}</div>`;
}

function headline(text: string): string {
  return `<tr><td style="padding:34px 44px 0">
    <h1 class="mms-ink" style="margin:0;font-family:${SERIF};font-size:31px;font-weight:600;color:${C.ink};letter-spacing:-0.2px;line-height:1.2">${escape(text)}</h1>
  </td></tr>`;
}

function lede(text: string): string {
  return `<tr><td style="padding:18px 44px 0">
    <p style="margin:0;font-family:${SERIF};font-style:italic;font-weight:600;font-size:20px;color:${C.gold};line-height:1.45">${escape(text)}</p>
  </td></tr>`;
}

function paragraph(html: string): string {
  return `<tr><td class="mms-body" style="padding:22px 44px 0;font-family:${SANS};font-size:16px;color:${C.body};line-height:1.72">${html}</td></tr>`;
}

function valueCallout(label: string, html: string): string {
  return `<tr><td style="padding:24px 44px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-left:3px solid ${C.goldBrand};border-radius:10px">
      <tr><td style="padding:20px 24px">
        <div style="margin-bottom:10px">${overline(label)}</div>
        <div class="mms-body" style="font-family:${SANS};font-size:15px;color:${C.body};line-height:1.7">${html}</div>
      </td></tr>
    </table>
  </td></tr>`;
}

function ctaBlock(primary: { label: string; url: string }, secondary?: { label: string; url: string }): string {
  return `<tr><td style="padding:32px 44px 0" align="left">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td bgcolor="${C.goldBrand}" style="background:${C.goldBrand};border:2px solid ${C.ink};border-radius:10px">
        <a href="${primary.url}" style="display:inline-block;color:${C.ink};text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;padding:16px 30px;font-family:${SANS}">${escape(primary.label)}</a>
      </td>
      ${secondary ? `<td style="padding-left:18px"><a href="${secondary.url}" style="display:inline-block;color:${C.gold};text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase;padding:16px 4px;font-family:${SANS}">${escape(secondary.label)} &rarr;</a></td>` : ''}
    </tr></table>
  </td></tr>`;
}

// The SAP signature: an oversized hand-drawn heart that crosses at the bottom
// into a long tail, then SAP (Sarah, Anthony & Polly). Signs every email. The
// name arg is kept for call-site compatibility but the signature is always SAP.
function signature(_name?: string): string {
  return `<tr><td style="padding:34px 44px 42px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:12px;vertical-align:middle"><div style="width:30px;height:2px;background:${C.goldBrand};font-size:0;line-height:0">&nbsp;</div></td>
      <td style="vertical-align:middle"><span style="font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.muted};font-weight:700">With love and faith,</span></td>
    </tr></table>
    <img src="https://modernmustardseed.com/brand/sap-heart.png" width="84" height="78" alt="SAP" style="display:block;margin:12px 0 2px -2px;border:0" />
    <p class="mms-ink" style="margin:0;font-family:${SERIF};font-style:italic;font-size:30px;color:${C.ink};font-weight:700;letter-spacing:0.5px">SAP</p>
    <p class="mms-ink" style="margin:5px 0 0;font-family:${SANS};font-size:12px;color:${C.ink};font-weight:600">Sarah, Anthony &amp; Polly</p>
    <p style="margin:2px 0 0;font-family:${SANS};font-size:11px;color:${C.gold};letter-spacing:2px;text-transform:uppercase;font-weight:700">Modern Mustard Seed</p>
    <p class="mms-ink" style="margin:7px 0 0;font-family:${SERIF};font-style:italic;font-size:14px;color:${C.ink};font-weight:600">Do you want your business to thrive?</p>
  </td></tr>`;
}

function nextUp(text: string): string {
  return `<tr><td style="padding:8px 44px 36px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${C.line};padding-top:22px">
      <div style="margin-bottom:9px">${overline('Coming next')}</div>
      <p class="mms-body" style="margin:0;font-family:${SANS};font-size:14px;color:${C.body};line-height:1.65">${escape(text)}</p>
    </td></tr></table>
  </td></tr>`;
}

function statusPill(label: string, bg: string, fg: string): string {
  return `<tr><td style="padding:34px 44px 0">
    <span style="display:inline-block;background:${bg};color:${fg};padding:6px 14px;border-radius:6px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">${escape(label)}</span>
  </td></tr>`;
}

/* ────────────────────────── MAGIC LINK (portal sign-in) ────────────────────────── */

/** Passwordless sign-in email for the client portal. */
export function magicLinkEmail({ firstName, url, note }: { firstName?: string; url: string; note?: string }): string {
  const name = firstName?.trim();
  const inner =
    headline(name ? `Welcome back, ${name}` : 'Sign in to your portal') +
    lede('One tap and you are in. No password to remember.') +
    (note ? paragraph(`<strong>${note}</strong>`) : '') +
    paragraph('Use the button below to open your Modern Mustard Seed workspace. For your security the link expires in 20 minutes and can be used once.') +
    ctaBlock({ label: 'Open my portal', url }) +
    paragraph(`<span style="font-size:13px;color:${C.muted}">If the button does not work, paste this link into your browser:<br><a href="${url}" style="color:${C.gold};word-break:break-all">${url}</a></span>`) +
    paragraph(`<span style="font-size:13px;color:${C.muted}">If you did not request this, you can safely ignore this email.</span>`) +
    signature('Sarah');
  return shell({ preheader: 'Your secure sign-in link (expires in 20 minutes)', subtitle: 'Your sign-in link', inner });
}

/* ────────────────────────── AFFILIATE WELCOME ────────────────────────── */

/** Sent when Sarah approves a partner. Carries their code and a passwordless
 *  link into their dashboard, where their links and free access live. */
export function affiliateWelcomeEmail({
  firstName,
  code,
  url,
}: {
  firstName?: string;
  code: string;
  url: string;
}): string {
  const name = firstName?.trim();
  const loginUrl = `${SITE}/portal/login`;
  const inner =
    headline(name ? `Welcome to the team, ${name}` : 'Welcome to the team') +
    lede('You are in, and I am genuinely glad you are here.') +
    paragraph('Your partner account is live. You now have free access to every Modern Mustard Seed product, so you can learn them and speak to them honestly, and you earn 50 percent on every product sale and 10 percent of any build you send our way.') +
    valueCallout('Your referral code', `<span style="font-family:${SERIF};font-size:22px;color:${C.ink};font-weight:600;letter-spacing:1px">${escape(code)}</span><br><span style="font-size:13px;color:${C.muted}">Add it to any link, for example ${escape(SITE)}/the-terminal?ref=${escape(code)}</span>`) +
    ctaBlock({ label: 'Open my partner dashboard', url }, { label: 'Sign in anytime', url: loginUrl }) +
    paragraph(`<span style="font-size:13px;color:${C.muted}">That button is a one-tap sign-in and it expires in 20 minutes. You can sign in fresh anytime: go to <a href="${loginUrl}" style="color:${C.gold};font-weight:600">modernmustardseed.com/portal/login</a>, enter the email this was sent to, and we email you a new link. No password, ever.</span>`) +
    paragraph('Inside you will find your links with one-tap copy, your numbers and earnings, and free access to every product. Share what you believe in, tell your audience the truth (including that you earn a commission), and we will root for you the whole way.') +
    signature('Sarah');
  return shell({ preheader: 'Your Modern Mustard Seed partner account is live', subtitle: 'Partner Program', inner });
}

/* ────────────────────────── WEBSITE AUDIT (manual, personalized) ────────────────────────── */

export type AuditCategory = { score: number; letter: string; notes: string };
export type AuditReport = {
  overall_score: number;
  letter_grade: string;
  headline: string;
  overall_analysis: string;
  categories?: Record<string, AuditCategory>;
  top_three_fixes?: { title: string; why: string; how: string }[];
  full_todo?: { category: string; priority: string; task: string }[];
};

/**
 * Personalized website-audit email. Sent by hand from the admin, never part of
 * any drip. Carries the score, the honest headline, the three highest-leverage
 * fixes, the full to-do list, and a booking link for anyone who wants help.
 * `note` is Sarah's own message at the top, so each send reads as a real,
 * one-to-one offer rather than a template.
 */
const TRACK_SITE = 'https://modernmustardseed.com';
/** A 1x1 open-tracking pixel row, keyed to a prospect id. Email-table safe. */
function trackPixel(id?: string): string {
  if (!id) return '';
  return `<tr><td style="padding:0;height:1px;line-height:1px;font-size:1px"><img src="${TRACK_SITE}/api/track/open?p=${encodeURIComponent(id)}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px"></td></tr>`;
}

export function auditReportEmail({
  toName,
  url,
  report,
  note,
  trackId,
}: {
  toName?: string;
  url: string;
  report: AuditReport;
  note?: string;
  trackId?: string;
}): string {
  let domain = url;
  try {
    domain = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw url */
  }
  const first = toName?.trim()?.split(/\s+/)[0];

  const priorityStyle: Record<string, { bg: string; fg: string }> = {
    high: { bg: '#F6E2DC', fg: '#9A2D14' },
    medium: { bg: '#F6ECD6', fg: C.goldDeep },
    low: { bg: '#E9EEE6', fg: '#5C6B57' },
  };

  const noteHtml =
    note && note.trim()
      ? escape(note.trim()).replace(/\n/g, '<br>')
      : `First off, there is a lot to like about ${escape(domain)}, and it is clear you put real care into your business. I ran a full audit and pulled together what is already working, plus the few highest-leverage things that would help it bring in even more. The short version is below, the full to-do list at the bottom. None of this is meant as criticism, just a friendly roadmap from someone who would genuinely love to see you win.`;

  const fixes = (report.top_three_fixes ?? []).slice(0, 3);
  const fixesBlock = fixes.length
    ? `<tr><td style="padding:30px 44px 0">
        <div style="margin-bottom:14px">${overline('Fix these three first')}</div>
        ${fixes
          .map(
            (f, i) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-radius:10px;margin-bottom:12px">
            <tr><td style="padding:18px 20px">
              <p class="mms-ink" style="margin:0 0 8px;font-family:${SERIF};font-size:18px;font-weight:600;color:${C.ink};line-height:1.3">${i + 1}. ${escape(f.title)}</p>
              <p class="mms-body" style="margin:0 0 6px;font-family:${SANS};font-size:14px;color:${C.body};line-height:1.6"><span style="color:${C.gold};font-weight:700;font-size:11px;letter-spacing:1.5px;text-transform:uppercase">Why&nbsp;&nbsp;</span>${escape(f.why)}</p>
              <p class="mms-body" style="margin:0;font-family:${SANS};font-size:14px;color:${C.body};line-height:1.6"><span style="color:${C.gold};font-weight:700;font-size:11px;letter-spacing:1.5px;text-transform:uppercase">How&nbsp;&nbsp;</span>${escape(f.how)}</p>
            </td></tr>
          </table>`
          )
          .join('')}
      </td></tr>`
    : '';

  const todos = report.full_todo ?? [];
  const todoBlock = todos.length
    ? `<tr><td style="padding:30px 44px 0">
        <div style="margin-bottom:14px">${overline('Your full to-do list')}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-radius:10px">
          ${todos
            .map((t, i) => {
              const ps = priorityStyle[t.priority] ?? priorityStyle.medium;
              return `<tr><td style="padding:12px 18px;${i === 0 ? '' : `border-top:1px solid ${C.line}`}">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td valign="top" style="padding-right:12px">
                  <span style="display:inline-block;background:${ps.bg};color:${ps.fg};padding:3px 8px;border-radius:5px;font-family:${SANS};font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">${escape(t.priority)}</span>
                </td>
                <td valign="top"><span class="mms-body" style="font-family:${SANS};font-size:14px;color:${C.body};line-height:1.55">${escape(t.task)}</span></td>
              </tr></table>
            </td></tr>`;
            })
            .join('')}
        </table>
      </td></tr>`
    : '';

  const inner =
    headline(first ? `${first}, here is your audit` : `Your audit, ${domain}`) +
    lede(report.headline || `A clear read on ${domain}`) +
    paragraph(noteHtml) +
    valueCallout(
      'The score',
      `<span style="font-family:${SERIF};font-size:30px;color:${C.ink};font-weight:600">${escape(String(report.overall_score))}</span><span style="font-size:15px;color:${C.muted}"> / 100</span> &nbsp;&nbsp; <span style="font-size:13px;color:${C.gold};font-weight:700;letter-spacing:1px">GRADE ${escape(report.letter_grade)}</span>`
    ) +
    (report.overall_analysis ? paragraph(escape(report.overall_analysis).replace(/\n/g, '<br><br>')) : '') +
    fixesBlock +
    todoBlock +
    ctaBlock({ label: 'Book a 30 min call', url: BOOKING_URL }, { label: 'Run it again anytime', url: WEBSITE_AUDIT_URL }) +
    paragraph(
      `<span style="font-size:14px">Honestly, we would love to help you fix these. Helping local businesses turn their website into something that quietly brings in real work is the thing we do best, and we would be glad to take this whole list off your plate so you can get back to what you actually love doing. Just reply to this email or grab a time above and we will map the fastest path to your A. No pressure either way, and either way I am cheering you on.</span>`
    ) +
    signature('Sarah') +
    trackPixel(trackId);

  return shell({
    preheader: `Your website audit: ${report.overall_score}/100 (${report.letter_grade}). The three fixes that matter most.`,
    subtitle: `Audit · ${domain}`,
    inner,
  });
}

/* ────────────────────────── PROPOSAL (send for signature) ────────────────────────── */

/**
 * Sends the client a link to their proposal, where they review, sign, and pay
 * the deposit to begin. Sent by hand from the admin. `note` is Sarah's message.
 */
export function proposalSendEmail({
  toName,
  url,
  note,
}: {
  toName?: string;
  url: string;
  note?: string;
}): string {
  const first = toName?.trim()?.split(/\s+/)[0];
  const inner =
    headline(first ? `${first}, here is your proposal` : 'Your proposal is ready') +
    lede('Review it, sign it, and we begin.') +
    (note && note.trim()
      ? paragraph(escape(note.trim()).replace(/\n/g, '<br>'))
      : paragraph(
          'Everything we discussed is laid out at the link below: the scope, the deliverables, the timeline, and the price. When it looks right, sign it in one tap and pay the 50 percent deposit to put your build on the calendar.'
        )) +
    ctaBlock({ label: 'Review and sign', url }) +
    paragraph(
      `<span style="font-size:13px;color:${C.muted}">If the button does not work, paste this into your browser:<br><a href="${url}" style="color:${C.gold};word-break:break-all">${url}</a></span>`
    ) +
    paragraph('The moment you sign and the deposit clears, I get to work and your project space goes live. Questions before you do? Just reply to this email.') +
    signature('Sarah');
  return shell({ preheader: 'Your proposal: review, sign, and begin', subtitle: 'Your proposal', inner });
}

/** Sent to the client right after they sign, with the signed PDF attached. */
export function proposalSignedEmail({ toName, payUrl }: { toName?: string; payUrl?: string }): string {
  const first = toName?.trim()?.split(/\s+/)[0];
  const inner =
    headline(first ? `${first}, you signed. Here is your copy` : 'You signed. Here is your copy') +
    lede('Your signed proposal is attached.') +
    paragraph('Thank you. The signed proposal is attached as a PDF for your records. Your project space is live and you will get a separate email with your portal link.') +
    (payUrl
      ? ctaBlock({ label: 'Pay the deposit to begin', url: payUrl }) +
        paragraph('The moment the 50 percent deposit clears, your build is on the calendar and I get to work.')
      : paragraph('I am on it. Watch your inbox for next steps.')) +
    signature('Sarah');
  return shell({ preheader: 'Your signed proposal (PDF attached)', subtitle: 'Signed and accepted', inner });
}

/* ────────────────────────── DEPOSIT INVOICE (proposal money loop) ────────────────────────── */

/**
 * The deposit-to-begin email for an accepted proposal. Carries the amount and a
 * Stripe payment link. Sent by hand from the admin, never part of a drip.
 */
export function depositInvoiceEmail({
  toName,
  label,
  amountUsd,
  payUrl,
  note,
}: {
  toName?: string;
  label: string;
  amountUsd: number;
  payUrl: string;
  note?: string;
}): string {
  const first = toName?.trim()?.split(/\s+/)[0];
  const inner =
    headline(first ? `${first}, here is your deposit to begin` : 'Your deposit to begin') +
    lede('One payment and we start. This holds your timeline.') +
    (note && note.trim()
      ? paragraph(escape(note.trim()).replace(/\n/g, '<br>'))
      : paragraph(
          `This is the 50 percent deposit to begin ${escape(label)}. The balance is due on delivery. The deposit holds your spot and your timeline, and it is the only thing standing between here and the work starting.`
        )) +
    valueCallout(
      'Deposit due',
      `<span style="font-family:${SERIF};font-size:30px;color:${C.ink};font-weight:600">$${amountUsd.toLocaleString('en-US')}</span> <span style="font-size:14px;color:${C.muted}">to start</span>`
    ) +
    ctaBlock({ label: 'Pay the deposit', url: payUrl }) +
    paragraph(
      `<span style="font-size:13px;color:${C.muted}">Secure checkout by Stripe. If the button does not work, paste this into your browser:<br><a href="${payUrl}" style="color:${C.gold};word-break:break-all">${payUrl}</a></span>`
    ) +
    paragraph('The moment this clears, your build is on the calendar and I get to work. Questions before you pay? Just reply to this email.') +
    signature('Sarah');
  return shell({ preheader: `Your deposit to begin ${label}`, subtitle: 'Deposit to begin', inner });
}

/** The final balance invoice, sent when the build is delivered. */
export function balanceInvoiceEmail({
  toName,
  label,
  amountUsd,
  payUrl,
  note,
}: {
  toName?: string;
  label: string;
  amountUsd: number;
  payUrl: string;
  note?: string;
}): string {
  const first = toName?.trim()?.split(/\s+/)[0];
  const inner =
    headline(first ? `${first}, the build is ready` : 'The build is ready') +
    lede('Here is the final balance to wrap it up.') +
    (note && note.trim()
      ? paragraph(escape(note.trim()).replace(/\n/g, '<br>'))
      : paragraph(
          `This is the remaining 50 percent balance on ${escape(label)}, due on delivery. Once it clears, everything is fully yours: the repo, the deploys, every credential.`
        )) +
    valueCallout(
      'Balance due',
      `<span style="font-family:${SERIF};font-size:30px;color:${C.ink};font-weight:600">$${amountUsd.toLocaleString('en-US')}</span> <span style="font-size:14px;color:${C.muted}">on delivery</span>`
    ) +
    ctaBlock({ label: 'Pay the balance', url: payUrl }) +
    paragraph(
      `<span style="font-size:13px;color:${C.muted}">Secure checkout by Stripe. If the button does not work, paste this into your browser:<br><a href="${payUrl}" style="color:${C.gold};word-break:break-all">${payUrl}</a></span>`
    ) +
    signature('Sarah');
  return shell({ preheader: `Final balance for ${label}`, subtitle: 'Balance due', inner });
}

/** Post-delivery ask for a review. Sent once when a build is paid in full or launched. */
export function reviewRequestEmail({
  toName,
  reviewUrl,
  portalUrl,
}: {
  toName?: string;
  reviewUrl: string;
  portalUrl?: string;
}): string {
  const first = toName?.trim()?.split(/\s+/)[0];
  const inner =
    headline(first ? `${first}, it is live and it is yours` : 'It is live and it is yours') +
    lede('One small favor, if you have 30 seconds.') +
    paragraph('It was a joy building this with you. If you are happy with how it turned out, a short review helps the next small business find a partner who will ship for them. It genuinely makes a difference for a small studio.') +
    ctaBlock({ label: 'Leave a review', url: reviewUrl }) +
    (portalUrl
      ? paragraph(`<span style="font-size:13px;color:${C.muted}">Everything we built lives in your portal: <a href="${portalUrl}" style="color:${C.gold}">${portalUrl}</a></span>`)
      : '') +
    paragraph('Thank you for trusting me with it. I am here whenever you want to build the next thing.') +
    signature('Sarah');
  return shell({ preheader: 'Your build is live. A quick favor?', subtitle: 'It is live', inner });
}

/** Start-your-monthly-plan invoice. Recurring subscription, cancel anytime. */
export function subscriptionInvoiceEmail({
  toName,
  label,
  amountUsd,
  payUrl,
}: {
  toName?: string;
  label: string;
  amountUsd: number;
  payUrl: string;
}): string {
  const first = toName?.trim()?.split(/\s+/)[0];
  const amt = `$${amountUsd.toLocaleString('en-US')}`;
  const inner =
    headline(first ? `${first}, start your monthly plan` : 'Start your monthly plan') +
    lede(`${amt} per month for ${label}.`) +
    paragraph('This is a recurring monthly plan. The first payment starts it, and it renews automatically each month. You can cancel anytime, just let me know.') +
    ctaBlock({ label: `Start plan, ${amt}/mo`, url: payUrl }) +
    paragraph(`<span style="font-size:13px;color:${C.muted}">Secure checkout by Stripe. Questions about scope or billing? Just reply to this email.</span>`) +
    signature('Sarah');
  return shell({ preheader: `Start your ${amt}/mo plan`, subtitle: 'Your monthly plan', inner });
}

/** A subscription payment failed. Ask the client to update their card. */
export function subscriptionPaymentFailedEmail({
  toName,
  label,
  manageUrl,
}: {
  toName?: string;
  label: string;
  manageUrl: string;
}): string {
  const first = toName?.trim()?.split(/\s+/)[0];
  const inner =
    headline(first ? `${first}, a quick payment hiccup` : 'A quick payment hiccup') +
    lede(`We could not process this month's payment for ${label}.`) +
    paragraph('It happens, usually an expired or replaced card. Update your payment method and we will retry automatically. Nothing is interrupted yet.') +
    ctaBlock({ label: 'Update payment method', url: manageUrl }) +
    paragraph(`<span style="font-size:13px;color:${C.muted}">Open your portal, then tap Manage plan. Questions? Just reply to this email.</span>`) +
    signature('Sarah');
  return shell({ preheader: 'Update your payment method', subtitle: 'Payment needs attention', inner });
}

/** Internal heads-up to Sarah when a client sends a note or change request from their portal. */
export function clientMessageEmail({
  fromName,
  fromEmail,
  body,
  source,
  projectName,
  adminUrl,
}: {
  fromName?: string;
  fromEmail: string;
  body: string;
  source: 'note' | 'chatbot' | 'launch_date' | 'revision';
  projectName?: string;
  adminUrl: string;
}): string {
  const who = fromName?.trim() || fromEmail;
  const via =
    source === 'chatbot'
      ? 'via Mr. Mustard Seed'
      : source === 'launch_date'
        ? 'a launch date request'
        : source === 'revision'
          ? 'ONE OF THEIR TWO FREE EDITS'
          : 'from their portal';
  const safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inner =
    headline(`New message from ${who}`) +
    lede(`A client just sent you a change request or note ${via}.`) +
    paragraph(`<strong>${who}</strong> &lt;${fromEmail}&gt;${projectName ? ` &middot; ${projectName}` : ''}`) +
    paragraph(`<span style="display:block;border-left:3px solid ${C.gold};padding:12px 16px;background:${C.panel};border-radius:8px;white-space:pre-wrap">${safe}</span>`) +
    ctaBlock({ label: 'Open the command center', url: adminUrl }) +
    paragraph(`<span style="font-size:13px;color:${C.muted}">Reply to this email to respond to ${who} directly.</span>`);
  return shell({ preheader: `${who}: ${body.slice(0, 80)}`, subtitle: 'New client message', inner });
}

/** Fires the moment a referred sale clears. The partner just made money. */
export function affiliateEarningsEmail({
  toName,
  amount,
  product,
  dashboardUrl,
}: {
  toName?: string;
  amount: string;
  product?: string;
  dashboardUrl: string;
}): string {
  const first = toName?.trim()?.split(/\s+/)[0];
  const inner =
    headline(first ? `${first}, you just earned ${amount}` : `You just earned ${amount}`) +
    lede(product ? `Someone you sent bought ${product}.` : 'A referral of yours just bought.') +
    paragraph(`That is <strong>${amount}</strong> in commission${product ? ` on ${product}` : ''}. It becomes payable once the refund window passes, then it goes out on the next payout run. Nothing for you to do.`) +
    ctaBlock({ label: 'See your dashboard', url: dashboardUrl }) +
    paragraph('Thank you for sharing what we build. It genuinely means the world to a small studio. Keep going.') +
    signature('Sarah');
  return shell({ preheader: `You earned ${amount}.`, subtitle: 'You earned a commission', inner });
}

/* ────────────────────────── PROGRAM ACCESS (Terminal / Idea to Spec) ────────────────────────── */

/** Delivery email for a $497 program purchase. Carries a passwordless link
 *  straight into the gated HQ (live tool + watermarked playbook). */
export function programAccessEmail({
  firstName,
  programName,
  toolName,
  url,
}: {
  firstName?: string;
  programName: string;
  toolName: string;
  url: string;
}): string {
  const name = firstName?.trim();
  const inner =
    headline(name ? `You're in, ${name}` : `Welcome to ${programName}`) +
    lede('Thank you. Everything is ready and waiting for you.') +
    paragraph(`Your purchase of ${escape(programName)} is confirmed. The button below takes you straight into your HQ, where ${escape(toolName)} lives and stays current, and your playbook is ready to download, watermarked to you.`) +
    ctaBlock({ label: `Enter ${programName}`, url }) +
    paragraph(`<span style="font-size:13px;color:${C.muted}">Bookmark it. This link signs you in for 30 days. If it ever expires, request a fresh one from the sign-in page with this same email.</span>`) +
    paragraph('Start with the setup checklist inside your HQ, then run the first step. The whole thing is built to get you shipping, not studying.') +
    signature('Sarah');
  return shell({ preheader: `Your ${programName} access is ready`, subtitle: programName, inner });
}

/* ────────────────────────── DEMO FILM CARD ────────────────────────── */

/** The welcome films that ship with a forged Demo Suite. Keep in sync with the
 *  `film` prop on components/demo/DemoHub. */
export type DemoFilm = 'demo-welcome' | 'demo-welcome-voice' | 'demo-welcome-site' | 'demo-welcome-os';

/**
 * Mr. Mustard's welcome film, as an email-safe card.
 *
 * No mail client plays inline <video> reliably (Gmail and Outlook strip it
 * outright), so we ship the real poster frame as a big linked image with a play
 * badge drawn in HTML, and the click lands on the hub where the film actually
 * plays. Fixed pixel width + max-width:100% is the one pattern Outlook honors.
 */
export function demoFilmCard({ film, href, caption }: { film: DemoFilm; href: string; caption?: string }): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr><td align="center">
    <a href="${escape(href)}" style="text-decoration:none;color:${C.ink}">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:2px solid ${C.ink};border-radius:14px;overflow:hidden;background:${C.ink}">
        <tr><td style="line-height:0">
          <img src="${SITE}/video/${film}-poster.jpg" width="516" alt="Press play: a 20-second welcome from Mr. Mustard" style="display:block;width:100%;max-width:516px;height:auto;border:0" />
        </td></tr>
        <tr><td align="center" style="padding:12px 16px;background:${C.goldBrand}">
          <span style="font-family:${SANS};font-size:13px;font-weight:bold;color:${C.ink};letter-spacing:.08em;text-transform:uppercase">&#9654;&nbsp; Play the welcome film</span>
        </td></tr>
      </table>
    </a>
    ${caption ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:12px;color:${C.muted}">${escape(caption)}</p>` : ''}
  </td></tr></table>`;
}

/* ────────────────────────── CLIENT EMAIL (general) ────────────────────────── */

type ClientEmailArgs = {
  preheader?: string;
  eyebrow?: string;
  greeting?: string;
  body: string; // HTML built from p() and callout()
  cta?: { label: string; url: string };
  secondary?: { label: string; url: string };
  signature?: string;
  trackId?: string;
};

/** General-purpose outbound customer email. */
export function clientEmail({
  preheader = '',
  eyebrow: eb,
  greeting,
  body,
  cta,
  secondary,
  signature: sig = 'Sarah',
  trackId,
}: ClientEmailArgs): string {
  const inner = `
    ${greeting ? headline(greeting) : ''}
    <tr><td class="mms-body" style="padding:24px 44px 0;font-family:${SANS};font-size:16px;color:${C.body};line-height:1.72">${body}</td></tr>
    ${cta ? ctaBlock(cta, secondary) : ''}
    ${signature(sig)}
    ${trackPixel(trackId)}
  `;
  return shell({ preheader, subtitle: eb, inner });
}

/* ────────────────────────── PLAYBOOK EMAIL (post-chat) ────────────────────────── */

type PlaybookEmailArgs = {
  firstName: string;
  painSummary: string;
  recommendedSteps: { title: string; detail: string }[];
  recommendedOffer?: { name: string; price: string; why: string; href: string };
  nextUpTease?: string;
};

/** Value-based auto-reply after the Mustard Seed chat. Reads the visitor's
 * pain back to them, then hands over a custom step-by-step playbook. */
export function playbookEmail({
  firstName,
  painSummary,
  recommendedSteps,
  recommendedOffer,
  nextUpTease,
}: PlaybookEmailArgs): string {
  const stepsHtml = recommendedSteps
    .map(
      (s, i) => `
    <div style="padding:20px 0;border-bottom:1px solid ${C.line}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="40" style="vertical-align:top"><div style="font-family:${SERIF};font-style:italic;font-size:26px;color:${C.goldBrand};font-weight:600;line-height:1">${i + 1}</div></td>
        <td style="vertical-align:top">
          <h3 class="mms-ink" style="margin:0 0 6px;font-family:${SERIF};font-size:18px;color:${C.ink};font-weight:600;line-height:1.3">${escape(s.title)}</h3>
          <p class="mms-body" style="margin:0;font-family:${SANS};font-size:14px;color:${C.body};line-height:1.65">${escape(s.detail)}</p>
        </td>
      </tr></table>
    </div>`
    )
    .join('');

  const stepsBlock = `<tr><td style="padding:26px 44px 0">
    <div style="margin-bottom:6px">${overline('Your playbook')}</div>
    ${stepsHtml}
  </td></tr>`;

  const offerBlock = recommendedOffer
    ? `<tr><td style="padding:30px 44px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panelWarm}" style="background:${C.panelWarm};border:1px solid ${C.lineGold};border-radius:12px">
          <tr><td style="padding:22px 24px">
            <div style="margin-bottom:8px">${overline('If you would rather we ship it')}</div>
            <h3 class="mms-ink" style="margin:0 0 4px;font-family:${SERIF};font-size:21px;color:${C.ink};font-weight:600">${escape(recommendedOffer.name)}</h3>
            <p style="margin:0 0 10px;font-family:${SANS};font-size:11px;color:${C.gold};letter-spacing:2px;text-transform:uppercase;font-weight:700">${escape(recommendedOffer.price)}</p>
            <p class="mms-body" style="margin:0 0 12px;font-family:${SANS};font-size:14px;color:${C.body};line-height:1.65">${escape(recommendedOffer.why)}</p>
            <a href="${recommendedOffer.href}" style="color:${C.gold};text-decoration:none;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700">See the details &rarr;</a>
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const inner = `
    ${headline(`${firstName}, I read every word you sent.`)}
    ${valueCallout('What I heard', escape(painSummary))}
    ${paragraph(`<p style="margin:0">Naming it is the hard part, and you have already done that. Here is exactly what I would do, in order, starting tomorrow morning.</p>`)}
    ${stepsBlock}
    ${offerBlock}
    ${ctaBlock(
      { label: 'Run the free Website Audit', url: WEBSITE_AUDIT_URL },
      { label: 'Apply to build queue', url: BUILD_QUEUE_URL }
    )}
    ${signature('Sarah')}
    ${nextUpTease ? nextUp(nextUpTease) : ''}
  `;
  return shell({
    preheader: `${firstName}, here is your custom playbook. Read it inside.`,
    subtitle: 'A playbook built for you',
    inner,
  });
}

/* ────────────────────────── BOOKING EMAILS ────────────────────────── */

type BookingArgs = {
  firstName: string;
  whenDisplay: string;
  durationMinutes: number;
  painSummary?: string;
  conferenceLink?: string;
};

/** Sent to the visitor when they book a call through the chatbot. */
export function bookingConfirmationEmail({
  firstName,
  whenDisplay,
  durationMinutes,
  painSummary,
  conferenceLink,
}: BookingArgs): string {
  const inner = `
    ${headline(`${firstName}, you are on my calendar.`)}
    <tr><td style="padding:26px 44px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panelWarm}" style="background:${C.panelWarm};border:1px solid ${C.lineGold};border-radius:12px">
        <tr><td style="padding:24px 26px">
          <div style="margin-bottom:10px">${overline('When')}</div>
          <p class="mms-ink" style="margin:0;font-family:${SERIF};font-style:italic;font-size:23px;color:${C.ink};font-weight:500;line-height:1.3">${escape(whenDisplay)}</p>
          <p style="margin:9px 0 0;font-family:${SANS};font-size:11px;color:${C.muted};letter-spacing:2px;text-transform:uppercase;font-weight:700">${durationMinutes} minutes</p>
        </td></tr>
      </table>
    </td></tr>
    ${conferenceLink
      ? paragraph(`<p style="margin:0">Your video link: <a href="${escape(conferenceLink)}" style="color:${C.gold};text-decoration:underline">${escape(conferenceLink)}</a></p>`)
      : paragraph(`<p style="margin:0">I will send the video link the day before. If you would rather meet by phone, just reply with the best number to reach you.</p>`)}
    ${valueCallout(
      'How to make the call worth your time',
      `<ul style="margin:0;padding-left:18px;line-height:1.8">
        <li>Bring the URL of your current site, if you have one.</li>
        <li>Bring the one thing slowing the business down the most.</li>
        <li>Bring the outcome you are hoping for. We will map the path to it together.</li>
      </ul>`
    )}
    ${painSummary ? `<tr><td style="padding:24px 44px 0">
      <div style="margin-bottom:8px">${overline('What you told me')}</div>
      <p class="mms-body" style="margin:0;font-family:${SERIF};font-style:italic;font-size:16px;color:${C.body};line-height:1.6">&ldquo;${escape(painSummary)}&rdquo;</p>
    </td></tr>` : ''}
    ${ctaBlock(
      { label: 'Run your free Website Audit first', url: WEBSITE_AUDIT_URL },
      { label: 'See the work', url: WORK_URL }
    )}
    ${signature('Sarah')}
  `;
  return shell({
    preheader: `You are confirmed for ${whenDisplay}.`,
    subtitle: 'Discovery call confirmed',
    inner,
  });
}

/** Sent the morning of the call, with the join link front and center. */
export function bookingReminderEmail({
  firstName,
  whenDisplay,
  conferenceLink,
}: {
  firstName: string;
  whenDisplay: string;
  conferenceLink?: string;
}): string {
  const inner = `
    ${headline(`${firstName}, we talk today.`)}
    <tr><td style="padding:26px 44px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panelWarm}" style="background:${C.panelWarm};border:1px solid ${C.lineGold};border-radius:12px">
        <tr><td style="padding:24px 26px">
          <div style="margin-bottom:10px">${overline('Today')}</div>
          <p class="mms-ink" style="margin:0;font-family:${SERIF};font-style:italic;font-size:23px;color:${C.ink};font-weight:500;line-height:1.3">${escape(whenDisplay)}</p>
          <p style="margin:9px 0 0;font-family:${SANS};font-size:11px;color:${C.muted};letter-spacing:2px;text-transform:uppercase;font-weight:700">30 minutes with Sarah</p>
        </td></tr>
      </table>
    </td></tr>
    ${paragraph(`<p style="margin:0">A quick reminder that we are on for today. The room opens at our time, and I have read your notes ahead so we can get right to it.</p>`)}
    ${conferenceLink
      ? ctaBlock({ label: 'Join the call', url: conferenceLink })
      : paragraph(`<p style="margin:0">I will send the video link shortly. If you would rather meet by phone, reply with the best number to reach you.</p>`)}
    ${conferenceLink
      ? paragraph(`<p style="margin:0;font-size:13px;color:${C.muted}">Or paste this into your browser: <a href="${escape(conferenceLink)}" style="color:${C.gold};text-decoration:underline">${escape(conferenceLink)}</a></p>`)
      : ''}
    ${paragraph(`<p style="margin:0">Need to move it? Just reply to this email and we will find a better time.</p>`)}
    ${signature('Sarah')}
  `;
  return shell({
    preheader: `Reminder: your call with Sarah is today, ${whenDisplay}.`,
    subtitle: 'Your call is today',
    inner,
  });
}

/** Sent to Sarah when a visitor books through the chatbot. */
export function bookingNotificationEmail(args: {
  name: string;
  email: string;
  business?: string;
  whenDisplay: string;
  painSummary: string;
  recommendedSteps?: { title: string; detail: string }[];
}): string {
  const stepsHtml = (args.recommendedSteps ?? [])
    .map(
      (s, i) => `<p style="margin:7px 0 0;font-family:${SANS};font-size:13px;color:${C.ink};line-height:1.65"><strong>${i + 1}. ${escape(s.title)}</strong> <span style="color:${C.body}">${escape(s.detail)}</span></p>`
    )
    .join('');

  const inner = `
    ${statusPill('Booked', C.sky, C.ink)}
    ${headline(args.whenDisplay)}
    <tr><td style="padding:18px 44px 0">
      <p class="mms-ink" style="margin:0;font-family:${SERIF};font-size:20px;color:${C.ink};font-weight:600;line-height:1.3">${escape(args.name)}</p>
      <p style="margin:5px 0 0;font-family:${SANS};font-size:13px;color:${C.gold};letter-spacing:0.3px"><a href="mailto:${escape(args.email)}" style="color:${C.gold};text-decoration:none">${escape(args.email)}</a>${args.business ? ` &middot; ${escape(args.business)}` : ''}</p>
    </td></tr>
    ${valueCallout('Pain point', escape(args.painSummary))}
    ${stepsHtml ? `<tr><td style="padding:24px 44px 0">
      <div style="margin-bottom:6px">${overline('Playbook I sent them')}</div>
      ${stepsHtml}
    </td></tr>` : ''}
    <tr><td style="padding:28px 44px 38px">
      <p style="margin:0;font-family:${SANS};font-size:12px;color:${C.muted};letter-spacing:0.5px;line-height:1.6">Prep: review their site and draft a three-question outline. The video link is already in their invite, so just show up.</p>
    </td></tr>
  `;
  return shell({
    preheader: `Booked: ${args.name}, ${args.whenDisplay}`,
    subtitle: 'New discovery call',
    inner,
    showSocial: false,
  });
}

/* ────────────────────────── SEQUENCE EMAILS (Day 2 + Day 5) ────────────────────────── */

/** Day 2 of the post-chat funnel. A specific tactic plus a case study. */
export function sequenceDay2Email(firstName: string): string {
  const inner = `
    ${headline(`${firstName}, one move you can make today.`)}
    ${paragraph(`<p style="margin:0 0 16px">If your website does not load in under two seconds on a phone, you are losing half your visitors before they ever see your offer. Here is a two-minute test:</p>
    <ol style="margin:0 0 16px;padding-left:20px;line-height:1.85">
      <li>Open your site on your phone with wifi off, on cellular.</li>
      <li>Count one-Mississippi until the page is actually usable.</li>
      <li>If you pass three seconds, you have a foundation problem.</li>
    </ol>
    <p style="margin:0">The good news: most slow sites are fixable in under a week. It is image weight, font loading, and the third-party scripts that are not earning their keep.</p>`)}
    ${valueCallout('What we built for VoiceStaff', `Their old site loaded in 4.8s on mobile. The rebuild loads in 0.9s. Same content, same brand, just a clean Next.js and Vercel build. Conversion on the exact same offer went from 2.1% to 5.4%. <a href="${SITE}/work/voicestaff" style="color:${C.gold};text-decoration:underline">See the case study &rarr;</a>`)}
    ${paragraph(`<p style="margin:0">Want the specifics for your site? Run our free Website Audit. It tells you exactly what is slowing you down and what to fix first, ranked by impact.</p>`)}
    ${ctaBlock({ label: 'Run the Website Audit', url: WEBSITE_AUDIT_URL }, { label: 'See engagements', url: ENGAGEMENTS_URL })}
    ${signature('Sarah')}
    ${nextUp('Day 5: how the right back office turns leads into recurring revenue without you opening eight tabs every Monday.')}
  `;
  return shell({
    preheader: 'A two-minute test that tells you if your site is costing you customers.',
    subtitle: 'A specific tactic, day two',
    inner,
  });
}

/** Day 5 of the post-chat funnel. The bigger picture plus an invite to book. */
export function sequenceDay5Email(firstName: string): string {
  const inner = `
    ${headline(`${firstName}, here is what I would actually build.`)}
    ${paragraph(`<p style="margin:0 0 16px">Most small business owners are running 8 to 12 separate tools (CRM, email, social scheduler, booking, payments, analytics, helpdesk, project tracker). Each one costs $30 to $80 a month. None of them talk to each other cleanly. Every Monday morning the owner opens eight tabs and tries to remember what closed last week.</p>
    <p style="margin:0 0 16px">A Full-Service Business Build replaces that whole stack with one custom system. Your site captures the lead. The AI SDR qualifies it. The booking engine holds the call. The back office shows you what closed, what stalled, and what to work on this week. The AI agents draft your follow-ups in your voice. It all lives on one screen, and you own every piece of it.</p>
    <p style="margin:0">Most builds run $8,500 to $22,000 and take two to four weeks. If you want smaller scope (just the site, no AI engine) that is the Seed Site, $2,500 to $5,000 in about two weeks.</p>`)}
    ${valueCallout('The math that makes this obvious', `12 SaaS subscriptions at $50 a month over 24 months is <strong>$14,400</strong>, and you still own none of it. A Full-Service Business Build at $14,000 lands at the same two-year cost. The difference: at month 25 you keep going on about $30 a month in hosting. Forever.`)}
    ${paragraph(`<p style="margin:0">If any of this fits the shape of your business, the next step is a 30-minute discovery call. I will scope your specific situation and tell you honestly whether we are the right partner.</p>`)}
    ${ctaBlock({ label: 'Book a discovery call', url: BOOKING_URL }, { label: 'Apply to build queue', url: BUILD_QUEUE_URL })}
    ${signature('Sarah')}
  `;
  return shell({
    preheader: 'Twelve tools versus one system you own. The math is not close.',
    subtitle: 'The bigger picture, day five',
    inner,
  });
}

/* ────────────────────────── AUDIT FOLLOW-UPS (score-conditioned) ────────────────────────── */

type AuditFollowupArgs = {
  firstName: string;
  url: string;
  score: number;
  grade: string;
  headline: string;
  topThreeFixes: { title: string; why: string; how: string }[];
};

function fixesList(fixes: { title: string; why: string; how: string }[]): string {
  return fixes
    .map(
      (f, i) => `
    <div style="padding:18px 0;border-bottom:1px solid ${C.line}">
      <div class="mms-ink" style="font-family:${SERIF};font-size:18px;color:${C.ink};font-weight:600;line-height:1.3;margin-bottom:8px"><span style="font-style:italic;color:${C.goldBrand};margin-right:8px">${i + 1}</span>${escape(f.title)}</div>
      <p class="mms-body" style="margin:0 0 6px;font-family:${SANS};font-size:13px;color:${C.body};line-height:1.6"><span style="font-family:${SANS};font-size:9px;font-weight:700;color:${C.gold};letter-spacing:2px;text-transform:uppercase;margin-right:7px">Why</span>${escape(f.why)}</p>
      <p class="mms-ink" style="margin:0;font-family:${SANS};font-size:13px;color:${C.ink};line-height:1.6"><span style="font-family:${SANS};font-size:9px;font-weight:700;color:${C.gold};letter-spacing:2px;text-transform:uppercase;margin-right:7px">How</span>${escape(f.how)}</p>
    </div>`
    )
    .join('');
}

function auditOffer(name: string, price: string, copy: string, href: string): string {
  return `<tr><td style="padding:30px 44px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panelWarm}" style="background:${C.panelWarm};border:1px solid ${C.lineGold};border-radius:12px">
      <tr><td style="padding:22px 24px">
        <div style="margin-bottom:8px">${overline('For where you are')}</div>
        <h3 class="mms-ink" style="margin:0 0 4px;font-family:${SERIF};font-size:22px;color:${C.ink};font-weight:600">${escape(name)}</h3>
        <p style="margin:0 0 10px;font-family:${SANS};font-size:11px;color:${C.gold};letter-spacing:2px;text-transform:uppercase;font-weight:700">${escape(price)}</p>
        <p class="mms-body" style="margin:0 0 14px;font-family:${SANS};font-size:14px;color:${C.body};line-height:1.65">${escape(copy)}</p>
        <a href="${href}" style="color:${C.gold};text-decoration:none;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700">See the engagement &rarr;</a>
      </td></tr>
    </table>
  </td></tr>`;
}

/** Audit follow-up email. Branches its recommendation on the score:
 *   < 70  -> Seed Site (fix the basics fast)
 *   70-89 -> Full-Service Business Build (past basics, time for the engine)
 *   >= 90 -> Fractional AI Partner (no rebuild needed, you need a strategist) */
export function auditFollowupEmail({ firstName, url, score, grade, headline: line, topThreeFixes }: AuditFollowupArgs): string {
  let offerBlock: string;
  let preheader: string;

  if (score < 70) {
    preheader = `Your audit: ${score}, grade ${grade}. The good news: Seed Site fixes it in 14 days.`;
    offerBlock = auditOffer(
      'Seed Site',
      '$2,500 to $5,000 · 14 days',
      'A beautiful, fast, brand-aligned site that fixes the foundation issues your audit just flagged. Loads in under two seconds. SEO built in. Full handoff, you own all of it.',
      `${ENGAGEMENTS_URL}#seed-site`
    );
  } else if (score < 90) {
    preheader = `Your audit: ${score}, grade ${grade}. You are past the basics. Ready for the engine?`;
    offerBlock = auditOffer(
      'Full-Service Business Build',
      '$8,500 to $22,000 · 2 to 4 weeks',
      'Your foundation is solid. What you need now is the engine: bespoke booking with an embedded CRM, an AI SDR catching every lead, funnels live on day one, a back office that surfaces what matters, and AI agents on both sides of the wall.',
      `${ENGAGEMENTS_URL}#online-presence`
    );
  } else {
    preheader = `Your audit: ${score}, grade ${grade}. You do not need a rebuild. You need a strategist.`;
    offerBlock = auditOffer(
      'Fractional AI Partner',
      'From $1,500/month · 3-month minimum',
      'Your site is excellent. There is nothing to rebuild. What you need is a partner who keeps extending it, plugs in new AI capabilities as they ship, and watches your numbers with you. That is exactly what this retainer is.',
      `${ENGAGEMENTS_URL}#fractional`
    );
  }

  const inner = `
    ${headline(`${firstName}, you scored ${score} out of 100.`)}
    ${lede(`"${line}"`)}
    <tr><td style="padding:18px 44px 0">
      <p style="margin:0;font-family:${SANS};font-size:11px;color:${C.muted};letter-spacing:1px">Audited: ${escape(url)} &nbsp;&middot;&nbsp; Grade ${escape(grade)}</p>
    </td></tr>
    <tr><td style="padding:26px 44px 0">
      <div style="margin-bottom:8px">${overline('Fix these three first')}</div>
      ${fixesList(topThreeFixes)}
    </td></tr>
    ${offerBlock}
    ${ctaBlock({ label: 'See all engagements', url: ENGAGEMENTS_URL }, { label: 'Apply to build queue', url: BUILD_QUEUE_URL })}
    ${signature('Sarah')}
  `;
  return shell({ preheader, subtitle: `Your website audit · Grade ${grade}`, inner });
}

/* ────────────────────────── LEAD NOTIFICATION (Sarah's triage view) ────────────────────────── */

export type LeadField = { label: string; value: string; isLink?: boolean };

type LeadNotificationArgs = {
  type: 'Build Queue' | 'AI Audit' | 'Contact' | 'Newsletter';
  name: string;
  email: string;
  fields: LeadField[];
  message?: string;
  suggestedAction?: string;
};

/** Sarah's inbound notification. Clean, scannable, built for triage. */
export function leadNotification({
  type,
  name,
  email,
  fields,
  message,
  suggestedAction,
}: LeadNotificationArgs): string {
  const pillBg = {
    'Build Queue': C.sky,
    'AI Audit': C.goldBrand,
    Contact: C.goldDeep,
    Newsletter: C.muted,
  }[type];
  const pillFg = type === 'AI Audit' || type === 'Build Queue' ? C.ink : '#FFFFFF';

  const fieldsHtml = fields
    .map(
      (f) => `<tr>
      <td style="padding:9px 0;width:130px;font-family:${SANS};font-size:10px;color:${C.muted};letter-spacing:1.5px;text-transform:uppercase;font-weight:700;vertical-align:top">${escape(f.label)}</td>
      <td class="mms-ink" style="padding:9px 0;font-family:${SANS};font-size:13px;color:${C.ink};line-height:1.5">${f.isLink ? `<a href="${escape(f.value)}" style="color:${C.gold};text-decoration:none">${escape(f.value)}</a>` : escape(f.value)}</td>
    </tr>`
    )
    .join('');

  const inner = `
    ${statusPill(type, pillBg, pillFg)}
    ${headline(name)}
    <tr><td style="padding:8px 44px 0">
      <a href="mailto:${escape(email)}" style="color:${C.gold};text-decoration:none;font-family:${SANS};font-size:13px;letter-spacing:0.3px">${escape(email)}</a>
    </td></tr>
    <tr><td style="padding:24px 44px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${fieldsHtml}
      </table>
    </td></tr>
    ${message ? valueCallout('Message', `<div style="white-space:pre-wrap">${escape(message)}</div>`) : ''}
    ${suggestedAction ? `<tr><td style="padding:24px 44px 0">
      <div style="margin-bottom:7px">${overline('Suggested action')}</div>
      <p class="mms-ink" style="margin:0;font-family:${SANS};font-size:14px;color:${C.ink};line-height:1.6">${escape(suggestedAction)}</p>
    </td></tr>` : ''}
    <tr><td style="padding:0 44px 38px"></td></tr>
  `;
  return shell({ preheader: `New ${type} lead: ${name}`, subtitle: 'New lead', inner, showSocial: false });
}

/* ────────────────────────── STORE ORDER EMAILS ────────────────────────── */

type StoreOrderConfirmationArgs = {
  firstName: string;
  itemName: string;
  downloads: { name: string; url: string }[];
  priceUsd: number;
};

/** Sent to the buyer right after Stripe confirms payment. Contains signed
 *  download URL(s) with a 24h TTL. For bundles, lists every included PDF. */
export function storeOrderConfirmationEmail({
  firstName,
  itemName,
  downloads,
  priceUsd,
}: StoreOrderConfirmationArgs): string {
  const downloadButtons = downloads
    .map(
      (d) => `<tr><td style="padding:7px 0">
        <a href="${d.url}" style="display:block;box-sizing:border-box;padding:17px 24px;background:${C.goldBrand};background-image:linear-gradient(135deg,${C.goldLite},${C.goldBrand});color:${C.ink};text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;border-radius:12px;text-align:center;font-family:${SANS}">&#8595;&nbsp;&nbsp;Download ${escape(d.name)}</a>
      </td></tr>`
    )
    .join('');

  const inner = `
    ${headline(`It is ready, ${firstName}.`)}
    ${paragraph(`<p style="margin:0">Thank you for your purchase. Your <strong style="color:${C.ink}">${escape(itemName)}</strong> ${downloads.length > 1 ? 'files are' : 'file is'} ready below. Yours to keep, for good.</p>`)}
    <tr><td style="padding:24px 44px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${downloadButtons}</table>
      <p class="mms-body" style="margin:16px 0 0;font-family:${SANS};font-size:14px;color:${C.body};line-height:1.6">These links expire in 24 hours. Need a fresh one? Reply to this email and I will send it right over.</p>
    </td></tr>
    ${valueCallout('The 10x companion', `Once you have read the PDF, upload it to Claude as context and ask it to coach you through implementation on your specific business. It will pull every framework from the book and adapt it to you. Most buyers miss this. Do not.`)}
    ${valueCallout('Credit toward your build', `Your <strong style="color:${C.ink}">$${priceUsd}</strong> comes straight off any future Modern Mustard Seed engagement (Seed Site or Full-Service Build). Just mention it when you reach out.`)}
    ${ctaBlock({ label: 'Book a discovery call', url: BOOKING_URL }, { label: 'See the work', url: WORK_URL })}
    ${signature('Sarah')}
  `;

  return shell({
    preheader: `Your ${itemName} download is ready inside.`,
    subtitle: 'Your dream, built to fullness',
    inner,
  });
}

/** Sent to Sarah when a sale closes. Triage view. */
export function storeOrderNotificationEmail(args: {
  name: string;
  email: string;
  itemName: string;
  priceUsd: number;
  sessionId: string;
}): string {
  const inner = `
    ${statusPill(`Store sale · $${args.priceUsd}`, C.goldBrand, C.ink)}
    ${headline(args.itemName)}
    <tr><td style="padding:16px 44px 0">
      <p class="mms-ink" style="margin:0;font-family:${SERIF};font-size:19px;color:${C.ink};font-weight:600">${escape(args.name)}</p>
      <p style="margin:5px 0 0;font-family:${SANS};font-size:13px"><a href="mailto:${escape(args.email)}" style="color:${C.gold};text-decoration:none;font-weight:600">${escape(args.email)}</a></p>
    </td></tr>
    ${valueCallout('Follow-up move', `Buyer is flagged in leads as <code>store-buyer</code> (<code>[bought:${escape(args.sessionId.slice(0, 14))}...]</code>). The chatbot, audit, and sequence will all recognize them. A personal note this week can convert the engagement.`)}
    <tr><td style="padding:0 44px 38px"></td></tr>
  `;

  return shell({
    preheader: `New sale: ${args.itemName} to ${args.name} for $${args.priceUsd}`,
    subtitle: 'New store sale',
    inner,
    showSocial: false,
  });
}

/* ────────────────────────── COMPAT SHIMS ────────────────────────── */

/** Older routes import `p` to build clientEmail bodies. Returns a block-level
 *  paragraph (not a table row) so it composes cleanly inside the body cell. */
export function p(html: string): string {
  return `<p class="mms-body" style="margin:0 0 18px;font-family:${SANS};font-size:16px;color:${C.body};line-height:1.72">${html}</p>`;
}

/** Older routes call `callout({ label, title, body, href, cta })` inside a
 *  clientEmail body. Renders a warm inset card with an optional internal link. */
export function callout(args: {
  label: string;
  title: string;
  body: string;
  href?: string;
  cta?: string;
}): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panelWarm}" style="background:${C.panelWarm};border:1px solid ${C.lineGold};border-left:3px solid ${C.goldBrand};border-radius:12px;margin:8px 0 22px">
    <tr><td style="padding:20px 22px">
      <div style="margin-bottom:8px">${overline(args.label)}</div>
      <h3 class="mms-ink" style="margin:0 0 6px;font-family:${SERIF};font-size:18px;color:${C.ink};font-weight:600;line-height:1.3">${escape(args.title)}</h3>
      <p class="mms-body" style="margin:0 0 ${args.href ? '12px' : '0'};font-family:${SANS};font-size:14px;color:${C.body};line-height:1.65">${escape(args.body)}</p>
      ${args.href ? `<a href="${args.href}" style="color:${C.gold};text-decoration:none;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700">${escape(args.cta ?? 'Read more')} &rarr;</a>` : ''}
    </td></tr>
  </table>`;
}
