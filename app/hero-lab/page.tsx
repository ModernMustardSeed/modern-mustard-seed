import type { Metadata } from 'next';
import Link from 'next/link';
import StudioHome from '@/components/home/StudioHome';
import PosterHero from '@/components/home/PosterHero';
import { HeroSeed, HeroGallery } from '@/components/home/HeroDirections';

/* The homepage hero, auditioned: each direction in the real page, one at a
   time, with a switcher. Unlisted and noindexed; it comes down once a pick ships. */
export const metadata: Metadata = {
  title: 'Hero Lab',
  robots: { index: false, follow: false },
};

const DIRECTIONS = {
  seed: { name: 'I · The Seed', hero: <HeroSeed /> },
  gallery: { name: 'II · The Gallery', hero: <HeroGallery /> },
  now: { name: 'Live Today', hero: <PosterHero /> },
} as const;
type Key = keyof typeof DIRECTIONS;

const LAB_FAQ = [{ q: 'What is this page?', a: 'A preview of homepage hero directions. The live homepage is unchanged.' }];

export default async function HeroLab({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const key: Key = d && d in DIRECTIONS ? (d as Key) : 'seed';
  return <>
    <StudioHome faq={LAB_FAQ} hero={DIRECTIONS[key].hero} />
    <style>{'.heroLab{position:fixed;z-index:90;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:4px;padding:5px;background:#080c16;border:2px solid #f5b700;box-shadow:5px 5px 0 #e0301e}.heroLab a{white-space:nowrap;padding:10px 14px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fbf6ea}.heroLab a[aria-current]{background:#f5b700;color:#080c16}@media(max-width:760px){.heroLab{left:12px;right:12px;top:auto;bottom:auto;top:84px;transform:none;justify-content:space-between}.heroLab a{padding:8px 6px;font-size:10px;letter-spacing:.04em}}'}</style>
    <nav aria-label="Hero directions" className="heroLab">
      {(Object.keys(DIRECTIONS) as Key[]).map(k => <Link key={k} href={'/hero-lab?d=' + k} scroll={false} aria-current={k === key ? 'page' : undefined}>{DIRECTIONS[k].name}</Link>)}
    </nav>
  </>;
}
