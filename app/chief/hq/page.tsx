import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getClientSession } from '@/lib/client-auth';
import { hasEntitlement } from '@/lib/entitlements';
import { buildMetadata } from '@/lib/seo';
import { chiefCapabilities } from '@/data/chief';
import MustardDeskCall from '@/components/MustardDeskCall';

export const metadata = buildMetadata({ title: 'Your Command Center', path: '/chief/hq', noindex: true });
export const dynamic = 'force-dynamic';

const PHONE_TEL = '+14063121223';
const PHONE_DISPLAY = '(406) 312-1223';

export default async function ChiefHqPage() {
  const session = await getClientSession();
  if (!session) redirect('/portal/login?next=/chief/hq');

  const entitled = await hasEntitlement(session.email, 'chief');
  if (!entitled) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] halftone-bg flex items-center justify-center px-6">
        <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] p-10 max-w-md text-center">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">[ Access check ]</p>
          <h1 className="font-display italic font-extrabold text-3xl text-[#161616] mt-3">Your Chief is not on yet</h1>
          <p className="font-body text-sm text-[#161616]/70 mt-3">
            You are signed in as {session.email}, but The Chief is not switched on for this email. Hire him and your
            command center opens the moment you do.
          </p>
          <Link
            href="/chief#pricing"
            className="inline-block mt-6 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] px-6 py-3.5 rounded-full hover:-translate-y-0.5 transition-all"
          >
            Meet The Chief
          </Link>
        </div>
      </div>
    );
  }

  const firstName = session.email.split('@')[0].split(/[._-]/)[0].replace(/^\w/, (c) => c.toUpperCase());

  const briefing = [
    { k: 'verse', label: 'Verse', text: '“Commit your work to the Lord, and your plans will be established.” Proverbs 16:3' },
    { k: 'focus', label: 'Today’s three', text: 'Your priorities land here each morning, drawn from your calendar and your goals.' },
    { k: 'calls', label: 'On your calendar', text: 'Once onboarding is done, your day and your meetings show up right here.' },
  ];

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-6 pt-28 pb-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#C4160B] font-bold">Your command center</p>
          <h1 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02]">
            Morning, {firstName}. The Chief is on duty.
          </h1>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-xl leading-relaxed">
            One place for your day, your briefings, and one button to reach him. Call, text, or talk to him right here.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {/* Reach your Chief */}
        <section className="grid md:grid-cols-3 gap-5">
          <a
            href={`tel:${PHONE_TEL}`}
            className="flex flex-col border-2 border-[#161616] bg-[#F5B700] rounded-2xl shadow-[6px_6px_0_0_#161616] p-6 hover:-translate-y-0.5 transition-transform"
          >
            <span className="text-2xl" aria-hidden>☎️</span>
            <h2 className="font-display font-extrabold text-xl mt-2.5">Call him</h2>
            <p className="font-body text-[13px] text-[#161616]/80 mt-1.5 leading-relaxed flex-1">Reach The Chief on his line any hour.</p>
            <span className="font-mono font-bold text-[13px] mt-3">{PHONE_DISPLAY}</span>
          </a>
          <a
            href={`sms:${PHONE_TEL}`}
            className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#161616] p-6 hover:-translate-y-0.5 transition-transform"
          >
            <span className="text-2xl" aria-hidden>💬</span>
            <h2 className="font-display font-extrabold text-xl mt-2.5">Text him</h2>
            <p className="font-body text-[13px] text-[#161616]/70 mt-1.5 leading-relaxed flex-1">Fire off a task and he takes it from there.</p>
            <span className="font-mono font-bold text-[13px] mt-3 text-[#8f6600]">Text {PHONE_DISPLAY}</span>
          </a>
          <div className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#161616] p-6">
            <span className="text-2xl" aria-hidden>🎙️</span>
            <h2 className="font-display font-extrabold text-xl mt-2.5">Talk here now</h2>
            <p className="font-body text-[13px] text-[#161616]/70 mt-1.5 leading-relaxed flex-1">
              Start a live voice call with him in your browser. Look for the pill in the corner.
            </p>
            <span className="font-mono font-bold text-[12px] mt-3 text-[#1E50C8]">Bottom-right ↘</span>
          </div>
        </section>

        {/* Morning briefing */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">Today’s briefing</p>
          <h2 className="font-display italic font-extrabold text-3xl mt-2 leading-[1.03]">What he has for you this morning.</h2>
          <div className="grid sm:grid-cols-3 gap-5 mt-6">
            {briefing.map((b) => (
              <div key={b.k} className="border-2 border-[#161616] bg-white rounded-2xl shadow-[5px_5px_0_0_#161616] p-5">
                <p className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#8f6600]">{b.label}</p>
                <p className="font-body text-[14px] mt-2 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What he handles */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">Hand it off</p>
          <h2 className="font-display italic font-extrabold text-3xl mt-2 leading-[1.03]">Everything you can put on his desk.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {chiefCapabilities.map((c) => (
              <div key={c.name} className="border-2 border-[#161616] bg-white rounded-2xl shadow-[4px_4px_0_0_#161616] p-4">
                <span className="text-xl" aria-hidden>{c.icon}</span>
                <h3 className="font-display font-extrabold text-[15px] mt-1.5">{c.name}</h3>
                <p className="font-body text-[12px] text-[#161616]/65 mt-1 leading-snug">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Onboarding status */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-9">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">Getting him fully wired</p>
          <h2 className="font-display italic font-extrabold text-2xl md:text-3xl mt-3 text-[#FBF6EA] leading-[1.05] max-w-2xl">
            You can talk to him today. This week he learns you by heart.
          </h2>
          <p className="font-body text-[14px] text-[#FBF6EA]/70 mt-4 max-w-2xl leading-relaxed">
            Sarah is hand-training your Chief on your calendar, your people, and your voice, and switching on your
            morning briefing and his agentic actions (sending email, booking, calls, and lead-gen on your say-so). Watch
            your inbox for the onboarding, and reach him here anytime in the meantime.
          </p>
          <a
            href="mailto:sarah@modernmustardseed.com"
            className="inline-block mt-6 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-full px-6 py-3.5 shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all"
          >
            Email Sarah a note
          </a>
        </section>
      </main>

      {/* Live browser call with Mr. Mustard, forged behind this client's auth */}
      <MustardDeskCall endpoint="/api/portal/desk-call" label="Talk to your Chief" sublabel="Live, in your browser" />
    </div>
  );
}
