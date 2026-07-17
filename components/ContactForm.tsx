'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { socials } from '@/data/socials';
import { trackLead, metaDedup } from '@/lib/analytics';

type Props = {
  defaultPackage?: string;
  defaultMessage?: string;
};

/** Routing chips. Each one pre-fills the note and tags the lead, so Sarah knows
 *  what a message is before she opens it. */
const TOPICS = [
  { id: 'build', label: 'I want something built', seed: 'I want to build ' },
  { id: 'partnership', label: 'Partnership', seed: 'I have a partnership idea: ' },
  { id: 'press', label: 'Press', seed: 'I am writing about ' },
  { id: 'hello', label: 'Just saying hi', seed: 'Hi Sarah, ' },
];

export default function ContactForm({ defaultPackage, defaultMessage }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message:
      defaultMessage ??
      (defaultPackage ? `I'm interested in the ${defaultPackage} package.` : ''),
  });
  const [topic, setTopic] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  /** Picking a topic seeds the note, but never clobbers something already typed. */
  const pickTopic = (t: (typeof TOPICS)[number]) => {
    setTopic(t.id);
    setFormData((d) => (d.message.trim().length === 0 ? { ...d, message: t.seed } : d));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    const source = defaultPackage ?? topic ?? undefined;

    try {
      const dedup = metaDedup();
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source, ...dedup }),
      });

      if (res.ok) {
        setSubmitted(true);
        trackLead({
          source: source ? `contact-${source}` : 'contact-form',
          eventId: dedup.metaEventId,
        });
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to send. Please email sarah@modernmustardseed.com directly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="w-full max-w-6xl mx-auto px-6 pb-20 md:pb-28">
      <PostmarkStyles />

      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-10 lg:gap-14 items-start">
        {/* ───── The reply card ───── */}
        <div className="relative">
          {/* Perforated tear line, so the card reads as torn from the magazine. */}
          <div aria-hidden="true" className="absolute -top-[3px] left-6 right-6 border-t-[3px] border-dashed border-[#161616]/35" />

          <div className="relative rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-9 shadow-[7px_7px_0_0_#161616]">
            <div className="flex items-start justify-between gap-4 border-b-2 border-[#161616] pb-4">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#E0301E]">Business Reply Card</p>
                <p className="mt-1 font-display text-2xl font-extrabold leading-none text-[#161616]">Modern Mustard Seed</p>
                <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5c554a]">Kalispell, Montana · no postage necessary</p>
              </div>

              {/* The mascot IS the postage. The postmark cancels it on send. */}
              <div className="relative flex-shrink-0">
                <div className="postage relative grid h-[74px] w-[64px] place-items-center rounded-[3px] border-2 border-[#161616] bg-[#F5B700]">
                  <span className="relative h-9 w-9">
                    <Image src="/brand/mascot.png" alt="" fill sizes="36px" className="object-contain" />
                  </span>
                  <p className="absolute bottom-1 font-mono text-[6px] font-bold tracking-[0.1em] text-[#161616]">MMS · 1¢</p>
                </div>
                {submitted && (
                  <div aria-hidden="true" className="cf-postmark pointer-events-none absolute -inset-3 grid place-items-center">
                    <div className="h-[76px] w-[76px] rounded-full border-[3px] border-[#E0301E] opacity-70" />
                    <div className="absolute h-[52px] w-[52px] rounded-full border-2 border-[#E0301E] opacity-60" />
                    <p className="absolute rotate-[-12deg] font-mono text-[7px] font-bold uppercase tracking-[0.08em] text-[#E0301E]">
                      Received
                    </p>
                  </div>
                )}
              </div>
            </div>

            {submitted ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                <div className="cf-land relative h-16 w-16">
                  <Image src="/brand/mascot.png" alt="" fill sizes="64px" className="object-contain" />
                </div>
                <h2 className="mt-5 font-display text-2xl font-extrabold text-[#161616]">In the mail.</h2>
                <p className="mt-2 max-w-sm font-body text-[15px] leading-relaxed text-[#5c554a]">
                  Your note is stamped, cancelled, and sitting in Sarah&rsquo;s inbox. She answers inside a day, and it will be her, not a template.
                </p>
                <p className="mt-5 font-body text-sm text-[#5c554a]">
                  In a hurry?{' '}
                  <Link href="/book" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#E0301E]">
                    Get on the book instead
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#5c554a]">What is this about?</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {TOPICS.map((t) => {
                      const active = topic === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => pickTopic(t)}
                          className={`rounded-full border-2 border-[#161616] px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${
                            active
                              ? 'bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616] -translate-y-0.5'
                              : 'bg-white text-[#161616] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#161616]'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#5c554a]">Name</span>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={inputCls}
                        placeholder="Your name"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#5c554a]">Email</span>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={inputCls}
                        placeholder="your@email.com"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#5c554a]">Your note</span>
                    <textarea
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className={inputCls}
                      placeholder="What are you building, and where are you stuck?"
                    />
                  </label>

                  {error && (
                    <p role="alert" className="text-center font-body text-sm font-bold text-[#E0301E]">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full rounded-full border-2 border-[#161616] bg-[#F5B700] py-4 font-sans text-sm font-extrabold uppercase tracking-[0.16em] text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616] disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {sending ? 'Mailing...' : 'Mail it'}
                  </button>
                  <p className="text-center font-body text-[13px] text-[#5c554a]">
                    A human answers inside a day. Usually Sarah, usually sooner.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

        {/* ───── The direct lines ───── */}
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-7 shadow-[5px_5px_0_0_#161616]">
            <span className="mb-3 block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#161616]/70">Rather just talk?</span>
            <h2 className="font-display text-xl font-extrabold text-[#161616]">Get on the book.</h2>
            <p className="mt-2 mb-5 font-body text-[15px] font-medium leading-relaxed text-[#161616]/80">
              A free 30-minute discovery call with Sarah. Pick a time, tell her what you are building, and she comes prepared.
            </p>
            <Link
              href="/book"
              className="block w-full rounded-lg border-2 border-[#161616] bg-[#161616] py-3 text-center font-sans text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#F5B700] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(22,22,22,.35)]"
            >
              Pick a time
            </Link>
          </div>

          <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[5px_5px_0_0_#161616]">
            <span className="mb-3 block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#E0301E]">Direct</span>
            <a
              href="mailto:sarah@modernmustardseed.com"
              className="font-body text-sm font-bold text-[#1E50C8] transition-colors hover:text-[#E0301E]"
            >
              sarah@modernmustardseed.com
            </a>
            <p className="mt-2 font-body text-[13px] leading-relaxed text-[#5c554a]">
              Straight to Sarah. No ticket number, no queue.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[5px_5px_0_0_#161616]">
            <span className="mb-3 block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#E0301E]">Connect</span>
            <div className="flex flex-wrap gap-2.5">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border-2 border-[#161616] bg-white px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#161616] transition-all hover:-translate-y-0.5 hover:bg-[#F5B700] hover:shadow-[2px_2px_0_0_#161616]"
                >
                  {social.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const inputCls =
  'w-full resize-none rounded-lg border-2 border-[#161616] bg-white px-4 py-3 font-body text-sm text-[#161616] placeholder-[#767066] transition-shadow focus:outline-none focus:shadow-[3px_3px_0_0_#161616]';

/** The postmark rotates down and cancels the stamp. Static for reduced-motion readers. */
function PostmarkStyles() {
  return (
    <style>{`
      @keyframes cf-cancel {
        0%   { opacity: 0; transform: rotate(-42deg) scale(1.7); }
        60%  { opacity: 1; transform: rotate(4deg) scale(.95); }
        100% { opacity: 1; transform: rotate(0deg) scale(1); }
      }
      .cf-postmark { animation: cf-cancel .5s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes cf-drop {
        0%   { opacity: 0; transform: translateY(-14px) rotate(-8deg); }
        100% { opacity: 1; transform: none; }
      }
      .cf-land { animation: cf-drop .5s cubic-bezier(.2,.8,.2,1) both .12s; }
      @media (prefers-reduced-motion: reduce) {
        .cf-postmark, .cf-land { animation: none; opacity: 1; transform: none; }
      }
    `}</style>
  );
}
