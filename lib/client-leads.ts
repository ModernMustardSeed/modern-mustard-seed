/**
 * LEADS FROM A CLIENT'S OWN SITE: the parts shared by the endpoint, the
 * portal, and the Monday digest.
 *
 * Priority comes from the buyer's starting point, in the order Carmen gave
 * on the onboarding: land and plans, land without plans, plans without land,
 * then a remodel. The visitor's own words are stored as given; this only
 * reads them.
 */
import { resendClient } from '@/lib/send-email';
import { sendSms, toE164 } from '@/lib/sms';
import { SITE } from '@/lib/seo';

export type ClientProject = {
  key: string;
  clientEmail: string;
  business: string;
  siteUrl: string;
  origins: string[];
  notify: { phone: string | null; emails: string[] };
  /** Who answers the phone, by first name, for the visitor's confirmation. */
  answers: string;
  phone: string;
};

export const CLIENT_PROJECTS: Record<string, ClientProject> = {
  'built-right': {
    key: 'built-right',
    clientEmail: 'builtbyshan@gmail.com',
    business: 'Built Right in Montana',
    siteUrl: 'https://built-right-montana-demo.vercel.app',
    origins: ['https://built-right-montana-demo.vercel.app', 'https://builtrightinmontana.com', 'https://www.builtrightinmontana.com', 'https://built-right-prep.vercel.app'],
    notify: { phone: '(406) 471-5613', emails: ['builtbyshan@gmail.com'] },
    answers: 'Carmen',
    phone: '(406) 471-5613',
  },
};

export const PRIORITY_LABEL: Record<number, string> = { 1: 'Land and plans', 2: 'Land, no plans', 3: 'Plans, no land', 4: 'Remodel' };

/** 1 to 4 from the starting-point string, null when it says nothing usable. */
export function priorityFromLand(land: string | null | undefined): number | null {
  const s = (land ?? '').toLowerCase();
  if (!s) return null;
  const hasLand = /\bown land\b|\bhave land\b|\bland and\b|^land\b/.test(s) || (/\bland\b/.test(s) && !/no land|not yet|without land/.test(s));
  const hasPlans = /\bhave plans\b|\bland and plans\b|\bplans,? no land\b|\bplans no land\b/.test(s) || (/\bplans\b/.test(s) && !/no plans|not yet|without plans/.test(s));
  if (/remodel|addition|renovat|home i own|house i own/.test(s)) return 4;
  if (hasLand && hasPlans) return 1;
  if (hasLand) return 2;
  if (hasPlans) return 3;
  return null;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * What the visitor gets back, at once: we have it, who calls, what happens
 * next. Email whenever they gave one; a text only when they ticked the box.
 */
export async function confirmVisitor(p: ClientProject, lead: { name: string | null; email: string | null; phone: string | null; smsConsent: boolean; hasQuestionnaire: boolean }): Promise<{ email?: { ok: boolean; id?: string | null; error?: string | null }; sms?: { ok: boolean; sid?: string; error?: string } }> {
  const out: { email?: { ok: boolean; id?: string | null; error?: string | null }; sms?: { ok: boolean; sid?: string; error?: string } } = {};
  const first = (lead.name ?? '').trim().split(/\s+/)[0] || 'Hello';
  const q = `${p.siteUrl}/questionnaire`;
  const steps = [
    `${p.answers} calls you back, usually the same business day.`,
    'We talk through what you have: land, plans, or a home you want changed.',
    'We walk the site together to see whether the lot suits the idea.',
    'Then a plan, and the real numbers after a pre-construction agreement.',
  ];

  if (lead.email) {
    const html = `<div style="font:400 16px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:540px;">
      <p style="margin:0 0 14px;">${esc(first)}, we have your message. Thank you for reaching out to ${esc(p.business)}.</p>
      <p style="margin:0 0 10px;"><strong>What happens next</strong></p>
      <ol style="margin:0 0 16px;padding-left:20px;">${steps.map((s) => `<li style="margin:0 0 6px;">${esc(s)}</li>`).join('')}</ol>
      ${lead.hasQuestionnaire ? '' : `<p style="margin:0 0 14px;">If you have ten minutes before we talk, the first-week questionnaire tells us what matters: <a href="${q}" style="color:#C4380C;">${q.replace('https://', '')}</a>. Answer what you can and skip the rest.</p>`}
      <p style="margin:0 0 14px;">Anything sooner, call us at ${esc(p.phone)}.</p>
      <p style="margin:22px 0 0;">${esc(p.business)}</p>
    </div>`;
    try {
      const resend = resendClient();
      const sent = await resend.emails.send({
        from: `${p.business} <sarah@modernmustardseed.com>`,
        to: [lead.email],
        replyTo: p.notify.emails,
        subject: `We have your message, ${first}`,
        html,
        text: [`${first}, we have your message. Thank you for reaching out to ${p.business}.`, '', 'What happens next:', ...steps.map((s, i) => `${i + 1}. ${s}`), '', ...(lead.hasQuestionnaire ? [] : [`The first-week questionnaire, if you have ten minutes: ${q}`, '']), `Anything sooner, call us at ${p.phone}.`, '', p.business].join('\n'),
      });
      out.email = { ok: !sent.error, id: sent.data?.id ?? null, error: sent.error?.message ?? null };
    } catch (err) {
      out.email = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  if (lead.smsConsent && lead.phone && toE164(lead.phone)) {
    const sms = await sendSms(lead.phone, `${p.business}: we have your message, ${first}. ${p.answers} calls back, usually the same business day. Sooner: ${p.phone}.${lead.hasQuestionnaire ? '' : ` Questionnaire: ${q}`}`);
    out.sms = sms.ok ? { ok: true, sid: sms.sid } : { ok: false, error: sms.error };
  }
  return out;
}

export type DigestLead = { id: string; name: string | null; phone: string | null; email: string | null; town: string | null; land: string | null; page: string | null; source: string; sources: string[] | null; priority: number | null; handled_at: string | null; created_at: string };

const DOOR: Record<string, string> = { contact: 'Contact form', intake: 'Project form', refer: 'Refer a friend', chat: 'Website chat', questionnaire: 'Questionnaire' };

/** The Monday note: last week by door, by priority, by page, and who is still waiting on a call. */
export async function sendLeadsDigest(p: ClientProject, week: DigestLead[], open: DigestLead[]): Promise<boolean> {
  const tally = (pick: (l: DigestLead) => string[] | string | null) => {
    const m = new Map<string, number>();
    for (const l of week) {
      const v = pick(l);
      for (const k of Array.isArray(v) ? v : v ? [v] : []) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const bySource = tally((l) => (l.sources?.length ? l.sources : [l.source]).map((s) => DOOR[s] ?? s));
  const byPriority = tally((l) => (l.priority ? `${l.priority}. ${PRIORITY_LABEL[l.priority]}` : 'Not said'));
  const byPage = tally((l) => (l.page ?? '').replace(/^https?:\/\/[^/]+/, '') || null).slice(0, 6);
  const row = (title: string, rows: Array<[string, number]>) => `<td style="vertical-align:top;padding:0 14px 0 0;"><p style="margin:0 0 4px;font:700 11px/1 monospace;letter-spacing:.16em;text-transform:uppercase;color:#161616;opacity:.6;">${title}</p>${rows.length ? rows.map(([k, n]) => `<p style="margin:0 0 2px;">${esc(k)} <strong>${n}</strong></p>`).join('') : '<p style="margin:0;opacity:.5;">none</p>'}</td>`;
  const openRows = open
    .map((l) => `<tr><td style="padding:4px 10px 4px 0;white-space:nowrap;">${l.priority ? `<strong>${l.priority}</strong>` : '·'}</td><td style="padding:4px 10px 4px 0;"><strong>${esc(l.name ?? 'No name')}</strong>${l.town ? `, ${esc(l.town)}` : ''}<br><span style="opacity:.7;">${esc(l.phone ?? l.email ?? '')}${l.land ? ` · ${esc(l.land)}` : ''}</span></td><td style="padding:4px 0;white-space:nowrap;opacity:.6;">${new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td></tr>`)
    .join('');
  const html = `<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:600px;">
    <p style="margin:0 0 14px;">${esc(p.business)}, last week: <strong>${week.length}</strong> ${week.length === 1 ? 'lead' : 'leads'} through the website${open.length ? `, and <strong>${open.length}</strong> still waiting on a call` : ', and nobody waiting on a call'}.</p>
    <table style="border-collapse:collapse;margin:0 0 18px;"><tr>${row('By door', bySource)}${row('By priority', byPriority)}${row('By page', byPage)}</tr></table>
    ${open.length ? `<p style="margin:0 0 6px;font:700 11px/1 monospace;letter-spacing:.16em;text-transform:uppercase;color:#C4160B;">Waiting on a call</p><table style="border-collapse:collapse;margin:0 0 16px;">${openRows}</table><p style="margin:0 0 14px;opacity:.7;">Mark each one called in your portal and it leaves this list.</p>` : ''}
    <p style="margin:0;"><a href="${SITE.url}/portal" style="display:inline-block;background:#F5B700;color:#161616;text-decoration:none;font-weight:700;padding:12px 20px;border:2px solid #161616;box-shadow:4px 4px 0 #161616;">Open your leads</a></p>
  </div>`;
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: `Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>`,
      to: p.notify.emails,
      cc: ['sarah@modernmustardseed.com'],
      replyTo: ['sarah@modernmustardseed.com'],
      subject: `${p.business}: ${week.length} ${week.length === 1 ? 'lead' : 'leads'} last week${open.length ? `, ${open.length} waiting on a call` : ''}`,
      html,
    });
    return true;
  } catch {
    return false;
  }
}
