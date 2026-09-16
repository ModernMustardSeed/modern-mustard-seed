import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * HAND A RUN TO A PRINT SHOP.
 *
 * The message is built here rather than typed in the box, because the one
 * instruction that decides whether the job comes out right is the one a person
 * in a hurry leaves out: every page is a different business, print straight
 * through, do not repeat page one. A shop that misses that line prints 140
 * copies of Moose's Saloon. The page count comes from the run's own run.json,
 * so the number in the email and the number in the PDF cannot disagree.
 *
 * A note from the sender is appended, never substituted, so "can you do this by
 * noon" cannot displace the spec.
 *
 * NO ATTACHMENT. The files are public links and a 4MB PDF is what gets a first
 * email from an unknown sender filed as junk. The link also stays correct when
 * the run is rebuilt, which an attachment does not.
 *
 * This is a hand send to one address that Sarah typed, so it does not go near
 * the outbound governor and starts no drip. It is not marketing; it is a work
 * order.
 */

const BUCKET = 'print-runs';
const SAFE = /^[A-Za-z0-9._-]{1,64}$/;

export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  let body: { label?: string; region?: string; to?: string; note?: string; bleed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const label = String(body.label ?? '');
  const region = String(body.region ?? '');
  const to = String(body.to ?? '').trim();
  const note = String(body.note ?? '').trim().slice(0, 1200);
  const bleed = body.bleed === true;

  if (!SAFE.test(label) || !SAFE.test(region)) {
    return NextResponse.json({ error: 'Unknown run.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return NextResponse.json({ error: 'That does not look like an email address.' }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: 'Email is not configured.' }, { status: 503 });

  const base = process.env.supabase_url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const at = (file: string) => `${base}/storage/v1/object/public/${BUCKET}/${label}/${region}/${file}`;

  let pages: number | null = null;
  try {
    const res = await fetch(at('run.json'), { cache: 'no-store' });
    if (res.ok) {
      const meta = (await res.json()) as { pages?: number };
      pages = typeof meta.pages === 'number' ? meta.pages : null;
    }
  } catch {
    /* No count is survivable. A wrong count is not, so it stays null. */
  }
  if (pages == null) {
    return NextResponse.json(
      { error: 'This run has no page count published yet. Re-publish it before sending.' },
      { status: 409 },
    );
  }

  const file = bleed ? 'flyers-press.pdf' : 'flyers-letter.pdf';
  const sizeLine = bleed
    ? `  Trim size     8.5 x 11 portrait. The file is 8.75 x 11.25, which is 0.125
                bleed on all four sides with crop marks. Trim to 8.5 x 11.`
    : `  Size          8.5 x 11, standard letter, portrait
  Scaling       Print at 100 percent. Please do not scale to fit.`;

  const text = `Hi,

I have a print job ready. The file is online, so there is nothing to upload or
email back and forth.

${at(file)}

THE ONE THING TO KNOW BEFORE YOU START: every page in that file is a different
business. It is not one design at quantity ${pages}. It is ${pages} separate flyers, each
with its own company name and its own text. Please print the file straight
through, one copy of each page, rather than repeating page one. The page order
matters to me, so please keep it.

  File          ${file}, ${pages} pages
  Quantity      1 of each page, ${pages} sheets total
  Sides         ONE SIDE ONLY, full colour. The back stays blank.
${sizeLine}
  Stock         100 lb matte cover preferred. Text weight is fine if it keeps
                the job same day.
  Finishing     ${bleed ? 'Cut to trim. ' : 'None. '}No fold, no score, no round corner, and no coating
                that stops a pen writing on it.
  Colour        The file is RGB. The background is a warm cream, #FBF6EA, and it
                should not come out white or grey. The yellow is #F5B700 and
                needs to stay saturated.

A one page spec sheet with the same details is here:
${at('printer-spec.pdf')}
${note ? `\n${note}\n` : ''}
Could you confirm the price and when it can be picked up?

Thanks,

Sarah Scarano
Modern Mustard Seed
sarah@modernmustardseed.com
`;

  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to,
    replyTo: 'sarah@modernmustardseed.com',
    subject: `Print job, ${pages} single sided colour letter pages, ready to download`,
    text,
  });

  if (error) return NextResponse.json({ error: error.message ?? 'Send failed.' }, { status: 502 });
  return NextResponse.json({ ok: true, id: data?.id ?? null, pages, to });
}
