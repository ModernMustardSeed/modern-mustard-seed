// The handover vault: logins a client mailed us, held encrypted, opened only
// by a person at the desk. Nothing here is ever emailed or logged. A value is
// decrypted on demand for one screen and the row records when it was rotated.
import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret } from '@/lib/crypto';
import { projectForEmail } from '@/lib/client-leads';

export type VaultRow = { id: string; label: string; createdAt: string; rotatedAt: string | null; rotatedBy: string | null; submittedBy: string | null };

function scope(client: string) {
  const project = projectForEmail(client);
  return project ? `client_email.eq.${client},project.eq.${project.key}` : `client_email.eq.${client}`;
}

export async function listVault(db: SupabaseClient, client: string): Promise<VaultRow[]> {
  const { data } = await db.from('prep_secrets').select('id, label, created_at, rotated_at, rotated_by, submitted_by').or(scope(client)).order('created_at').order('label');
  return (data ?? []).map((r) => ({ id: r.id as string, label: r.label as string, createdAt: r.created_at as string, rotatedAt: (r.rotated_at as string | null) ?? null, rotatedBy: (r.rotated_by as string | null) ?? null, submittedBy: (r.submitted_by as string | null) ?? null }));
}

export async function revealSecret(db: SupabaseClient, client: string, id: string): Promise<{ ok: true; label: string; value: string } | { ok: false; error: string }> {
  const { data } = await db.from('prep_secrets').select('id, label, ciphertext, iv, tag').eq('id', id).or(scope(client)).maybeSingle();
  if (!data) return { ok: false, error: 'No such credential for this client.' };
  try {
    return { ok: true, label: data.label as string, value: decryptSecret(data.ciphertext as string, data.iv as string, data.tag as string) };
  } catch {
    return { ok: false, error: 'This credential cannot be opened here. The vault key on this deployment does not match the one it was sealed with.' };
  }
}

export async function markRotated(db: SupabaseClient, client: string, id: string, by: string): Promise<boolean> {
  const { data } = await db.from('prep_secrets').update({ rotated_at: new Date().toISOString(), rotated_by: by }).eq('id', id).or(scope(client)).select('id');
  return Boolean(data && data.length);
}
