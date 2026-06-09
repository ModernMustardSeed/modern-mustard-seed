'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { navLinks, socials } from '@/data/socials';

// Comprehensive site map for the hamburger mega-menu. Public pages only
// (admin, portals, and program HQs run their own shells).
const MENU_GROUPS = [
  {
    heading: 'Work With Us',
    links: [
      { label: 'How It Works', href: '/work-with-us' },
      { label: 'Services', href: '/services' },
      { label: 'Idea to Spec', href: '/idea-to-spec' },
      { label: 'The Terminal', href: '/the-terminal' },
      { label: 'AI-Proof Your Business', href: '/ai-proof' },
      { label: 'Join the Build Queue', href: '/build-queue' },
    ],
  },
  {
    heading: 'Free Tools',
    links: [
      { label: 'Free AI Audit', href: '/audit' },
      { label: 'Website Audit', href: '/website-audit' },
      { label: 'Free Playbooks', href: '/playbooks' },
    ],
  },
  {
    heading: 'Explore',
    links: [
      { label: 'The Work', href: '/work' },
      { label: 'Blog', href: '/blog' },
      { label: 'Playbook Store', href: '/store' },
      { label: 'For Your Industry', href: '/for' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Partners', href: '/partners' },
      { label: 'Client Portal', href: '/portal' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname() || '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close the menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll, manage focus, and wire Escape-to-close while open.
  useEffect(() => {
    if (!menuOpen) return;
    const prevFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus into the menu so keyboard + screen-reader users land here.
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      // Return focus to wherever it was before opening.
      prevFocused?.focus?.();
    };
  }, [menuOpen]);

  // App shells (admin, client portal, program HQs) have their own headers.
  // Hide the marketing nav there so it never overlaps them.
  const isAppShell =
    pathname.startsWith('/admin') || pathname.startsWith('/portal') || pathname.endsWith('/hq');
  if (isAppShell) return null;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 bg-[#FBF6EA]/95 backdrop-blur-md border-b-2 border-[#161616] ${
          scrolled ? 'shadow-[0_3px_0_0_rgba(22,22,22,0.12)]' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-3.5 flex justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <Image
              src="/brand/mascot.png"
              alt=""
              width={885}
              height={1180}
              className="h-9 w-auto md:h-10"
              priority
            />
            <span className="font-sans text-sm md:text-base tracking-[0.06em] text-[#161616] uppercase font-extrabold">
              Modern Mustard Seed
            </span>
          </Link>

          <div className="flex items-center gap-4 md:gap-6">
            {/* Existing inline desktop nav stays exactly as it was. */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[11px] uppercase tracking-[0.2em] text-[#161616]/70 hover:text-[#E0301E] transition-colors font-body font-bold"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/portal"
                className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] hover:bg-[#FFF8E6] transition-all"
              >
                Clients
              </Link>
              <Link
                href="/book"
                className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Book a Call
              </Link>
            </div>

            {/* Hamburger: top right, ALL breakpoints, opens the full menu. */}
            <button
              className="flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-full border-2 border-[#161616] bg-white shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="site-mega-menu"
            >
              <span
                className={`block w-5 h-0.5 bg-[#161616] transition-all duration-300 ${
                  menuOpen ? 'rotate-45 translate-y-[4px]' : ''
                }`}
              />
              <span
                className={`block w-5 h-0.5 bg-[#161616] transition-all duration-300 ${
                  menuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block w-5 h-0.5 bg-[#161616] transition-all duration-300 ${
                  menuOpen ? '-rotate-45 -translate-y-[4px]' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Full-screen mega-menu overlay */}
      <div
        id="site-mega-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={`fixed inset-0 z-[60] transition-all duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[#161616]/40 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Panel */}
        <div
          className={`absolute right-0 top-0 h-full w-full sm:max-w-2xl bg-[#FBF6EA] border-l-2 border-[#161616] overflow-y-auto transition-transform duration-300 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Halftone texture */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(245,183,0,0.22) 1.4px, transparent 1.5px)',
              backgroundSize: '20px 20px',
            }}
          />

          <div className="relative z-10 px-7 md:px-10 py-7">
            {/* Header row */}
            <div className="flex items-center justify-between mb-9">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold">
                Menu
              </span>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="w-10 h-10 rounded-full border-2 border-[#161616] bg-white text-[#161616] text-xl leading-none flex items-center justify-center shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                ×
              </button>
            </div>

            {/* Featured: Work With Us gets visual priority. */}
            <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616] p-6 md:p-7 mb-8">
              <span className="block text-[11px] uppercase tracking-[0.32em] text-[#E0301E] font-mono font-bold mb-1.5">
                {MENU_GROUPS[0].heading}
              </span>
              <p className="font-display italic font-bold text-[#161616] text-base md:text-lg leading-snug mb-5">
                Bring your idea. We bring it to life in 30 days.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {MENU_GROUPS[0].links.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`font-display font-black text-xl md:text-2xl tracking-tight leading-snug transition-colors ${
                          active ? 'text-[#E0301E]' : 'text-[#161616] hover:text-[#E0301E]'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Secondary groups */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-8">
              {MENU_GROUPS.slice(1).map((group) => (
                <div key={group.heading}>
                  <span className="block text-[10px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold mb-3">
                    {group.heading}
                  </span>
                  <ul className="flex flex-col gap-2">
                    {group.links.map((link) => {
                      const active = pathname === link.href;
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className={`font-display font-black text-base md:text-lg tracking-tight leading-snug transition-colors ${
                              active ? 'text-[#E0301E]' : 'text-[#161616] hover:text-[#E0301E]'
                            }`}
                          >
                            {link.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {/* Primary CTAs */}
            <div className="mt-11 flex flex-col sm:flex-row gap-3">
              <Link
                href="/book"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Book a Call
              </Link>
              <Link
                href="/build-queue"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Join the Build Queue
              </Link>
            </div>

            {/* Socials */}
            <div className="mt-9 pt-7 border-t-2 border-[#161616]/15">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold mb-3.5">
                Follow
              </span>
              <div className="flex flex-wrap gap-2.5">
                {socials.map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-[#161616] bg-white rounded-full border-2 border-[#161616] hover:bg-[#FFF8E6] hover:-translate-y-0.5 transition-all"
                  >
                    {s.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
