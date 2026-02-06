import { useState, useEffect } from 'react';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
      scrolled ? 'bg-neutral-950/80 backdrop-blur-md border-b border-white/[0.04]' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-5 flex justify-between items-center">
        {/* Brand */}
        <a href="#" className="font-sans text-xs md:text-sm tracking-[0.15em] text-white/60 uppercase font-bold hover:text-white/90 transition-colors">
          Modern Mustard Seed
        </a>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[11px] uppercase tracking-[0.2em] text-white/40 hover:text-mustard-400 transition-colors font-body font-medium"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/50 transition-all"
          >
            Talk to Olivia
          </a>
        </div>

        {/* Mobile: status indicator */}
        <div className="md:hidden flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] text-white/30 tracking-widest uppercase font-mono">Active</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
