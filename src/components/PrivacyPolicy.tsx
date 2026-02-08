const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0804] text-white">
      {/* Back bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-neutral-950/90 border-b border-white/[0.04] sticky top-0 z-50">
        <a
          href="#"
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-mustard-400 transition-colors font-sans font-bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-4 block">
          Legal
        </span>
        <h1 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
          Privacy <span className="text-gradient-mustard">Policy</span>
        </h1>
        <p className="text-white/30 text-sm font-mono mb-12">Last updated: February 7, 2026</p>

        <div className="space-y-10 text-white/60 font-body text-base leading-7">
          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">1. Information We Collect</h2>
            <p>When you use our website or services, we may collect:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-white/50">
              <li><strong className="text-white/70">Contact information</strong> — name, email address, and any details you provide through our contact form.</li>
              <li><strong className="text-white/70">Usage data</strong> — anonymous analytics about how you interact with our site (page views, device type, referral source) collected via Vercel Analytics.</li>
              <li><strong className="text-white/70">Voice demo data</strong> — if you use our live voice agent demo, the conversation is processed in real-time and is not stored or recorded.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">2. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-white/50">
              <li>Respond to your inquiries and provide our services.</li>
              <li>Improve our website experience based on anonymous usage patterns.</li>
              <li>Send project-related communications (we do not send marketing emails without consent).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">3. Data Sharing</h2>
            <p>We do not sell, trade, or rent your personal information. We may share data with:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-white/50">
              <li><strong className="text-white/70">Service providers</strong> — Vercel (hosting & analytics), Supabase (data storage), Vapi (voice AI processing).</li>
              <li><strong className="text-white/70">Legal requirements</strong> — if required by law or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">4. Cookies & Tracking</h2>
            <p>
              We use Vercel Analytics, which is privacy-friendly and does not use cookies or track individuals across sites.
              No cookie consent banner is required. We do not use third-party advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including HTTPS encryption,
              secure hosting on Vercel, and encrypted database connections via Supabase.
            </p>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-white/50">
              <li>Request access to any personal data we hold about you.</li>
              <li>Request deletion of your personal data.</li>
              <li>Opt out of any communications.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">7. Contact</h2>
            <p>
              For privacy-related questions, contact us at{' '}
              <a href="mailto:sarah@modernmustardseed.com" className="text-mustard-400 hover:text-mustard-300 transition-colors">
                sarah@modernmustardseed.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
