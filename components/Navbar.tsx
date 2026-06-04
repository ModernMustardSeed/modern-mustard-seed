'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { navLinks } from '@/data/socials';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() || '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // App shells (admin, client portal, program HQs) have their own headers.
  // Hide the marketing nav there so it never overlaps them.
  const isAppShell =
    pathname.startsWith('/admin') || pathname.startsWith('/portal') || pathname.endsWith('/hq');
  if (isAppShell) return null;

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 bg-[#FBF6EA]/95 backdrop-blur-md border-b-2 border-[#161616] ${
        scrolled ? 'shadow-[0_3px_0_0_rgba(22,22,22,0.12)]' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-3.5 flex justify-between items-center">
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

        <button
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-0.5 bg-[#161616] transition-all duration-300 ${
              menuOpen ? 'rotate-45 translate-y-[3.5px]' : ''
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-[#161616] transition-all duration-300 ${
              menuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-[#161616] transition-all duration-300 ${
              menuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''
            }`}
          />
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 bg-[#FBF6EA] ${
          menuOpen ? 'max-h-96 opacity-100 border-b-2 border-[#161616]' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 pt-1 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-[11px] uppercase tracking-[0.2em] text-[#161616]/70 hover:text-[#E0301E] transition-colors font-body font-bold py-1"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/portal"
            onClick={() => setMenuOpen(false)}
            className="mt-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] transition-all text-center"
          >
            Clients
          </Link>
          <Link
            href="/book"
            onClick={() => setMenuOpen(false)}
            className="px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] transition-all text-center"
          >
            Book a Call
          </Link>
        </div>
      </div>
    </nav>
  );
}
