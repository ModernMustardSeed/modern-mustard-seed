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

const C = {
  // Surfaces
  page: '#EDE6D8',      // warm ivory page (frames the card)
  card: '#FBF8F2',      // cream card surface
  panel: '#FFFFFF',     // inset panel (pops on the cream)
  panelWarm: '#F5EEE0', // alternate warm inset

  // Brand sky
  sky: '#1F4280',       // deep brand sky (header, primary actions)
  skyDeep: '#163259',   // header gradient anchor
  skyMid: '#34588C',    // mid sky
  skyLo: '#6F92BC',     // light sky

  // Brand brass
  gold: '#A8741A',      // gold for text and links on cream (legible when bold)
  goldDeep: '#85590F',  // deeper gold
  goldBrand: '#C8964E', // signature brass (CTA fill, gradients, rules)
  goldLite: '#E8C88A',  // light brass (gradient stop, ornament)

  // Ink
  ink: '#1B2436',       // warm navy ink (headlines, max contrast on cream)
  body: '#474F60',      // comfortable body copy
  muted: '#8A8170',     // warm taupe for labels and fine print
  ghost: '#A7A091',     // ghost copy

  // Hairlines
  line: '#E7DECC',      // warm hairline
  lineGold: '#E3D0A2',  // gold hairline
};

const SERIF = '"Playfair Display","Hoefler Text","Iowan Old Style","Cormorant Garamond",Georgia,"Times New Roman",serif';
const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Helvetica,Arial,sans-serif';

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
    <!-- Brass sunrise hairline -->
    <tr><td height="3" bgcolor="${C.goldBrand}" style="height:3px;line-height:3px;font-size:0;background:${C.goldBrand};background-image:linear-gradient(to right,${C.goldLite} 0%,${C.goldBrand} 55%,${C.skyLo} 100%)">&nbsp;</td></tr>

    <!-- Deep-sky header -->
    <tr><td align="center" bgcolor="${C.sky}" style="background:${C.sky};background-image:linear-gradient(158deg,${C.skyDeep} 0%,${C.sky} 48%,${C.skyMid} 100%);padding:38px 40px 32px">
      <!-- Seed emblem: one gold seed, light breaking on either side -->
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 18px"><tr>
        <td width="64" style="font-size:0;line-height:0"><div style="height:1px;line-height:1px;font-size:0;background-image:linear-gradient(to right,rgba(232,200,138,0) 0%,${C.goldLite} 100%)">&nbsp;</div></td>
        <td style="padding:0 12px;font-size:0;line-height:0">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="9" height="9" bgcolor="${C.goldLite}" style="width:9px;height:9px;font-size:0;line-height:9px;background:${C.goldLite};border-radius:9px;box-shadow:0 0 14px rgba(232,200,138,0.85)">&nbsp;</td>
          </tr></table>
        </td>
        <td width="64" style="font-size:0;line-height:0"><div style="height:1px;line-height:1px;font-size:0;background-image:linear-gradient(to left,rgba(232,200,138,0) 0%,${C.goldLite} 100%)">&nbsp;</div></td>
      </tr></table>
      <div style="font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:6px;text-transform:uppercase;color:#FFFFFF">Modern Mustard Seed</div>
      ${subtitle ? `<div style="font-family:${SERIF};font-style:italic;font-size:17px;color:rgba(255,255,255,0.90);margin-top:12px;letter-spacing:0.2px">${escape(subtitle)}</div>` : ''}
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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" class="mms-card" style="background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden">
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
    <p style="margin:0;font-family:${SERIF};font-style:italic;font-size:20px;font-weight:500;color:${C.skyMid};line-height:1.45">${escape(text)}</p>
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
      <td bgcolor="${C.goldBrand}" style="background:${C.goldBrand};background-image:linear-gradient(135deg,${C.goldLite} 0%,${C.goldBrand} 100%);border-radius:10px">
        <a href="${primary.url}" style="display:inline-block;color:${C.ink};text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;padding:16px 30px;font-family:${SANS}">${escape(primary.label)}</a>
      </td>
      ${secondary ? `<td style="padding-left:18px"><a href="${secondary.url}" style="display:inline-block;color:${C.gold};text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase;padding:16px 4px;font-family:${SANS}">${escape(secondary.label)} &rarr;</a></td>` : ''}
    </tr></table>
  </td></tr>`;
}

function signature(name: string): string {
  return `<tr><td style="padding:36px 44px 42px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:12px;vertical-align:middle"><div style="width:30px;height:2px;background:${C.goldBrand};font-size:0;line-height:0">&nbsp;</div></td>
      <td style="vertical-align:middle"><span style="font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.muted};font-weight:700">With faith,</span></td>
    </tr></table>
    <p class="mms-ink" style="margin:12px 0 0;font-family:${SERIF};font-style:italic;font-size:26px;color:${C.ink};font-weight:600;letter-spacing:-0.2px">${escape(name)}</p>
    <p style="margin:4px 0 0;font-family:${SANS};font-size:11px;color:${C.gold};letter-spacing:2px;text-transform:uppercase;font-weight:700">Founder, Modern Mustard Seed</p>
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

/* ────────────────────────── CLIENT EMAIL (general) ────────────────────────── */

type ClientEmailArgs = {
  preheader?: string;
  eyebrow?: string;
  greeting?: string;
  body: string; // HTML built from p() and callout()
  cta?: { label: string; url: string };
  secondary?: { label: string; url: string };
  signature?: string;
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
}: ClientEmailArgs): string {
  const inner = `
    ${greeting ? headline(greeting) : ''}
    <tr><td class="mms-body" style="padding:24px 44px 0;font-family:${SANS};font-size:16px;color:${C.body};line-height:1.72">${body}</td></tr>
    ${cta ? ctaBlock(cta, secondary) : ''}
    ${signature(sig)}
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
        <li>Have a rough budget in mind. We can scope around any range.</li>
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
    ${statusPill('Booked', C.sky, '#FFFFFF')}
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
      <p style="margin:0;font-family:${SANS};font-size:12px;color:${C.muted};letter-spacing:0.5px;line-height:1.6">Prep: review their site, draft a three-question outline, send the video link 24 hours before.</p>
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
    <p style="margin:0">Most builds run $8,500 to $22,000 and take 30 days. If you want smaller scope (just the site, no AI engine) that is the Seed Site, $2,500 to $5,000 in 14 days.</p>`)}
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
      '$8,500 to $22,000 · 30 days',
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
  const pillFg = type === 'AI Audit' ? C.ink : '#FFFFFF';

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
