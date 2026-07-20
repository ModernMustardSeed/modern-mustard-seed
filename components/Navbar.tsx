'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { navLinks, socials, facebookUrl } from '@/data/socials';

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M14.02 22v-8.94h3l.45-3.48h-3.45V7.36c0-1.01.28-1.69 1.72-1.69h1.85V2.56A24.6 24.6 0 0 0 15.9 2.4c-2.67 0-4.5 1.63-4.5 4.63v2.55H8.4v3.48h3v8.94h2.62Z" />
    </svg>
  );
}

// Curated site map for the hamburger menu: fewer, clearer doors. Everything
// dropped here (Idea to Spec, AI-Proof, industries, legal) stays reachable
// through Services, the footer, and in-page cross-links.
const MENU_GROUPS = [
  {
    heading: 'Work With Us',
    links: [
      { label: 'How It Works', href: '/work-with-us' },
      { label: 'Services', href: '/services' },
      { label: 'The Work', href: '/work' },
      { label: 'Join the Build Queue', href: '/build-queue' },
    ],
  },
  {
    heading: 'Free Tools',
    links: [
      { label: 'Bottleneck Breaker', href: '/audit' },
      { label: 'Launch Checklist', href: '/launch-checklist' },
      { label: 'Prompt Playbook', href: '/prompt-playbook' },
      { label: 'Free Playbooks', href: '/playbooks' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Store', href: '/store' },
      { label: 'Contact', href: '/contact' },
      { label: 'Client Portal', href: '/portal' },
    ],
  },
];

// The Studio Departments: every door opens free. Rendered as the signature
// ink panel near the bottom of the drawer (names in Title Case, descriptors
// in tracked mono caps; never a lowercase opener).
const DEPARTMENTS = [
  { name: 'Sidekick Forge', tag: 'FREE RECEPTIONIST DEMO', href: '/sidekick' },
  { name: 'The Switchboard', tag: 'FREE FRANCHISE DEMO LINE', href: '/switchboard' },
  { name: 'Mustard Broadcast', tag: 'WE RUN YOUR ADS', href: '/ads' },
  { name: 'Mustard Pictures', tag: 'FREE SCREEN TEST', href: '/pictures' },
  { name: 'Mustard Press', tag: 'FREE TYPESET PROOF', href: '/press' },
  { name: 'GEO Desk', tag: 'FREE AI-FINDABILITY GRADE', href: '/website-audit' },
  { name: 'Mustard Hatchery', tag: 'FREE FIRST GLIMPSE', href: '/hatchery' },
  { name: 'Mustard Mode', tag: 'LEARN CLAUDE WITH A COACH', href: '/mustard-mode' },
  { name: 'Mustard Launch', tag: 'YOUR AI LAUNCH COACH', href: '/mustard-launch' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The layout wraps the nav in a `relative z-30` stacking context, so the
  // menu overlay must portal to <body> to stack above the floating chat
  // launcher (z-80) while staying under the cookie banner (z-120).
  const [mounted, setMounted] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname() || '/';

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // App shells (admin, client portal, program HQs) have their own headers, and
  // forged demos are single-offer sales pages. Hide the marketing nav on both
  // so it never overlaps them or sells a competing offer. The voice demo still
  // lives at the legacy /sidekick/demo/ path.
  const isAppShell =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/portal') ||
    pathname.endsWith('/hq') ||
    pathname === '/partners/playbook' ||
    pathname.startsWith('/demo/') ||
    pathname.startsWith('/hatchery/') ||
    pathname.startsWith('/sidekick/demo/');
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
              sizes="40px"
              className="h-9 w-auto md:h-10"
              priority
            />
            <span className="font-sans text-sm md:text-base tracking-[0.06em] text-[#161616] uppercase font-extrabold">
              Modern Mustard Seed
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4 xl:gap-6">
            {/* The inline link row rides at xl. Free Demos made it five links next to
                two pills, which wrapped the bar to two rows (and 102px tall) from 768
                to 1279. Below xl the row folds into the hamburger, and the two doors
                that earn their keep (Free Demos, Book a Call) stay out as pills. */}
            <div className="hidden xl:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[11px] uppercase tracking-[0.2em] transition-colors font-body font-bold text-[#161616]/70 hover:text-[#E0301E]"
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

            {/* Between the phone and the full row, Free Demos is the door that pays. */}
            <Link
              href="/demos"
              className="hidden sm:inline-flex xl:hidden items-center px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Free Demos
            </Link>

            {/* Facebook: the company page, one tap from every screen. */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Modern Mustard Seed on Facebook"
              title="Modern Mustard Seed on Facebook"
              className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#161616] bg-white text-[#1E50C8] shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:bg-[#FFF8E6] transition-all"
            >
              <FacebookMark />
            </a>

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

      {/* Full-screen mega-menu overlay (portaled to <body>, see `mounted`) */}
      {mounted && createPortal(
      <div
        id="site-mega-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={`fixed inset-0 z-[90] transition-all duration-300 ${
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

            {/* Free Demos: the door the ads point at. On phones the nav pill is
                hidden, so this is where it lives. */}
            <Link
              href="/demos"
              onClick={() => setMenuOpen(false)}
              className="group block rounded-2xl border-2 border-[#161616] bg-[#F5B700] shadow-[5px_5px_0_0_#161616] p-5 md:p-6 mb-5 hover:-translate-y-0.5 transition-transform"
            >
              <span className="block text-[10px] uppercase tracking-[0.32em] text-[#161616]/70 font-mono font-bold mb-1.5">
                Free · No Card · No Meeting
              </span>
              <span className="block font-display font-black text-2xl md:text-3xl tracking-tight text-[#161616] leading-snug">
                Free Demos <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
              </span>
              <span className="block font-body text-[13px] text-[#161616]/75 mt-1 leading-relaxed">
                An AI receptionist, a command center, and a new website. All three built for your business.
              </span>
            </Link>

            {/* Featured: Work With Us gets visual priority. */}
            <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616] p-6 md:p-7 mb-8">
              <span className="block text-[11px] uppercase tracking-[0.32em] text-[#E0301E] font-mono font-bold mb-1.5">
                {MENU_GROUPS[0].heading}
              </span>
              <p className="font-display italic font-bold text-[#161616] text-base md:text-lg leading-snug mb-5">
                Bring your idea. We bring it to life in weeks, not months.
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

            {/* The Studio Departments: the signature ink panel */}
            <div className="relative mt-9 rounded-2xl border-2 border-[#161616] bg-[#161616] shadow-[5px_5px_0_0_#F5B700] overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(rgba(245,183,0,0.35) 1.3px, transparent 1.4px)',
                  backgroundSize: '18px 18px',
                }}
              />
              <div className="relative p-6 md:p-7">
                <span className="block text-[10px] uppercase tracking-[0.32em] text-[#F5B700] font-mono font-bold mb-4">
                  The Studio Departments · Every Door Opens Free
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {DEPARTMENTS.map((d) => {
                    const active = pathname === d.href;
                    return (
                      <li key={d.href}>
                        <Link
                          href={d.href}
                          onClick={() => setMenuOpen(false)}
                          className="group block"
                        >
                          <span
                            className={`block font-display font-black text-lg md:text-xl tracking-tight leading-snug transition-colors ${
                              active ? 'text-[#F5B700]' : 'text-[#FBF6EA] group-hover:text-[#F5B700]'
                            }`}
                          >
                            {d.name}
                          </span>
                          <span className="block font-mono text-[9px] uppercase tracking-[0.24em] text-[#F5B700]/75 mt-0.5">
                            {d.tag}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
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

            {/* Team access */}
            <div className="mt-7 pt-6 border-t-2 border-[#161616]/15 pb-2">
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                <span aria-hidden="true">🔒</span> Admin Login
              </Link>
            </div>
          </div>
        </div>
      </div>,
      document.body
      )}
    </>
  );
}
