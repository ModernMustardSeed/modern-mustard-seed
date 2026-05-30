/**
 * Modern Mustard Seed email templates.
 *
 * Design system: cabin-at-dusk. Midnight bg, cream body text, brass
 * accents, Playfair Display headlines via web-safe serif fallback.
 * Every template shares the same shell (preheader → eyebrow → headline
 * → body → optional value block → CTA → footer with scripture).
 *
 * No em dashes anywhere. Period.
 */

const C = {
  midnight: '#080c16',
  midnight800: '#0F1422',
  midnight700: '#1A1A2E',
  brass: '#C8964E',
  brassLight: '#E8C88A',
  brassBright: '#F0D090',
  rust: '#C86A45',
  ember: '#FF6B35',
  lake: '#3B6B8A',
  sage: '#8FA98F',
  cream: '#F5F0E8',
  creamDim: 'rgba(245,240,232,0.78)',
  creamFaint: 'rgba(245,240,232,0.55)',
  creamGhost: 'rgba(245,240,232,0.30)',
  hairline: 'rgba(245,240,232,0.10)',
  hairlineBrass: 'rgba(200,150,78,0.35)',
};

const FONT_SERIF = '"Playfair Display","Cormorant Garamond","Iowan Old Style","Apple Garamond",Baskerville,Georgia,serif';
const FONT_SANS = '"DM Sans","Helvetica Neue",Helvetica,Arial,sans-serif';
const FONT_MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,monospace';

const SITE = 'https://modernmustardseed.com';
const BOOKING_URL = 'https://modernmustardseed.zohobookings.com/#/4764600000000052054';
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
  inner: string;
  showSocial?: boolean;
};

function shell({ preheader = '', inner, showSocial = true }: ShellArgs): string {
  const socialRow = showSocial
    ? `
    <tr><td align="center" style="padding-bottom:12px">
      <a href="https://x.com/sarahmscarano" style="color:${C.creamFaint};text-decoration:none;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:${FONT_MONO};font-weight:600">X</a>
      <span style="color:${C.creamGhost};margin:0 12px">·</span>
      <a href="https://www.linkedin.com/in/sarahmscarano/" style="color:${C.creamFaint};text-decoration:none;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:${FONT_MONO};font-weight:600">LinkedIn</a>
      <span style="color:${C.creamGhost};margin:0 12px">·</span>
      <a href="https://instagram.com/modernmustardseed" style="color:${C.creamFaint};text-decoration:none;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:${FONT_MONO};font-weight:600">Instagram</a>
    </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark only">
<meta name="supported-color-schemes" content="dark only">
<title>Modern Mustard Seed</title>
</head>
<body style="margin:0;padding:0;background:${C.midnight};font-family:${FONT_SANS};color:${C.cream};line-height:1.7;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.midnight}" style="background:${C.midnight}">
  <tr><td align="center" style="padding:56px 16px 40px">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px">

      <!-- Wordmark eyebrow -->
      <tr><td align="center" style="padding:0 0 8px">
        <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:7px;color:${C.brassLight};text-transform:uppercase">
          Modern Mustard Seed
        </div>
      </td></tr>

      <!-- Brass hairline -->
      <tr><td align="center" style="padding:14px 0 0">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="56" style="height:1px;background:${C.hairlineBrass};line-height:1px;font-size:0">&nbsp;</td></tr></table>
      </td></tr>

      <!-- Card body -->
      <tr><td style="padding:36px 0 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.midnight800}" style="background:${C.midnight800};border:1px solid ${C.hairline};border-radius:18px;overflow:hidden">
          ${inner}
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:36px 12px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${socialRow}
          <tr><td align="center" style="padding-bottom:14px">
            <a href="${SITE}" style="color:${C.brassLight};text-decoration:none;font-family:${FONT_MONO};font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:700">modernmustardseed.com</a>
          </td></tr>
          <tr><td align="center" style="padding-bottom:10px">
            <p style="margin:0;color:${C.creamFaint};font-family:${FONT_SERIF};font-size:13px;font-style:italic;letter-spacing:0.3px;line-height:1.5">
              &ldquo;If you have faith as small as a mustard seed, nothing will be impossible for you.&rdquo;
            </p>
          </td></tr>
          <tr><td align="center">
            <p style="margin:0;color:${C.creamGhost};font-family:${FONT_MONO};font-size:9px;letter-spacing:3px;text-transform:uppercase;font-weight:700">
              Matthew 17:20 · Kalispell, Montana
            </p>
          </td></tr>
        </table>
      </td></tr>

    </table>

  </td></tr>
</table>
</body></html>`;
}

/* ────────────────────────── SHARED BLOCKS ────────────────────────── */

function brassDivider(): string {
  return `<tr><td height="1" style="height:1px;line-height:1px;font-size:0;background:linear-gradient(90deg,transparent,${C.brassLight},transparent)">&nbsp;</td></tr>`;
}

function eyebrow(text: string): string {
  return `<tr><td style="padding:42px 48px 0">
    <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:5px;color:${C.brassLight};text-transform:uppercase">${escape(text)}</div>
  </td></tr>`;
}

function headline(text: string): string {
  return `<tr><td style="padding:18px 48px 0">
    <h1 style="margin:0;font-family:${FONT_SERIF};font-style:italic;font-size:32px;font-weight:500;color:${C.cream};letter-spacing:-0.5px;line-height:1.18">${escape(text)}</h1>
  </td></tr>`;
}

function lede(text: string): string {
  return `<tr><td style="padding:18px 48px 0">
    <p style="margin:0;font-family:${FONT_SERIF};font-style:italic;font-size:18px;font-weight:400;color:${C.creamDim};line-height:1.5">${escape(text)}</p>
  </td></tr>`;
}

function paragraph(html: string): string {
  return `<tr><td style="padding:22px 48px 0;font-family:${FONT_SANS};font-size:15px;color:${C.cream};line-height:1.75">${html}</td></tr>`;
}

function valueCallout(label: string, html: string): string {
  return `<tr><td style="padding:28px 48px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:2px solid ${C.brass};background:${C.midnight700};border-radius:6px">
      <tr><td style="padding:18px 22px">
        <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:4px;color:${C.brassLight};text-transform:uppercase;margin-bottom:8px">${escape(label)}</div>
        <div style="font-family:${FONT_SANS};font-size:14px;color:${C.cream};line-height:1.7">${html}</div>
      </td></tr>
    </table>
  </td></tr>`;
}

function ctaBlock(primary: { label: string; url: string }, secondary?: { label: string; url: string }): string {
  return `<tr><td style="padding:30px 48px 0" align="left">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td bgcolor="${C.brass}" style="background:linear-gradient(120deg,${C.rust} 0%,${C.brass} 60%,${C.brassLight} 100%);border-radius:999px">
        <a href="${primary.url}" style="display:inline-block;color:${C.cream};text-decoration:none;font-weight:700;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;padding:15px 30px;font-family:${FONT_SANS}">${escape(primary.label)}</a>
      </td>
      ${secondary ? `<td style="padding-left:14px"><a href="${secondary.url}" style="display:inline-block;color:${C.brassLight};text-decoration:none;font-weight:600;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:15px 8px;font-family:${FONT_SANS}">${escape(secondary.label)} →</a></td>` : ''}
    </tr></table>
  </td></tr>`;
}

function signature(name: string): string {
  return `<tr><td style="padding:32px 48px 44px">
    <div style="font-family:${FONT_MONO};font-size:10px;letter-spacing:3px;color:${C.creamGhost};text-transform:uppercase;margin-bottom:6px">Signed</div>
    <p style="margin:0;font-family:${FONT_SERIF};font-style:italic;font-size:22px;color:${C.cream};font-weight:500">${escape(name)}</p>
    <p style="margin:2px 0 0;font-family:${FONT_MONO};font-size:10px;color:${C.creamFaint};letter-spacing:2px;text-transform:uppercase">Modern Mustard Seed</p>
  </td></tr>`;
}

function nextUp(text: string): string {
  return `<tr><td style="padding:0 48px 30px">
    <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:4px;color:${C.brassLight};text-transform:uppercase;margin-bottom:8px">Coming next</div>
    <p style="margin:0;font-family:${FONT_SANS};font-size:13px;color:${C.creamDim};line-height:1.6;font-style:italic">${escape(text)}</p>
  </td></tr>`;
}

/* ────────────────────────── CLIENT EMAIL (general) ────────────────────────── */

type ClientEmailArgs = {
  preheader?: string;
  eyebrow?: string;
  greeting?: string;
  body: string; // HTML
  cta?: { label: string; url: string };
  secondary?: { label: string; url: string };
  signature?: string;
};

/** General-purpose outbound customer email. Cleaner type hierarchy than v1. */
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
    ${brassDivider()}
    ${eb ? eyebrow(eb) : ''}
    ${greeting ? headline(greeting) : ''}
    ${paragraph(body)}
    ${cta ? ctaBlock(cta, secondary) : ''}
    ${signature(sig)}
    ${brassDivider()}
  `;
  return shell({ preheader, inner });
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
 * pain back at them, then hands them a 3-5 step playbook AI-generated for
 * their specific situation. */
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
    <div style="padding:20px 0;border-bottom:1px solid ${C.hairline}">
      <div style="display:inline-block;width:32px;font-family:${FONT_SERIF};font-style:italic;font-size:24px;color:${C.brassLight};font-weight:600;line-height:1;vertical-align:top">${i + 1}</div>
      <div style="display:inline-block;width:calc(100% - 40px);vertical-align:top">
        <h3 style="margin:0 0 6px;font-family:${FONT_SERIF};font-size:17px;color:${C.cream};font-weight:600;line-height:1.3">${escape(s.title)}</h3>
        <p style="margin:0;font-family:${FONT_SANS};font-size:14px;color:${C.creamDim};line-height:1.65">${escape(s.detail)}</p>
      </div>
    </div>`
    )
    .join('');

  const stepsBlock = `<tr><td style="padding:22px 48px 0">
    <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:5px;color:${C.brassLight};text-transform:uppercase;margin-bottom:14px">Your playbook</div>
    ${stepsHtml}
  </td></tr>`;

  const offerBlock = recommendedOffer
    ? `<tr><td style="padding:30px 48px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.midnight700};border:1px solid ${C.hairlineBrass};border-radius:10px">
          <tr><td style="padding:22px 24px">
            <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:4px;color:${C.brassLight};text-transform:uppercase;margin-bottom:8px">If you want us to ship it</div>
            <h3 style="margin:0 0 4px;font-family:${FONT_SERIF};font-size:20px;color:${C.cream};font-weight:600">${escape(recommendedOffer.name)}</h3>
            <p style="margin:0 0 10px;font-family:${FONT_MONO};font-size:11px;color:${C.brassLight};letter-spacing:2px;text-transform:uppercase">${escape(recommendedOffer.price)}</p>
            <p style="margin:0 0 12px;font-family:${FONT_SANS};font-size:14px;color:${C.creamDim};line-height:1.65">${escape(recommendedOffer.why)}</p>
            <a href="${recommendedOffer.href}" style="color:${C.brassLight};text-decoration:none;font-family:${FONT_MONO};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;font-weight:700">See the details →</a>
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const inner = `
    ${brassDivider()}
    ${eyebrow('Your Mustard Seed playbook')}
    ${headline(`${firstName}, I read what you sent.`)}
    ${valueCallout('What I heard', escape(painSummary))}
    ${paragraph(`<p style="margin:0">You named the pain. That is the hard part. Here is what I would do, in order, starting tomorrow morning.</p>`)}
    ${stepsBlock}
    ${offerBlock}
    ${ctaBlock(
      { label: 'Run the free Website Audit', url: WEBSITE_AUDIT_URL },
      { label: 'Apply to build queue', url: BUILD_QUEUE_URL }
    )}
    ${signature('Sarah')}
    ${nextUpTease ? nextUp(nextUpTease) : ''}
    ${brassDivider()}
  `;
  return shell({ preheader: `Your custom 5-step playbook for ${firstName}. Read inside.`, inner });
}

/* ────────────────────────── BOOKING EMAILS ────────────────────────── */

type BookingArgs = {
  firstName: string;
  whenDisplay: string; // e.g. "Tuesday, June 10, 11:00 AM Mountain"
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
    ${brassDivider()}
    ${eyebrow('Discovery call confirmed')}
    ${headline(`${firstName}, you are on my calendar.`)}
    <tr><td style="padding:28px 48px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.midnight700};border:1px solid ${C.hairlineBrass};border-radius:10px">
        <tr><td style="padding:24px 26px">
          <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:5px;color:${C.brassLight};text-transform:uppercase;margin-bottom:10px">When</div>
          <p style="margin:0;font-family:${FONT_SERIF};font-style:italic;font-size:22px;color:${C.cream};font-weight:500;line-height:1.3">${escape(whenDisplay)}</p>
          <p style="margin:8px 0 0;font-family:${FONT_MONO};font-size:11px;color:${C.creamFaint};letter-spacing:2px;text-transform:uppercase">${durationMinutes} minutes</p>
        </td></tr>
      </table>
    </td></tr>
    ${conferenceLink ? paragraph(`<p style="margin:0">Video link: <a href="${escape(conferenceLink)}" style="color:${C.brassLight};text-decoration:underline">${escape(conferenceLink)}</a></p>`) : paragraph(`<p style="margin:0">I will send a video link the day before. If you would rather meet by phone, reply with the number to call.</p>`)}
    ${valueCallout(
      'How to make the call worth your time',
      `<ul style="margin:0;padding-left:18px;line-height:1.75">
        <li>Bring the URL of your current site (if you have one).</li>
        <li>Bring the one thing that is most slowing the business down.</li>
        <li>Have a rough budget in mind. We can scope around any range.</li>
      </ul>`
    )}
    ${painSummary ? paragraph(`<p style="margin:0 0 6px;font-family:${FONT_MONO};font-size:10px;color:${C.brassLight};letter-spacing:3px;text-transform:uppercase;font-weight:700">What you told me</p><p style="margin:0;font-style:italic;color:${C.creamDim}">"${escape(painSummary)}"</p>`) : ''}
    ${ctaBlock(
      { label: 'Run the free Website Audit before we meet', url: WEBSITE_AUDIT_URL },
      { label: 'See the work', url: WORK_URL }
    )}
    ${signature('Sarah')}
    ${brassDivider()}
  `;
  return shell({ preheader: `Your discovery call is confirmed for ${whenDisplay}.`, inner });
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
      (s, i) => `<p style="margin:6px 0 0;font-family:${FONT_SANS};font-size:13px;color:${C.cream};line-height:1.65"><strong>${i + 1}. ${escape(s.title)}</strong> <span style="color:${C.creamDim}">${escape(s.detail)}</span></p>`
    )
    .join('');

  const inner = `
    ${brassDivider()}
    <tr><td style="padding:36px 48px 0">
      <span style="display:inline-block;background:${C.ember};color:${C.cream};padding:5px 12px;border-radius:4px;font-family:${FONT_MONO};font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Booked</span>
    </td></tr>
    ${headline(args.whenDisplay)}
    <tr><td style="padding:22px 48px 0">
      <p style="margin:0;font-family:${FONT_SERIF};font-size:20px;color:${C.cream};font-weight:600;line-height:1.3">${escape(args.name)}</p>
      <p style="margin:4px 0 0;font-family:${FONT_MONO};font-size:13px;color:${C.brassLight};letter-spacing:0.5px"><a href="mailto:${escape(args.email)}" style="color:${C.brassLight};text-decoration:none">${escape(args.email)}</a>${args.business ? ` · ${escape(args.business)}` : ''}</p>
    </td></tr>
    ${valueCallout('Pain point', escape(args.painSummary))}
    ${stepsHtml ? `<tr><td style="padding:24px 48px 0">
      <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:4px;color:${C.brassLight};text-transform:uppercase;margin-bottom:6px">Playbook I sent them</div>
      ${stepsHtml}
    </td></tr>` : ''}
    <tr><td style="padding:30px 48px 36px">
      <p style="margin:0;font-family:${FONT_MONO};font-size:11px;color:${C.creamFaint};letter-spacing:1.5px">Prep checklist: review their site if they have one, draft a 3-question outline, send video link 24h before.</p>
    </td></tr>
    ${brassDivider()}
  `;
  return shell({ preheader: `Booked: ${args.name}, ${args.whenDisplay}`, inner, showSocial: false });
}

/* ────────────────────────── SEQUENCE EMAILS (Day 2 + Day 5) ────────────────────────── */

/** Day 2 of the post-chat funnel. A specific tactic + case study reference. */
export function sequenceDay2Email(firstName: string): string {
  const inner = `
    ${brassDivider()}
    ${eyebrow('Day 2 · A specific tactic')}
    ${headline(`${firstName}, one move you can make today.`)}
    ${paragraph(`<p style="margin:0 0 14px">If your website does not load in under two seconds on a phone, you are losing half your visitors before they ever see your offer. Run this test in two minutes:</p>
    <ol style="margin:0 0 14px;padding-left:20px;line-height:1.8">
      <li>Open your site on a phone with 4G (turn wifi off).</li>
      <li>Count one-Mississippi until the page is fully usable.</li>
      <li>If it is over three seconds, you have a foundation problem.</li>
    </ol>
    <p style="margin:0">The good news: most slow sites can be fixed in under a week. The work is image optimization, font loading, and killing the third-party scripts that are not earning their keep.</p>`)}
    ${valueCallout('What we built for VoiceStaff', `Their old site loaded in 4.8s on mobile. The new one loads in 0.9s. Same content. Same brand. Just a clean Next.js + Vercel build. Conversion on the same offer went from 2.1% to 5.4%. <a href="${SITE}/work/voicestaff" style="color:${C.brassLight};text-decoration:underline">See the case study →</a>`)}
    ${paragraph(`<p style="margin:0">If you want, run our free Website Audit on your URL. It will tell you exactly what is slowing your site down and what to fix first, ranked by impact.</p>`)}
    ${ctaBlock({ label: 'Run the Website Audit', url: WEBSITE_AUDIT_URL }, { label: 'See engagements', url: ENGAGEMENTS_URL })}
    ${signature('Sarah')}
    ${nextUp('Day 5: how the right back office turns leads into recurring revenue without you opening eight tabs.')}
    ${brassDivider()}
  `;
  return shell({ preheader: 'A two-minute test that tells you if your site is losing customers.', inner });
}

/** Day 5 of the post-chat funnel. The bigger picture + invite to book. */
export function sequenceDay5Email(firstName: string): string {
  const inner = `
    ${brassDivider()}
    ${eyebrow('Day 5 · The bigger picture')}
    ${headline(`${firstName}, here is what I would actually build.`)}
    ${paragraph(`<p style="margin:0 0 14px">Most "small business" owners are running 8 to 12 separate tools (CRM, email, social scheduler, booking, payments, analytics, helpdesk, project tracker). Each tool costs $30 to $80 a month. None of them talk to each other cleanly. Every Monday morning, the owner opens eight tabs and tries to remember what closed last week.</p>
    <p style="margin:0 0 14px">A Full-Service Business Build replaces that whole stack with one custom system. Your site captures the lead. The AI SDR qualifies it. The booking system holds the call. The back office shows you what closed, what stalled, and what to work on this week. The AI agents draft your follow-ups in your voice. Everything lives in one screen. You own all of it.</p>
    <p style="margin:0">Most builds run $8,500 to $22,000 and take 30 days. Smaller scope (just the site, no AI engine) is the Seed Site at $2,500 to $5,000 in 14 days.</p>`)}
    ${valueCallout('The math that makes this obvious', `12 SaaS subscriptions × $50/mo × 24 months = <strong>$14,400</strong>. And you still own none of it. A Full-Service Business Build at $14,000 lands at the same total cost over two years, and at month 25 you keep going on $30/month in hosting. Forever.`)}
    ${paragraph(`<p style="margin:0">If any of this fits the shape of your business, the next step is a 30-minute discovery call. I will scope your situation specifically and tell you honestly if I think we are the right partner.</p>`)}
    ${ctaBlock({ label: 'Book a discovery call', url: BOOKING_URL }, { label: 'Apply to build queue', url: BUILD_QUEUE_URL })}
    ${signature('Sarah')}
    ${brassDivider()}
  `;
  return shell({ preheader: 'The 12-tool stack vs. one custom system. The math is wild.', inner });
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
    <div style="padding:18px 0;border-bottom:1px solid ${C.hairline}">
      <div style="font-family:${FONT_SERIF};font-style:italic;font-size:22px;color:${C.brassLight};font-weight:600;line-height:1;margin-bottom:6px">${i + 1}. ${escape(f.title)}</div>
      <p style="margin:0 0 6px;font-family:${FONT_SANS};font-size:13px;color:${C.creamDim};line-height:1.6"><span style="font-family:${FONT_MONO};font-size:9px;color:${C.brassLight};letter-spacing:2px;text-transform:uppercase;margin-right:6px">Why</span>${escape(f.why)}</p>
      <p style="margin:0;font-family:${FONT_SANS};font-size:13px;color:${C.cream};line-height:1.6"><span style="font-family:${FONT_MONO};font-size:9px;color:${C.brassLight};letter-spacing:2px;text-transform:uppercase;margin-right:6px">How</span>${escape(f.how)}</p>
    </div>`
    )
    .join('');
}

/** Audit follow-up email. Branches its recommendation based on score:
 *  < 70  → Seed Site (fix the basics fast)
 *  70-89 → Full-Service Business Build (you are past basics, time for the engine)
 *  >= 90 → Fractional AI Partner (you do not need a rebuild, you need a strategist) */
export function auditFollowupEmail({ firstName, url, score, grade, headline: line, topThreeFixes }: AuditFollowupArgs): string {
  let offerBlock: string;
  let preheader: string;

  if (score < 70) {
    preheader = `Your audit: ${score}/${grade}. The good news: Seed Site fixes it in 14 days.`;
    offerBlock = `<tr><td style="padding:30px 48px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.midnight700};border:1px solid ${C.hairlineBrass};border-radius:10px">
        <tr><td style="padding:22px 24px">
          <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:4px;color:${C.brassLight};text-transform:uppercase;margin-bottom:8px">For where you are</div>
          <h3 style="margin:0 0 4px;font-family:${FONT_SERIF};font-size:22px;color:${C.cream};font-weight:600">Seed Site</h3>
          <p style="margin:0 0 10px;font-family:${FONT_MONO};font-size:11px;color:${C.brassLight};letter-spacing:2px;text-transform:uppercase">$2,500 to $5,000 · 14 days</p>
          <p style="margin:0 0 14px;font-family:${FONT_SANS};font-size:14px;color:${C.creamDim};line-height:1.65">Beautiful, fast, brand-aligned site that fixes the foundation issues your audit just flagged. Loads in under two seconds. SEO foundation built in. Full handoff.</p>
          <a href="${ENGAGEMENTS_URL}#seed-site" style="color:${C.brassLight};text-decoration:none;font-family:${FONT_MONO};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;font-weight:700">See the engagement →</a>
        </td></tr>
      </table>
    </td></tr>`;
  } else if (score < 90) {
    preheader = `Your audit: ${score}/${grade}. You are past basics. Ready for the engine?`;
    offerBlock = `<tr><td style="padding:30px 48px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.midnight700};border:1px solid ${C.hairlineBrass};border-radius:10px">
        <tr><td style="padding:22px 24px">
          <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:4px;color:${C.brassLight};text-transform:uppercase;margin-bottom:8px">For where you are</div>
          <h3 style="margin:0 0 4px;font-family:${FONT_SERIF};font-size:22px;color:${C.cream};font-weight:600">Full-Service Business Build</h3>
          <p style="margin:0 0 10px;font-family:${FONT_MONO};font-size:11px;color:${C.brassLight};letter-spacing:2px;text-transform:uppercase">$8,500 to $22,000 · 30 days</p>
          <p style="margin:0 0 14px;font-family:${FONT_SANS};font-size:14px;color:${C.creamDim};line-height:1.65">Your foundation is solid. What you need now is the engine: bespoke booking with embedded CRM, an AI SDR capturing every lead, funnels live on day one, a back office that surfaces what matters, AI agents on both sides of the wall.</p>
          <a href="${ENGAGEMENTS_URL}#online-presence" style="color:${C.brassLight};text-decoration:none;font-family:${FONT_MONO};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;font-weight:700">See the engagement →</a>
        </td></tr>
      </table>
    </td></tr>`;
  } else {
    preheader = `Your audit: ${score}/${grade}. You do not need a rebuild. You need a strategist.`;
    offerBlock = `<tr><td style="padding:30px 48px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.midnight700};border:1px solid ${C.hairlineBrass};border-radius:10px">
        <tr><td style="padding:22px 24px">
          <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:4px;color:${C.brassLight};text-transform:uppercase;margin-bottom:8px">For where you are</div>
          <h3 style="margin:0 0 4px;font-family:${FONT_SERIF};font-size:22px;color:${C.cream};font-weight:600">Fractional AI Partner</h3>
          <p style="margin:0 0 10px;font-family:${FONT_MONO};font-size:11px;color:${C.brassLight};letter-spacing:2px;text-transform:uppercase">From $1,500/month · 3-month minimum</p>
          <p style="margin:0 0 14px;font-family:${FONT_SANS};font-size:14px;color:${C.creamDim};line-height:1.65">Your site is excellent. You do not need to rebuild. You need a partner who can keep extending it, plug in new AI capabilities as they ship, and watch your numbers with you. That is exactly what this retainer is.</p>
          <a href="${ENGAGEMENTS_URL}#fractional" style="color:${C.brassLight};text-decoration:none;font-family:${FONT_MONO};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;font-weight:700">See the engagement →</a>
        </td></tr>
      </table>
    </td></tr>`;
  }

  const inner = `
    ${brassDivider()}
    ${eyebrow(`Your website audit: ${grade}`)}
    ${headline(`${firstName}, ${score}/100.`)}
    ${lede(`"${line}"`)}
    <tr><td style="padding:28px 48px 0">
      <p style="margin:0;font-family:${FONT_MONO};font-size:10px;color:${C.creamFaint};letter-spacing:2px">${escape(url)}</p>
    </td></tr>
    <tr><td style="padding:22px 48px 0">
      <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:5px;color:${C.brassLight};text-transform:uppercase;margin-bottom:14px">Fix these three first</div>
      ${fixesList(topThreeFixes)}
    </td></tr>
    ${offerBlock}
    ${ctaBlock({ label: 'See all engagements', url: ENGAGEMENTS_URL }, { label: 'Apply to build queue', url: BUILD_QUEUE_URL })}
    ${signature('Sarah')}
    ${brassDivider()}
  `;
  return shell({ preheader, inner });
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

/** Sarah's inbound notification. Clean, scannable, designed for triage. */
export function leadNotification({
  type,
  name,
  email,
  fields,
  message,
  suggestedAction,
}: LeadNotificationArgs): string {
  const typeAccent = {
    'Build Queue': C.brassBright,
    'AI Audit': C.brass,
    Contact: C.rust,
    Newsletter: C.creamFaint,
  }[type];

  const fieldsHtml = fields
    .map(
      (f) => `<tr>
      <td style="padding:8px 0;width:130px;font-family:${FONT_MONO};font-size:10px;color:${C.creamFaint};letter-spacing:1.5px;text-transform:uppercase;vertical-align:top">${escape(f.label)}</td>
      <td style="padding:8px 0;font-family:${FONT_SANS};font-size:13px;color:${C.cream}">${f.isLink ? `<a href="${escape(f.value)}" style="color:${C.brassLight};text-decoration:none">${escape(f.value)}</a>` : escape(f.value)}</td>
    </tr>`
    )
    .join('');

  const inner = `
    ${brassDivider()}
    <tr><td style="padding:36px 48px 0">
      <span style="display:inline-block;background:${typeAccent};color:${C.midnight};padding:5px 12px;border-radius:4px;font-family:${FONT_MONO};font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase">${escape(type)}</span>
    </td></tr>
    ${headline(name)}
    <tr><td style="padding:8px 48px 0">
      <a href="mailto:${escape(email)}" style="color:${C.brassLight};text-decoration:none;font-family:${FONT_MONO};font-size:13px;letter-spacing:0.5px">${escape(email)}</a>
    </td></tr>
    <tr><td style="padding:28px 48px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${fieldsHtml}
      </table>
    </td></tr>
    ${message ? valueCallout('Message', `<div style="white-space:pre-wrap">${escape(message)}</div>`) : ''}
    ${suggestedAction ? `<tr><td style="padding:24px 48px 0">
      <p style="margin:0;font-family:${FONT_MONO};font-size:11px;color:${C.brassLight};letter-spacing:1.5px;text-transform:uppercase;font-weight:700">Suggested action</p>
      <p style="margin:6px 0 0;font-family:${FONT_SANS};font-size:14px;color:${C.cream};line-height:1.6">${escape(suggestedAction)}</p>
    </td></tr>` : ''}
    <tr><td style="padding:36px 48px 36px"></td></tr>
    ${brassDivider()}
  `;
  return shell({ preheader: `New ${type} lead: ${name}`, inner, showSocial: false });
}

/* ────────────────────────── STORE ORDER EMAILS ────────────────────────── */

/**
 * Store emails use a dedicated LIGHT shell, not the dark `shell()` used by the
 * rest of the system. The dark store delivery email rendered as dark-on-dark in
 * some clients (Gmail/Apple Mail dark mode), making it unreadable. A light card
 * with explicit near-black text on cream is bulletproof in every client and in
 * both light and dark mode. The header is a deep-blue sky with drifting cloud
 * emoji to match the website and keep it fun.
 */
const SKY = {
  sky: '#1F4280',
  skyMid: '#3E6BA8',
  skyLight: '#8FC0EF',
  ink: '#16203A',       // near-black navy body copy (high contrast on cream)
  inkSoft: '#46506A',   // softer slate for secondary copy
  cream: '#FBF8F2',     // card background
  creamEdge: '#EFE7D6', // hairline / borders
  panel: '#FFFFFF',     // inner panel
  gold: '#C8964E',
  goldLight: '#E8C88A',
  page: '#DCEAF7',      // pale sky page background
};

/** Light, cloud-headed shell for store emails. `subtitle` sits under the mark. */
function skyShell({ preheader, subtitle, inner }: { preheader: string; subtitle: string; inner: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>Modern Mustard Seed</title>
</head>
<body style="margin:0;padding:0;background:${SKY.page};font-family:${FONT_SANS};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${SKY.page}" style="background:${SKY.page}">
  <tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${SKY.cream};border:1px solid ${SKY.creamEdge};border-radius:18px;overflow:hidden">

      <!-- Sky header with drifting clouds -->
      <tr><td align="center" bgcolor="${SKY.sky}" style="background:${SKY.sky};background-image:linear-gradient(160deg,${SKY.sky} 0%,${SKY.skyMid} 60%,${SKY.skyLight} 100%);padding:34px 40px 28px">
        <div style="font-size:22px;line-height:1;letter-spacing:6px;margin-bottom:8px">&#9729;&#65039; &#9729;&#65039; &#9729;&#65039;</div>
        <div style="font-size:38px;line-height:1;margin-bottom:10px">&#127793;</div>
        <div style="color:#FFFFFF;font-family:${FONT_MONO};font-size:11px;letter-spacing:5px;text-transform:uppercase;font-weight:700">Modern Mustard Seed</div>
        <div style="color:rgba(255,255,255,0.9);font-family:${FONT_SERIF};font-style:italic;font-size:15px;margin-top:8px">${escape(subtitle)}</div>
      </td></tr>

      ${inner}

      <!-- Footer -->
      <tr><td style="padding:8px 40px 34px;background:${SKY.cream}">
        <p style="margin:0;border-top:1px solid ${SKY.creamEdge};padding-top:20px;color:${SKY.inkSoft};font-family:${FONT_SERIF};font-style:italic;font-size:13px;line-height:1.6;text-align:center">
          &ldquo;If you have faith as small as a mustard seed, nothing will be impossible for you.&rdquo;
        </p>
        <p style="margin:12px 0 0;text-align:center">
          <a href="${SITE}" style="color:${SKY.gold};text-decoration:none;font-family:${FONT_MONO};font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700">modernmustardseed.com</a>
        </p>
      </td></tr>

    </table>
    <!-- Cloud sign-off under the card, for fun -->
    <div style="font-size:16px;letter-spacing:8px;margin-top:16px">&#9729;&#65039; &#9729;&#65039; &#9729;&#65039;</div>
  </td></tr>
</table>
</body></html>`;
}

type StoreOrderConfirmationArgs = {
  firstName: string;
  itemName: string;
  downloads: { name: string; url: string }[];
  priceUsd: number;
};

/** Sent to the buyer right after Stripe confirms payment. Contains signed
 *  download URL(s) with 24h TTL. For bundles, lists every included PDF. */
export function storeOrderConfirmationEmail({
  firstName,
  itemName,
  downloads,
  priceUsd,
}: StoreOrderConfirmationArgs): string {
  const downloadButtons = downloads
    .map(
      (d) => `<tr><td style="padding:7px 0">
        <a href="${d.url}" style="display:block;box-sizing:border-box;padding:16px 24px;background:${SKY.gold};background-image:linear-gradient(135deg,${SKY.gold},${SKY.goldLight});color:${SKY.ink};text-decoration:none;font-weight:700;font-size:16px;border-radius:12px;text-align:center;font-family:${FONT_SANS}">&#11015;&#65039;&nbsp; Download ${escape(d.name)}</a>
      </td></tr>`
    )
    .join('');

  const inner = `
    <!-- Greeting + intro -->
    <tr><td style="padding:32px 40px 4px;background:${SKY.cream}">
      <h1 style="margin:0 0 14px;color:${SKY.ink};font-family:${FONT_SERIF};font-size:26px;font-weight:600;line-height:1.2">It is ready, ${escape(firstName)}. &#9729;&#65039;</h1>
      <p style="margin:0;color:${SKY.inkSoft};font-size:16px;line-height:1.65">
        Thank you for your purchase. Your <strong style="color:${SKY.ink}">${escape(itemName)}</strong> ${downloads.length > 1 ? 'files are' : 'file is'} ready to download below. Yours for good.
      </p>
    </td></tr>

    <!-- Download buttons -->
    <tr><td style="padding:20px 40px 0;background:${SKY.cream}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${downloadButtons}</table>
      <p style="margin:18px 0 0;color:${SKY.inkSoft};font-size:14px;line-height:1.6">
        These links expire in 24 hours. Need a fresh one? Just reply to this email and I will send it right over.
      </p>
    </td></tr>

    <!-- 10x companion tip -->
    <tr><td style="padding:22px 40px 0;background:${SKY.cream}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SKY.panel};border:1px solid ${SKY.creamEdge};border-left:3px solid ${SKY.gold};border-radius:12px">
        <tr><td style="padding:18px 22px">
          <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:4px;color:${SKY.gold};text-transform:uppercase;margin-bottom:8px">The 10x companion</div>
          <p style="margin:0;color:${SKY.ink};font-size:14px;line-height:1.7">Once you have read the PDF, upload it to Claude as context, then ask it to coach you through implementation on your specific business. It will reference every framework in the book and adapt it to you. Most buyers miss this.</p>
        </td></tr>
      </table>
    </td></tr>

    <!-- Credit note -->
    <tr><td style="padding:14px 40px 4px;background:${SKY.cream}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SKY.panel};border:1px solid ${SKY.creamEdge};border-radius:12px">
        <tr><td style="padding:16px 20px">
          <p style="margin:0;color:${SKY.ink};font-size:14px;line-height:1.6">&#127793; Your <strong>$${priceUsd}</strong> credits toward any Modern Mustard Seed engagement (Seed Site or Full-Service Build). Just mention it when you reach out.</p>
        </td></tr>
      </table>
    </td></tr>

    <!-- CTA -->
    <tr><td align="center" style="padding:24px 40px 28px;background:${SKY.cream}">
      <a href="https://modernmustardseed.com/build-queue" style="display:inline-block;background:${SKY.sky};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;border-radius:999px;font-family:${FONT_SANS}">Book a discovery call</a>
    </td></tr>
  `;

  return skyShell({
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
    <tr><td style="padding:32px 40px 36px;background:${SKY.cream}">
      <div style="display:inline-block;background:${SKY.gold};color:${SKY.ink};padding:5px 12px;border-radius:6px;font-family:${FONT_MONO};font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px">Store sale &middot; $${args.priceUsd}</div>
      <h1 style="margin:0 0 14px;color:${SKY.ink};font-family:${FONT_SERIF};font-size:22px;font-weight:600;line-height:1.25">${escape(args.itemName)}</h1>
      <p style="margin:0 0 6px;color:${SKY.ink};font-size:16px;line-height:1.6"><strong>${escape(args.name)}</strong></p>
      <p style="margin:0 0 18px;font-size:14px"><a href="mailto:${escape(args.email)}" style="color:${SKY.gold};text-decoration:none;font-weight:600">${escape(args.email)}</a></p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SKY.panel};border:1px solid ${SKY.creamEdge};border-left:3px solid ${SKY.gold};border-radius:12px">
        <tr><td style="padding:16px 20px">
          <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:4px;color:${SKY.gold};text-transform:uppercase;margin-bottom:8px">Follow-up move</div>
          <p style="margin:0;color:${SKY.ink};font-size:14px;line-height:1.7">Buyer is flagged in leads as <code>store-buyer</code> (<code>[bought:${escape(args.sessionId.slice(0, 14))}...]</code>). The chatbot, audit, and sequence will recognize them. A personal note this week may convert the engagement.</p>
        </td></tr>
      </table>
    </td></tr>
  `;

  return skyShell({
    preheader: `New sale: ${args.itemName} to ${args.name} for $${args.priceUsd}`,
    subtitle: 'New store sale',
    inner,
  });
}

/** Compatibility shim — older code imported `p`. */
export function p(html: string): string {
  return paragraph(html);
}

/** Compatibility shim for older routes that called `callout({ label, title, body, href, cta })`.
 * Renders a brass-bordered card with optional internal link. */
export function callout(args: {
  label: string;
  title: string;
  body: string;
  href?: string;
  cta?: string;
}): string {
  return `<div style="background:${C.midnight700};border:1px solid ${C.hairlineBrass};border-left:3px solid ${C.brass};border-radius:8px;padding:20px 22px;margin:16px 0">
    <div style="font-family:${FONT_MONO};font-size:9px;font-weight:700;letter-spacing:4px;color:${C.brassLight};text-transform:uppercase;margin-bottom:8px">${escape(args.label)}</div>
    <h3 style="margin:0 0 6px;font-family:${FONT_SERIF};font-size:18px;color:${C.cream};font-weight:600;line-height:1.3">${escape(args.title)}</h3>
    <p style="margin:0 0 ${args.href ? '12px' : '0'};font-family:${FONT_SANS};font-size:14px;color:${C.creamDim};line-height:1.65">${escape(args.body)}</p>
    ${args.href ? `<a href="${args.href}" style="color:${C.brassLight};text-decoration:none;font-family:${FONT_MONO};font-size:10px;letter-spacing:2.5px;text-transform:uppercase;font-weight:700">${escape(args.cta ?? 'Read more')} →</a>` : ''}
  </div>`;
}
