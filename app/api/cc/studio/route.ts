import { NextResponse } from 'next/server';
import { hasStudioPass, setStudioAs, getCcSession } from '@/lib/client-auth';
import { allDoors, projectForDoor } from '@/lib/cc-access';
import { hydrateDesks } from '@/lib/client-desks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE STUDIO'S CLIENT SWITCH. Only answers while Sarah's studio pass is live.
 *
 *   GET   every client door, and which one she is standing in
 *   POST  { door }  stand in that client's Command Center
 */
export async function GET() {
  if (!(await hasStudioPass())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await hydrateDesks();
  const here = await getCcSession();
  const doors = allDoors().map(({ door, business, clientEmail }) => ({ door, business, here: here?.studio === true && here.email === clientEmail.toLowerCase() }));
  return NextResponse.json({ doors });
}

export async function POST(req: Request) {
  if (!(await hasStudioPass())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await hydrateDesks();
  let body: { door?: string };
  try {
    body = (await req.json()) as { door?: string };
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }
  const project = projectForDoor(String(body.door ?? ''));
  if (!project) return NextResponse.json({ error: 'No client has that door.' }, { status: 404 });
  await setStudioAs(project.clientEmail);
  return NextResponse.json({ ok: true });
}
