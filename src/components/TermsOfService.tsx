const TermsOfService: React.FC = () => {
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
          Terms of <span className="text-gradient-mustard">Service</span>
        </h1>
        <p className="text-white/30 text-sm font-mono mb-12">Last updated: February 7, 2026</p>

        <div className="space-y-10 text-white/60 font-body text-base leading-7">
          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">1. Services</h2>
            <p>
              Modern Mustard Seed ("we," "us," "our") provides AI-powered product development, voice agent solutions,
              full-stack development, and brand strategy services. These terms govern your use of our website at
              modernmustardseed.com and any services we provide.
            </p>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">2. Use of Website</h2>
            <p>By accessing our website, you agree to:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-white/50">
              <li>Use the site for lawful purposes only.</li>
              <li>Not attempt to interfere with the site's functionality or security.</li>
              <li>Not scrape, crawl, or extract data from the site beyond what is publicly available and intended for consumption (see our robots.txt and llms.txt).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">3. Voice Agent Demos</h2>
            <p>
              Our live voice agent demos are provided for demonstration purposes. Conversations are processed in real-time
              by our AI voice agent (powered by Vapi) and are not recorded or stored. By using the demo, you consent to
              interacting with an AI system.
            </p>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">4. Intellectual Property</h2>
            <p>
              All content on this website — including design, code, animations, text, and branding — is the property of
              Modern Mustard Seed and is protected by copyright and intellectual property laws. You may not reproduce,
              distribute, or create derivative works without written permission.
            </p>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">5. Client Engagements</h2>
            <p>
              Service engagements are governed by individual project agreements. These website terms do not constitute
              a service agreement. Specific deliverables, timelines, payment terms, and intellectual property ownership
              for client work are defined in separate contracts.
            </p>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">6. Limitation of Liability</h2>
            <p>
              Modern Mustard Seed provides this website and its demos "as is" without warranties of any kind.
              We are not liable for any damages arising from your use of the website, voice demos, or reliance on
              information presented here.
            </p>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">7. Changes to Terms</h2>
            <p>
              We may update these terms at any time. Continued use of the website after changes constitutes acceptance
              of the updated terms. Material changes will be noted by updating the "Last updated" date above.
            </p>
          </section>

          <section>
            <h2 className="font-sans text-xl font-bold text-white/80 mb-3">8. Contact</h2>
            <p>
              Questions about these terms? Contact us at{' '}
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

export default TermsOfService;
