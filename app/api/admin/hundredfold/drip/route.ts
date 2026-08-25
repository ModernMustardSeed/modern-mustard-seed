import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import {
  hundredfoldDrip,
  personalise,
  roadmapDripEmail,
  interviewDripEmail,
  ROADMAP_TOUCHES,
  INTERVIEW_TOUCHES,
} from '@/lib/hundredfold-drip';
import { SITE } from '@/lib/seo';
import type { RoadmapReport } from '@/lib/roadmap-shape';
import type { BuiltOffer } from '@/lib/hundredfold-synthesis';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * The drip desk.
 *
 * GET                       dry-run status: who is due, who needs a human.
 * GET ?preview=roadmap:0    the actual letter, rendered as HTML in the browser.
 * GET ?preview=interview:2  same, for the interview sequence.
 *
 * ⚠️ PREVIEW SENDS NOTHING and never will. Sarah approves what goes out in her
 * name (feedback_approve_client_sends), and a drip is the one send path she
 * cannot read over the shoulder of, so this is how she reads all seven letters
 * before the first one leaves. Rendered from a real member's real document, so
 * what she sees is what a prospect gets, not a mock.
 */

const DEMO_MEMBER = 'b9348c43-ea37-4c84-9820-24727756b70b';

export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 });

  const preview = new URL(req.url).searchParams.get('preview');
  const memberId = new URL(req.url).searchParams.get('member') || DEMO_MEMBER;

  if (preview) {
    const [seq, rawStep] = preview.split(':');
    const step = Math.max(0, Math.min(9, Number(rawStep) || 0));

    const { data: member } = await sb
      .from('hundredfold_members')
      .select('id, email, name, business_name, deep_roadmap, offer, roadmap_slug')
      .eq('id', memberId)
      .maybeSingle();

    const p = personalise((member?.deep_roadmap as RoadmapReport) ?? null, member?.business_name ?? null);
    if (!p) {
      return new NextResponse(
        '<p style="font-family:system-ui;padding:40px">That member has no readable roadmap yet, so there is no letter to preview. The drip refuses to write from nothing, which is the point.</p>',
        { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
      );
    }

    const firstName = member?.name?.split(/\s+/)[0] ?? null;
    const mail =
      seq === 'interview'
        ? interviewDripEmail(p, Math.min(step, INTERVIEW_TOUCHES - 1), {
            firstName,
            offer: (member?.offer as BuiltOffer) ?? null,
            roadmapUrl: member?.roadmap_slug ? `${SITE.url}/scaling-roadmap/r/${member.roadmap_slug}` : null,
          })
        : roadmapDripEmail(p, Math.min(step, ROADMAP_TOUCHES - 1), {
            reportUrl: member?.roadmap_slug
              ? `${SITE.url}/scaling-roadmap/r/${member.roadmap_slug}`
              : `${SITE.url}/scaling-roadmap`,
            firstName,
          });

    const banner = `<div style="background:#161616;color:#FBF6EA;font-family:ui-monospace,monospace;font-size:12px;padding:12px 18px;letter-spacing:.08em">PREVIEW ONLY, NOTHING SENT &nbsp;·&nbsp; ${seq} touch ${step + 1} &nbsp;·&nbsp; SUBJECT: ${mail.subject}</div>`;
    return new NextResponse(banner + mail.html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const report = await hundredfoldDrip(sb, { dryRun: true });
  return NextResponse.json({
    ok: true,
    ...report,
    touches: { roadmap: ROADMAP_TOUCHES, interview: INTERVIEW_TOUCHES },
    previewMember: memberId,
  });
}
