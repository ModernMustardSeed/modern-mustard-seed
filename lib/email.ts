/**
 * Branded email templates for Modern Mustard Seed.
 * Dark, editorial, atmospheric. Matches the site aesthetic.
 */

const COLORS = {
  void: '#1A1140',
  card: '#150E33',
  text: '#F5EFE4',
  heading: '#ffffff',
  muted: 'rgba(255,255,255,0.62)',
  faint: 'rgba(255,255,255,0.38)',
  hairlineWhite: 'rgba(255,255,255,0.08)',
  hairlineGold: 'rgba(255,179,71,0.25)',
  goldDim: 'rgba(255,179,71,0.78)',
  gold: '#FF8E72',
  brightGold: '#FFB347',
};

const GOLD_GRADIENT =
  'linear-gradient(120deg,#FF6B6B 0%,#FFB347 55%,#4ECDC4 100%)';

const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF_STACK = '"Iowan Old Style", "Apple Garamond", Baskerville, Georgia, serif';
const MONO_STACK = '"SF Mono", "Menlo", "Consolas", monospace';

type ClientEmailArgs = {
  preheader?: string;
  eyebrow?: string;
  greeting?: string;
  body: string;
  cta?: { label: string; url: string };
  secondary?: { label: string; url: string };
  signature?: string;
};

/** Outgoing customer email. Dark, editorial. */
export function clientEmail({
  preheader = '',
  eyebrow,
  greeting,
  body,
  cta,
  secondary,
  signature = 'Sarah',
}: ClientEmailArgs): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark only">
<meta name="supported-color-schemes" content="dark only">
<title>Modern Mustard Seed</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.void};font-family:${FONT_STACK};color:${COLORS.text};line-height:1.65;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.void}" style="background:${COLORS.void}">
  <tr><td align="center" style="padding:48px 16px 32px">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px">

      <tr><td align="center" style="padding:0 0 6px">
        <div style="font-family:${MONO_STACK};font-size:10px;font-weight:700;letter-spacing:6px;color:${COLORS.goldDim};text-transform:uppercase">
          Modern Mustard Seed
        </div>
      </td></tr>

      <tr><td align="center" style="padding:14px 0 0">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="48" style="height:1px;background:${COLORS.hairlineGold};line-height:1px;font-size:0">&nbsp;</td></tr></table>
      </td></tr>

      <tr><td style="padding:36px 0 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.card}" style="background:${COLORS.card};border:1px solid ${COLORS.hairlineWhite};border-radius:14px">

          <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background:${GOLD_GRADIENT}">&nbsp;</td></tr>

          ${eyebrow ? `<tr><td style="padding:36px 44px 0">
            <div style="font-family:${MONO_STACK};font-size:10px;font-weight:700;letter-spacing:4px;color:${COLORS.gold};text-transform:uppercase">${escape(eyebrow)}</div>
          </td></tr>` : ''}

          ${greeting ? `<tr><td style="padding:${eyebrow ? '20px' : '40px'} 44px 0">
            <p style="margin:0;font-size:20px;color:${COLORS.heading};font-weight:500;letter-spacing:-0.2px;line-height:1.4">${escape(greeting)}</p>
          </td></tr>` : ''}

          <tr><td style="padding:22px 44px 8px;font-size:16px;color:${COLORS.text};line-height:1.75">
            ${body}
          </td></tr>

          ${cta ? renderCta(cta, secondary) : ''}

          <tr><td style="padding:18px 44px 36px">
            <div style="font-size:11px;letter-spacing:3px;color:${COLORS.faint};text-transform:uppercase;font-family:${MONO_STACK};margin-bottom:8px">Signed</div>
            <p style="margin:0;font-size:17px;color:${COLORS.heading};font-weight:500">${escape(signature)}</p>
            <p style="margin:2px 0 0;font-size:13px;color:${COLORS.muted};letter-spacing:0.3px">Modern Mustard Seed</p>
          </td></tr>

          <tr><td height="1" style="height:1px;line-height:1px;font-size:0;background:${GOLD_GRADIENT}">&nbsp;</td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:32px 12px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding-bottom:14px">
            ${footerLink('X', 'https://x.com/sarahmscarano')}
            ${footerSeparator()}
            ${footerLink('LinkedIn', 'https://linkedin.com/in/sarahscarano')}
            ${footerSeparator()}
            ${footerLink('Instagram', 'https://instagram.com/modernmustardseed')}
            ${footerSeparator()}
            ${footerLink('TikTok', 'https://tiktok.com/@modernmustardseed')}
          </td></tr>
          <tr><td align="center" style="padding-bottom:18px">
            <a href="https://modernmustardseed.com" style="color:${COLORS.gold};text-decoration:none;font-family:${MONO_STACK};font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700">modernmustardseed.com</a>
          </td></tr>
          <tr><td align="center">
            <p style="margin:0;color:${COLORS.faint};font-family:${SERIF_STACK};font-size:14px;font-style:italic;letter-spacing:0.3px">Stewardship over extraction.</p>
          </td></tr>
        </table>
      </td></tr>

    </table>

  </td></tr>
</table>
</body></html>`;
}

function footerLink(label: string, url: string): string {
  return `<a href="${url}" style="color:${COLORS.muted};text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:${MONO_STACK};font-weight:500">${label}</a>`;
}

function footerSeparator(): string {
  return `<span style="color:${COLORS.faint};margin:0 12px">·</span>`;
}

function renderCta(cta: { label: string; url: string }, secondary?: { label: string; url: string }): string {
  return `
    <tr><td style="padding:24px 44px 8px" align="left">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="#FF8E72" style="background:${GOLD_GRADIENT};border-radius:999px">
          <a href="${cta.url}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;padding:16px 32px;font-family:${FONT_STACK}">
            ${escape(cta.label)}
          </a>
        </td>
        ${secondary ? `<td style="padding-left:12px"><a href="${secondary.url}" style="display:inline-block;color:${COLORS.gold};text-decoration:none;font-weight:600;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:16px 8px;font-family:${FONT_STACK}">${escape(secondary.label)} →</a></td>` : ''}
      </tr></table>
    </td></tr>
  `;
}

type LeadField = { label: string; value: string; isLink?: boolean };

type LeadNotificationArgs = {
  type: 'Build Queue' | 'AI Audit' | 'Contact' | 'Newsletter';
  name: string;
  email: string;
  fields: LeadField[];
  message?: string;
  suggestedAction?: string;
};

/** Sarah's inbound notification. Dark, scannable, designed for triage. */
export function leadNotification({
  type,
  name,
  email,
  fields,
  message,
  suggestedAction,
}: LeadNotificationArgs): string {
  const typeAccent = {
    'Build Queue': '#FFB347',
    'AI Audit': '#FF8E72',
    'Contact': '#FF6B6B',
    'Newsletter': 'rgba(255,255,255,0.45)',
  }[type];

  const rows = fields
    .map(
      (f) => `
      <tr>
        <td style="padding:11px 0;color:${COLORS.faint};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;width:180px;vertical-align:top;font-family:${MONO_STACK}">${escape(f.label)}</td>
        <td style="padding:11px 0;color:${COLORS.text};font-size:14px;vertical-align:top;line-height:1.5">${f.isLink ? `<a href="${f.value}" style="color:${COLORS.gold};text-decoration:none">${escape(f.value)}</a>` : escape(f.value)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark only"><meta name="supported-color-schemes" content="dark only"></head>
<body style="margin:0;padding:0;background:${COLORS.void};font-family:${FONT_STACK};color:${COLORS.text};-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.void}" style="background:${COLORS.void}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px">

      <tr><td style="padding-bottom:18px;font-family:${MONO_STACK};font-size:10px;font-weight:700;letter-spacing:5px;color:${COLORS.goldDim};text-transform:uppercase">
        Modern Mustard Seed &nbsp;·&nbsp; Inbox
      </td></tr>

      <tr><td bgcolor="${COLORS.card}" style="background:${COLORS.card};border:1px solid ${COLORS.hairlineWhite};border-radius:14px;overflow:hidden">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="2" style="height:2px;line-height:2px;font-size:0;background:${typeAccent}">&nbsp;</td></tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:32px 40px 0">
            <div style="font-family:${MONO_STACK};font-size:10px;font-weight:700;letter-spacing:4px;color:${typeAccent};text-transform:uppercase;margin-bottom:14px">${type}</div>
            <h1 style="margin:0;font-size:26px;color:${COLORS.heading};font-weight:600;letter-spacing:-0.4px;font-family:${FONT_STACK}">${escape(name)}</h1>
            <p style="margin:6px 0 0;font-size:14px"><a href="mailto:${email}" style="color:${COLORS.gold};text-decoration:none">${escape(email)}</a></p>
          </td></tr>

          <tr><td style="padding:24px 40px 0">
            <div style="border-top:1px solid ${COLORS.hairlineWhite};padding-top:8px"></div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
          </td></tr>

          ${message ? `<tr><td style="padding:18px 40px 0">
            <div style="background:rgba(255,179,71,0.08);border-left:2px solid ${COLORS.gold};padding:18px 22px;border-radius:6px;font-size:14px;color:${COLORS.text};line-height:1.65;white-space:pre-wrap;font-family:${FONT_STACK}">${escape(message)}</div>
          </td></tr>` : ''}

          ${suggestedAction ? `<tr><td style="padding:18px 40px 0">
            <p style="margin:0;font-family:${MONO_STACK};font-size:11px;color:${COLORS.faint};letter-spacing:1.5px;text-transform:uppercase">&rarr; ${escape(suggestedAction)}</p>
          </td></tr>` : ''}

          <tr><td style="padding:24px 40px 32px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td bgcolor="#FF8E72" style="background:${GOLD_GRADIENT};border-radius:8px">
                <a href="mailto:${email}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:700;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;padding:13px 24px;font-family:${FONT_STACK}">Reply to ${escape(name.split(' ')[0])}</a>
              </td>
              <td style="padding-left:12px">
                <a href="https://modernmustardseed.com/admin" style="display:inline-block;color:${COLORS.gold};text-decoration:none;font-weight:600;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:13px 8px;font-family:${FONT_STACK}">Open in admin →</a>
              </td>
            </tr></table>
          </td></tr>
        </table>

      </td></tr>

      <tr><td align="center" style="padding-top:18px">
        <p style="margin:0;color:${COLORS.faint};font-family:${MONO_STACK};font-size:10px;letter-spacing:2px;text-transform:uppercase">Logged at /admin · Synced to Supabase</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function escape(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Paragraph helper for body content. */
export function p(content: string): string {
  return `<p style="margin:0 0 18px;color:${COLORS.text};line-height:1.75;font-size:16px">${content}</p>`;
}

/** Callout block. Gold-bordered card for highlighted content (playbook recs etc). */
export function callout(args: { label?: string; title: string; body?: string; href?: string; cta?: string }): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px"><tr><td style="background:rgba(255,179,71,0.08);border-left:2px solid ${COLORS.gold};padding:20px 22px;border-radius:6px">
    ${args.label ? `<div style="font-family:${MONO_STACK};font-size:10px;font-weight:700;letter-spacing:3px;color:${COLORS.gold};text-transform:uppercase;margin-bottom:8px">${escape(args.label)}</div>` : ''}
    <div style="font-size:17px;font-weight:600;color:${COLORS.heading};margin-bottom:${args.body ? '8px' : '0'};line-height:1.4">${escape(args.title)}</div>
    ${args.body ? `<div style="font-size:14px;color:${COLORS.muted};line-height:1.6;margin-bottom:${args.href ? '12px' : '0'}">${escape(args.body)}</div>` : ''}
    ${args.href ? `<a href="${args.href}" style="color:${COLORS.gold};text-decoration:none;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase">${escape(args.cta ?? 'Read it')} →</a>` : ''}
  </td></tr></table>`;
}
