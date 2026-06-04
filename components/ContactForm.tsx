'use client';

import { useState } from 'react';
import { bookingUrl, socials } from '@/data/socials';

type Props = {
  defaultPackage?: string;
  defaultMessage?: string;
};

export default function ContactForm({ defaultPackage, defaultMessage }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message:
      defaultMessage ??
      (defaultPackage ? `I'm interested in the ${defaultPackage} package.` : ''),
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: defaultPackage }),
      });

      if (res.ok) {
        setSubmitted(true);
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
    <section id="contact" className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-28 md:py-40">
      <div className="flex justify-center mb-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-[#161616]/20 to-transparent" />
      </div>

      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
          Let&rsquo;s Connect
        </span>
        <h2 className="font-display text-4xl md:text-5xl font-black text-[#161616] tracking-tight mb-6">
          Plant a{' '}
          <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
            Seed
          </span>{' '}
          Together
        </h2>
        <p className="text-[#3a3733] text-base font-body leading-relaxed">
          Whether you&rsquo;re building something meaningful, need AI-powered solutions, or want to explore a partnership. Reach out.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 max-w-6xl mx-auto">
        <div className="pop-card p-8 md:p-10">
          {submitted ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="font-display text-xl font-black text-[#161616] mb-3">Seed Planted</h3>
              <p className="text-[#3a3733] text-sm font-body">
                Your message is on its way. We&rsquo;ll be in touch within 24-48 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/35 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/35 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/35 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow resize-none"
                  placeholder="Tell us about your vision..."
                />
              </div>
              {error && <p className="text-[#E0301E] text-sm font-body font-bold text-center">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-lg border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-8">
          <div className="pop-card-yellow p-8">
            <span className="text-[9px] uppercase tracking-[0.3em] text-[#161616] font-mono font-bold block mb-4">
              Book a Call
            </span>
            <h4 className="font-display text-sm font-black text-[#161616] mb-3">Ready to build something?</h4>
            <p className="text-[#161616]/75 text-sm font-body font-medium leading-6 mb-5">
              Schedule a free 30-minute discovery call to talk through your project and see if we&rsquo;re a fit.
            </p>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] border-2 border-[#161616] rounded-lg hover:-translate-y-0.5 transition-all text-center"
            >
              Book a Discovery Call
            </a>
          </div>

          <div className="pop-card p-8">
            <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-4">
              Direct
            </span>
            <a
              href="mailto:sarah@modernmustardseed.com"
              className="text-[#1E50C8] text-sm font-body font-bold hover:text-[#E0301E] transition-colors"
            >
              sarah@modernmustardseed.com
            </a>
          </div>

          <div className="pop-card p-8">
            <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-4">
              Connect
            </span>
            <div className="flex flex-wrap gap-3">
              {socials.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#F5B700] transition-all"
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
