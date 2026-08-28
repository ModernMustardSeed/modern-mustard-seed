import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import {
  getInterview,
  getMemberById,
  listInterviews,
  saveInterviewProgress,
  saveSynthesis,
  updateMember,
} from '@/lib/hundredfold-store';
import { getRoadmapBySlug } from '@/lib/roadmap-store';
import { buildDeepRoadmap, extractAnswers, buildOffer } from '@/lib/hundredfold-synthesis';
import { interviewCoverage } from '@/lib/hundredfold-interview';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Turn an interview into a plan, one step at a time.
 *
 * Three steps rather than one button, because the whole synthesis runs six to
 * eleven minutes and no request lives that long. Splitting it also means a
 * failure costs one step instead of the lot, which matters when each step is a
 * high-effort call on a 20k-token document.
 *
 *   answers  read the transcript into the thirty answers      (~1 min)
 *   roadmap  build the deep roadmap from those answers        (~3-5 min)
 *   offer    build the offer, the systems, and the gates      (~3-5 min)
 *
 * Each step is idempotent and safely re-runnable.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: { step?: 'answers' | 'roadmap' | 'offer'; interviewId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }

  const member = await getMemberById(id);
  if (!member) return NextResponse.json({ ok: false, error: 'no such member' }, { status: 404 });

  // The interview to work from: the one named, or their most recent complete one.
  const interview = body.interviewId
    ? await getInterview(body.interviewId)
    : (await listInterviews(member.id)).find((i) => i.status === 'complete') ?? null;
  if (!interview) {
    return NextResponse.json({ ok: false, error: 'no completed interview for this member' }, { status: 400 });
  }

  try {
    if (body.step === 'answers') {
      const answers = await extractAnswers(interview.transcript ?? []);
      await saveInterviewProgress(interview.id, { answers });
      const coverage = interviewCoverage(answers);
      return NextResponse.json({ ok: true, step: 'answers', coverage, answers });
    }

    if (body.step === 'roadmap') {
      const answers = interview.answers ?? {};
      const coverage = interviewCoverage(answers);
      if (!Object.keys(answers).length) {
        return NextResponse.json({ ok: false, error: 'run the answers step first' }, { status: 400 });
      }
      // A thin interview must not become a confident twelve month plan. Say what
      // is missing and let Sarah decide to go back rather than silently
      // synthesizing from a third of the questions.
      if (!coverage.enough) {
        return NextResponse.json(
          {
            ok: false,
            error: `Only ${coverage.answered} of ${coverage.total} questions were answered. That is too thin for a plan. Finish the interview first, or override from the desk.`,
            coverage,
          },
          { status: 409 }
        );
      }

      const free = member.roadmap_slug ? await getRoadmapBySlug(member.roadmap_slug) : null;
      const roadmap = await buildDeepRoadmap({
        businessName: member.business_name,
        url: interview.url ?? free?.url ?? null,
        answers,
        freeRoadmap: free?.report ?? null,
      });
      await updateMember(member.id, { deep_roadmap: roadmap });
      return NextResponse.json({ ok: true, step: 'roadmap', roadmap });
    }

    if (body.step === 'offer') {
      if (!member.deep_roadmap) {
        return NextResponse.json({ ok: false, error: 'run the roadmap step first' }, { status: 400 });
      }
      const { offer, systems, gates } = await buildOffer({
        businessName: member.business_name,
        answers: interview.answers ?? {},
        roadmap: member.deep_roadmap,
      });
      await saveSynthesis(member.id, { roadmap: member.deep_roadmap, offer, systems, gates });
      return NextResponse.json({
        ok: true,
        step: 'offer',
        offer,
        systems: systems.length,
        gates: gates.length,
      });
    }

    return NextResponse.json({ ok: false, error: 'unknown step' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`hundredfold synthesize ${body.step} failed:`, message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
