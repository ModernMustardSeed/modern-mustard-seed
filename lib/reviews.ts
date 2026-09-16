import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientProject } from '@/lib/client-leads';
import { resendClient } from '@/lib/send-email';
import { sendSms, toE164 } from '@/lib/sms';

/**
 * ONE REVIEW ASK, from the business, Google first. Used by the portal card
 * and by the guide when the owner says "ask the Millers for a review".
 * Every ask is logged so nobody is asked twice by accident.
 */
export type ReviewAskInput = { name: string; email?: string | null; phone?: string | null; project?: string | null; note?: string | null };
export type ReviewAskResult = { ok: boolean; sent_email: boolean; sent_sms: boolean; error: string | null };

export async function sendReviewAsk(sb: SupabaseClient, project: ClientProject, clientEmail: string, input: ReviewAskInput): Promise<ReviewAskResult> {
  const name = (input.name ?? '').trim().slice(0, 120);
  const email = (input.email ?? '').trim().toLowerCase().slice(0, 200) || null;
  const phone = (input.phone ?? '').trim().slice(0, 40) || null;
  const which = (input.project ?? '').trim().slice(0, 160) || null;
  const note = (input.note ?? '').trim().slice(0, 600);
  if (!name) return { ok: false, sent_email: false, sent_sms: false, error: 'Their name, at least.' };
  if (!email && !phone) return { ok: false, sent_email: false, sent_sms: false, error: 'An email or a mobile number to send it to.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, sent_email: false, sent_sms: false, error: 'That email does not look right.' };

  const first = name.split(/\s+/)[0];
  const google = project.reviews.find((r) => r.key === 'google');
  const others = project.reviews.filter((r) => r.key !== 'google');
  const owner = project.notify.emails[0] ?? 'sarah@modernmustardseed.com';
  const thanks = note || `Thank you for building with us${which ? ` on ${which}` : ''}. It meant a lot to be trusted with your home.`;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const result: ReviewAskResult = { ok: false, sent_email: false, sent_sms: false, error: null };

  if (email) {
    try {
      const resend = resendClient();
      const sent = await resend.emails.send({
        from: `${project.business} <sarah@modernmustardseed.com>`,
        to: [email],
        replyTo: [owner],
        subject: `A quick favor from ${project.business}`,
        html: `<div style="font:400 16px/1.6 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;"><p>${esc(first)},</p><p>${esc(thanks)}</p><p>If you have two minutes, a review helps the next family find us. Google matters most:</p><p><a href="${google?.url ?? '#'}" style="display:inline-block;background:#48603c;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Leave a Google review</a></p>${others.length ? `<p style="opacity:.75;">If you would rather: ${others.map((r) => `<a href="${r.url}" style="color:#9b4f2f;">${esc(r.label)}</a>`).join(' or ')}</p>` : ''}<p>Thank you,<br>Shan and Carmen, ${esc(project.business)}<br>${esc(project.phone)}</p></div>`,
        text: [`${first},`, '', thanks, '', 'If you have two minutes, a review helps the next family find us. Google matters most:', google?.url ?? '', '', others.length ? `If you would rather: ${others.map((r) => `${r.label} ${r.url}`).join(' or ')}` : '', '', 'Thank you,', `Shan and Carmen, ${project.business}`, project.phone].join('\n'),
      });
      result.sent_email = !sent.error;
      if (sent.error) result.error = sent.error.message;
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }
  }
  if (phone && toE164(phone)) {
    const sms = await sendSms(phone, `${first}, thank you for building with ${project.business}. If you have two minutes, a Google review helps the next family find us: ${google?.url ?? ''} Shan and Carmen`);
    result.sent_sms = sms.ok;
    if (!sms.ok && !result.sent_email) result.error = sms.error ?? 'The text did not send.';
  }
  result.ok = result.sent_email || result.sent_sms;
  await sb.from('client_review_requests').insert({ client_email: clientEmail, name, email, phone, project: which, sent_email: result.sent_email, sent_sms: result.sent_sms, error: result.error });
  return result;
}
