import { getSupabase } from '@/lib/supabase';

export type Delivery = { url: string; summary: string; feedback: string; feedbackAt: string | null; requests?: { text: string; at: string }[] };
export const emptyDelivery: Delivery = { url: '', summary: '', feedback: '', feedbackAt: null, requests: [] };
export const phoneLines = ['ai-receptionist', 'phone-and-site-agent'];

export function safeReviewUrl(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : '';
  } catch { return ''; }
}

export function serviceConflict(lines: string[]): string | null {
  if (lines.includes('phone-and-site-agent') && lines.some((s) => ['ai-receptionist', 'site-agent'].includes(s))) return 'Choose Phone + Website Agent or the individual agents. The bundle already includes both.';
  if (lines.filter((s) => ['site-5', 'site-20', 'site-50'].includes(s)).length > 1) return 'Choose one website size for this project.';
  if (lines.includes('bench') && lines.includes('bench-two')) return 'Choose one Bench capacity.';
  return null;
}

export async function deliveries(ids: string[]): Promise<Record<string, Delivery>> {
  if (!ids.length) return {};
  const db = getSupabase();
  if (!db) throw new Error('Delivery storage is unavailable.');
  const { data, error } = await db.from('app_state').select('key,value').in('key', ids.map((id) => `white-label:delivery:${id}`));
  if (error) throw new Error('Could not read delivery details. Please retry.');
  return Object.fromEntries((data ?? []).map((row) => [row.key.replace('white-label:delivery:', ''), { ...emptyDelivery, ...row.value }]));
}

export async function saveDelivery(id: string, delivery: Delivery) {
  const db = getSupabase();
  if (!db) throw new Error('Delivery storage is unavailable.');
  const { error } = await db.from('app_state').upsert({ key: `white-label:delivery:${id}`, value: delivery, updated_at: new Date().toISOString() });
  if (error) throw new Error('Could not save delivery details. Please retry.');
}

export function launchError(status: string, next: string | null, approved: string | null, lines: string[], test: string | null, delivery: Delivery): string | null {
  if (next === 'review' && !test && !delivery.url) return 'Add a test number or an HTTPS preview link before sending for review.';
  if (next === 'review' && !delivery.summary) return 'Add a delivery summary explaining what to test.';
  if (next === 'live' && (status !== 'review' || !approved)) return 'The agency must approve this delivery in its portal before it goes live.';
  if (next === 'live' && delivery.feedback) return 'Resolve the requested changes and send a fresh review before launch.';
  if ((next === 'review' || next === 'live') && lines.some((s) => phoneLines.includes(s)) && !test) return 'Add the test phone number for the receptionist.';
  return null;
}
