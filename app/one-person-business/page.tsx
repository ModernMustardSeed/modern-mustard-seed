import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Clock3, Lightbulb, MessageCircleQuestion, Users } from 'lucide-react';
import WebinarRegistrationForm from '@/components/seed-to-system/WebinarRegistrationForm';
import { ENGINE_JOBS, WEBINAR } from '@/data/seed-to-system';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'The One-Person Business Engine. Free Live Class',
  description:
    'A free live class with Sarah Scarano: build the five jobs your business needs before you hire five people, even with a small audience.',
  path: '/one-person-business',
});

export default function OnePersonBusinessPage() {
  return (
    <main className="overflow-hidden bg-[#FBF6EA] text-[#161616]">
      <section className="relative min-h-[88svh] border-b-2 border-[#161616]">
        <Image
          src="/video/build-the-tree-poster.jpg"
          alt="A Modern Mustard Seed workspace where a one-person business is built"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,22,22,.92)_0%,rgba(22,22,22,.76)_48%,rgba(22,22,22,.22)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[88svh] max-w-7xl flex-col justify-end px-6 pb-12 pt-32 md:px-10 md:pb-16 lg:px-16">
          <div className="max-w-4xl">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.36em] text-[#F5B700]">
              {WEBINAR.eyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-5xl font-black leading-[0.96] text-white md:text-7xl lg:text-8xl">
              The One-Person
              <span className="block text-[#F5B700]">Business Engine</span>
            </h1>
            <p className="mt-6 max-w-2xl font-display text-2xl font-bold leading-tight text-white md:text-3xl">
              {WEBINAR.headline}
            </p>
            <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-white/80 md:text-lg">
              {WEBINAR.promise}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#register"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[#161616] bg-[#F5B700] px-7 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#161616] shadow-[5px_5px_0_0_#FFFFFF] transition-transform hover:-translate-y-0.5"
              >
                Save my free seat
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href="/seed-to-system"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-white bg-[#161616]/65 px-7 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#161616]"
              >
                See the six-week lab
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/25 pt-5 text-white/75">
            <span className="inline-flex items-center gap-2 font-body text-sm">
              <Clock3 className="h-4 w-4 text-[#F5B700]" aria-hidden="true" />
              {WEBINAR.length}
            </span>
            <span className="inline-flex items-center gap-2 font-body text-sm">
              <Users className="h-4 w-4 text-[#F5B700]" aria-hidden="true" />
              Built for small-audience founders
            </span>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#B62618]">
                The first belief shift
              </p>
              <h2 className="mt-4 font-display text-4xl font-black leading-tight md:text-6xl">
                You do not need a bigger audience yet.
              </h2>
            </div>
            <div className="border-l-4 border-[#F5B700] pl-6">
              <p className="font-display text-2xl font-bold leading-snug text-[#161616] md:text-3xl">
                Content multiplies what it points at.
              </p>
              <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-[#5C554A] md:text-lg">
                If the offer is muddy, content multiplies confusion. If follow-up is broken, content creates more
                lost leads. We build the problem, offer, proof, and engine before asking an audience to carry it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-[#F5B700] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#161616]/60">
            Five jobs. No payroll.
          </p>
          <h2 className="mt-4 max-w-4xl font-display text-4xl font-black leading-tight md:text-6xl">
            Build these before your first hire.
          </h2>
          <div className="mt-12 divide-y-2 divide-[#161616] border-y-2 border-[#161616]">
            {ENGINE_JOBS.map((job) => (
              <div
                key={job.number}
                className="grid gap-3 py-6 md:grid-cols-[80px_260px_1fr] md:items-center md:gap-8"
              >
                <span className="font-mono text-sm font-bold text-[#161616]/55">{job.number}</span>
                <h3 className="font-display text-2xl font-black">{job.job}</h3>
                <p className="font-body leading-relaxed text-[#3A3733]">{job.result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-[#163B68] py-16 text-white md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:px-10 lg:grid-cols-2 lg:items-center lg:px-16">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#F5B700]">
              Real systems, not theory
            </p>
            <h2 className="mt-4 font-display text-4xl font-black leading-tight md:text-6xl">
              Sarah builds this way every day.
            </h2>
            <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-white/78">
              {WEBINAR.proof}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-7 border-t border-white/25 pt-7">
              <div>
                <strong className="block font-display text-3xl font-black text-[#F5B700]">40+</strong>
                <span className="font-body text-sm text-white/70">production AI systems shipped</span>
              </div>
              <div>
                <strong className="block font-display text-3xl font-black text-[#F5B700]">4</strong>
                <span className="font-body text-sm text-white/70">ventures run with a small human team</span>
              </div>
              <div>
                <strong className="block font-display text-3xl font-black text-[#F5B700]">100+</strong>
                <span className="font-body text-sm text-white/70">languages on live voice systems</span>
              </div>
              <div>
                <strong className="block font-display text-3xl font-black text-[#F5B700]">1</strong>
                <span className="font-body text-sm text-white/70">clear next move when class ends</span>
              </div>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border-2 border-white/40">
            <Image
              src="/home/work/cross-covenant.jpg"
              alt="Cross and Covenant, one of Sarah's businesses built with the one-person engine"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section id="register" className="scroll-mt-24 border-b-2 border-[#161616] bg-[#FBF6EA] py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:px-10 lg:grid-cols-[1fr_460px] lg:items-start">
          <div className="pt-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#B62618]">
              Bring the raw idea
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl font-black leading-tight md:text-6xl">
              Leave the branding tabs closed for one hour.
            </h2>
            <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-[#5C554A]">
              Bring the idea that keeps returning. Sarah will show you how to test the buyer, problem, offer, proof,
              and engine in the right order.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex gap-3">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#B62618]" aria-hidden="true" />
                <p className="font-body text-[#3A3733]">A one-page Engine Map you can use immediately.</p>
              </div>
              <div className="flex gap-3">
                <MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-[#B62618]" aria-hidden="true" />
                <p className="font-body text-[#3A3733]">Live Q&amp;A with honest answers about your idea.</p>
              </div>
            </div>
          </div>
          <WebinarRegistrationForm />
        </div>
      </section>
    </main>
  );
}
