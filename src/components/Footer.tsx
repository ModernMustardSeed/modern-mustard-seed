const Footer: React.FC = () => {
  return (
    <footer className="w-full max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-10">
      {/* Divider */}
      <div className="flex justify-center mb-16">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-mustard-500/20 to-transparent" />
      </div>

      {/* Scripture */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="font-sans font-extrabold text-lg md:text-xl text-mustard-200/50 leading-relaxed mb-4">
          "He told them another parable: 'The kingdom of heaven is like a mustard seed, which a man took and planted in his field. Though it is the smallest of all seeds, yet when it grows, it is the largest of garden plants and becomes a tree, so that the birds come and perch in its branches.'"
        </p>
        <cite className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/40 font-mono font-bold not-italic">
          Matthew 13:31-32
        </cite>
      </div>

      {/* Bottom */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/[0.04]">
        {/* Social */}
        <div className="flex gap-6">
          {[
            { name: 'X', url: 'https://x.com' },
            { name: 'LinkedIn', url: 'https://linkedin.com' },
            { name: 'Facebook', url: 'https://facebook.com' },
            { name: 'Instagram', url: 'https://instagram.com' },
            { name: 'TikTok', url: 'https://tiktok.com' },
          ].map((social) => (
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
        </div>

        {/* Copyright */}
        <p className="text-[10px] text-white/15 font-mono tracking-wider">
          &copy; {new Date().getFullYear()}{' '}
          <a href="https://modernmustardseed.com" className="hover:text-mustard-400 transition-colors">
            Modern Mustard Seed
          </a>
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
