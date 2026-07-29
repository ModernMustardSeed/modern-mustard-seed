import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { resendClient } from '@/lib/send-email';
import { clientEmail, p } from '@/lib/email';
import { getSupabase, insertLead } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';

const REF_PATTERN = /^MT[A-Z0-9]{6}$/;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function newRefCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = 'MT';
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

/**
 * Waitlist capture for THE MUSTARD TREE (the Founding Grove). Takes an email,
 * an optional one-sentence seed idea, and an optional ?ref= code from the
 * planter who shared the link. Assigns a planting number (queue position) and
 * a personal ref code, credits the referrer, records a CRM lead, confirms to
 * the requester, and pings Sarah. Capture fails OPEN: if the waitlist table is
 * unreachable we still record the lead and return ok without a number.
 */
export async function POST(req: Request) {
  let payload: { email?: unknown; idea?: unknown; ref?: unknown; company?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@') || email.length > 200) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  const idea = typeof payload.idea === 'string' && payload.idea.trim() ? payload.idea.trim().slice(0, 200) : null;
  const rawRef = typeof payload.ref === 'string' ? payload.ref.trim().toUpperCase() : '';
  const referredBy = REF_PATTERN.test(rawRef) ? rawRef : null;
  const firstName = email.split('@')[0];

  let number: number | null = null;
  let code: string | null = null;
  let already = false;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('mustard_tree_waitlist')
        .select('ref_code, created_at')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        already = true;
        code = existing.ref_code;
        const { count } = await supabase
          .from('mustard_tree_waitlist')
          .select('id', { count: 'exact', head: true })
          .lte('created_at', existing.created_at);
        number = count ?? null;
      } else {
        let inserted: { ref_code: string; created_at: string } | null = null;
        for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
          const candidate = newRefCode();
          const { data, error } = await supabase
            .from('mustard_tree_waitlist')
            .insert({ email, seed_idea: idea, ref_code: candidate, referred_by: referredBy })
            .select('ref_code, created_at')
            .single();
          if (!error && data) inserted = data;
          // 23505 = unique violation. A duplicate ref_code retries; a duplicate
          // email (double-click race) falls through to the fail-open path.
          else if (error && !`${error.code}`.includes('23505')) break;
        }
        if (inserted) {
          code = inserted.ref_code;
          const { count } = await supabase
            .from('mustard_tree_waitlist')
            .select('id', { count: 'exact', head: true })
            .lte('created_at', inserted.created_at);
          number = count ?? null;
          if (referredBy) {
            const { error: rpcError } = await supabase.rpc('increment_mustard_tree_referral', { code: referredBy });
            if (rpcError) console.warn('mustard-tree referral bump', rpcError);
          }
        }
      }
    } catch (e) {
      console.error('mustard-tree waitlist table', e);
    }
  }

  // CRM inbox record (best-effort, never blocks the response).
  try {
    await insertLead({
      type: 'contact',
      email,
      idea_description: idea,
      industry: 'mustard-tree',
      source: 'mustard-tree-waitlist',
      message: `MUSTARD TREE Founding Grove${number != null ? `, planting no. ${number}` : ''}${referredBy ? `, referred by ${referredBy}` : ''}${idea ? `. Seed: ${idea}` : '. No seed given.'}`,
    });
  } catch (e) {
    console.error('mustard-tree insertLead', e);
  }

  // Confirm to the requester + notify Sarah (best-effort).
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = resendClient();
    const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

    if (AUDIENCE_ID) {
      try {
        await resend.contacts.create({ email, unsubscribed: false, audienceId: AUDIENCE_ID });
      } catch (e) {
        console.warn('mustard-tree audience add', e);
      }
    }

    const shareUrl = code ? `${SITE.url}/mustard-tree?ref=${code}` : `${SITE.url}/mustard-tree`;
    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject:
          number != null ? `Your seed is in the ground: planting no. ${number}` : 'Your seed is in the ground',
        html: clientEmail({
          preheader: 'The Mustard Tree: one sentence in, a whole business out. You are in the Founding Grove.',
          greeting: `Hi ${firstName},`,
          body:
            p(
              `You are in the Founding Grove${number != null ? ` at planting no. ${number}` : ''}. The Mustard Tree takes one sentence about the business you want and grows the whole thing: plan, brand, store, site, books, and marketing, with a staff of six AI agents that keeps it growing after launch.`
            ) +
            p(
              idea
                ? `Your seed is saved: &ldquo;${escapeHtml(idea)}&rdquo;. When plantings open, yours is already loaded.`
                : 'Plantings open in cohorts, in Grove order. Founding pricing is announced to the Grove first, and every plan will be hard-capped, so no surprise bills, ever.'
            ) +
            p(
              `Every founder you bring moves you up 10 spots. Your planting link: <a href="${shareUrl}">${shareUrl}</a>`
            ),
          cta: { label: 'See The Mustard Tree', url: `${SITE.url}/mustard-tree` },
          secondary: { label: 'Meet the studio', url: `${SITE.url}/about` },
        }),
      });
    } catch (e) {
      console.error('mustard-tree requester email', e);
    }

    try {
      await resend.emails.send({
        from: 'Mustard Tree Grove <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        subject: `New Grove planting${number != null ? ` no. ${number}` : ''}: ${firstName}`,
        html: `<p>New Mustard Tree waitlist signup.</p>
<ul>
  <li><strong>Email:</strong> ${escapeHtml(email)}</li>
  <li><strong>Planting no.:</strong> ${number != null ? number : 'unknown (table unreachable)'}</li>
  <li><strong>Seed:</strong> ${idea ? escapeHtml(idea) : 'not given'}</li>
  <li><strong>Referred by:</strong> ${referredBy ? escapeHtml(referredBy) : 'nobody'}</li>
</ul>`,
      });
    } catch (e) {
      console.warn('mustard-tree notify', e);
    }
  }

  return NextResponse.json({ ok: true, number, code, already });
}
