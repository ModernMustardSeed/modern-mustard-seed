import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import MissedCallCalculator from '@/components/MissedCallCalculator';
import RestaurantVoiceSection from '@/components/RestaurantVoiceSection';
import VoiceTalkButton from '@/components/VoiceTalkButton';
import MrMustardHeroCTA from '@/components/MrMustardHeroCTA';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'AI Voice Agents That Answer Every Call, in Any Language',
  description:
    'A 24/7 AI voice agent that picks up every call in a natural human voice, books appointments, answers FAQs, and routes urgent calls to you. Now multilingual: it greets and serves callers in 100+ languages (English, Spanish, French, Portuguese, German, Mandarin, and more) and detects the caller automatically. For restaurants, it takes phone orders, books tables, and saves the dinner rush from voicemail. Stop losing customers to voicemail or a language barrier.',
  path: '/voice-agents',
});

const stats = [
  {
    figure: '5 min',
    label: 'The window',
    body:
      'Reach a new lead within five minutes and you are up to 100x more likely to connect than at thirty. Speed is the whole game.',
  },
  {
    figure: '78%',
    label: 'First responder wins',
    body:
      'Most buyers go with the first business that responds. Voicemail loses to the competitor who picked up.',
  },
  {
    figure: '24/7',
    label: 'Always answered',
    body:
      'Nights, weekends, holidays, and the lunch-rush calls you cannot get to. Your agent answers every one.',
  },
];

const handles = [
  {
    title: 'Books the appointment',
    body: 'Checks your real availability and puts the booking on your calendar while the caller is still on the line.',
  },
  {
    title: 'Answers your FAQs',
    body: 'Hours, pricing, location, services, directions. In your words, the way you would say it.',
  },
  {
    title: 'Routes the urgent ones',
    body: 'A real emergency rings straight through to you. You decide what counts as urgent.',
  },
  {
    title: 'Qualifies the caller',
    body: 'Asks the right questions, captures the details, and drops a clean lead into your CRM with notes.',
  },
  {
    title: 'Covers after-hours and overflow',
    body: 'When you are closed, on a job, or every line is busy, the agent is still answering.',
  },
  {
    title: 'Follows up by text',
    body: 'Sends a confirmation, a reminder, or a booking link so nothing slips between the call and the visit.',
  },
];

const steps = [
  {
    eyebrow: 'Step 1',
    title: 'We learn your business',
    body: 'Your services, your hours, your FAQs, the way you talk, and exactly what counts as an emergency.',
  },
  {
    eyebrow: 'Step 2',
    title: 'We build and train the agent',
    body: 'A natural custom voice, your script, your calendar and CRM wired in, and tested against real call flows before it ever picks up.',
  },
  {
    eyebrow: 'Step 3',
    title: 'It answers from day one',
    body: 'Live on your number in about two weeks. It is yours, fully, with every call captured from the first ring.',
  },
];

const faq = [
  {
    q: 'Does it actually sound human?',
    a: 'Yes. Natural voice, natural pacing, and your script. Most callers cannot tell, and the ones who can do not mind, because they got a real answer instead of voicemail.',
  },
  {
    q: 'What happens with a call it cannot handle?',
    a: 'It does not guess. It captures the details, books a callback, or routes a true emergency straight to you. You set the rules for what it handles and what it escalates.',
  },
  {
    q: 'How fast can it go live?',
    a: 'Most voice agents are live on your number in about two weeks, from first conversation to answering real calls.',
  },
  {
    q: 'Does it work with my calendar and CRM?',
    a: 'Yes. It books against your real availability and writes every call into your CRM, whether that is Zoho, HubSpot, Acuity, or a custom build.',
  },
  {
    q: 'What does it cost?',
    a: 'Quoted after a short discovery call and scoped to your call volume. It usually costs less than a part-time receptionist and never misses a call.',
  },
  {
    q: 'Will it really cover nights and weekends?',
    a: 'That is the entire point. It answers every call, every hour, including the after-hours calls quietly going to voicemail right now.',
  },
  {
    q: 'Can the voice agent speak other languages?',
    a: 'Yes. It speaks over 100 languages and detects the caller automatically, then answers in their language. English, Spanish, French, Portuguese, German, Mandarin, and dozens more. Pick a language on the live demo above and talk to it yourself.',
  },
  {
    q: 'Will it switch languages if my customer does?',
    a: 'Yes. It detects the language the caller is speaking and responds in kind, and it can switch mid-conversation. That means you serve Spanish-speaking and multilingual customers without a second phone line or a bilingual receptionist.',
  },
  {
    q: 'Can it take restaurant orders and send them to my kitchen?',
    a: 'Yes. It reads your menu, takes the full takeout or delivery order, repeats it back to the caller, and sends it to your kitchen or POS, with a pay link or card capture if you want payment up front.',
  },
  {
    q: 'Can it handle the dinner rush when every call comes at once?',
    a: 'That is when it earns its keep. It answers every line at the same time, so the Friday-night flood of takeout and reservation calls all get handled instead of rolling to voicemail.',
  },
];

export default function VoiceAgentsPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'AI Voice Agents', url: '/voice-agents' },
          ]),
          serviceJsonLd({
            name: 'Multilingual AI Voice Agents',
            description:
              'Custom 24/7 AI voice agents that answer every call in a natural human voice, in 100+ languages with automatic language detection. They book appointments, answer FAQs, qualify leads, and route urgent calls. Built and live in about two weeks.',
          }),
          faqJsonLd(faq),
        ]}
      />
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 md:px-8">
          {/* Hero */}
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
              AI Voice Agents · Talking Websites · 24/7
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black text-[#161616] tracking-tight mb-6 leading-[1.05]">
              Plug the{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                Leak
              </span>
            </h1>
            <p className="text-[#3a3733] text-lg font-body leading-relaxed max-w-2xl mx-auto mb-9">
              Most leads go to whoever answers first. A Modern Mustard Seed voice agent picks up every
              call in a natural human voice, day or night, books the appointment, and routes the urgent
              ones to you. No voicemail. No missed sales. No leak.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#calculator"
                className="px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Calculate Your Leak
              </a>
              <Link
                href="/book"
                className="px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Book a Call
              </Link>
            </div>
          </div>

          {/* Live demo: talk to the actual agent (renders when Vapi env is set) */}
          <div className="mb-16">
            <p className="text-center text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-4">
              Yes, this is a talking website. Pick a language and say hi.
            </p>
            <VoiceTalkButton />
          </div>

          {/* Multilingual highlight */}
          <div className="mb-20 pop-card p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <div className="flex-1">
                <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">
                  Speaks 100+ languages
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight leading-[1.1] mb-3">
                  It answers in your customer&apos;s{' '}
                  <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                    language
                  </span>
                </h2>
                <p className="text-[#3a3733] text-base font-body leading-7 max-w-xl">
                  English, Spanish, French, Portuguese, German, Mandarin, and dozens more. Your agent
                  detects the caller and replies in their language automatically, and can switch
                  mid-call. No second line, no bilingual hire. Pick a language on the demo above and
                  hear it for yourself.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:max-w-[240px]">
                {['🇺🇸 English', '🇲🇽 Español', '🇫🇷 Français', '🇧🇷 Português', '🇩🇪 Deutsch', '🇨🇳 中文', '🇷🇺 Русский', '+95 more'].map((t) => (
                  <span key={t} className="px-3 py-1.5 rounded-full border-2 border-[#161616] bg-white text-xs font-sans font-bold text-[#161616]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Whitepaper link */}
          <div className="text-center mb-20">
            <Link
              href="/voice-agents/whitepaper"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#161616] bg-white text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] shadow-[4px_4px_0_0_#161616] hover:bg-[#F5B700] hover:-translate-y-0.5 transition-all"
            >
              Read the AI voice agent whitepaper →
            </Link>
          </div>

          {/* Speed-to-lead stat band */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {stats.map((s) => (
              <div key={s.label} className="pop-card p-7 md:p-8">
                <span className="font-display text-4xl md:text-5xl font-black text-[#F5B700] tracking-tight block mb-2" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  {s.figure}
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-3">
                  {s.label}
                </span>
                <p className="text-[#3a3733] text-sm font-body leading-7">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="text-[#161616]/40 text-[11px] font-body italic text-center mb-20">
            Speed-to-lead figures from widely cited lead-response research.
          </p>

          {/* Calculator (signature interactive moment + lead magnet) */}
          <div id="calculator" className="scroll-mt-28 mb-24">
            <MissedCallCalculator />
          </div>

          {/* What it handles */}
          <div className="mb-24">
            <div className="text-center mb-12">
              <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-5 block">
                What it handles
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.1]">
                A receptionist that never{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  sleeps
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {handles.map((h) => (
                <article key={h.title} className="pop-card p-7 md:p-8 hover:-translate-y-1 transition-transform duration-300">
                  <h3 className="font-display text-xl font-black text-[#161616] tracking-tight mb-2 leading-snug">
                    {h.title}
                  </h3>
                  <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">{h.body}</p>
                </article>
              ))}
            </div>
          </div>

          {/* For restaurants (shared with /for/restaurants) */}
          <RestaurantVoiceSection />

          {/* How it works */}
          <div className="mb-24">
            <div className="text-center mb-12">
              <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-5 block">
                How it works
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.1]">
                Live in about{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  two weeks
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((s) => (
                <article key={s.title} className="pop-card p-8 hover:-translate-y-1 transition-transform duration-300">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-3">
                    {s.eyebrow}
                  </span>
                  <h3 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-3 leading-snug">
                    {s.title}
                  </h3>
                  <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">{s.body}</p>
                </article>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto mb-24">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
                Common{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  Questions
                </span>
              </h2>
            </div>
            <div className="space-y-4">
              {faq.map((item) => (
                <details key={item.q} className="pop-card p-6 group cursor-pointer">
                  <summary className="flex justify-between items-start gap-4 list-none">
                    <h3 className="font-display text-lg font-black text-[#161616] tracking-tight">
                      {item.q}
                    </h3>
                    <span className="text-[#E0301E] text-2xl flex-shrink-0 transition-transform group-open:rotate-45 font-black">
                      +
                    </span>
                  </summary>
                  <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mt-4">{item.a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center pop-card-yellow p-10 mb-16">
            <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-4">
              Stop the leak this month
            </h2>
            <p className="text-[#161616]/75 text-base font-body font-medium mb-6 max-w-lg mx-auto">
              One discovery call. We scope your voice agent to your call volume and you stop sending
              customers to voicemail. Your number, your brand, your calendar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/book"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
              >
                Book a Discovery Call
              </Link>
              <Link
                href="/playbooks/14-day-voice-agent"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Read the 14-Day Playbook
              </Link>
            </div>
          </div>

          {/* Last word: talk it out with Mr. Mustard, voice or chat */}
          <MrMustardHeroCTA location="voice-agents" />

          <div className="mt-16">
            <NewsletterSignup
              headline="Speed-to-lead plays. Weekly."
              subhead="How small businesses stop the leak with AI, automation, and faster follow-up. Free to read. Free to copy."
            />
          </div>
        </div>
      </div>
    </>
  );
}
