import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { googleReviewUrl } from '@/data/socials';
import { reviewRequestEmail } from '@/lib/email';

/**
 * Ask a delivered client for a review, exactly once. Deduped via
 * projects.review_requested_at, so balance-paid and project-launched can both
 * call this and the client is only emailed a single time.
 */
export async function sendReviewNudge({ email, name }: { email?: string | null; name?: string | null }): Promise<void> {
  if (!email) return;
  const supabase = getSupabase();
  if (!supabase || !process.env.RESEND_API_KEY) return;
  const addr = email.toLowerCase().trim();

  try {
    // Already nudged for any of this client's projects? Stop.
    const { data: projects } = await supabase
      .from('projects')
      .select('id, review_requested_at')
      .ilike('client_email', addr);
    if (projects && projects.some((p) => p.review_requested_at)) return;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: 'Your build is live. A quick favor?',
      html: reviewRequestEmail({
        toName: name || undefined,
        reviewUrl: process.env.GOOGLE_REVIEW_URL || googleReviewUrl,
        portalUrl: `${SITE.url}/portal`,
      }),
    });

    // Mark all of the client's projects so we never ask twice.
    if (projects && projects.length) {
      await supabase.from('projects').update({ review_requested_at: new Date().toISOString() }).ilike('client_email', addr);
    }
  } catch (err) {
    console.error('sendReviewNudge failed', err);
  }
}
