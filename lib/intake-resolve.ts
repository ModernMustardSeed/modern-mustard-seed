import type { SupabaseClient } from '@supabase/supabase-js';
import {
  detectIntakeKind,
  readTailor,
  tailoredProfile,
  type IntakeKind,
  type IntakeProfile,
} from '@/lib/intake-profiles';

export type IntakeClient = {
  email: string;
  name: string | null;
  company: string | null;
  kind: IntakeKind;
  /** True when Sarah set the kind by hand; false when it was read from what we know. */
  kindSet: boolean;
  profile: IntakeProfile;
};

/**
 * Resolves an intake key to the client and the form they should see.
 *
 * Reads `*` rather than naming intake_tailor so a database without migration
 * 156 still serves the form (as a detected profile) instead of a 404.
 */
export async function resolveIntake(supabase: SupabaseClient, key: string): Promise<IntakeClient | null> {
  const { data: client } = await supabase.from('clients').select('*').eq('intake_key', key).maybeSingle();
  if (!client?.email) return null;

  const email = String(client.email);
  const company = (client.company as string | null) ?? null;
  const tailor = readTailor(client.intake_tailor);

  let kind = tailor.kind;
  if (!kind) {
    const [{ data: projects }, { data: leads }] = await Promise.all([
      supabase.from('projects').select('name, summary').ilike('client_email', email).limit(3),
      supabase.from('leads').select('industry, business_name, company').ilike('email', email).limit(3),
    ]);
    kind = detectIntakeKind(
      company,
      ...(leads ?? []).flatMap((l) => [l.business_name, l.company, l.industry]),
      ...(projects ?? []).flatMap((p) => [p.name, p.summary]),
      client.welcome_note as string | null,
    );
  }

  return {
    email,
    name: (client.name as string | null) ?? null,
    company,
    kind,
    kindSet: !!tailor.kind,
    profile: tailoredProfile(kind, tailor, company || 'your business'),
  };
}
