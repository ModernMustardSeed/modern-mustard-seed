import type { Metadata } from 'next';
import { wlSans } from '@/components/white-label/font';
import WhiteLabelDemo, { type WlDemoLine } from '@/components/white-label/WhiteLabelDemo';
import { WL_LINES, WL_SAMPLE_CLIENTS, wlSample, wlColor, wlClean, wlInk } from '@/data/white-label';
import { wlKeyValid } from '@/lib/white-label/key';

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/** The tab wears the agency's name too. `absolute` skips the site's "| Modern Mustard Seed" template. */
export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const q = await searchParams;
  const agency = wlClean(one(q.agency)) || 'Your Agency';
  const client = wlClean(one(q.client), 80) || wlSample(one(q.sample)).client;
  return {
    title: { absolute: `${client} · AI Receptionist by ${agency}` },
    description: `A live AI receptionist for ${client}, from ${agency}.`,
    robots: { index: false, follow: false },
    icons: { icon: monogram(agency, wlColor(one(q.color))) },
    openGraph: { title: `${client} · AI Receptionist by ${agency}`, description: `A live AI receptionist for ${client}, from ${agency}.`, siteName: agency },
    twitter: { card: 'summary_large_image', title: `${client} · AI Receptionist by ${agency}`, description: `A live AI receptionist for ${client}, from ${agency}.`, site: undefined, creator: undefined },
  };
}

/**
 * Server half of the demo. Reads the agency's settings from the link, checks
 * the signed key, and hands the client component wholesale prices only when
 * the key is good for this exact agency name.
 */
/** The tab icon is the agency's monogram in their color, not our seed. */
function monogram(agency: string, color: string): string {
  const w = agency.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const text = ((w[0]?.[0] ?? 'A') + (w[1]?.[0] ?? '')).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="42" font-family="Arial,sans-serif" font-size="28" font-weight="700" text-anchor="middle" fill="${wlInk(color)}">${text}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export default async function WhiteLabelDemoPage({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const agency = wlClean(one(q.agency)) || 'Your Agency';
  const signed = wlKeyValid(agency, one(q.k));
  const sample = wlSample(one(q.sample));

  // What an agency's client would buy. Overflow sites are agency-to-us capacity, so they stay off.
  const show = ['ai-receptionist', 'site-agent', 'phone-and-site-agent', 'ai-visibility', 'custom-agent', 'site-ai', 'marketing-dashboard', 'agentic-system'];
  const lines: WlDemoLine[] = show
    .map((slug) => WL_LINES.find((l) => l.slug === slug)!)
    .map((l) => ({
      slug: l.slug,
      name: l.name,
      pitch: l.pitch,
      includes: l.includes,
      retail: l.retail,
      ...(signed ? { wholesale: l.wholesale } : {}),
    }));

  return (
    <div className={wlSans.className}>
    <WhiteLabelDemo
      initial={{
        agency,
        color: wlColor(one(q.color)),
        city: wlClean(one(q.city)) || 'Kalispell',
        sample: sample.id,
        client: wlClean(one(q.client), 80),
        // A logo can ride in the link as an https image URL; an uploaded one stays in the browser.
        site: wlClean(one(q.site), 200) || null,
        logo: /^https:\/\/[^\s"'<>]{4,400}$/.test(one(q.logo)) ? one(q.logo) : null,
      }}
      samples={WL_SAMPLE_CLIENTS.map((s) => ({ id: s.id, label: s.label, client: s.client, services: s.services, hours: s.hours }))}
      lines={lines}
      signed={signed}
      present={one(q.present) === '1' || one(q.view) === 'client'}
      locked={one(q.view) === 'client'}
    />
    </div>
  );
}
