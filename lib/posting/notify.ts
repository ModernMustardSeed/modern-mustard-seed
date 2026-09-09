/**
 * WHO HEARS WHAT.
 *   Sarah: the hand-post sheet each morning (copy-ready words and the image
 *   for every platform without an API), and a line the moment an API post
 *   fails. Never a "went fine" email; the desk shows that.
 *   The client: one weekly note on Monday with what went out and where.
 */
import { resendClient } from '@/lib/send-email';
import { SITE } from '@/lib/seo';
import { PLATFORM_LABEL, type Platform, type PostRow, type SettingsRow } from './types';
import { prettyDate } from './time';

const SARAH = 'sarah@modernmustardseed.com';
const FROM = 'Modern Mustard Seed <sarah@modernmustardseed.com>';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function para(s: string): string {
  return esc(s).replace(/\n{2,}/g, '</p><p style="margin:0 0 12px;">').replace(/\n/g, '<br>');
}

/** The morning sheet: everything a person has to paste today. */
export async function sendHandPostSheet(s: SettingsRow, post: PostRow, platforms: Platform[]): Promise<boolean> {
  if (!platforms.length) return false;
  const resend = resendClient();
  const desk = `${SITE.url}/admin/posting?client=${encodeURIComponent(s.client_email)}`;
  const blocks = platforms
    .map((p) => {
      const text = post.captions[p] ?? post.captions.facebook ?? '';
      return `<div style="border:2px solid #161616;border-radius:12px;padding:14px 16px;margin:0 0 14px;">
        <p style="margin:0 0 6px;font:700 11px/1 monospace;letter-spacing:.2em;text-transform:uppercase;color:#C4160B;">${PLATFORM_LABEL[p]}</p>
        <p style="margin:0 0 12px;">${para(text)}</p>
        <p style="margin:0;font:12px/1.4 monospace;color:#161616;opacity:.6;">Mark it posted on the desk when it is up.</p>
      </div>`;
    })
    .join('');
  const html = `<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;">
    <p style="margin:0 0 14px;"><strong>${esc(s.business_name)}</strong>, ${esc(prettyDate(post.scheduled_for))}. ${platforms.length === 1 ? 'One platform' : `${platforms.length} platforms`} to post by hand today${post.headline ? `: ${esc(post.headline)}` : ''}.</p>
    ${post.image_url ? `<p style="margin:0 0 14px;"><a href="${post.image_url}"><img src="${post.image_url}" alt="" style="max-width:100%;border:2px solid #161616;border-radius:12px;"></a><br><a href="${post.image_url}" style="color:#C4380C;">Open the image</a> (right click, save)</p>` : ''}
    ${blocks}
    <p style="margin:18px 0 0;"><a href="${desk}" style="display:inline-block;background:#F5B700;color:#161616;text-decoration:none;font-weight:700;padding:12px 20px;border:2px solid #161616;box-shadow:4px 4px 0 #161616;">Open the posting desk</a></p>
  </div>`;
  try {
    await resend.emails.send({
      from: FROM,
      to: [SARAH],
      subject: `Hand-post today: ${s.business_name} (${platforms.map((p) => PLATFORM_LABEL[p]).join(', ')})`,
      html,
    });
    return true;
  } catch {
    return false;
  }
}

/** One line to Sarah when an API post did not go. */
export async function sendFailureNote(s: SettingsRow, post: PostRow, failed: Array<{ platform: Platform; error: string }>): Promise<void> {
  if (!failed.length) return;
  const resend = resendClient();
  const desk = `${SITE.url}/admin/posting?client=${encodeURIComponent(s.client_email)}`;
  const lines = failed.map((f) => `<li><strong>${PLATFORM_LABEL[f.platform]}</strong>: ${esc(f.error)}</li>`).join('');
  try {
    await resend.emails.send({
      from: FROM,
      to: [SARAH],
      subject: `Post did not go: ${s.business_name}, ${prettyDate(post.scheduled_for)}`,
      html: `<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;"><p style="margin:0 0 12px;">The ${esc(prettyDate(post.scheduled_for))} post for ${esc(s.business_name)} failed on:</p><ul style="margin:0 0 14px;padding-left:20px;">${lines}</ul><p style="margin:0;"><a href="${desk}" style="color:#C4380C;">Open the desk</a> to retry or paste it by hand.</p></div>`,
    });
  } catch {
    /* the desk still shows the failure */
  }
}

/** The stall alarm: a client with connected accounts and nothing out by late morning. */
export async function sendStallNote(s: SettingsRow, reason: string): Promise<void> {
  const resend = resendClient();
  try {
    await resend.emails.send({
      from: FROM,
      to: [SARAH],
      subject: `Nothing posted today: ${s.business_name}`,
      html: `<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;"><p style="margin:0 0 12px;">${esc(s.business_name)} has no post out today. ${esc(reason)}</p><p style="margin:0;"><a href="${SITE.url}/admin/posting?client=${encodeURIComponent(s.client_email)}" style="color:#C4380C;">Open the desk</a>.</p></div>`,
    });
  } catch {
    /* nothing else to do */
  }
}

/** Monday note to the client: what went out last week, with links. */
export async function sendWeeklySummary(s: SettingsRow, posts: PostRow[], leads: number): Promise<boolean> {
  const to = s.notify_emails.length ? s.notify_emails : [s.client_email];
  const resend = resendClient();
  const rows = posts
    .map((p) => {
      const live = (Object.keys(p.results) as Platform[]).filter((k) => p.results[k]?.ok);
      const links = live
        .map((k) => {
          const r = p.results[k];
          return r?.url ? `<a href="${r.url}" style="color:#C4380C;">${PLATFORM_LABEL[k]}</a>` : PLATFORM_LABEL[k];
        })
        .join(', ');
      return `<tr><td style="padding:6px 10px 6px 0;white-space:nowrap;vertical-align:top;">${esc(prettyDate(p.scheduled_for).replace(/^\w+, /, ''))}</td><td style="padding:6px 0;vertical-align:top;"><strong>${esc(p.headline ?? 'Post')}</strong><br><span style="opacity:.7;">${links || 'Not posted'}</span></td></tr>`;
    })
    .join('');
  const portal = `${SITE.url}/portal/posting`;
  const html = `<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;">
    <p style="margin:0 0 14px;">Last week for ${esc(s.business_name)}: ${posts.filter((p) => ['published', 'partial'].includes(p.status)).length} posts went out${leads ? `, and ${leads} ${leads === 1 ? 'lead' : 'leads'} came in through the site` : ''}.</p>
    <table style="border-collapse:collapse;width:100%;margin:0 0 16px;">${rows}</table>
    <p style="margin:0 0 14px;">Drop this week's photos in the portal and they go out first; with none, the feed still posts every day.</p>
    <p style="margin:0;"><a href="${portal}" style="display:inline-block;background:#F5B700;color:#161616;text-decoration:none;font-weight:700;padding:12px 20px;border:2px solid #161616;box-shadow:4px 4px 0 #161616;">Open your posting calendar</a></p>
    <p style="margin:22px 0 0;">Sarah<br><a href="mailto:${SARAH}" style="color:#C4380C;">${SARAH}</a></p>
  </div>`;
  try {
    await resend.emails.send({ from: `Sarah at Modern Mustard Seed <${SARAH}>`, to, replyTo: [SARAH], subject: `${s.business_name}: last week's posts`, html });
    return true;
  } catch {
    return false;
  }
}
