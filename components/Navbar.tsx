'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { navLinks } from '@/data/socials';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled || menuOpen
          ? 'bg-neutral-950/80 backdrop-blur-md border-b border-white/[0.04]'
          : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-5 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center hover:opacity-90 transition-opacity"
        >
          <span className="font-sans text-sm md:text-base tracking-[0.12em] text-white/85 uppercase font-extrabold hover:text-white transition-colors">
            Modern Mustard Seed
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-sunrise-gold transition-colors font-body font-medium"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/build-queue"
            className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-white bg-sunrise-warm rounded-full hover:shadow-[0_0_20px_rgba(255,107,107,0.4)] transition-all"
          >
            Join the Queue
          </Link>
        </div>

        <button
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-px bg-white/60 transition-all duration-300 ${
              menuOpen ? 'rotate-45 translate-y-[3.5px]' : ''
            }`}
          />
          <span
            className={`block w-5 h-px bg-white/60 transition-all duration-300 ${
              menuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-5 h-px bg-white/60 transition-all duration-300 ${
              menuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''
            }`}
          />
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-[11px] uppercase tracking-[0.2em] text-white/50 hover:text-mustard-400 transition-colors font-body font-medium py-1"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/build-queue"
            onClick={() => setMenuOpen(false)}
            className="mt-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_20px_rgba(255,179,71,0.25)] transition-all text-center"
          >
            Join the Queue
          </Link>
        </div>
      </div>
    </nav>
  );
}
