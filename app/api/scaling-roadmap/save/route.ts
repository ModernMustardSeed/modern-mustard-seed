import { NextResponse } from 'next/server';
import { deliverRoadmap } from '@/lib/roadmap-delivery';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Re-send a roadmap to a different address.
 *
 * Since 2026-08-07 the address is collected BEFORE the roadmap is generated and
 * the copy goes out automatically, so this is no longer the capture step. It
 * stays for two real cases: someone reading a shared roadmap who wants their own
 * copy, and anyone still on a cached older page whose form posts here.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { slug?: string; email?: string; name?: string; phone?: string };
    const slug = (body.slug ?? '').trim();
    const email = (body.email ?? '').trim();

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Provide a real email address.' }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json({ error: 'Roadmap reference missing. Run it again.' }, { status: 400 });
    }

    const result = await deliverRoadmap({
      slug,
      email,
      name: body.name,
      phone: body.phone,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });

    return NextResponse.json({ ok: true, url: result.url });
  } catch (err) {
    console.error('scaling-roadmap save error', err);
    return NextResponse.json(
      { error: 'Could not send it. Try again or email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
