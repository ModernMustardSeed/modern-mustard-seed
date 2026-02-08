import { useState, useEffect } from 'react';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks: { label: string; href: string }[] = [
    { label: 'Services', href: '#services' },
    { label: 'Live Demo', href: '#demo' },
    { label: 'Contact', href: '#contact' },
    { label: 'Portfolio', href: '#portfolio-page' },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
      scrolled || menuOpen ? 'bg-neutral-950/80 backdrop-blur-md border-b border-white/[0.04]' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-5 flex justify-between items-center">
        {/* Brand */}
        <a href="#" className="font-sans text-xs md:text-sm tracking-[0.15em] text-white/60 uppercase font-bold hover:text-white/90 transition-colors">
          Modern Mustard Seed
        </a>

        {/* Desktop Nav Links */}
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

        {/* Mobile: Hamburger Button */}
        <button
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-px bg-white/60 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} />
          <span className={`block w-5 h-px bg-white/60 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-px bg-white/60 transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu Panel */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${
        menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-6 pb-6 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-mustard-400 transition-colors font-body font-medium py-1"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setMenuOpen(false)}
            className="mt-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/50 transition-all text-center"
          >
            Talk to Olivia
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
