import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * WHAT THE DESK KNOWS ABOUT THE BUSINESS IT WORKS FOR.
 *
 * The Operator can read every row and still know nothing about the business:
 * that they do not take commercial work, that Carmen decides and Shan builds,
 * that a lot without a perc test is a conversation rather than a job. Those
 * facts are what separate a tool that answers questions from one that belongs
 * to them.
 *
 * THE DISTINCTION THIS FILE EXISTS TO KEEP. A fact the owner STATED is kept
 * the moment they say it, because they are the only authority on their own
 * business. A fact the machine NOTICED is a hypothesis with evidence, and it
 * is proposed rather than kept. Software that quietly adopts its own guesses
 * will eventually act on one that is wrong, and the owner will never find out
 * where it came from.
 *
 * Nothing is ever deleted. "We stopped doing remodels" is itself worth
 * knowing, and a fact that vanishes takes its own history with it.
 */

export type FactKind = 'rule' | 'preference' | 'about' | 'person';
export type FactSource = 'said' | 'noticed';

export type Fact = {
  id: string;
  fact: string;
  kind: FactKind;
  subject: string | null;
  source: FactSource;
  evidence: string | null;
  confirmed_at: string | null;
  retired_at: string | null;
  created_at: string;
};

export const FACT_COLUMNS = 'id, fact, kind, subject, source, evidence, confirmed_at, retired_at, created_at';

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Everything live: stated facts, and noticed ones a person has confirmed. */
export async function knownFacts(sb: SupabaseClient, clientEmail: string): Promise<Fact[]> {
  const { data } = await sb
    .from('client_facts')
    .select(FACT_COLUMNS)
    .eq('client_email', clientEmail.toLowerCase().trim())
    .is('retired_at', null)
    .order('created_at', { ascending: false })
    .limit(200);
  return ((data ?? []) as Fact[]).filter((f) => f.source === 'said' || f.confirmed_at);
}

/** Noticed and still waiting on a yes. */
export async function proposedFacts(sb: SupabaseClient, clientEmail: string): Promise<Fact[]> {
  const { data } = await sb
    .from('client_facts')
    .select(FACT_COLUMNS)
    .eq('client_email', clientEmail.toLowerCase().trim())
    .eq('source', 'noticed')
    .is('confirmed_at', null)
    .is('retired_at', null)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as Fact[];
}

/**
 * The lines the Operator carries into every conversation.
 *
 * Deliberately short. A prompt that opens with forty facts about a business is
 * a prompt that has stopped reading the question.
 */
export function factLines(facts: Fact[], max = 25): string[] {
  const order: Record<FactKind, number> = { rule: 0, preference: 1, about: 2, person: 3 };
  return [...facts]
    .sort((a, b) => order[a.kind] - order[b.kind] || b.created_at.localeCompare(a.created_at))
    .slice(0, max)
    .map((f) => (f.subject ? `${f.subject}: ${f.fact}` : f.fact));
}

export type RememberInput = { fact: unknown; kind?: unknown; subject?: unknown; source?: FactSource; evidence?: unknown; by: string };

/**
 * Keep something.
 *
 * A stated fact is live immediately. A noticed one is written unconfirmed and
 * shows up as a question, never as knowledge.
 */
export async function remember(sb: SupabaseClient, clientEmail: string, input: RememberInput): Promise<{ ok: true; fact: Fact } | { ok: false; error: string }> {
  const fact = clean(input.fact, 400);
  if (fact.length < 4) return { ok: false, error: 'What should I remember?' };
  const kind = (['rule', 'preference', 'about', 'person'] as const).includes(String(input.kind) as FactKind) ? (String(input.kind) as FactKind) : 'about';
  const source: FactSource = input.source === 'noticed' ? 'noticed' : 'said';

  const email = clientEmail.toLowerCase().trim();
  // The same thing said twice is one fact. Cheap exact-match guard; a near
  // duplicate is a person's to tidy, not a machine's to merge.
  const { data: had } = await sb.from('client_facts').select(FACT_COLUMNS).eq('client_email', email).is('retired_at', null).ilike('fact', fact).maybeSingle();
  if (had) return { ok: true, fact: had as Fact };

  const { data, error } = await sb
    .from('client_facts')
    .insert({
      client_email: email,
      fact,
      kind,
      subject: clean(input.subject, 120) || null,
      source,
      evidence: clean(input.evidence, 1000) || null,
      // Stated facts are true on arrival. Noticed ones wait.
      confirmed_at: source === 'said' ? new Date().toISOString() : null,
      confirmed_by: source === 'said' ? input.by : null,
      created_by: input.by,
    })
    .select(FACT_COLUMNS)
    .single();
  if (error || !data) return { ok: false, error: 'That did not save.' };
  return { ok: true, fact: data as Fact };
}

export async function confirmFact(sb: SupabaseClient, clientEmail: string, id: string, by: string): Promise<void> {
  await sb
    .from('client_facts')
    .update({ confirmed_at: new Date().toISOString(), confirmed_by: by })
    .eq('id', id)
    .eq('client_email', clientEmail.toLowerCase().trim());
}

export async function retireFact(sb: SupabaseClient, clientEmail: string, id: string, reason: string, by: string): Promise<void> {
  await sb
    .from('client_facts')
    .update({ retired_at: new Date().toISOString(), retired_reason: clean(reason, 400) || null, confirmed_by: by })
    .eq('id', id)
    .eq('client_email', clientEmail.toLowerCase().trim());
}
