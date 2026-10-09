/**
 * THE FRONT DESK REPORT.
 *
 * A hand-built front desk agent (a law office, a clinic, anywhere the caller's
 * details matter more than a booking) does its filing after the call, not
 * during it. The agent has a good conversation, Vapi's analysis pulls the
 * intake out of the transcript, and the end-of-call report becomes one email
 * the office can act on without listening to the recording: who called, how to
 * reach them, what it is about, who is on the other side, and whether it cannot
 * wait.
 *
 * Why after the call and not a tool on it: every tool is a live failure mode
 * with a caller on the line, and a mid-call "send" is one more thing that can
 * stall the conversation. The report arrives within a minute of the hang-up,
 * which is sooner than any human receptionist's message slip.
 *
 * Who it is for comes from the assistant's own metadata (`deskReport`), set in
 * the config we commit. A request that reaches this code has already passed the
 * shared secret, so the metadata is ours.
 */

import { escape } from '@/lib/email';

type Json = Record<string, unknown>;

export type DeskReportMeta = {
  /** The business as the email names it: "Vann Law Firm". */
  business: string;
  /** Who is answering, for the sign-off line: "Kelsey, the front desk". */
  desk?: string;
  /** Extra recipients beyond the studio's own notify list. */
  notifyTo?: string[];
  /** Brand ink for the header rule, a hex colour. */
  accent?: string;
  /** True on a demo, so the subject says so and nobody mistakes it for a client. */
  demo?: boolean;
};

export type Intake = {
  caller_name?: string;
  callback_number?: string;
  email?: string;
  caller_type?: string;
  matter_type?: string;
  county?: string;
  opposing_party?: string;
  other_parties?: string;
  deadline?: string;
  urgent?: boolean;
  urgent_reason?: string;
  in_custody?: boolean;
  summary_for_attorney?: string;
  asked_for?: string;
  wants_consultation?: boolean;
  best_time_to_call?: string;
  referral_source?: string;
  existing_client?: boolean;
};

export type DeskReport = {
  subject: string;
  html: string;
  text: string;
  urgent: boolean;
  /** False when nobody spoke and there is no number to call back: nothing to act on. */
  worthSending: boolean;
};

const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i;
const HEX = /^#[0-9a-f]{6}$/i;

/** The deskReport block off the assistant that took the call, or null if it has none. */
export function deskMetaFrom(message: Json): DeskReportMeta | null {
  const assistant = obj(message.assistant);
  const call = obj(message.call);
  const meta = obj(obj(assistant.metadata).deskReport ?? obj(obj(call.metadata).deskReport));
  const business = str(meta.business);
  if (!business) return null;
  const notifyTo = Array.isArray(meta.notifyTo)
    ? (meta.notifyTo as unknown[]).map(str).filter((a) => EMAIL.test(a)).slice(0, 5)
    : [];
  const accent = str(meta.accent);
  return {
    business,
    desk: str(meta.desk) || undefined,
    notifyTo,
    accent: HEX.test(accent) ? accent : undefined,
    demo: meta.demo === true,
  };
}

/** Ten digits as (406) 555-0123, or the input untouched if it is not a US number. */
export function prettyPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw;
}

function telHref(raw: string): string | null {
  const d = raw.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `tel:+1${d}` : null;
}

function duration(seconds: number | null): string {
  if (!seconds || seconds < 1) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m} min ${s} sec` : `${s} sec`;
}

function whenMountain(iso: string | null, timeZone: string): string {
  const t = iso ? Date.parse(iso) : NaN;
  const d = Number.isFinite(t) ? new Date(t) : new Date();
  return d.toLocaleString('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Strip any dash a model slipped in, so the office never reads one of ours. */
function clean(s: string): string {
  return s.replace(/\s*[\u2013\u2014]\s*/g, ', ').trim();
}

/**
 * `listenUrl` is where the recording can actually be played. Vapi's own
 * recordingUrl sits in private storage on this org and answers a browser with
 * a 400, so the email links the call log, which streams it through the API.
 */
export function buildDeskReport(
  message: Json,
  meta: DeskReportMeta,
  opts: { listenUrl?: string | null; timeZone?: string } = {},
): DeskReport {
  const timeZone = opts.timeZone ?? 'America/Denver';
  const listenUrl = opts.listenUrl ?? null;
  const call = obj(message.call);
  const artifact = { ...obj(call.artifact), ...obj(message.artifact) };
  const analysis = { ...obj(call.analysis), ...obj(message.analysis) };
  const intake = obj(analysis.structuredData) as Intake;
  const customer = { ...obj(call.customer), ...obj(message.customer) };

  const summary = clean(str(analysis.summary) || str(message.summary));
  const transcript = str(artifact.transcript) || str(message.transcript);
  const callerId = str(customer.number);
  const seconds = Number(message.durationSeconds ?? call.durationSeconds ?? 0) || null;
  const ended = str(message.endedReason) || str(call.endedReason);
  const startedAt = str(message.startedAt) || str(call.startedAt) || null;
  const isWeb = !callerId;

  const messages = Array.isArray(artifact.messages) ? (artifact.messages as Json[]) : [];
  const callerSpoke = messages.some((m) => m.role === 'user' && str(m.message)) || /\bUser:/i.test(transcript);

  const name = clean(str(intake.caller_name)) || 'Caller did not give a name';
  const callback = str(intake.callback_number) || callerId;
  const matter = clean(str(intake.matter_type)) || 'Not stated';
  const custody = intake.in_custody === true;
  const urgent = intake.urgent === true || custody;

  const tag = meta.demo ? ' (demo)' : '';
  const subject = !callerSpoke
    ? `${meta.business}${tag}: missed call from ${callerId ? prettyPhone(callerId) : 'a web caller'}`
    : `${urgent ? 'URGENT · ' : ''}${meta.business}${tag}: ${name === 'Caller did not give a name' ? 'new caller' : name} · ${matter}`;

  type Row = { label: string; value: string; href?: string; strong?: boolean };
  const rows: Row[] = [];
  const push = (label: string, value: unknown, extra: Partial<Row> = {}) => {
    const v = typeof value === 'string' ? clean(value) : '';
    if (v) rows.push({ label, value: v, ...extra });
  };
  push('Caller', name === 'Caller did not give a name' ? '' : name, { strong: true });
  if (callback) push('Call back', prettyPhone(callback), { href: telHref(callback) ?? undefined, strong: true });
  if (callerId && callback && callerId.replace(/\D/g, '').slice(-10) !== callback.replace(/\D/g, '').slice(-10)) {
    push('Caller ID', prettyPhone(callerId), { href: telHref(callerId) ?? undefined });
  }
  if (str(intake.email)) push('Email', str(intake.email), { href: `mailto:${str(intake.email)}` });
  push('Best time', str(intake.best_time_to_call));
  push('Who they are', str(intake.caller_type));
  if (intake.existing_client === true) push('Existing client', 'Yes');
  push('Matter', matter === 'Not stated' ? '' : matter, { strong: true });
  push('County', str(intake.county));
  push('Other side', str(intake.opposing_party), { strong: true });
  push('Also involved', str(intake.other_parties));
  push('Deadline or court date', str(intake.deadline), { strong: true });
  push('Asked for', str(intake.asked_for));
  if (intake.wants_consultation === true) push('Consultation', 'Wants to set one up');
  push('Found us through', str(intake.referral_source));

  const banner = urgent
    ? clean(
        custody
          ? `In custody. ${str(intake.urgent_reason)}`
          : str(intake.urgent_reason) || 'The caller described something that cannot wait.',
      )
    : '';
  const forAttorney = clean(str(intake.summary_for_attorney)) || summary;
  const conflict = str(intake.opposing_party)
    ? `Run conflicts on ${clean(str(intake.opposing_party))}${str(intake.other_parties) ? ` and ${clean(str(intake.other_parties))}` : ''} before anyone calls back.`
    : '';

  const accent = meta.accent ?? '#1F3A5F';
  const ink = '#1A1A1A';
  const muted = '#6B6B6B';
  const rule = '#E4E1DA';
  const SERIF = "Georgia, 'Times New Roman', serif";
  const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

  const rowHtml = rows
    .map(
      // Label over value, one cell: a fixed label column cannot shrink, and on
      // a phone it pushed the whole card past the screen edge.
      (r) => `<tr><td style="padding:10px 0;border-bottom:1px solid ${rule};word-break:break-word">
  <div style="font-family:${SANS};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${muted};font-weight:700">${escape(r.label)}</div>
  <div style="margin-top:3px;font-family:${SANS};font-size:15px;line-height:1.5;color:${ink};${r.strong ? 'font-weight:600;' : ''}">${
    r.href ? `<a href="${escape(r.href)}" style="color:${accent};text-decoration:none">${escape(r.value)}</a>` : escape(r.value)
  }</div>
</td></tr>`,
    )
    .join('');

  const lines = transcript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^(AI|User|Assistant|Bot):\s*(.*)$/i.exec(l);
      if (!m) return `<p style="margin:0 0 8px">${escape(l)}</p>`;
      const who = /^user$/i.test(m[1]) ? 'Caller' : meta.desk ? meta.desk.split(',')[0] : 'Front desk';
      return `<p style="margin:0 0 8px"><span style="font-weight:700;color:${/^user$/i.test(m[1]) ? ink : accent}">${escape(who)}:</span> ${escape(m[2])}</p>`;
    })
    .join('');

  const metaParts = [whenMountain(startedAt, timeZone), duration(seconds), isWeb ? 'web call' : `from ${prettyPhone(callerId)}`].filter(Boolean);
  const meta1 = metaParts.join(' · ');
  // Each piece stays whole, so a phone never breaks a number across two lines.
  const meta1Html = metaParts.map((m) => `<span style="white-space:nowrap">${escape(m)}</span>`).join(' · ');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F2EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2EE"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FFFFFF;border-top:4px solid ${accent}">
<tr><td style="padding:28px 28px 8px">
  <div style="font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${muted};font-weight:700">${escape(meta.business)} · Phone intake${meta.demo ? ' · Demo' : ''}</div>
  <div style="font-family:${SERIF};font-size:26px;line-height:1.25;color:${ink};margin-top:8px">${escape(callerSpoke ? (name === 'Caller did not give a name' ? 'A new caller' : name) : 'Missed call')}</div>
  <div style="font-family:${SANS};font-size:13px;color:${muted};margin-top:6px">${meta1Html}</div>
</td></tr>
${
  banner
    ? `<tr><td style="padding:16px 28px 0"><div style="background:#FBEAEA;border-left:4px solid #A32020;padding:12px 14px;font-family:${SANS};font-size:15px;line-height:1.5;color:#5A1010"><strong>Needs attention today.</strong> ${escape(banner)}</div></td></tr>`
    : ''
}
${
  forAttorney
    ? `<tr><td style="padding:18px 28px 0"><div style="font-family:${SERIF};font-size:17px;line-height:1.6;color:${ink}">${escape(forAttorney)}</div></td></tr>`
    : ''
}
${
  rows.length
    ? `<tr><td style="padding:14px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${rule}">${rowHtml}</table></td></tr>`
    : ''
}
${
  conflict
    ? `<tr><td style="padding:12px 28px 0"><div style="border:1px solid ${rule};padding:10px 14px;font-family:${SANS};font-size:13px;line-height:1.5;color:${ink}"><strong>Conflict check.</strong> ${escape(conflict)}</div></td></tr>`
    : ''
}
${
  listenUrl
    ? `<tr><td style="padding:20px 28px 0"><a href="${escape(listenUrl)}" style="display:inline-block;background:${accent};color:#FFFFFF;font-family:${SANS};font-size:14px;font-weight:600;text-decoration:none;padding:11px 18px">Listen to the call</a></td></tr>`
    : ''
}
${
  lines
    ? `<tr><td style="padding:24px 28px 0"><div style="font-family:${SANS};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${muted};font-weight:700;margin-bottom:10px">Transcript</div><div style="font-family:${SANS};font-size:13px;line-height:1.55;color:#3A3A3A">${lines}</div></td></tr>`
    : ''
}
<tr><td style="padding:22px 28px 26px"><div style="border-top:1px solid ${rule};padding-top:12px;font-family:${SANS};font-size:12px;line-height:1.5;color:${muted}">Confidential. Written for ${escape(meta.business)} only; please do not forward. Taken by ${escape(meta.desk ?? 'the front desk')}, the AI receptionist.${ended ? ` Call ended: ${escape(ended.replace(/-/g, ' '))}.` : ''}</div></td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    subject,
    meta1,
    banner ? `NEEDS ATTENTION TODAY: ${banner}` : '',
    forAttorney,
    ...rows.map((r) => `${r.label}: ${r.value}`),
    conflict,
    listenUrl ? `Recording: ${listenUrl}` : '',
    transcript ? `\nTranscript\n${transcript}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text, urgent, worthSending: callerSpoke || Boolean(callerId) };
}
