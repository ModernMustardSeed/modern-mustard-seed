/**
 * Branded email templates for Modern Mustard Seed.
 * One source of truth for header, footer, colors, and layout so every
 * transactional email is unmistakably ours.
 */

const COLORS = {
  void: '#0a0804',
  gold: '#C8A415',
  brightGold: '#FFE082',
  cream: '#FFF8E1',
  text: '#1a1410',
  muted: '#6b6357',
  border: '#e9e3d4',
};

const GOLD_GRADIENT =
  'linear-gradient(135deg, #A68B10 0%, #E6C84A 40%, #C8A415 70%, #FFE082 100%)';

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

type ClientEmailArgs = {
  preheader?: string;
  greeting?: string;
  body: string; // HTML, paragraphs already wrapped
  cta?: { label: string; url: string };
  secondary?: { label: string; url: string };
  signature?: string;
};

/** Outgoing email TO a customer / prospect. Branded, warm, scannable. */
export function clientEmail({
  preheader = '',
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
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Modern Mustard Seed</title>
<style>
  @media (prefers-color-scheme: dark) {
    .body-bg { background: ${COLORS.cream} !important; }
  }
</style>
</head>
<body class="body-bg" style="margin:0;padding:0;background:${COLORS.cream};font-family:${FONT_STACK};color:${COLORS.text};line-height:1.65">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.cream}">
  <tr>
    <td align="center" style="padding:32px 16px">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(20,15,5,0.05)">

        <!-- Top gold bar -->
        <tr><td height="4" style="height:4px;line-height:4px;background:${GOLD_GRADIENT}">&nbsp;</td></tr>

        <!-- Brand header -->
        <tr><td style="padding:36px 40px 8px">
          <div style="font-size:11px;font-weight:700;letter-spacing:5px;color:${COLORS.gold};text-transform:uppercase;font-family:${FONT_STACK}">
            Modern Mustard Seed
          </div>
          <div style="margin-top:8px;width:48px;height:1px;background:${COLORS.border}"></div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 40px 8px;font-size:16px;color:${COLORS.text};line-height:1.7">
          ${greeting ? `<p style="margin:0 0 18px;font-size:18px;color:${COLORS.text};font-weight:500">${escape(greeting)}</p>` : ''}
          ${body}
        </td></tr>

        ${cta ? renderCta(cta, secondary) : ''}

        <!-- Signature -->
        <tr><td style="padding:8px 40px 36px;font-size:16px;color:${COLORS.text}">
          <p style="margin:0">Best,<br><strong style="color:${COLORS.text}">${escape(signature)}</strong><br>
          <span style="color:${COLORS.muted};font-size:14px">Modern Mustard Seed</span></p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px"><div style="border-top:1px solid ${COLORS.border}"></div></td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px 28px;font-family:${FONT_STACK}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding-bottom:14px">
                <a href="https://x.com/sarahmscarano" style="color:${COLORS.muted};text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 8px">X</a>
                <a href="https://linkedin.com/in/sarahscarano" style="color:${COLORS.muted};text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 8px">LinkedIn</a>
                <a href="https://instagram.com/modernmustardseed" style="color:${COLORS.muted};text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 8px">Instagram</a>
                <a href="https://tiktok.com/@modernmustardseed" style="color:${COLORS.muted};text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 8px">TikTok</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:8px">
                <a href="https://modernmustardseed.com" style="color:${COLORS.gold};text-decoration:none;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700">modernmustardseed.com</a>
              </td>
            </tr>
            <tr>
              <td align="center">
                <p style="margin:0;color:${COLORS.muted};font-size:11px;letter-spacing:1px;font-style:italic">Stewardship over extraction.</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Bottom gold bar -->
        <tr><td height="4" style="height:4px;line-height:4px;background:${GOLD_GRADIENT}">&nbsp;</td></tr>
      </table>

    </td>
  </tr>
</table>
</body></html>`;
}

function renderCta(cta: { label: string; url: string }, secondary?: { label: string; url: string }): string {
  return `
    <tr><td style="padding:18px 40px 8px" align="left">
      <a href="${cta.url}" style="display:inline-block;background:${GOLD_GRADIENT};color:#0a0804;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;border-radius:999px;font-family:${FONT_STACK}">
        ${escape(cta.label)}
      </a>
      ${secondary ? `<a href="${secondary.url}" style="display:inline-block;color:${COLORS.gold};text-decoration:none;font-weight:600;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:14px 12px;font-family:${FONT_STACK};margin-left:8px">${escape(secondary.label)} &rarr;</a>` : ''}
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

/** Internal notification TO Sarah when a new lead arrives. Scannable. */
export function leadNotification({
  type,
  name,
  email,
  fields,
  message,
  suggestedAction,
}: LeadNotificationArgs): string {
  const badge = {
    'Build Queue': { color: '#C8A415', label: 'BUILD QUEUE' },
    'AI Audit': { color: '#8B7209', label: 'AUDIT LEAD' },
    'Contact': { color: '#A68B10', label: 'CONTACT' },
    'Newsletter': { color: '#6b6357', label: 'NEWSLETTER' },
  }[type];

  const rows = fields
    .map(
      (f) => `
      <tr>
        <td style="padding:9px 0;color:${COLORS.muted};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:170px;vertical-align:top">${escape(f.label)}</td>
        <td style="padding:9px 0;color:${COLORS.text};font-size:14px;vertical-align:top">${f.isLink ? `<a href="${f.value}" style="color:${COLORS.gold};text-decoration:none">${escape(f.value)}</a>` : escape(f.value)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f1e6;font-family:${FONT_STACK};color:${COLORS.text}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f1e6">
  <tr><td align="center" style="padding:24px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:#fff;border-radius:12px;overflow:hidden">
      <tr><td height="3" style="height:3px;line-height:3px;background:${badge.color}">&nbsp;</td></tr>

      <tr><td style="padding:28px 36px 8px">
        <div style="display:inline-block;background:${badge.color};color:#fff;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:6px 12px;border-radius:4px">${badge.label}</div>
        <h1 style="margin:18px 0 6px;font-size:24px;color:${COLORS.text};font-weight:700;letter-spacing:-0.3px">${escape(name)}</h1>
        <p style="margin:0;font-size:14px;color:${COLORS.muted}"><a href="mailto:${email}" style="color:${COLORS.gold};text-decoration:none">${escape(email)}</a></p>
      </td></tr>

      <tr><td style="padding:18px 36px 4px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLORS.border}">
          ${rows}
        </table>
      </td></tr>

      ${message ? `<tr><td style="padding:18px 36px 4px"><div style="background:${COLORS.cream};padding:16px 18px;border-radius:8px;border-left:3px solid ${COLORS.gold};font-size:14px;color:${COLORS.text};line-height:1.6;white-space:pre-wrap">${escape(message)}</div></td></tr>` : ''}

      ${suggestedAction ? `<tr><td style="padding:18px 36px 4px"><p style="margin:0;font-size:13px;color:${COLORS.muted};font-style:italic">Suggested: ${escape(suggestedAction)}</p></td></tr>` : ''}

      <tr><td style="padding:20px 36px 28px">
        <a href="mailto:${email}" style="display:inline-block;background:${badge.color};color:#fff;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:12px 22px;border-radius:6px">Reply to ${escape(name.split(' ')[0])}</a>
      </td></tr>

      <tr><td style="padding:0 36px 24px">
        <p style="margin:0;font-size:11px;color:${COLORS.muted};letter-spacing:1px">Submitted via modernmustardseed.com</p>
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

/** Paragraph helper for body content. Use to compose clientEmail body strings. */
export function p(content: string): string {
  return `<p style="margin:0 0 16px;color:${COLORS.text};line-height:1.7">${content}</p>`;
}

/** Highlighted callout (for playbook recommendations etc) */
export function callout(args: { label?: string; title: string; body?: string; href?: string; cta?: string }): string {
  return `<div style="background:${COLORS.cream};border-left:3px solid ${COLORS.gold};padding:18px 20px;margin:18px 0;border-radius:6px">
    ${args.label ? `<div style="font-size:10px;font-weight:700;letter-spacing:3px;color:${COLORS.gold};text-transform:uppercase;margin-bottom:6px">${escape(args.label)}</div>` : ''}
    <div style="font-size:16px;font-weight:600;color:${COLORS.text};margin-bottom:${args.body ? '6px' : '0'}">${escape(args.title)}</div>
    ${args.body ? `<div style="font-size:14px;color:${COLORS.muted};line-height:1.6;margin-bottom:${args.href ? '10px' : '0'}">${escape(args.body)}</div>` : ''}
    ${args.href ? `<a href="${args.href}" style="color:${COLORS.gold};text-decoration:none;font-size:13px;font-weight:600">${escape(args.cta ?? 'Read it')} &rarr;</a>` : ''}
  </div>`;
}
