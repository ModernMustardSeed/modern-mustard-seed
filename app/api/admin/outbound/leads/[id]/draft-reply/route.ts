import { NextResponse } from 'next/server';
import { llmText, LlmUnavailable } from '@/lib/llm';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * Draft a reply to the lead's last inbound message. Interactive and low-volume,
 * so it uses the metered API directly (same call pattern as the Tracker's
 * draft-reply). Returns text only; the rep reviews and sends.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;


  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const { data: last } = await guard.supabase
    .from('messages')
    .select('subject,body,snippet')
    .eq('outbound_lead_id', id)
    .eq('direction', 'inbound')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return NextResponse.json({ error: 'No inbound message to reply to yet.' }, { status: 400 });

  const audit = lead.audit_json as { headline?: string; top_three_fixes?: { title: string }[] } | null;
  const auditLine = lead.audit_score != null
    ? `Their website audit scored ${lead.audit_score}/100. Headline: ${audit?.headline ?? 'n/a'}. Top fix: ${audit?.top_three_fixes?.[0]?.title ?? 'n/a'}.`
    : 'No website audit on file.';

  try {
    const draft = await llmText({
      label: 'outbound-draft-reply',
      model: 'sonnet',
      system:
        'You are Sarah Scarano of Modern Mustard Seed, a Montana AI studio. You sell a voice agent that catches missed calls and books jobs, plus a website and a business command center. These are three SEPARATE products with separate prices: the voice agent is never included with a website, it is an add-on that goes on any site, theirs or ours, so never say a website comes with one. The command center is NOT part of the demo suite and is never bundled or discounted: it is built by hand at its own price and starts with a conversation, so never offer it, never suggest it, and only discuss it if they raise it first. The free part is the DEMO: we build them a real working one to try, at no cost and with no card. There is NO free trial and NO free month on their real line, so never promise one. Going live is a one-time setup fee plus a flat monthly, month to month, cancel anytime, and you may not invent or quote dollar figures. Voice: warm, direct, founder to founder, short paragraphs, no fluff, no em dashes. Draft ONLY the reply email body (no subject line, no signature block beyond "Sarah"). Push gently toward booking a 10-minute demo.',
      user: `Lead: ${lead.business_name}${lead.city ? ` in ${lead.city}` : ''}. ${auditLine}\n\nTheir last message (subject: ${last.subject ?? 'none'}):\n${(last.body || last.snippet || '').slice(0, 3000)}\n\nDraft my reply.`,
    });
    if (!draft) return NextResponse.json({ error: 'The draft came back empty. Try again.' }, { status: 500 });
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Draft failed' }, { status: 500 });
  }
}
