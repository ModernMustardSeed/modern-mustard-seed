import React, { useState, useEffect } from 'react';
import MustardTree from './components/MustardTree';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SocialProof from './components/SocialProof';
import Portfolio from './components/Portfolio';
import VideoShowcase from './components/VideoShowcase';
import Services from './components/Services';
import Insights from './components/Insights';
import Contact from './components/Contact';
import Footer from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import AIAuditEngine from './components/AIAuditEngine';

type Page = 'home' | 'privacy' | 'terms' | 'ai-audit';

function getPage(): Page {
  const hash = window.location.hash;
  if (hash === '#privacy') return 'privacy';
  if (hash === '#terms') return 'terms';
  if (hash === '#ai-audit') return 'ai-audit';
  return 'home';
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(getPage);

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(getPage());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (currentPage === 'privacy') return <PrivacyPolicy />;
  if (currentPage === 'terms') return <TermsOfService />;
  if (currentPage === 'ai-audit') return <AIAuditEngine />;

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
          <Portfolio />
          <VideoShowcase />
          <Services />
          <Insights />
          <Contact />
        </main>
        <Footer />
      </div>

    </div>
  );
};

export default App;
