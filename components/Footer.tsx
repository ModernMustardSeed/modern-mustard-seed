import Link from '@/components/AttributionLink';
import { SITE } from '@/lib/seo';
import Image from 'next/image';
import { socials } from '@/data/socials';
import { PARABLE_REFERENCE, PARABLE_SEGMENTS } from '@/data/parable';
import CookiePreferencesLink from '@/components/CookiePreferencesLink';

/** Editorial studio footer with the full public directory and original parable. */
export default function Footer() {
  const linkSections = [
    // PARKED 2026-08-07 (Sarah): The Mustard Tree, Mustard Press, and Mustard
    // Hatchery are pulled from every nav and index. The pages still answer at
    // their URLs; they are only unlisted. See the note in Navbar.tsx.
    //
    // PARKED 2026-09-11 (Sarah, the boutique pass): the Programs column, the
    // Free Tools column, the Demo Station, the Store, the Playbooks, the GEO
    // Desk, the Switchboard, Mustard Mode, Mustard Launch, HUNDREDFOLD, and the
    // comic all came out of the footer. Every one of those routes still answers,
    // so ads, QR codes, Stripe returns, and drip emails keep working. The studio
    // simply no longer advertises a price or a giveaway from its own chrome.
    {
      title: 'Disciplines',
      links: [
        { label: 'The Talking Website', href: '/talking-website' },
        { label: 'Websites And Brand', href: '/websites' },
        { label: 'Brand / Rebrand', href: '/brand' },
        { label: 'Voice Agents', href: '/voice-agents' },
        { label: 'Custom Software', href: '/services' },
        { label: 'Advisory', href: '/advisory' },
        { label: 'AI Native', href: '/ai-native' },
        { label: 'The Chief', href: '/chief' },
        { label: 'Command Center', href: '/command-center' },
        { label: 'Mustard Pictures', href: '/pictures' },
        { label: 'The Launch Film', href: '/launch-film' },
        { label: 'Meet Mr. Mustard', href: '/mustard' },
      ],
    },
    {
      title: 'The Studio',
      links: [
        { label: 'The Work', href: '/work' },
        { label: 'How We Work', href: '/work-with-us' },
        { label: 'The System', href: '/the-system' },
        { label: 'Services', href: '/services' },
        { label: 'What You Get', href: '/playbook' },
        { label: 'AI Websites', href: '/ai-websites' },
        { label: 'AI Search Resources', href: '/resources' },
      ],
    },
    {
      title: 'Where We Work',
      links: [
        { label: 'Northwest Montana', href: '/montana' },
        { label: 'Kalispell', href: '/montana/kalispell' },
        { label: 'Industries We Build For', href: '/for' },
        { label: 'AI-Proof Your Business', href: '/ai-proof' },
        { label: 'Partner Program', href: '/partners' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'The Free Presence Audit', href: '/presence-audit' },
        { label: 'The Bottleneck Breaker', href: '/audit' },
        { label: 'Book A Call', href: '/book' },
        { label: 'Or Write Instead', href: '/inquire' },
        { label: 'The Mustard Seed World', href: '/world' },
        { label: 'Journal', href: '/blog' },
        { label: 'About', href: '/about' },
        { label: 'Sarah Scarano', href: '/sarahscarano' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ];


  return (
    <footer className="studio-footer">
      <div className="studio-footer-top">
        <Link href="/" className="studio-footer-brand">Modern<br /><em>Mustard Seed.</em></Link>
        <div><p>{SITE.description}</p><Link href="/inquire" className="studio-footer-inquire">Begin A Conversation <span aria-hidden="true">↗</span></Link><a href={'mailto:' + SITE.email}>{SITE.email}</a><a href={'tel:' + SITE.phoneE164}>{SITE.phone}</a></div>
      </div>
      <div className="studio-footer-links">{linkSections.map(section => <div key={section.title}><h2>{section.title}</h2><ul>{section.links.map(l => <li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}</ul></div>)}</div>
      <div className="studio-footer-seed"><Image src="/images/editorial/mascot-160.webp" alt="Mr. Mustard, the studio mascot" width={44} height={59} /><div><p>&ldquo;{PARABLE_SEGMENTS.map(s => s.t).join('')}&rdquo;</p><span>{PARABLE_REFERENCE} · Every build starts seed-sized.</span></div></div>
      <div className="studio-footer-bottom"><div>{socials.map(s => <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>)}<Link href="/portal">Client Portal</Link><Link href="/partners/hq">Partner Login</Link><Link href="/review">Review On Google</Link><CookiePreferencesLink /></div><p>&copy; {new Date().getFullYear()} Modern Mustard Seed. Kalispell, Montana.</p></div>
    </footer>
  );
}
