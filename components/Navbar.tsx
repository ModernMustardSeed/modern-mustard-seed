'use client';

import Link from '@/components/AttributionLink';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { navLinks, socials } from '@/data/socials';
import { DEMO_LINE } from '@/data/trade-pages';

// The hamburger menu is short on purpose (Sarah, 2026-10-05: "way too much in
// the hamburger menu"). Six offers, six studio doors, two calls to action.
// Every page that came off it (industries, places, the buyer's guides, partner
// programs, the parked departments below) still answers at its URL and stays
// listed in the footer and the sitemap.
const STUDIO_LINKS = [
  { label: 'The Work', href: '/work' },
  { label: 'All Services', href: '/services' },
  { label: 'How We Work', href: '/work-with-us' },
  { label: 'About the Studio', href: '/about' },
  { label: 'Journal', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

// What We Build: the offers at the top of the ink menu. History of the old panel
// of the drawer (names in Title Case, descriptors in tracked mono caps; never a
// lowercase opener).
//
// PARKED 2026-09-11 (Sarah, the boutique pass): every department whose tag was
// a giveaway or a self-serve price came off this panel. GEO Desk, The
// Hundredfold Roadmap, The Switchboard, Mustard Mode, Mustard Launch,
// HUNDREDFOLD, Seed to System, Idea to Spec, The Terminal, the Store, the
// Playbooks, the Field Guide, the comic, and the demo build are all still live
// at their URLs so links, ads, Stripe returns, and drips keep working. They are
// simply not advertised from the studio's own navigation any more.
//
// PARKED 2026-08-07 (Sarah): The Mustard Tree, Mustard Press, and Mustard
// Hatchery are pulled from every nav, index, sitemap, and llms.txt entry. The
// pages still build and answer at their URLs, they are just not discoverable.
// Restore these three rows (plus the Footer, sitemap, services-hub, llms.txt,
// front-desk, quotable, and comic entries) to bring them back.
//
// UNPARKED 2026-08-11 (Sarah): Celebrate came back on its own when the launch
// countdown shipped, listed everywhere except lib/quotable.ts.
//
// RE-PARKED 2026-08-20 (Sarah): Celebrate is off every listing surface again
// (nav, footer, sitemap, llms.txt, services hub, comic) and noindexed. The
// route and the waitlist drip keep working; it is only undiscoverable.
//
// PARKED 2026-08-12 (Sarah): The Voice Agent Build is pulled from every nav,
// index, cross-sell CTA, sitemap, and llms.txt entry, and noindexed. Three voice
// agent pages competed with each other; /voice-agents and /demos are the two
// that stay. The route still answers so the Meta campaign, Stripe checkout
// returns, and the demo agent drip keep working, and the built demos at
// /voice-agents/build/demo/<runId> are untouched. To bring it back: restore this
// row plus the Footer, sitemap, services-hub, llms.txt, front-desk, portfolio,
// industries, partner-swipe, jsonld, and comic entries, drop the noindex flag on
// app/voice-agents/build/page.tsx, and repoint the cross-sell CTAs.
const OFFERS = [
  { name: 'AI For Your Business', tag: 'AI WEBSITES, RECEPTIONISTS AND AGENTS', href: '/ai' },
  { name: 'Websites And Brand', tag: 'DESIGN-LED, BUILT TO BE FOUND', href: '/websites' },
  { name: 'Voice Agents', tag: `THE STUDIO LINE: ${DEMO_LINE.display}`, href: '/voice-agents' },
  { name: 'Custom Software', tag: 'APPLICATIONS, STORES, AGENTIC SYSTEMS', href: '/services' },
  { name: 'Marketing', tag: 'SOCIAL, BLOG, ADS AND EMAIL', href: '/marketing' },
  { name: 'Advisory', tag: 'RETAINED COUNSEL, BY THE QUARTER', href: '/advisory' },
];

/** `menuOnly` renders just the menu overlay, for a page that draws its own
 *  header (the homepage). Any button marked `data-site-menu-toggle` opens it. */
export default function Navbar({ menuOnly = false }: { menuOnly?: boolean } = {}) {
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

  // A page with its own header opens the menu from its own button.
  useEffect(() => {
    if (!menuOnly) return;
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('[data-site-menu-toggle]')) setMenuOpen((o) => !o);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [menuOnly]);

  useEffect(() => {
    if (!menuOnly) return;
    document.querySelectorAll('[data-site-menu-toggle]').forEach((b) => {
      b.setAttribute('aria-expanded', String(menuOpen));
      b.setAttribute('aria-label', menuOpen ? 'Close menu' : 'Open menu');
    });
  }, [menuOnly, menuOpen]);

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
      if (e.key === 'Tab') {
        const panel = document.getElementById('site-mega-menu');
        const items = Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex="0"]') ?? []).filter(el => el.getClientRects().length > 0);
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
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
  // built demos are single-offer sales pages. Hide the marketing nav on both
  // so it never overlaps them or sells a competing offer. The voice demo still
  // lives at the legacy /voice-agents/build/demo/ path.
  const isAppShell =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/cc') ||
    pathname.startsWith('/office') ||
    pathname.endsWith('/hq') ||
    pathname === '/partners/playbook' ||
    pathname.startsWith('/demo/') ||
    pathname.startsWith('/hatchery/') ||
    // The Cross + Covenant booth and the Eternal Optimist booth are other
    // houses. MMS marketing nav across the top of either one is exactly the blur
    // those studios exist to prevent. (/sarah keeps the nav: MMS chrome on an MMS
    // booth is not a brand collision.)
    pathname.startsWith('/sarahcxc') ||
    pathname.startsWith('/sarahbook') ||
    pathname.startsWith('/voice-agents/build/demo/') ||
    // The white label demo and price sheet wear the agency's name, never ours.
    /^\/white-label\/(demo|sheet|hq)(\/|$)/.test(pathname);
  if (isAppShell) return null;

  return (
    <>
      {!menuOnly && <nav className={`studio-bar${scrolled ? ' is-scrolled' : ''}`} aria-label="Main navigation">
        <div className="studio-bar-in">
          <Link href="/" className="studio-bar-brand" aria-label="Modern Mustard Seed home">
            <Image src="/storybook/seed-mark.webp" alt="" width={160} height={160} sizes="40px" loading="eager" />
            <span>Modern Mustard Seed</span>
          </Link>

          {/* What we build, by name, on every page: the clearest answer to
              "what is this studio" for a visitor, for Google and for Bing. */}
          <div className="studio-bar-links">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="studio-bar-end">
            <Link href="/book" className="studio-bar-cta">Book a call <span aria-hidden="true">↗</span></Link>
            <button
              type="button"
              className={`studio-bar-menu${menuOpen ? ' is-open' : ''}`}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="site-mega-menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>}

      {/* Full-screen menu overlay (portaled to <body>, see `mounted`). One ink
          panel: the studio's dark ground with the mustard halftone. */}
      {mounted && createPortal(
      <div
        id="site-mega-menu"
        inert={!menuOpen}
        hidden={!menuOpen}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={`fixed inset-0 z-[90] transition-all duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[#141210]/40 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Panel */}
        <div
          className={`absolute right-0 top-0 h-full w-full sm:max-w-xl bg-[#141210] text-[#fcfaf3] border-l border-[#f5b700] overflow-y-auto transition-transform duration-300 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >

          <div className="relative z-10 min-h-full flex flex-col px-7 md:px-11 py-7">
            <div className="flex items-center justify-between mb-10">
              <span className="font-mono uppercase text-[#f5b700]">Menu</span>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="w-11 h-11 rounded-full border border-[#fbf5ea]/40 text-[#fbf5ea] text-2xl leading-none flex items-center justify-center hover:border-[#f5b700] hover:text-[#f5b700] transition-colors"
              >
                ×
              </button>
            </div>

            <span className="block font-mono uppercase text-[#f5b700] mb-5">What We Build</span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {OFFERS.map((d) => {
                const active = pathname === d.href;
                return (
                  <li key={d.href}>
                    <Link href={d.href} onClick={() => setMenuOpen(false)} className="group block">
                      <span
                        className={`menu-offer block font-display leading-tight transition-colors ${
                          active ? 'text-[#f5b700]' : 'text-[#fbf5ea] group-hover:text-[#f5b700]'
                        }`}
                      >
                        {d.name}
                      </span>
                      <span className="block text-[9px] uppercase tracking-[0.22em] text-[#f5b700]/75 mt-1">
                        {d.tag}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="my-9 h-px bg-[#fbf5ea]/15" />

            <span className="block font-mono uppercase text-[#f5b700] mb-4">The Studio</span>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              {STUDIO_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`text-[15px] transition-colors ${
                        active ? 'text-[#f5b700]' : 'text-[#fbf5ea]/85 hover:text-[#f5b700]'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/book"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0b3b44] bg-[#f5b700] rounded-sm hover:bg-[#ffc81f] transition-colors"
              >
                Book a Call
              </Link>
              <Link
                href="/presence-audit"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#fbf5ea] border border-[#fbf5ea]/50 rounded-sm hover:border-[#f5b700] hover:text-[#f5b700] transition-colors"
              >
                Free Presence Audit
              </Link>
            </div>

            <div className="mt-auto pt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#fbf5ea]/60">
              <Link href="/portal" onClick={() => setMenuOpen(false)} className="hover:text-[#f5b700] transition-colors">Client Portal</Link>
              <Link href="/partners" onClick={() => setMenuOpen(false)} className="hover:text-[#f5b700] transition-colors">Partners</Link>
              {socials.filter((x) => x.name !== 'Facebook').map((x) => (
                <a key={x.name} href={x.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#f5b700] transition-colors">
                  {x.name}
                </a>
              ))}
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="hover:text-[#f5b700] transition-colors">Team Login</Link>
            </div>
          </div>
        </div>
      </div>,
      document.body
      )}
    </>
  );
}
