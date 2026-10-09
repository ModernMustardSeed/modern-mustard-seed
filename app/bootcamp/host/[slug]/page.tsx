import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { hostKeyValid, hostLinks } from '@/lib/bootcamp/key';
import { getHostBySlug, hostStats } from '@/lib/bootcamp/store';
import { getSupabase } from '@/lib/supabase';
import { HOST_SWIPE } from '@/data/bootcamp-marketing';
import HostDashboard, { type HostEventView, type HostStatsView, type HostView, type SwipeView } from '@/components/bootcamp/HostDashboard';

/**
 * THE HOST'S PRIVATE PAGE. The key in ?k= is an HMAC over the slug; without
 * it the page renders nothing but a plain refusal. Everything the store
 * returns is normalised here so the dashboard never sees an undefined.
 */
export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({ title: 'Host dashboard', description: 'A private page for a bootcamp host.', path: '/bootcamp/host', noindex: true });

const SLUG_OK = /^[a-z0-9-]{1,48}$/;

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : 0;
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}
function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function normaliseHost(raw: unknown, slug: string): HostView | null {
  const h = rec(raw);
  if (!str(h.name) && !str(h.brand)) return null;
  return {
    name: str(h.name) ?? '',
    brand: str(h.brand),
    slug: str(h.slug) ?? slug,
    status: str(h.status) ?? 'applied',
    founding: h.founding === true,
    ticketPct: num(h.ticket_pct ?? h.ticketPct) || 100,
    programPct: num(h.program_pct ?? h.programPct) || 20,
    approvedAt: str(h.approved_at ?? h.approvedAt),
  };
}

function normaliseStats(raw: unknown): { stats: HostStatsView; recent: HostEventView[] } {
  const s = rec(raw);
  const t = s.tickets;
  const byTier = t && typeof t === 'object'
    ? { ga: num(rec(t).ga), vip: num(rec(t).vip), platinum: num(rec(t).platinum) }
    : s.byTier && typeof s.byTier === 'object'
      ? { ga: num(rec(s.byTier).ga), vip: num(rec(s.byTier).vip), platinum: num(rec(s.byTier).platinum) }
      : null;
  const tickets = typeof t === 'number' ? t : byTier ? byTier.ga + byTier.vip + byTier.platinum : 0;
  const recentRaw = Array.isArray(s.recent) ? s.recent : [];
  const recent: HostEventView[] = recentRaw.map((e) => {
    const r = rec(e);
    const d = rec(r.detail);
    const kind = str(r.kind) ?? 'event';
    const label = str(r.label) ?? (kind === 'host-sale' ? `A seat sold through your link` : kind.startsWith('register') || kind === 'masterclass' ? 'A free masterclass seat' : kind === 'click' ? 'A click on your link' : kind.replace(/[-_:]/g, ' '));
    return { at: str(r.created_at ?? r.at) ?? new Date(0).toISOString(), label, cents: num(r.cents ?? d.cents ?? d.owed_cents) || undefined };
  });
  return {
    stats: {
      clicks: num(s.clicks),
      masterclass: num(s.masterclass),
      tickets,
      ticketsByTier: byTier,
      ticketRevenueCents: num(s.ticketRevenueCents),
      operatorSeats: num(s.operatorSeats),
      earningsCents: num(s.earningsCents),
    },
    recent,
  };
}

function Invalid({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-[#fcfaf3] text-[#141210] min-h-[70vh] flex items-center">
      <div className="max-w-md mx-auto px-5 py-28 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#0f4c47] font-bold">Host dashboard</p>
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight mt-3">{title}</h1>
        <p className="font-body text-[#141210]/70 leading-relaxed mt-4">{body}</p>
        <Link href="/bootcamp/host" className="mt-8 inline-flex items-center justify-center rounded-full border-2 border-[#141210] bg-[#141210] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#fcfaf3]">About hosting a room</Link>
      </div>
    </div>
  );
}

export default async function HostSlugPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug: rawSlug } = await params;
  const sp = await searchParams;
  const slug = decodeURIComponent(rawSlug || '').toLowerCase();
  const k = typeof sp.k === 'string' ? sp.k : null;

  if (!SLUG_OK.test(slug) || !hostKeyValid(slug, k)) {
    return <Invalid title="This link is not valid." body="The dashboard link is private to its host and signed. Open the one in your approval email, or write to sarah@modernmustardseed.com and we will send it again." />;
  }

  let hostRaw: unknown = null;
  let statsRaw: unknown = null;
  let failed = false;
  try {
    [hostRaw, statsRaw] = await Promise.all([getHostBySlug(getSupabase(), slug), hostStats(getSupabase(), slug)]);
  } catch {
    failed = true;
  }

  const host = normaliseHost(hostRaw, slug);
  if (!host) {
    return failed
      ? <Invalid title="The numbers are not loading right now." body="Your link is valid; the book did not answer. Give it a minute and reload. If it keeps up, email sarah@modernmustardseed.com and we will read them to you." />
      : <Invalid title="This link is not valid." body="No host is filed under this address. Open the link in your approval email, or write to sarah@modernmustardseed.com." />;
  }

  const { stats, recent } = normaliseStats(statsRaw);
  const links = hostLinks(SITE.url, slug);
  const swipe: SwipeView[] = (Array.isArray(HOST_SWIPE) ? HOST_SWIPE : []).map((c) => ({ id: c.id, title: c.title, channel: c.channel, body: c.body, note: c.note }));

  return <HostDashboard host={host} stats={stats} recent={recent} links={{ share: links.share, masterclass: links.masterclass }} swipe={swipe} />;
}
