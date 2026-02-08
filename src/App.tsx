import React, { useState, useEffect } from 'react';
import MustardTree from './components/MustardTree';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SocialProof from './components/SocialProof';
import Services from './components/Services';
import ProductDemo from './components/ProductDemo';
import Contact from './components/Contact';
import VoiceAgentCTA from './components/VoiceAgentCTA';
import Footer from './components/Footer';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'portfolio'>(
    window.location.hash === '#portfolio-page' ? 'portfolio' : 'home'
  );

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(window.location.hash === '#portfolio-page' ? 'portfolio' : 'home');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (currentPage === 'portfolio') {
    return (
      <div className="fixed inset-0 bg-[#0a0804] flex flex-col">
        {/* Back bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-neutral-950/90 border-b border-white/[0.04]">
          <a
            href="#"
            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-mustard-400 transition-colors font-sans font-bold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </a>
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-mono">Portfolio</span>
        </div>
        {/* Iframe */}
        <iframe
          src="https://kingdom-lab.vercel.app/"
          className="flex-1 w-full border-0"
          title="Portfolio — Kingdom Lab"
          allow="autoplay; fullscreen"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-[#0a0804] text-white selection:bg-mustard-500/30 selection:text-white overflow-x-hidden">
      {/* Background Layer (Fixed) — Mustard Tree Animation */}
      <div className="fixed inset-0 z-0">
        <MustardTree />

        {/* Vignette Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_30%,rgba(10,8,4,0.6)_100%)] z-10" />

        {/* Warm ambient glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60 z-20"
          style={{
            background: `
              radial-gradient(ellipse 50% 30% at 50% 55%, rgba(200, 164, 21, 0.03) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 30% 40%, rgba(180, 140, 20, 0.02) 0%, transparent 50%)
            `
          }}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-30">
        <Navbar />
        <main>
          <Hero />
          <SocialProof />
          <Services />
          <ProductDemo />
          <Contact />
        </main>
        <Footer />
      </div>

      {/* VAPI Voice Widget — Olivia */}
      <VoiceAgentCTA />
    </div>
  );
};

export default App;
