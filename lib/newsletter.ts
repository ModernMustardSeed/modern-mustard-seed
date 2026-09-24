import { SAMPLE } from '@/data/presence-audit-page';
import { NEWSLETTER_AUDIT_URL } from '@/lib/presence-audit-links';
import { postalAddress } from '@/lib/outbound-email';
import { escape } from '@/lib/email';

/**
 * THE TUESDAY NEWSLETTER, AS HTML.
 *
 * app/api/cron/newsletter/route.ts picks the playbook of the week and sends
 * whatever this renders. The issue is a template, not a table of rows, so the
 * things it can feature are reusable blocks: functions that return one
 * self-contained HTML section. NEWSLETTER_FEATURES is the running order of the
 * blocks the next issue carries under the playbook. Add a block to feature
 * something; take it out of the list when it has had its run.
 *
 * Email HTML rules this file keeps: inline styles only, tables for anything
 * laid out side by side, no fixed pixel widths wider than a phone, and no
 * webfonts (Arial falls back everywhere).
 */

const INK = '#161616';
const CREAM = '#FBF6EA';
const MUSTARD = '#F5B700';
const RED = '#E0301E';
const GREEN = '#2F7D4F';
const MUTED = '#5c554a';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The bar colour a score earns: the same thresholds the report page reads as fail, fair, strong. */
const barColor = (score: number) => (score >= 80 ? GREEN : score >= 60 ? MUSTARD : RED);

function pillarRow(p: (typeof SAMPLE.pillars)[number]): string {
  const filled = Math.max(2, Math.min(100, Math.round(p.score)));
  return `
      <tr>
        <td style="padding:10px 0 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            <tr>
              <td style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${INK}">${esc(p.label)}</td>
              <td align="right" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${INK};white-space:nowrap">${p.score} <span style="color:${MUTED};font-weight:400">/ 100</span></td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:5px;border:1px solid ${INK}">
            <tr>
              <td width="${filled}%" height="10" style="height:10px;line-height:10px;font-size:0;background:${barColor(p.score)}">&nbsp;</td>
              ${filled < 100 ? `<td height="10" style="height:10px;line-height:10px;font-size:0;background:#ffffff">&nbsp;</td>` : ''}
            </tr>
          </table>
        </td>
      </tr>`;
}

/**
 * THE FREE ONLINE PRESENCE AUDIT, as a newsletter section.
 *
 * Leads with the sample report the landing page and Campaign 28 already use
 * (data/presence-audit-page.ts SAMPLE, labelled as a sample wherever it shows),
 * so the email, the page and the ads all tell one story. The button carries
 * utm_source=newsletter, which the request form files as
 * presence-audit:newsletter for the Audit Desk and the scoreboard.
 *
 * It never claims a person runs the audit (Sarah, 2026-09-18). The claim is the
 * three pillars and that every check is printed.
 */
export function presenceAuditBlock(url: string = NEWSLETTER_AUDIT_URL): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:36px 0 8px;border:2px solid ${INK};background:${CREAM}">
  <tr>
    <td style="padding:24px 22px">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;color:${RED}">Free: the Online Presence Audit</p>
      <h2 style="margin:10px 0 12px;font-family:Arial,sans-serif;font-size:24px;line-height:1.2;color:${INK}">Most people decide about you before they reach your website.</h2>
      <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#3a3733">They see your Google listing, your stars and your reviews first. So the audit grades all three: your website on seven categories, your Google Business Profile on eight checks, and your reviews against your trade. Every check is printed so you can verify it, and the full report lands in your inbox, yours to keep.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:2px solid ${INK}">
        <tr>
          <td style="padding:18px 18px 20px">
            <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${MUTED}">Sample report &middot; ${esc(SAMPLE.business)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:10px">
              <tr>
                <td style="font-family:Arial,sans-serif;font-size:44px;line-height:1;font-weight:900;color:${INK};padding-right:8px">${SAMPLE.overall}</td>
                <td style="font-family:Arial,sans-serif;font-size:14px;color:${MUTED};padding-right:12px;vertical-align:bottom">/ 100</td>
                <td style="vertical-align:middle"><span style="display:inline-block;border:2px solid ${INK};background:${MUSTARD};padding:4px 10px;font-family:Arial,sans-serif;font-size:16px;font-weight:900;color:${INK}">${esc(SAMPLE.letter)}</span></td>
              </tr>
            </table>
            <p style="margin:12px 0 4px;font-family:Arial,sans-serif;font-size:17px;line-height:1.35;font-weight:700;font-style:italic;color:${INK}">${esc(SAMPLE.headline)}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${SAMPLE.pillars.map(pillarRow).join('')}
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${MUTED}">A sample. The business is invented, the math is the real rubric.</p>

      <p style="margin:24px 0 0">
        <a href="${esc(url)}" style="display:inline-block;padding:14px 28px;background:${MUSTARD};border:2px solid ${INK};color:${INK};text-decoration:none;font-family:Arial,sans-serif;font-weight:700;border-radius:999px;font-size:12px;letter-spacing:2px;text-transform:uppercase">Get your free audit</a>
      </p>
      <p style="margin:14px 0 0;font-family:Arial,sans-serif;font-size:13px;color:${MUTED}">No card. No call unless you ask.</p>
    </td>
  </tr>
</table>`;
}

/** The blocks the next issue carries, in order, under the playbook of the week. */
export const NEWSLETTER_FEATURES: { id: string; html: () => string }[] = [
  { id: 'presence-audit', html: () => presenceAuditBlock() },
];

export type NewsletterPlaybook = { slug: string; title: string; description: string };

/** One issue: the playbook of the week, then every block in NEWSLETTER_FEATURES. */
export function renderNewsletter(playbook: NewsletterPlaybook, features = NEWSLETTER_FEATURES): string {
  // A broadcast is commercial mail and owes the reader a postal address.
  const postal = postalAddress();
  const playbookUrl = `https://modernmustardseed.com/playbooks/${playbook.slug}`;
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:Arial,sans-serif;line-height:1.65;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <p style="font-size:11px;letter-spacing:3px;color:#C8964E;text-transform:uppercase;font-weight:700">
    Playbook of the Week
  </p>
  <h1 style="font-size:28px;margin:8px 0 16px;color:#080c16">${esc(playbook.title)}</h1>
  <p style="font-size:16px;color:#555;margin-bottom:24px">${esc(playbook.description)}</p>
  <p style="margin:24px 0">
    <a href="${playbookUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#F0D090,#C8964E);color:#ffffff;text-decoration:none;font-weight:700;border-radius:999px;font-size:12px;letter-spacing:2px;text-transform:uppercase">Read the playbook</a>
  </p>
  <p style="font-size:14px;color:#777">Free to read. Free to run yourself. The whole point.</p>
  <p style="font-size:14px;color:#777">If you would rather have us ship the thing for you, a <a href="https://modernmustardseed.com/book" style="color:#C8964E">free call</a> is the fastest way in, and we are booking new builds.</p>
  ${features.map((f) => f.html()).join('\n')}
  <hr style="border:0;border-top:1px solid #eee;margin:32px 0">
  <p style="font-size:12px;color:#888">Modern Mustard Seed. Apps, sites, and agentic systems.<br>
  Reply to this email to talk to Sarah directly.</p>
  <p style="font-size:11px;color:#aaa">You are getting this because you subscribed at modernmustardseed.com.
  <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#aaa">Unsubscribe</a>.</p>
  ${postal ? `<p style="font-size:11px;color:#aaa">${escape(postal)}</p>` : ''}
</body></html>
  `;
}
