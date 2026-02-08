import { useState } from 'react';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      const res = await fetch('https://modern-mustard-seed-voice-agent.onrender.com/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/30 to-transparent" />
      </div>

      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
          Let's Connect
        </span>
        <h2 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
          Plant a <span className="text-gradient-mustard">Seed</span> Together
        </h2>
        <p className="text-white/50 text-base font-body font-light leading-relaxed">
          Whether you're building something meaningful, need AI-powered solutions, or want to explore a partnership — reach out.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Form */}
        <div className="glass-card p-8 md:p-10">
          {submitted ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="font-sans text-xl font-bold text-white mb-3">Seed Planted</h3>
              <p className="text-white/40 text-sm font-body">Your message is on its way. We'll be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30 transition-colors"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30 transition-colors"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">Message</label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30 transition-colors resize-none"
                  placeholder="Tell us about your vision..."
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm font-body text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-black bg-gradient-to-r from-mustard-500 to-mustard-400 rounded-lg hover:shadow-[0_0_30px_rgba(200,164,21,0.2)] transition-all duration-300 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-8">
          {/* Voice Agent CTA */}
          <div className="glass-card p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-mustard-500/10 border border-mustard-500/20 flex items-center justify-center">
                <span className="text-lg">🎙️</span>
              </div>
              <div>
                <h4 className="font-sans text-sm font-bold text-white">Talk to Olivia</h4>
                <p className="text-[10px] text-white/30 font-body">Our AI voice assistant</p>
              </div>
            </div>
            <p className="text-white/30 text-sm font-body font-light leading-6 mb-4">
              Click the mustard button in the bottom-right corner to talk to Olivia. She can answer your questions, walk you through our services, and book a discovery call — 24/7.
            </p>
            <a
              href="https://calendar.app.google/8YvQK2wbL5LPGxtT7"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-mustard-400 border border-mustard-500/30 rounded-lg hover:bg-mustard-500/10 transition-all text-center"
            >
              Book a Discovery Call
            </a>
          </div>

          {/* Direct Contact */}
          <div className="glass-card p-8">
            <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-mono font-bold block mb-4">Direct</span>
            <a
              href="mailto:sarah@modernmustardseed.com"
              className="text-mustard-400/80 text-sm font-body hover:text-mustard-300 transition-colors"
            >
              sarah@modernmustardseed.com
            </a>
          </div>

          {/* Social Links */}
          <div className="glass-card p-8">
            <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 font-mono font-bold block mb-4">Connect</span>
            <div className="flex flex-wrap gap-3">
              {[
                { name: 'X', url: 'https://x.com/sarahmscarano' },
                { name: 'LinkedIn', url: 'https://linkedin.com' },
                { name: 'GitHub', url: 'https://github.com/ModernMustardSeed' },
                { name: 'Instagram', url: 'https://instagram.com' },
                { name: 'TikTok', url: 'https://tiktok.com' },
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-white/30 border border-white/[0.06] rounded-full hover:border-mustard-500/30 hover:text-mustard-400 transition-all"
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
};

export default Contact;
