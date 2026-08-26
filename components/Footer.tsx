import Link from 'next/link';
import Image from 'next/image';
import { socials } from '@/data/socials';
import { PARABLE_REFERENCE, PARABLE_SEGMENTS } from '@/data/parable';
import CookiePreferencesLink from '@/components/CookiePreferencesLink';

/**
 * The warm sign-off. Bright pop-art cabin footer that ends every page:
 * a gold CTA band, then a cream body carrying the mascot, the stamped
 * scripture card, and the link columns. Replaces the old midnight slab
 * (Sarah, 2026-07-17) so the page resolves warm after the dark ship close
 * instead of fading to black twice. Dark is now reserved for the terminal
 * panes and the client proposal header only.
 */
export default function Footer() {
  const linkSections = [
    // PARKED 2026-08-07 (Sarah): The Mustard Tree, Mustard Press, and Mustard
    // Hatchery are pulled from every nav and index. The pages still answer at
    // their URLs; they are only unlisted. Celebrate was unparked 2026-08-11 when
    // the launch countdown shipped. See the note in Navbar.tsx.
    {
      title: 'The Departments',
      links: [
        { label: 'HUNDREDFOLD', href: '/hundredfold' },
        { label: 'The Talking Website', href: '/talking-website' },
        { label: 'Brand / Rebrand', href: '/brand' },
        { label: 'The Chief', href: '/chief' },
        { label: 'Command Center', href: '/command-center' },
        { label: 'Websites', href: '/websites' },
        // The Voice Agent Build was parked 2026-08-12 (Sarah) and held this
        // slot alone, so /voice-agents takes it rather than leaving the footer
        // with no voice agent department. See the note in Navbar.tsx.
        { label: 'Voice Agents', href: '/voice-agents' },
        { label: 'Meet Mr. Mustard', href: '/mustard' },
        { label: 'The Switchboard', href: '/switchboard' },
        { label: 'Mustard Broadcast', href: '/ads' },
        { label: 'GEO Desk', href: '/website-audit' },
        { label: 'Mustard Launch', href: '/mustard-launch' },
        { label: 'Mustard Mode', href: '/mustard-mode' },
      ],
    },
    {
      title: 'Programs',
      links: [
        { label: 'Seed to System', href: '/seed-to-system' },
        { label: 'Idea to Spec', href: '/idea-to-spec' },
        { label: 'The Terminal', href: '/the-terminal' },
        { label: 'The Store', href: '/store' },
        { label: 'Free Playbooks', href: '/playbooks' },
      ],
    },
    {
      title: 'Work With Us',
      links: [
        { label: 'The System', href: '/the-system' },
        { label: 'How It Works', href: '/work-with-us' },
        { label: 'Services', href: '/services' },
        { label: 'Voice Agents', href: '/voice-agents' },
        { label: 'Industries We Build For', href: '/for' },
        { label: 'Northwest Montana', href: '/montana' },
        { label: 'The Work', href: '/work' },
        { label: 'What You Get', href: '/playbook' },
      ],
    },
    {
      title: 'Get Started',
      links: [
        { label: 'Book a Free Call', href: '/book' },
        { label: 'The Demo Station', href: '/demos' },
        { label: 'AI-Proof Your Business', href: '/ai-proof' },
        { label: 'Partner Program', href: '/partners' },
      ],
    },
    {
      title: 'Free Tools',
      links: [
        { label: 'The Hundredfold Roadmap', href: '/scaling-roadmap' },
        { label: 'New Business Checklist', href: '/launch-checklist' },
        { label: 'Bottleneck Breaker', href: '/audit' },
        { label: 'Website Audit', href: '/website-audit' },
        { label: 'Prompt Playbook', href: '/prompt-playbook' },
        { label: 'Claude Code Field Guide', href: '/fieldguide' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'The Mustard Seed World', href: '/world' },
        { label: 'Mustard Life Comic', href: '/comic' },
        { label: 'Blog', href: '/blog' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ];

  return (
    <footer className="relative w-full bg-[#FBF6EA] text-[#161616] border-t-2 border-[#161616]">
      {/* ── Gold CTA band: the last ask ── */}
      <div className="relative halftone-bg border-b-2 border-[#161616] bg-[#F5B700]">
        <div className="relative z-[2] max-w-4xl mx-auto px-6 py-14 md:py-16 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-[#161616]/70">
            One desk. Your idea. Weeks, not months.
          </p>
          <h2 className="mt-3 font-display italic text-3xl md:text-5xl font-extrabold leading-[1.02] text-[#161616]">
            Let&rsquo;s build the tree.
          </h2>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book"
              className="rounded-full border-2 border-[#161616] bg-[#161616] text-[#F5B700] px-8 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_rgba(22,22,22,.3)] transition-all hover:-translate-y-0.5"
            >
              Book a Free Call
            </Link>
            <Link
              href="/demos"
              className="rounded-full border-2 border-[#161616] bg-white text-[#161616] px-8 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
            >
              See Free Demos
            </Link>
          </div>
        </div>
      </div>

      {/* ── Cream body ── */}
      <div className="relative px-6 md:px-16 lg:px-24 xl:px-32 pt-16 pb-10">
        {/* Scripture, stamped with the mascot */}
        <div className="relative max-w-2xl mx-auto mb-16 -rotate-[0.6deg] rounded-2xl border-2 border-[#161616] bg-white px-7 py-6 shadow-[6px_6px_0_0_#161616]">
          <div className="absolute -top-4 right-6 grid h-12 w-11 place-items-center rounded-[4px] border-2 border-[#161616] bg-[#F5B700]">
            <span className="relative h-7 w-7">
              <Image src="/brand/mascot.png" alt="" fill sizes="28px" className="object-contain" />
            </span>
          </div>
          {/* Same verse as the hero slab, same source (data/parable.ts). */}
          <p className="font-display italic text-lg md:text-xl leading-relaxed text-[#161616] text-center">
            &ldquo;
            {PARABLE_SEGMENTS.map((seg, i) =>
              seg.stamp ? (
                <span key={i} className="not-italic font-bold text-[#8f6600]">
                  {seg.t}
                </span>
              ) : (
                <span key={i}>{seg.t}</span>
              )
            )}
            &rdquo;
          </p>
          <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.4em] font-bold text-[#8f6600]">
            {PARABLE_REFERENCE}
          </p>
          <p className="mt-3 text-center font-body text-[13px] text-[#5c554a]">
            Every build here starts seed-sized. That is the plan.
          </p>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-8 max-w-6xl mx-auto mb-12 pb-12 border-b-2 border-dashed border-[#161616]/25">
          <div className="col-span-2 md:col-span-3 xl:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#161616] bg-[#F5B700]">
                <Image src="/brand/mascot.png" alt="" fill sizes="32px" className="object-contain p-0.5" />
              </span>
              <span className="font-display text-sm font-extrabold tracking-tight text-[#161616]">
                Modern Mustard Seed
              </span>
            </div>
            <p className="text-[#5c554a] text-sm font-body leading-relaxed">
              Built with faith. Powered by AI. Engineered to scale.
            </p>
          </div>
          {linkSections.map((section) => (
            <div key={section.title}>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#8f6600] font-mono font-bold block mb-4">
                {section.title}
              </span>
              <ul className="space-y-2">
                {section.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-[#161616] hover:text-[#1E50C8] transition-colors font-body"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-2.5">
            {socials.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border-2 border-[#161616] bg-white px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] text-[#161616] hover:bg-[#F5B700] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#161616] transition-all font-mono font-bold"
              >
                {social.name}
              </a>
            ))}
            <Link
              href="/portal"
              className="rounded-full border-2 border-[#161616] bg-white px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] text-[#161616] hover:bg-[#F5B700] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#161616] transition-all font-mono font-bold"
            >
              Client Portal
            </Link>
            <Link
              href="/partners/hq"
              className="rounded-full border-2 border-[#161616] bg-white px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] text-[#161616] hover:bg-[#F5B700] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#161616] transition-all font-mono font-bold"
            >
              Partner Login
            </Link>
            <a
              href="/review"
              className="rounded-full border-2 border-[#161616] bg-white px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] text-[#161616] hover:bg-[#F5B700] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#161616] transition-all font-mono font-bold"
            >
              Review on Google
            </a>
            <CookiePreferencesLink />
          </div>

          <p className="text-[10px] text-[#5c554a] font-mono tracking-wider text-center md:text-right">
            &copy; {new Date().getFullYear()}{' '}
            <Link href="/" className="font-bold hover:text-[#1E50C8] transition-colors">
              Modern Mustard Seed
            </Link>
            . Kalispell, Montana. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
