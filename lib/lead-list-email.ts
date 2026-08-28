/**
 * The lead list as an email.
 *
 * Stacked blocks, not a wide table. A ten-column table is unreadable on a phone
 * and most of these lists get opened on one, so each lead is its own card with a
 * tappable phone number and a tappable address. Nothing here is fixed-width and
 * nothing uses eight-digit hex alpha, which Outlook drops on the floor.
 */
import { escape } from '@/lib/email';
import { cellValue, listDate } from '@/lib/lead-list';
import type { ListColumn, ListLead } from '@/lib/lead-list';

const INK = '#1a1815';
const MUTED = '#6b6863';
const RULE = '#dcd8cf';
const CREAM = '#f7f3e9';
const PAPER = '#fffdf8';
// The admin's brass gold is brown by the house rule (scripts/check-no-brown.mjs),
// so the mail wears the brand mustard and the brick red instead.
const MUSTARD = '#F5B700';
const BRICK = '#a03123';

const SANS = 'Helvetica,Arial,sans-serif';

export function leadListEmail({
  title,
  note,
  leads,
  columns,
}: {
  title: string;
  note?: string;
  leads: ListLead[];
  columns: ListColumn[];
}): string {
  const detailCols = columns.filter((c) => c.key !== 'business_name');
  const count = `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`;

  const cards = leads
    .map((l, i) => {
      const detail = detailCols
        .map((c) => {
          const v = cellValue(l, c.key);
          if (!v) return '';
          const shown =
            c.key === 'phone'
              ? `<a href="tel:${escape(l.phone)}" style="color:${INK};text-decoration:none;font-weight:700">${escape(v)}</a>`
              : c.key === 'email'
                ? `<a href="mailto:${escape(l.email ?? '')}" style="color:${BRICK};text-decoration:none;word-break:break-all">${escape(v)}</a>`
                : c.key === 'website' && l.website?.trim()
                  ? `<a href="${escape(l.website.trim())}" style="color:${BRICK};text-decoration:none;word-break:break-all">${escape(v)}</a>`
                  : escape(v);
          return `<tr>
        <td valign="top" style="padding:2px 10px 2px 0;font-family:${SANS};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};white-space:nowrap">${escape(c.label)}</td>
        <td valign="top" style="padding:2px 0;font-family:${SANS};font-size:14px;line-height:1.45;color:${INK}">${shown}</td>
      </tr>`;
        })
        .join('');

      return `<tr><td style="padding:0 0 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid ${INK};border-radius:12px;background:${PAPER}">
        <tr><td style="padding:14px 16px">
          <div style="font-family:${SANS};font-size:17px;font-weight:700;color:${INK};line-height:1.3;margin:0 0 8px">
            <span style="color:${BRICK}">${i + 1}.</span> ${escape(l.business_name)}
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${detail}</table>
        </td></tr>
      </table>
    </td></tr>`;
    })
    .join('');

  const noteBlock = note
    ? `<tr><td style="padding:0 0 18px;font-family:${SANS};font-size:15px;line-height:1.6;color:${INK};white-space:pre-wrap">${escape(note)}</td></tr>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:${CREAM}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${count}, ${listDate()}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM}">
    <tr><td align="center" style="padding:24px 12px 40px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px">
        <tr><td style="padding:0 0 6px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${INK}">Modern Mustard Seed</td></tr>
        <tr><td style="padding:0 0 10px"><table role="presentation" width="54" cellpadding="0" cellspacing="0" border="0"><tr><td height="3" bgcolor="${MUSTARD}" style="height:3px;line-height:3px;font-size:0;background:${MUSTARD}">&nbsp;</td></tr></table></td></tr>
        <tr><td style="padding:0 0 4px;font-family:${SANS};font-size:24px;font-weight:700;color:${INK};line-height:1.25">${escape(title)}</td></tr>
        <tr><td style="padding:0 0 20px;font-family:${SANS};font-size:13px;color:${MUTED}">${count} &middot; ${listDate()}</td></tr>
        ${noteBlock}
        ${cards}
        <tr><td style="padding:10px 0 0;border-top:1px solid ${RULE};font-family:${SANS};font-size:12px;color:${MUTED}">
          Sent from the Modern Mustard Seed Command Center. Reply to this and it reaches Sarah.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
