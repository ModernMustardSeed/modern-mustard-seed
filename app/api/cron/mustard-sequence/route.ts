/**
 * Mustard Seed chat follow-up sequence.
 *
 * Runs daily via Vercel Cron. For each lead captured through the
 * Mustard Seed chatbot:
 *  - Day 2 (created between 36h and 60h ago): send Day 2 tactic email
 *  - Day 5 (created between 4d and 6d ago): send Day 5 bigger-picture email
 *
 * Dedup: we mark sent emails in the `notes` column with `[d2-sent]` /
 * `[d5-sent]` substrings.
 *
 * Auth: requires the standard Vercel cron secret (Authorization: Bearer …).
 */

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { sequenceDay2Email, sequenceDay5Email } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

type SequenceStep = 'd2' | 'd5';

async function processStep(step: SequenceStep): Promise<{ sent: number; errors: number; skipped: number }> {
  const client = getSupabase();
  if (!client) return { sent: 0, errors: 0, skipped: 0 };
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  // Day 2 window: 36h to 60h ago. Day 5 window: 96h to 144h ago.
  const now = Date.now();
  const range =
    step === 'd2'
      ? { gte: new Date(now - 60 * 3600 * 1000).toISOString(), lte: new Date(now - 36 * 3600 * 1000).toISOString() }
      : { gte: new Date(now - 144 * 3600 * 1000).toISOString(), lte: new Date(now - 96 * 3600 * 1000).toISOString() };

  const { data, error } = await client
    .from('leads')
    .select('id, name, email, notes, source, created_at')
    .eq('source', 'mustard-seed-chat')
    .gte('created_at', range.gte)
    .lte('created_at', range.lte);

  if (error || !data) return { sent: 0, errors: 1, skipped: 0 };

  const tag = step === 'd2' ? '[d2-sent]' : '[d5-sent]';
  let sent = 0;
  let errors = 0;
  let skipped = 0;

  for (const lead of data) {
    const notes = (lead.notes as string | null) ?? '';
    if (notes.includes(tag)) {
      skipped++;
      continue;
    }
    if (!lead.email || !lead.email.includes('@') || lead.email.includes('no-email@chat')) {
      skipped++;
      continue;
    }
    const firstName = (lead.name as string | null)?.split(' ')[0] || 'there';

    try {
      if (resend) {
        const html = step === 'd2' ? sequenceDay2Email(firstName) : sequenceDay5Email(firstName);
        const subject =
          step === 'd2'
            ? `${firstName}, one move you can make today.`
            : `${firstName}, here is what I would actually build.`;
        await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: lead.email,
          replyTo: 'sarah@modernmustardseed.com',
          subject,
          html,
        });
      }
      await client
        .from('leads')
        .update({ notes: `${notes}${notes ? ' ' : ''}${tag}` })
        .eq('id', lead.id);
      sent++;
    } catch (err) {
      console.error(`sequence ${step} failed for ${lead.email}`, err);
      errors++;
    }
  }

  return { sent, errors, skipped };
}

export async function GET(req: Request) {
  // Vercel Cron sends Authorization: Bearer ${CRON_SECRET}
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const d2 = await processStep('d2');
  const d5 = await processStep('d5');

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    d2,
    d5,
  });
}
