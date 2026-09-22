import { NextResponse } from 'next/server';
import { llmJson, renderTranscript } from '@/lib/llm';
import { getClientSession, getCcWho, normalizeEmail } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { displayForIso } from '@/lib/booking';
import { createClientRequest } from '@/lib/client-requests';
import { visibleProject } from '@/lib/command-center/visible';
import { getCcSession } from '@/lib/client-auth';
import { projectForEmail } from '@/lib/client-leads';
import { commandCenterContext } from '@/lib/command-center/context';
import { draftNewMail } from '@/lib/mail-desk';
import { sendReviewAsk } from '@/lib/reviews';
import { mintCode } from '@/lib/campaigns';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * The in-portal AI guide. Scoped strictly to the signed-in client's own data
 * (their project, files, downloads, calls). It gives guided tours, answers
 * questions about their engagement, and helps them use what was built. It can
 * never see another client's account.
 *
 * For a client whose Command Center is on, it also acts, within four walls:
 * draft an email into their own Gmail Drafts (never send), send a review ask,
 * mark a lead as called, make a QR code. Each action is reported back only
 * after it actually happened.
 */

const SYSTEM_PROMPT = `You are the Mustard Seed guide, the AI assistant inside a client's private Modern Mustard Seed portal. Modern Mustard Seed is Sarah Scarano's one-person AI product studio.

Your job:
- Help this client understand their project status, find their files, see upcoming calls, and use what Sarah built for them.
- If they bought a playbook (PDF), help them get the most from it and answer questions about applying it.
- Offer a short guided tour of their portal when they arrive or ask for one.
- When the context includes a Command Center, answer from it: who is waiting on a call, what came in, which QR code is being scanned, which email needs a reply, when a domain renews, what is still to connect. Give the numbers as they are. Do not tell them to check a screen you can already read.
- When useful, suggest booking a call (their portal has a booking button) or point them to the right section.
- Pass messages to Sarah. When the client wants a change, an edit, a fix, has feedback, or asks you to tell Sarah something, use the send_note_to_sarah tool. Capture exactly what they want, with all the specifics they gave. After it succeeds, confirm warmly in one sentence that you have passed it to Sarah and she will follow up. Never claim you sent something to Sarah unless you actually used the tool.

Voice:
- Warm, brief, direct. No em dashes anywhere. Use periods, commas, parentheses.
- 2 to 5 sentences. Plain words.
- You only know THIS client's account. If they ask about something you cannot see, say so plainly and suggest they email sarah@modernmustardseed.com.
- Never invent project details, dates, prices, or files that are not in the context. If it is not in the context, say you are not sure and Sarah can confirm.`;

const DECISION_RULES = `# How to answer

Reply with a single JSON object and nothing else:
{"reply": "<what you say to the client>", "sendNote": <true|false>, "note": "<the message for Sarah, or empty>", "actions": [ ...zero or more of the actions below... ]}

Set sendNote to true whenever the client wants something changed about their project, or wants to tell Sarah something directly: a change request, an edit, a fix, feedback, or a note. When you do, "note" is a clear, complete restatement of what they want Sarah to know or do, written in the client's voice, including every specific they gave (pages, copy, colors, dates). Otherwise sendNote is false and "note" is an empty string.

Actions, only when the context says the Command Center is on, and only when the client clearly asked for the thing:
- {"type":"draft_email","to":"<address>","subject":"<subject>","body":"<the email, in the owner's voice, first person as the company, no em dashes, signed Shan>"}: when they ask you to write or draft an email to someone. It lands in their own Drafts folder; it is never sent by you. If they gave no address, ask for it instead of acting.
- {"type":"review_ask","name":"<homeowner name>","email":"<address or empty>","phone":"<mobile or empty>","project":"<which build or empty>","note":"<a personal line or empty>"}: when they ask you to ask someone for a review.
- {"type":"mark_called","name":"<lead name as it appears in the context>"}: when they say they called or reached a lead who is waiting.
- {"type":"make_code","label":"<what the sign is>","medium":"sign|jobsite|truck|card|print|ad|mail|other","path":"</page or /projects/<slug> or />"}: when they ask for a QR code.
Never put an action in the list for something they only asked about. Never say an action happened; the reply is written before the action runs, so say what you are doing ("I am putting a draft to Bob in your Gmail drafts now") and the system confirms the result after.

Keep "reply" in your normal voice either way. Do not tell the client you are sending a note unless sendNote is true.`;

const DECISION_SCHEMA = {
  type: 'object' as const,
  properties: {
    reply: { type: 'string' },
    sendNote: { type: 'boolean' },
    note: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          to: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          project: { type: 'string' },
          note: { type: 'string' },
          label: { type: 'string' },
          medium: { type: 'string' },
          path: { type: 'string' },
        },
        required: ['type'],
      },
    },
  },
  required: ['reply', 'sendNote'],
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Action = { type: string; to?: string; subject?: string; body?: string; name?: string; email?: string; phone?: string; project?: string; note?: string; label?: string; medium?: string; path?: string };

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const incoming = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  if (incoming.length === 0) return NextResponse.json({ error: 'Say something first.' }, { status: 400 });

  // Build a compact, strictly-scoped context for this email.
  const email = session.email;
  const supabase = getSupabase();
  const ctx: string[] = [`Client email: ${email}`];
  let project: Awaited<ReturnType<typeof visibleProject>> = null;
  if (supabase) {
    try {
      const { data: c } = await supabase.from('clients').select('name, company, tier, welcome_note').eq('email', email).maybeSingle();
      if (c) ctx.push(`Client: ${c.name ?? 'unknown'}${c.company ? `, ${c.company}` : ''} (tier: ${c.tier}).`);
    } catch {}
    try {
      const { data: projects } = await supabase.from('projects').select('name, status, summary, progress, milestones, launch_target').eq('client_email', email);
      for (const p of projects ?? []) {
        const ms = Array.isArray(p.milestones) ? (p.milestones as Array<{ title: string; done?: boolean }>).map((m) => `${m.done ? '[done]' : '[ ]'} ${m.title}`).join('; ') : '';
        ctx.push(`Project "${p.name}": status ${p.status}, ${p.progress}% complete${p.launch_target ? `, launch target ${p.launch_target}` : ''}. ${p.summary ?? ''} Milestones: ${ms || 'none yet'}.`);
      }
    } catch {}
    try {
      const { data: files } = await supabase.from('client_files').select('label, kind').eq('client_email', email);
      if (files?.length) ctx.push(`Files available: ${files.map((f) => `${f.label} (${f.kind})`).join(', ')}.`);
    } catch {}
    try {
      const { data: orders } = await supabase.from('orders').select('product_name').eq('email', email).eq('status', 'paid');
      if (orders?.length) ctx.push(`Playbooks purchased: ${orders.map((o) => o.product_name).join(', ')}.`);
    } catch {}
    try {
      const { data: booked } = await supabase.from('leads').select('timeline').eq('email', email).eq('source', 'mustard-seed-booking').eq('status', 'booked').gte('timeline', new Date().toISOString()).order('timeline', { ascending: true });
      const next = booked?.find((b) => b.timeline);
      if (next) ctx.push(`Next call: ${displayForIso(next.timeline as string).display}.`);
    } catch {}
    // A client whose Command Center is on has it read to the guide too, so
    // "who is waiting on me" and "which sign is working" get real answers.
    project = await visibleProject(supabase, email);
    // THE GATE THAT SILENTLY ATE EVERY ACTION.
    //
    // `visibleProject` answers "may this client see their Command Center",
    // which needs a row in client_command_center that is deliberately absent
    // until Sarah hands the desk over. Anyone working inside /cc before that
    // (Sarah building it, or a client whose desk is switched on) got a
    // confident "making that QR code now" and no QR code, because the action
    // block below was skipped entirely.
    //
    // So: holding a Command Center key IS the permission, which is the same
    // rule the middleware on /cc already applies. The key is only ever minted
    // by a sign-in that checked the account, so this widens who may act
    // without widening who may get in.
    if (!project) {
      const cc = await getCcSession();
      if (cc && normalizeEmail(cc.email) === email) project = projectForEmail(email);
    }
    if (project) {
      try {
        const cc = await commandCenterContext(supabase, email);
        if (cc.length) ctx.push('', 'The Command Center is on. Here it is right now:', ...cc);
      } catch {}
    }
  }
  const contextBlock = ctx.join('\n');

  const system = `${SYSTEM_PROMPT}\n\nHere is everything you know about this client (and nothing about anyone else):\n\n${contextBlock}`;
  const convo = incoming.map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  try {
    const decision = await llmJson<{ reply: string; sendNote: boolean; note?: string; actions?: Action[] }>({
      label: 'portal-assistant',
      model: 'sonnet',
      system: `${system}\n\n${DECISION_RULES}`,
      user: renderTranscript(convo, { assistantLabel: 'Assistant', userLabel: 'Client' }),
      schema: DECISION_SCHEMA,
      timeoutMs: 45_000,
    });

    let noteSent = false;
    if (decision.sendNote) {
      const message = (decision.note ?? '').trim();
      if (message) {
        const r = await createClientRequest({ email, body: message, source: 'chatbot' });
        noteSent = r.ok;
      }
    }

    // ACTIONS, only with the Command Center on, only what was asked, and
    // every outcome reported as it happened. A failure is said plainly.
    const done: string[] = [];
    if (project && supabase && Array.isArray(decision.actions)) {
      for (const a of decision.actions.slice(0, 3)) {
        try {
          if (a.type === 'draft_email' && a.to && a.body) {
            const r = await draftNewMail(supabase, email, a.to, a.subject ?? '(no subject)', a.body);
            done.push(r.ok ? `The draft to ${a.to} is in your Gmail drafts, from ${r.address}. Nothing was sent.` : `I could not save the draft to ${a.to}: ${r.error}`);
          } else if (a.type === 'review_ask' && a.name) {
            const r = await sendReviewAsk(supabase, project, email, { name: a.name, email: a.email, phone: a.phone, project: a.project, note: a.note });
            done.push(r.ok ? `The review ask went to ${a.name}${r.sent_email && r.sent_sms ? ' by email and text' : r.sent_sms ? ' by text' : ' by email'}.` : `The review ask to ${a.name} did not go out: ${r.error}`);
          } else if (a.type === 'mark_called' && a.name) {
            const { data: lead } = await supabase.from('client_leads').select('id, name').eq('client_email', email).is('handled_at', null).ilike('name', `%${a.name.replace(/[%_]/g, '')}%`).order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (lead) {
              await supabase.from('client_leads').update({ handled_at: new Date().toISOString(), handled_by: email }).eq('id', lead.id);
              // The desk log says who asked for it, so the next person reading
              // the lead does not find a called mark with no name on it.
              const whoEmail = await getCcWho();
              const asker = Object.values(project?.people ?? {}).find((p) => normalizeEmail(p.email) === whoEmail)?.name ?? project?.business ?? 'The office';
              await supabase.from('client_lead_events').insert({ client_email: email, lead_id: lead.id, kind: 'called', author_key: null, author_name: `${asker}, through the Operator` });
              done.push(`${lead.name ?? a.name} is marked called and off the Monday list.`);
            } else done.push(`I did not find a waiting lead named ${a.name}.`);
          } else if (a.type === 'make_code' && a.label) {
            const medium = ['sign', 'jobsite', 'truck', 'card', 'print', 'ad', 'mail', 'other'].includes(String(a.medium)) ? String(a.medium) : 'sign';
            let path = String(a.path ?? '/').trim() || '/';
            if (!path.startsWith('/')) path = `/${path}`;
            if (!/^\/[A-Za-z0-9\-._~/]*$/.test(path)) path = '/';
            const code = await mintCode(supabase, email, a.label);
            const { error } = await supabase.from('client_campaigns').insert({ client_email: email, code, label: a.label.slice(0, 80), medium, path });
            done.push(error ? `I could not make the code for ${a.label}.` : `The QR code "${a.label}" is made. Download it under Signs and ads.`);
          }
        } catch (err) {
          done.push(`Something did not go through: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    const reply = (decision.reply ?? '').trim();
    const base = reply || (noteSent ? 'Done. I passed that along to Sarah and she will follow up.' : 'Tell me a little more and I will help.');

    // NEVER LET A CONFIDENT SENTENCE STAND ON ITS OWN.
    //
    // The reply is written before the actions run, so it says "making that QR
    // code now" whether or not anything happened. When the model asked for
    // work and none of it ran, the last word must be that nothing ran, not
    // the promise.
    const asked = Array.isArray(decision.actions) ? decision.actions.slice(0, 3).length : 0;
    const nothingRan = asked > 0 && done.length === 0;
    if (nothingRan) {
      done.push('That did not actually happen: this account cannot run that action yet. Sarah has been told.');
      if (!noteSent) {
        try {
          await createClientRequest({ email, body: `The Operator tried to do something and could not: ${JSON.stringify(decision.actions).slice(0, 800)}`, source: 'chatbot' });
        } catch {
          /* the sentence above is still the honest answer */
        }
      }
    }
    return NextResponse.json({
      reply: done.length ? `${base}\n\n${done.join(' ')}` : base,
      // Only true when the note actually landed. There is no second turn here,
      // so the flag is the honest signal and the client is never told something
      // reached Sarah when it did not.
      noteSent,
      actions: done,
    });
  } catch (err) {
    console.error('portal assistant error', err);
    return NextResponse.json({ reply: 'I hit a snag. Try again, or email sarah@modernmustardseed.com.' });
  }
}
