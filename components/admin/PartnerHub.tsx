'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AdminHeader from '@/components/admin/AdminHeader';
import ProductSwipeKit from '@/components/partners/ProductSwipeKit';

/**
 * Partner Hub: the one tab where every team-partner finds their code, their
 * money link, what to post, the playbooks, the training, and the programs
 * they get free. Signature moment: the money ticket, a tilted mustard stub
 * with your code stamped on it that copies your link in one press.
 */

type Earnings = { sales: number; pending: number; payable: number; paid: number };
type TeamCode = { name: string; code: string; isYou: boolean };
type Partner = { code: string; partnerEmail: string; name: string } | null;

const SECTIONS = [
  { key: 'post', label: 'What to Post' },
  { key: 'playbooks', label: 'Playbooks' },
  { key: 'learn', label: 'Learn' },
  { key: 'programs', label: 'Free Access' },
] as const;
type SectionKey = (typeof SECTIONS)[number]['key'];

const PROGRAMS: { name: string; blurb: string; href: string; hq: string; tag: string }[] = [
  { name: 'Mustard Mode', blurb: 'The flagship coaching program. Player, Builder, and the Cabinet.', href: '/mustard-mode', hq: '/mustard-mode/hq', tag: '$197 to $397' },
  { name: 'Mustard Launch', blurb: 'The AI launch coach. Blueprint, Kit, and the Launch Room.', href: '/mustard-launch', hq: '/mustard-launch/hq', tag: '$197' },
  { name: 'Idea to Spec', blurb: 'Turn any idea into a spec a builder can ship, with the Spec Studio.', href: '/idea-to-spec', hq: '/idea-to-spec/hq', tag: '$497' },
  { name: 'The Terminal', blurb: 'The fullstack build program, with the Ops Center.', href: '/the-terminal', hq: '/the-terminal/hq', tag: '$497' },
  { name: 'The Playbook Store', blurb: 'Every playbook and bundle in the store, yours free.', href: '/store', hq: '/store', tag: 'All playbooks' },
];

const LEARN: { name: string; blurb: string; href: string }[] = [
  { name: 'The Academy', blurb: 'Your step-by-step onboarding. It ranks you up as you go.', href: '/admin/onboarding' },
  { name: 'Sales Training', blurb: 'How we sell: the method behind every call and demo.', href: '/admin/sales-training' },
  { name: 'The Call Script', blurb: 'The exact words for a discovery call, start to finish.', href: '/admin/call-script' },
  { name: 'The Manual', blurb: 'The owner’s manual for the whole command center.', href: '/admin/manual' },
];

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: cents % 100 === 0 ? 0 : 2 })}`;
}

function CopyChip({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked; text is visible regardless */
        }
      }}
      className={`shrink-0 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold rounded-full border-2 border-[#161616] transition-all ${
        copied ? 'bg-emerald-500 text-white' : 'bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5'
      }`}
    >
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

/** The money ticket. Press it, your link is on the clipboard. */
function MoneyTicket({ code, link }: { code: string; link: string }) {
  const [stamped, setStamped] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy your money link, ${link}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setStamped(true);
          setTimeout(() => setStamped(false), 1800);
        } catch {
          /* clipboard blocked */
        }
      }}
      className={`group relative block w-full max-w-sm -rotate-2 text-left transition-transform duration-150 ${
        stamped ? 'translate-x-[5px] translate-y-[5px]' : 'hover:rotate-0'
      }`}
    >
      <div
        className={`rounded-2xl border-2 border-[#161616] bg-[#F5B700] px-6 py-5 transition-shadow duration-150 ${
          stamped ? 'shadow-none' : 'shadow-[6px_6px_0_0_#161616]'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-[#161616]/70">Your partner code</span>
          <span className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full px-2.5 py-0.5">
            {stamped ? 'Link copied ✓' : 'Tap to copy link'}
          </span>
        </div>
        <div className="mt-2 font-mono text-4xl sm:text-5xl font-bold tracking-tight text-[#161616] break-all leading-none">{code}</div>
        <div className="mt-3 border-t-2 border-dashed border-[#161616]/40 pt-2.5">
          <span className="font-mono text-[11px] text-[#161616]/80 break-all leading-snug">{link}</span>
        </div>
      </div>
    </button>
  );
}

export default function PartnerHub({
  firstName,
  partner,
  clicks,
  earnings,
  team,
  siteUrl,
}: {
  firstName: string;
  partner: Partner;
  clicks: number;
  earnings: Earnings;
  team: TeamCode[];
  siteUrl: string;
}) {
  const [section, setSection] = useState<SectionKey>('post');
  const base = siteUrl.replace(/\/$/, '');
  const myLink = partner ? `${base}/?ref=${partner.code}` : '';

  const stats = [
    { label: 'Link clicks', value: String(clicks) },
    { label: 'Sales', value: String(earnings.sales) },
    { label: 'Pending', value: money(earnings.pending) },
    { label: 'Payable', value: money(earnings.payable) },
    { label: 'Paid out', value: money(earnings.paid) },
  ];

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="hq" title="Partner Hub" />

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8">
        {/* ── Hero: you, your ticket, your numbers ── */}
        <section className="halftone-bg border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] bg-white overflow-hidden mb-6">
          <div className="p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold block mb-3">Learn and earn</span>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-[1.08]">
                {firstName}, everything a partner needs lives here.
              </h2>
              <p className="mt-3 text-[#3A3733] font-body leading-relaxed max-w-xl">
                Your code, ready-made posts, the playbooks, the training, and free access to every program we sell.
                You earn 50% on products, 25% monthly for a year on referred subscriptions, and 10 to 20% on builds.
              </p>
              {partner ? (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {stats.map((s) => (
                    <div key={s.label} className="bg-white border-2 border-[#161616] rounded-xl px-4 py-2.5 shadow-[2px_2px_0_0_#161616]">
                      <div className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono font-bold">{s.label}</div>
                      <div className="font-sans text-xl font-bold mt-0.5">{s.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 bg-white border-2 border-[#E0301E] rounded-xl px-5 py-4 shadow-[2px_2px_0_0_#161616] max-w-xl">
                  <p className="font-body text-sm text-[#161616]">
                    No partner code is linked to this login yet. Ask Sarah to add you on the{' '}
                    <Link href="/admin/team" className="text-[#1E50C8] font-semibold hover:text-[#161616]">Team board</Link>, then your ticket appears here.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-4 shrink-0 w-full md:w-auto">
              {partner && <MoneyTicket code={partner.code} link={myLink} />}
              <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-24 w-auto hidden md:block" />
            </div>
          </div>
        </section>

        {/* ── Everyone's codes ── */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Team codes</span>
            <span className="text-[10px] font-body text-[#161616]/45">Anyone’s link, one tap. Full earnings live on the Team board.</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {team.map((t) => (
              <div
                key={t.code}
                className={`border-2 border-[#161616] rounded-2xl p-4 shadow-[3px_3px_0_0_#161616] ${t.isYou ? 'bg-[#F5B700]' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-sans text-sm font-bold truncate">{t.name}{t.isYou ? ' (you)' : ''}</div>
                    <div className="font-mono text-lg font-bold tracking-tight truncate">{t.code}</div>
                  </div>
                  <CopyChip text={`${base}/?ref=${t.code}`} label="Link" />
                </div>
              </div>
            ))}
            {team.length === 0 && (
              <p className="col-span-full text-[#161616]/45 font-body text-sm italic">No team codes yet. Add teammates on the Team board.</p>
            )}
          </div>
        </section>

        {/* ── Section switcher ── */}
        <nav aria-label="Partner Hub sections" className="flex flex-wrap gap-2 mb-6">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              aria-pressed={section === s.key}
              className={`px-4 py-2 text-[11px] uppercase tracking-[0.18em] font-sans font-bold rounded-lg border-2 transition-colors ${
                section === s.key
                  ? 'bg-[#161616] text-[#FBF6EA] border-[#161616] shadow-[2px_2px_0_0_#F5B700]'
                  : 'bg-white text-[#161616]/60 border-[#161616]/20 hover:border-[#161616] hover:text-[#161616]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* ── What to Post ── */}
        {section === 'post' && (
          <section>
            <div className="grid md:grid-cols-2 gap-3 mb-6">
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-5">
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1.5">The commercials</span>
                <p className="font-body text-sm text-[#3A3733] mb-3">
                  The Mr. Mustard films, cut and ready to post. Pair one with your link and a swipe caption below.
                </p>
                <Link href="/admin/ads" className="inline-block px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">
                  Open the Ads Playbook
                </Link>
              </div>
              <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-5">
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1.5">House rules</span>
                <p className="font-body text-sm text-[#3A3733]">
                  Copy, lightly reword so it sounds like you, and post. Always keep the disclosure line in: the commission is the trust.
                  Your link is already injected into every post below.
                </p>
              </div>
            </div>
            {partner ? (
              <ProductSwipeKit code={partner.code} siteUrl={siteUrl} />
            ) : (
              <p className="text-[#161616]/45 font-body text-sm italic">The swipe posts unlock once your partner code is linked.</p>
            )}
          </section>
        )}

        {/* ── Playbooks ── */}
        {section === 'playbooks' && (
          <section className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
              <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-2">Field guide</span>
              <h3 className="font-display text-2xl font-semibold mb-2">The Outreach Playbook</h3>
              <p className="font-body text-sm text-[#3A3733] mb-4">
                Where to find businesses that need us, what to say in comments, DMs, and calls, and the four build lanes.
                Personalized with your booking link.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Link href="/admin/hq/playbook" className="px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">
                  Read it here
                </Link>
                {partner && (
                  <a href="/api/admin/hq/playbook-pdf" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-colors">
                    Download PDF ↓
                  </a>
                )}
              </div>
            </div>
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
              <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-2">Video campaigns</span>
              <h3 className="font-display text-2xl font-semibold mb-2">The Ads Playbook</h3>
              <p className="font-body text-sm text-[#3A3733] mb-4">
                Every commercial with its targeting, captions, and where it runs. Post them with your link riding along.
              </p>
              <Link href="/admin/ads" className="inline-block px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">
                Open it
              </Link>
            </div>
          </section>
        )}

        {/* ── Learn ── */}
        {section === 'learn' && (
          <section className="grid sm:grid-cols-2 gap-4">
            {LEARN.map((l) => (
              <Link key={l.href} href={l.href} className="group bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] transition-all">
                <h3 className="font-display text-xl font-semibold mb-1.5 group-hover:text-[#1E50C8] transition-colors">{l.name}</h3>
                <p className="font-body text-sm text-[#3A3733]">{l.blurb}</p>
              </Link>
            ))}
          </section>
        )}

        {/* ── Free Access ── */}
        {section === 'programs' && (
          <section>
            <div className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#F5B700] p-5 mb-4">
              <p className="font-body text-sm text-[#FBF6EA]">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#F5B700] font-bold mr-2">Free for partners</span>
                Every program below is yours at no cost, so you can learn it and recommend it honestly.
                {partner && (
                  <>
                    {' '}Sign in on the program page with your partner email, <span className="font-mono text-[#F5B700]">{partner.partnerEmail}</span>, and the magic link does the rest.
                  </>
                )}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROGRAMS.map((p) => (
                <div key={p.name} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                    <span className="shrink-0 text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2.5 py-0.5">{p.tag}</span>
                  </div>
                  <p className="font-body text-sm text-[#3A3733] flex-1">{p.blurb}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={p.hq} className="px-4 py-2 text-[10px] uppercase tracking-[0.16em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform">
                      Open
                    </Link>
                    <Link href={p.href} className="px-4 py-2 text-[10px] uppercase tracking-[0.16em] font-sans font-bold text-[#161616]/60 bg-white border-2 border-[#161616]/25 rounded-full hover:border-[#161616] hover:text-[#161616] transition-colors">
                      Sales page
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
