import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { clientEmail, p } from '@/lib/email';
import { getSupabase, insertLead } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { CELEBRATE_LAUNCH, daysToLaunch, type CelebrateAudience } from '@/data/celebrate';
import { saveWaitlistEntry } from '@/lib/celebrate-store';

export const runtime = 'nodejs';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const str = (v: unknown, max: number): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};

/**
 * Waitlist capture for CELEBRATE (gifting on autopilot), which does not open
 * until CELEBRATE_LAUNCH. Takes an email, an optional business or family name,
 * an optional city, which lane they are in (team or family), and the parade
 * they built, then does four things:
 *
 *   1. Writes the machine record (lib/celebrate-store.ts) that the pre-launch
 *      drip runs from. This is the one that must not fail silently, so it is
 *      first and its failure is surfaced.
 *   2. Writes the lead row so the person shows up in Sarah's pipeline.
 *   3. Confirms to the requester with the real countdown in the letter.
 *   4. Pings Sarah.
 *
 * Steps 2 through 4 are best-effort. As long as the person is captured we
 * return ok, because a Resend outage must never look like a broken form.
 */
export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const rawEmail = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!rawEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawEmail)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  // Stored lower case everywhere so the drip's terminal-lead check and the
  // waitlist key both match on one spelling of the same person.
  const email = rawEmail.toLowerCase();

  const business = str(payload.business, 120);
  const city = str(payload.city, 80);
  const audience: CelebrateAudience = payload.audience === 'family' ? 'family' : 'team';
  const surface = payload.surface === 'parade' ? 'parade' : 'countdown';
  const people = Array.isArray(payload.people)
    ? payload.people
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .slice(0, 24)
        .map((x) => x.slice(0, 80))
    : [];

  const firstName = email.split('@')[0];
  const days = daysToLaunch(Date.now());

  // 1) The machine record the drip runs from.
  const sb = getSupabase();
  let isNew = true;
  if (sb) {
    try {
      const saved = await saveWaitlistEntry(sb, { email, business, audience, city, people, surface });
      isNew = saved.isNew;
    } catch (e) {
      console.error('celebrate waitlist store', e);
    }
  }

  // 2) The pipeline record. Skipped on a repeat signup so the inbox does not
  //    fill with the same person joining twice from two surfaces.
  if (isNew) {
    try {
      await insertLead({
        type: 'contact',
        email,
        business_name: business,
        industry: 'celebrate',
        source: `celebrate-waitlist-${audience}`,
        message: [
          `CELEBRATE waitlist (${audience}, via ${surface}). Opens in ${days} days.`,
          city ? `City: ${city}.` : null,
          people.length > 0 ? `Parade (${people.length}): ${people.join(' | ')}` : 'No parade built.',
        ]
          .filter(Boolean)
          .join(' '),
      });
    } catch (e) {
      console.error('celebrate insertLead', e);
    }
  }

  // 3) + 4) Mail, best-effort.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && isNew) {
    const resend = resendClient();
    const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

    if (AUDIENCE_ID) {
      try {
        await resend.contacts.create({ email, unsubscribed: false, audienceId: AUDIENCE_ID });
      } catch (e) {
        console.warn('celebrate audience add', e);
      }
    }

    const countdown =
      days > 0
        ? `Celebrate opens ${CELEBRATE_LAUNCH.label} at ${CELEBRATE_LAUNCH.timeLabel}, which is ${days} ${days === 1 ? 'day' : 'days'} from now.`
        : `Celebrate is open. The founding route is running in ${CELEBRATE_LAUNCH.city}.`;

    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: days > 0 ? `You are on the parade route (${days} days)` : 'You are on the parade route',
        html: clientEmail({
          preheader: 'Celebrate: real cakes, fresh flowers, and handwritten cards on autopilot, from local shops.',
          eyebrow: 'CELEBRATE',
          greeting: `Hi ${firstName},`,
          body:
            p(countdown) +
            p(
              people.length > 0
                ? `Your parade is saved: ${people.length} ${people.length === 1 ? 'person' : 'people'} who will never go uncelebrated. Your year is already loaded, so on opening day you confirm a budget and the route starts running.`
                : 'You are on the waitlist. Load your people once, set a budget, and real cakes, fresh flowers, and handwritten cards from local shops go out on every date that matters.'
            ) +
            p(
              audience === 'family'
                ? 'The family lane opens with the business plans, on the same founding route and the same local bakeries and florists. Waitlist spots are seated first, in the order you joined.'
                : 'Waitlist accounts are seated first, in the order you joined, and the founding rate is held for everyone on this list. If you want your team or your best clients celebrated before the public doors open, corporate pilots are running now on the founding route.'
            ) +
            p(
              'Between now and opening day you will hear from me a handful of times, never more than once every three days, and one click ends it for good.'
            ),
          cta:
            audience === 'family'
              ? { label: 'Build your parade', url: `${SITE.url}/celebrate#parade` }
              : { label: 'Book a corporate pilot', url: `${SITE.url}/book` },
          secondary: { label: 'See the countdown', url: `${SITE.url}/celebrate` },
        }),
      });
    } catch (e) {
      console.error('celebrate requester email', e);
    }

    try {
      await resend.emails.send({
        from: 'Celebrate Waitlist <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `New Celebrate waitlist (${audience}): ${firstName}${business ? ` (${business})` : ''}`,
        html: `<p>New Celebrate waitlist signup, ${days} days before launch.</p>
<ul>
  <li><strong>Email:</strong> ${escapeHtml(email)}</li>
  <li><strong>Lane:</strong> ${escapeHtml(audience)}</li>
  <li><strong>Name:</strong> ${business ? escapeHtml(business) : 'not given'}</li>
  <li><strong>City:</strong> ${city ? escapeHtml(city) : 'not given'}</li>
  <li><strong>Captured on:</strong> ${escapeHtml(surface)}</li>
  <li><strong>Parade:</strong> ${people.length > 0 ? escapeHtml(people.join(' | ')) : 'none built'}</li>
</ul>`,
      });
    } catch (e) {
      console.warn('celebrate notify', e);
    }
  }

  return NextResponse.json({ ok: true });
}
