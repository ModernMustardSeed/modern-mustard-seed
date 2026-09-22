import { HeroPoster, HeroStage, HeroReel } from '@/components/home/HeroLab';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Hero Lab', description: 'Three homepage hero directions.', path: '/hero-lab', noindex: true });

const label: React.CSSProperties = { position: 'relative', zIndex: 5, background: '#080c16', color: '#f5b700', fontFamily: 'var(--font-body), sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', padding: '18px 6vw', borderTop: '4px solid #f5b700' };

export default function HeroLabPage() {
  return <main>
    <div style={label}>A · Poster</div>
    <HeroPoster />
    <div style={label}>B · Stage</div>
    <HeroStage />
    <div style={label}>C · Reel</div>
    <HeroReel />
  </main>;
}
