import type { SupabaseClient } from '@supabase/supabase-js';
import { resendClient } from '@/lib/send-email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

/**
 * WHEN SOMETHING BREAKS, SARAH HEARS ABOUT IT.
 *
 * Until now a failure in the Command Center went to `console.error` on a
 * serverless platform, which is a log nobody reads written in a place nobody
 * opens. The Operator failing, a token dying, the drainer stopping: all of it
 * silent, all of it discovered days later by a client, which is the most
 * expensive way for a studio to learn anything.
 *
 * THE TWO RULES THAT MAKE AN ALERT WORTH HAVING.
 *
 *   IT MUST NOT CRY WOLF. Every alert is deduplicated on its own key for a
 *   cooldown, so a thing that is broken for six hours sends one email and not
 *   seventy two. An alert channel that floods is an alert channel that gets a
 *   filter rule, and a filtered alert channel is no alert channel.
 *
 *   IT MUST SAY WHAT TO DO. "Error in posting publish" is a notification. "The
 *   Facebook token for Built Right stopped working; posts are waiting rather
 *   than going out; reconnect at this link" is an alert. The difference is
 *   whether the person reading it on a phone can act.
 *
 * Severity decides nothing technical. It decides the first word of the
 * subject, because that is what she sees on a lock screen.
 */

export type Severity = 'down' | 'broken' | 'watch';

const WORD: Record<Severity, string> = { down: 'DOWN', broken: 'BROKEN', watch: 'Watch' };

/** How long the same alert stays quiet after it has been sent once. */
const COOLDOWN_MINUTES: Record<Severity, number> = { down: 60, broken: 180, watch: 720 };

export type Alert = {
  /** Stable across repeats of the same problem: "operator:builtbyshan@gmail.com". */
  key: string;
  severity: Severity;
  /** One line. It is the subject, and often the whole thing she reads. */
  what: string;
  /** What is affected, in her words: whose desk, which feed. */
  where?: string;
  /** What to do, concretely. A link is better than a sentence. */
  doThis?: string;
  /** The technical detail, for when she opens it. */
  detail?: string;
};

/**
 * Send it, unless the same thing was sent recently.
 *
 * The cooldown lives in `app_state` rather than in memory, because the thing
 * sending these is a serverless function that forgets everything between
 * invocations, which is exactly how an hourly cron turns one broken token into
 * twenty four emails a day.
 */
export async function alert(sb: SupabaseClient | null, a: Alert): Promise<'sent' | 'quiet' | 'failed'> {
  const key = `alert:${a.key}`;
  const cooldownMs = COOLDOWN_MINUTES[a.severity] * 60_000;

  if (sb) {
    try {
      const { data } = await sb.from('app_state').select('value').eq('key', key).maybeSingle();
      const last = (data?.value as { at?: string } | null)?.at;
      if (last && Date.now() - Date.parse(last) < cooldownMs) return 'quiet';
    } catch {
      // A missing app_state row is not a reason to swallow an alert. Erring
      // towards sending is the right direction for this one function.
    }
  }

  const subject = `${WORD[a.severity]}: ${a.what}${a.where ? ` (${a.where})` : ''}`;
  const html = [
    '<div style="font:400 15px/1.6 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px">',
    `<p style="font:700 17px/1.3 -apple-system,sans-serif;margin:0 0 6px">${esc(a.what)}</p>`,
    a.where ? `<p style="margin:0 0 14px;color:#57606a">${esc(a.where)}</p>` : '',
    a.doThis ? `<p style="margin:0 0 14px;padding:12px;background:#FFFAEB;border-left:3px solid #F5B700"><strong>Do this:</strong> ${esc(a.doThis)}</p>` : '',
    a.detail ? `<pre style="margin:0 0 14px;padding:12px;background:#F7F8FA;border-radius:8px;white-space:pre-wrap;font:400 12px/1.5 ui-monospace,monospace;color:#57606a">${esc(a.detail.slice(0, 1500))}</pre>` : '',
    `<p style="margin:18px 0 0;font-size:13px;color:#8b949e">Sent once, then quiet for ${COOLDOWN_MINUTES[a.severity] >= 60 ? `${Math.round(COOLDOWN_MINUTES[a.severity] / 60)} hours` : `${COOLDOWN_MINUTES[a.severity]} minutes`} on this same problem. ${SITE.url}/admin</p>`,
    '</div>',
  ].join('');

  try {
    if (!process.env.RESEND_API_KEY) return 'failed';
    await resendClient().emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      subject,
      html,
      text: [a.what, a.where ?? '', a.doThis ? `Do this: ${a.doThis}` : '', a.detail ?? ''].filter(Boolean).join('\n\n'),
    });
  } catch {
    return 'failed';
  }

  if (sb) {
    try {
      await sb.from('app_state').upsert({ key, value: { at: new Date().toISOString(), what: a.what }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    } catch {
      /* the email went, which was the point */
    }
  }
  return 'sent';
}

/** Say plainly that something recovered, but only if it was reported broken. */
export async function recovered(sb: SupabaseClient | null, key: string, what: string): Promise<void> {
  if (!sb) return;
  try {
    const { data } = await sb.from('app_state').select('value').eq('key', `alert:${key}`).maybeSingle();
    if (!data) return;
    await sb.from('app_state').delete().eq('key', `alert:${key}`);
    if (!process.env.RESEND_API_KEY) return;
    await resendClient().emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      subject: `Fixed: ${what}`,
      html: `<div style="font:400 15px/1.6 -apple-system,Segoe UI,sans-serif;color:#161616"><p>${esc(what)} is working again. Nothing to do.</p></div>`,
      text: `${what} is working again. Nothing to do.`,
    });
  } catch {
    /* a missed all-clear is the least costly thing in this file */
  }
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
