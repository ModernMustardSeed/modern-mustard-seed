import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { listCallerMemory } from '@/lib/voice-memory';

export const runtime = 'nodejs';

/**
 * Admin: the voice agents' persistent caller memory (who Mr. Mustard has talked
 * to, what they needed, whether they booked). Read-only. Returns reason:
 * 'table-missing' until migration 028_voice_caller_memory has been run, so the
 * UI can show the activation hint instead of an error.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await listCallerMemory();
  return NextResponse.json(result);
}
