import React from 'react';
import MustardTree from './components/MustardTree';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import Contact from './components/Contact';
import VoiceAgentCTA from './components/VoiceAgentCTA';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="relative w-full min-h-screen bg-[#0a0804] text-white selection:bg-mustard-500/30 selection:text-white">
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
          <About />
          <Services />
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
