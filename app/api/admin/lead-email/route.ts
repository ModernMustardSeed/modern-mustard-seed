import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { LlmUnavailable } from '@/lib/llm';
import { isLeadSource, loadComposeSubject, sendComposedEmail, suggestEmail } from '@/lib/lead-compose';

export const runtime = 'nodejs';
// The suggestion waits on the LLM, which on this deployment means waiting on a
// drainer to pick the job up. 120s leaves room over lib/lead-compose's 100s
// timeout so a slow draft comes back as a draft rather than as a dead request.
export const maxDuration = 120;

/**
 * ONE EMAIL, TO ONE LEAD, FROM ANY SCREEN.
 *
 * GET  ?source=&id=            what we know, what the last interaction was, and
 *                              whether we are allowed to mail them at all.
 * POST { action: 'suggest' }   a draft written from that last interaction,
 *                              steered by `instruction`.
 * POST { action: 'send' }      send exactly the subject and body handed in.
 *
 * `source` names which lead table the id belongs to: 'lead' (outbound_leads),
 * 'prospect' (rep_prospects), or 'inbound' (leads). Every admin lead screen
 * points at this one route, so the composer behaves identically on all of them.
 */

async function subjectFor(req: Request, body?: Record<string, unknown>) {
  const url = new URL(req.url);
  const source = body ? body.source : url.searchParams.get('source');
  const id = String((body ? body.id : url.searchParams.get('id')) ?? '').trim();
  if (!isLeadSource(source)) {
    return { error: NextResponse.json({ error: 'Unknown lead source.' }, { status: 400 }) };
  }
  if (!id) return { error: NextResponse.json({ error: 'Which lead?' }, { status: 400 }) };

  const db = getSupabase();
  if (!db) return { error: NextResponse.json({ error: 'Database not configured' }, { status: 500 }) };

  const subject = await loadComposeSubject(db, source, id);
  if (!subject) return { error: NextResponse.json({ error: 'That lead is not on file.' }, { status: 404 }) };
  return { db, subject };
}

export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const got = await subjectFor(req);
  if ('error' in got) return got.error;
  const { subject } = got;

  return NextResponse.json({
    to: subject.to,
    businessName: subject.businessName,
    contactName: subject.contactName,
    basis: subject.basis,
    blocked: subject.blocked,
    links: subject.links,
    // The two most recent things, so the composer can show Sarah what the
    // suggestion is about to be written from before she asks for one.
    recent: subject.interactions.slice(0, 2).map((i) => ({
      at: i.at,
      what: i.what,
      preview: i.detail.replace(/\s+/g, ' ').slice(0, 220),
    })),
  });
}

export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const got = await subjectFor(req, body);
  if ('error' in got) return got.error;
  const { db, subject } = got;

  const action = String(body.action ?? '');

  if (action === 'suggest') {
    if (subject.blocked) return NextResponse.json({ error: subject.blocked }, { status: 400 });
    const instruction = String(body.instruction ?? '').slice(0, 2000);
    try {
      const draft = await suggestEmail(subject, instruction);
      return NextResponse.json({ ok: true, ...draft });
    } catch (e) {
      if (e instanceof LlmUnavailable) {
        // Honest, and actionable: the draft is queued and a drainer will finish
        // it, but nothing is going to appear in this request. Write it yourself.
        return NextResponse.json(
          { error: `${e.message} Write it yourself, or try the suggestion again in a minute.` },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: e instanceof Error ? e.message : 'The draft failed.' }, { status: 500 });
    }
  }

  if (action === 'send') {
    const result = await sendComposedEmail(db, subject, {
      subject: String(body.subject ?? ''),
      body: String(body.body ?? ''),
      sentBy: user.name || user.email,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, to: result.to, subject: result.subject, messageId: result.messageId });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
