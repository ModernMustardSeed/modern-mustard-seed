import Link from 'next/link';
import { socials } from '@/data/socials';

export default function Footer() {
  const linkSections = [
    {
      title: 'Programs',
      links: [
        { label: 'Idea to Spec', href: '/idea-to-spec' },
        { label: 'The Terminal', href: '/the-terminal' },
        { label: 'The Store', href: '/store' },
        { label: 'Free Playbooks', href: '/playbooks' },
      ],
    },
    {
      title: 'Work With Us',
      links: [
        { label: 'The Work', href: '/work' },
        { label: 'How it Works', href: '/work-with-us' },
        { label: 'Book a Call', href: '/book' },
        { label: 'Join the Build Queue', href: '/build-queue' },
        { label: 'AI-Proof Your Business', href: '/ai-proof' },
        { label: 'Partner Program', href: '/partners' },
      ],
    },
    {
      title: 'Free Tools',
      links: [
        { label: 'AI Audit', href: '/audit' },
        { label: 'Website Audit', href: '/website-audit' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'Blog', href: '/blog' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ];

  return (
    <footer className="relative w-full px-6 md:px-16 lg:px-24 xl:px-32 pt-20 pb-10 bg-[#080c16] border-t border-cream-100/[0.04]">
      {/* Soft fade-in from the section above so the midnight backdrop
          does not slam into the previous section's background */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-16 h-16 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(8,12,22,0.55) 50%, #080c16 100%)',
        }}
      />

      <div className="relative flex justify-center mb-16">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/20 to-transparent" />
      </div>

      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="font-sans font-semibold text-lg md:text-xl text-mustard-200/50 leading-relaxed mb-4">
          &ldquo;He told them another parable: &lsquo;The kingdom of heaven is like a mustard seed, which a man took and planted in his field. Though it is the smallest of all seeds, yet when it grows, it is the largest of garden plants and becomes a tree, so that the birds come and perch in its branches.&rsquo;&rdquo;
        </p>
        <cite className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/40 font-mono font-bold not-italic">
          Matthew 13:31-32
        </cite>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 max-w-6xl mx-auto mb-12 pb-12 border-b border-white/[0.04]">
        <div className="col-span-2 md:col-span-1">
          <span className="font-sans text-xs tracking-[0.15em] text-white/60 uppercase font-bold block mb-4">
            Modern Mustard Seed
          </span>
          <p className="text-white/35 text-sm font-body font-light leading-relaxed">
            Built with faith. Powered by AI. Engineered to scale.
          </p>
        </div>
        {linkSections.map((section) => (
          <div key={section.title}>
            <span className="text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold block mb-4">
              {section.title}
            </span>
            <ul className="space-y-2">
              {section.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/40 hover:text-mustard-400 transition-colors font-body"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap gap-4 md:gap-6">
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-[0.15em] text-white/20 hover:text-mustard-400 transition-colors font-mono font-bold"
            >
              {social.name}
            </a>
          ))}
          <Link
            href="/portal"
            className="text-[10px] uppercase tracking-[0.15em] text-white/20 hover:text-mustard-400 transition-colors font-mono font-bold"
          >
            Client Portal
          </Link>
        </div>

        <p className="text-[10px] text-white/15 font-mono tracking-wider">
          &copy; {new Date().getFullYear()}{' '}
          <Link href="/" className="hover:text-mustard-400 transition-colors">
            Modern Mustard Seed
          </Link>
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
}
