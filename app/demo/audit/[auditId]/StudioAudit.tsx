import type { CSSProperties, ReactNode } from 'react';
import { PILLAR_WEIGHTS, type PresenceAuditReport, type Pillar } from '@/lib/presence-audit';
import { scanFixes, type DeepScan, type Effort, type ScanCheck, type ScanStatus } from '@/lib/deep-scan';
import PresenceAsk from '@/components/PresenceAsk';

/**
 * THE AUDIT, STUDIO EDITION (2026-10-09).
 *
 * Sarah: "make that page and the audit itself be the most elite and valuable
 * info ever ... do more than just online presence ... specific website and
 * online presence plus plus plus."
 *
 * So the report became a document an owner keeps. Same three pillars and the
 * same grade, set in the house the site moved into the same day (DM Sans set
 * tight, Shrikhand for the one accent line, JetBrains Mono for labels, ruled
 * lines, warm paper), and three things it never had:
 *
 *   WHAT IS ALREADY WORKING, first. An audit that opens on what the owner got
 *     right is read to the end; one that opens on a red letter is closed.
 *   HOW YOU SHOW UP. Their actual Google result and their actual link preview,
 *     drawn from their own tags, so the gap is something they can see.
 *   THE DEEP SCAN. About forty measured checks under the grade (lib/deep-scan.ts):
 *     speed, certificate, domain expiry, email forgery protection, search
 *     basics, AI search readiness, and the plumbing that turns a visit into a
 *     call. Every line prints what was found, so it can be checked in a minute.
 *
 * And it ends on a plan sorted by effort rather than a list sorted by alarm.
 *
 * THE GRADE IS NOT A BILLBOARD. The number sits inside a ring with a plain
 * word next to it ("Room to grow"); the letter is printed small, beside it. A
 * nineteen in a sixty-point red F told 824 Home Services one thing and nothing
 * else. The same number here sits under the business's own strengths.
 */

const INK = '#141210';
const PAPER = '#fcfaf3';
const MUSTARD = '#f5b700';
const TEAL = '#0f4c47';
const PALE = '#e8ecd0';
const CORAL = '#d9472b';
const RULE = `${INK}1f`;

const SANS: CSSProperties = { fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif", fontVariationSettings: "'opsz' 14" };
const ACCENT: CSSProperties = { fontFamily: "var(--font-shrikhand), 'Shrikhand', Georgia, serif", fontWeight: 400, letterSpacing: 0 };
const MONO: CSSProperties = { fontFamily: "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace" };

function tone(score: number) {
  if (score >= 80) return { color: TEAL, word: 'Strong' };
  if (score >= 60) return { color: '#b07f00', word: 'Room to grow' };
  return { color: CORAL, word: 'Big upside' };
}

const STATUS: Record<ScanStatus, { mark: string; bg: string; fg: string; word: string }> = {
  pass: { mark: '✓', bg: TEAL, fg: PAPER, word: 'Right' },
  warn: { mark: '!', bg: MUSTARD, fg: INK, word: 'Tighten' },
  fail: { mark: '✕', bg: CORAL, fg: PAPER, word: 'Fix' },
  info: { mark: 'i', bg: PALE, fg: INK, word: 'Note' },
};

const EFFORT: Record<Effort, string> = { minutes: 'Minutes', afternoon: 'An afternoon', build: 'A build' };

function Label({ children, color = TEAL }: { children: ReactNode; color?: string }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ ...MONO, color }}>
      {children}
    </span>
  );
}

/** A numbered chapter head: mono number, ink rule, heading, optional accent line. */
function Chapter({ n, id, kicker, title, accent, children }: { n: string; id: string; kicker: string; title: ReactNode; accent?: string; children?: ReactNode }) {
  return (
    <header id={id} className="scroll-mt-6">
      <div className="flex items-center gap-4 border-t pt-4" style={{ borderColor: INK }}>
        <span className="text-[12px] font-medium tabular-nums" style={{ ...MONO, color: INK }}>{n}</span>
        <Label>{kicker}</Label>
      </div>
      <h2 className="mt-4 text-[34px] sm:text-[48px] font-bold leading-[1] tracking-[-0.05em] [text-wrap:balance]" style={{ ...SANS, color: INK }}>
        {title}
        {accent && (
          <>
            {' '}
            <span className="whitespace-nowrap text-[0.86em]" style={{ ...ACCENT, color: TEAL, boxShadow: `inset 0 -0.18em 0 ${MUSTARD}` }}>{accent}</span>
          </>
        )}
      </h2>
      {children && <div className="mt-4 max-w-2xl text-[16.5px] leading-relaxed" style={{ ...SANS, color: `${INK}c7` }}>{children}</div>}
    </header>
  );
}

function Ring({ score, size = 168 }: { score: number; size?: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const t = tone(score);
  return (
    <svg viewBox="0 0 168 168" width={size} height={size} role="img" aria-label={`${score} out of 100`}>
      <circle cx="84" cy="84" r={r} fill="none" stroke={PALE} strokeWidth="12" />
      <circle
        cx="84"
        cy="84"
        r={r}
        fill="none"
        stroke={t.color}
        strokeWidth="12"
        strokeLinecap="butt"
        strokeDasharray={`${(c * Math.max(0, Math.min(100, score))) / 100} ${c}`}
        transform="rotate(-90 84 84)"
      />
      <text x="84" y="92" textAnchor="middle" style={{ ...SANS, fontSize: 52, fontWeight: 700, letterSpacing: '-0.05em', fill: INK }}>
        {score}
      </text>
      <text x="84" y="116" textAnchor="middle" style={{ ...MONO, fontSize: 10, letterSpacing: '0.18em', fill: `${INK}99` }}>
        OF 100
      </text>
    </svg>
  );
}

function Bar({ score, unknown }: { score: number; unknown?: boolean }) {
  return (
    <div className="h-[6px] w-full" style={{ background: PALE }}>
      <div className="h-full" style={{ width: `${unknown ? 0 : Math.max(0, Math.min(100, score))}%`, background: unknown ? PALE : tone(score).color }} />
    </div>
  );
}

function Chip({ status }: { status: ScanStatus }) {
  const s = STATUS[status];
  return (
    <span
      className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[3px] text-[12px] font-bold"
      style={{ ...SANS, background: s.bg, color: s.fg }}
      aria-label={s.word}
    >
      {s.mark}
    </span>
  );
}

function PillarCell({ p }: { p: Pillar }) {
  const t = tone(p.score);
  return (
    <div className="flex min-w-0 flex-col p-6 sm:p-7" style={{ background: PAPER }}>
      <div className="flex items-baseline justify-between gap-3">
        <Label color={INK}>{p.key === 'profile' ? 'Google profile' : p.label}</Label>
        <span className="text-[11px] tabular-nums" style={{ ...MONO, color: `${INK}80` }}>{Math.round(p.weight * 100)}% of total</span>
      </div>
      <div className="mt-5 flex items-baseline gap-3">
        <span className="text-[64px] font-bold leading-[0.85] tabular-nums tracking-[-0.06em]" style={{ ...SANS, color: INK }}>
          {p.unknown ? '?' : p.score}
        </span>
        <span className="text-[12px] font-medium uppercase tracking-[0.14em]" style={{ ...MONO, color: p.unknown ? `${INK}80` : t.color }}>
          {p.unknown ? 'Not scored' : `${t.word} · ${p.letter}`}
        </span>
      </div>
      <div className="mt-5"><Bar score={p.score} unknown={p.unknown} /></div>
      <p className="mt-5 flex-1 text-[15px] leading-relaxed" style={{ ...SANS, color: `${INK}c7` }}>{p.verdict}</p>
    </div>
  );
}

/** Their real Google result and link preview, drawn from their own tags. */
function ShowUp({ scan, business }: { scan: DeepScan; business: string }) {
  const s = scan.snapshot;
  const host = (() => {
    try {
      return new URL(scan.final_url).hostname.replace(/^www\./, '');
    } catch {
      return scan.final_url;
    }
  })();
  const safeImg = s.og_image && /^https:/i.test(s.og_image) ? s.og_image : null;
  const safeIcon = s.favicon && /^https:/i.test(s.favicon) ? s.favicon : null;
  return (
    <div className="grid grid-cols-1 gap-px md:grid-cols-[1.25fr_1fr]" style={{ background: RULE, border: `1px solid ${RULE}` }}>
      <figure className="m-0 min-w-0 p-6 sm:p-8" style={{ background: '#ffffff' }}>
        <Label color={`${INK}99`}>On Google, today</Label>
        <div className="mt-5 max-w-[600px]" style={{ fontFamily: 'arial, sans-serif' }}>
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: '#f1f3f4', border: '1px solid #dadce0' }}>
              {safeIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeIcon} alt="" width={18} height={18} referrerPolicy="no-referrer" loading="lazy" className="h-[18px] w-[18px] object-contain" />
              ) : (
                <span aria-hidden className="text-[13px]" style={{ color: '#5f6368' }}>◍</span>
              )}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[14px]" style={{ color: '#202124' }}>{s.site_name ?? business}</span>
              <span className="block truncate text-[12px]" style={{ color: '#4d5156' }}>{s.display_url}</span>
            </span>
          </div>
          <p className="mt-2 text-[20px] leading-[1.3]" style={{ color: s.title ? '#1a0dab' : '#70757a' }}>
            {s.title ?? `${host} (no title tag, so Google writes one)`}
          </p>
          <p className="mt-1 text-[14px] leading-[1.58]" style={{ color: s.description ? '#4d5156' : '#70757a' }}>
            {s.description ?? 'No description set, so Google picks a line from the page, often a menu or a cookie notice.'}
          </p>
        </div>
        <figcaption className="mt-6 text-[14px] leading-relaxed" style={{ ...SANS, color: `${INK}a6` }}>
          Drawn from your homepage&apos;s own title and description tags, the two lines Google most often prints. Google can rewrite them; it rarely improves on a good one.
        </figcaption>
      </figure>
      <figure className="m-0 flex min-w-0 flex-col p-6 sm:p-8" style={{ background: PAPER }}>
        <Label color={`${INK}99`}>When a customer texts your link</Label>
        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-[290px] overflow-hidden rounded-[18px]" style={{ background: '#e9e9eb' }}>
            {safeImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeImg} alt="" referrerPolicy="no-referrer" loading="lazy" className="aspect-[1.91/1] w-full object-cover" style={{ background: '#d1d1d6' }} />
            ) : (
              <div className="grid aspect-[1.91/1] w-full place-items-center text-[12px]" style={{ ...MONO, background: '#d1d1d6', color: '#6e6e73' }}>
                NO PREVIEW IMAGE
              </div>
            )}
            <div className="px-3.5 py-2.5" style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}>
              <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug" style={{ color: '#1c1c1e' }}>{s.og_title ?? s.title ?? host}</p>
              <p className="mt-0.5 text-[12px]" style={{ color: '#8e8e93' }}>{host}</p>
            </div>
          </div>
        </div>
        <figcaption className="mt-auto pt-6 text-[14px] leading-relaxed" style={{ ...SANS, color: `${INK}a6` }}>
          {safeImg
            ? 'Your share image and title, as a phone draws them. Referrals travel this way more than any other.'
            : 'With no share image set, a referral arrives as a grey box. Referrals travel this way more than any other.'}
        </figcaption>
      </figure>
    </div>
  );
}

function ScanRow({ c }: { c: ScanCheck }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-5 border-t first:border-t-0" style={{ borderColor: RULE }}>
      <Chip status={c.status} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h4 className="text-[17px] font-semibold leading-snug tracking-[-0.015em]" style={{ ...SANS, color: INK }}>{c.label}</h4>
          {c.effort && (
            <span className="text-[10.5px] uppercase tracking-[0.16em]" style={{ ...MONO, color: `${INK}80` }}>
              {c.urgent ? 'Urgent · ' : ''}{EFFORT[c.effort]}
            </span>
          )}
        </div>
        <p className="mt-1.5 break-words text-[14px] leading-relaxed [overflow-wrap:anywhere]" style={{ ...MONO, color: INK }}>{c.found}</p>
        <p className="mt-2 text-[15px] leading-relaxed" style={{ ...SANS, color: `${INK}b8` }}>{c.why}</p>
        {c.fix && (
          <p className="mt-2.5 text-[15px] leading-relaxed" style={{ ...SANS, color: INK }}>
            <span className="mr-2 text-[10.5px] font-medium uppercase tracking-[0.18em]" style={{ ...MONO, color: TEAL }}>The fix</span>
            {c.fix}
          </p>
        )}
      </div>
    </li>
  );
}

function DeepScanSection({ scan }: { scan: DeepScan }) {
  return (
    <div className="space-y-6">
      {scan.sections.map((sec) => {
        const open = sec.checks.filter((c) => c.status === 'fail' || c.status === 'warn');
        const right = sec.checks.filter((c) => c.status === 'pass' || c.status === 'info');
        const passed = sec.checks.filter((c) => c.status === 'pass').length;
        const graded = sec.checks.filter((c) => c.status !== 'info').length;
        return (
          <section key={sec.key} className="break-inside-avoid-page" style={{ border: `1px solid ${RULE}`, background: '#ffffff' }} aria-labelledby={`scan-${sec.key}`}>
            <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-5 pt-6 sm:px-8" style={{ borderBottom: `1px solid ${RULE}` }}>
              <div className="min-w-0">
                <h3 id={`scan-${sec.key}`} className="text-[24px] sm:text-[28px] font-bold leading-tight tracking-[-0.04em]" style={{ ...SANS, color: INK }}>{sec.label}</h3>
                <p className="mt-1 text-[15px] leading-snug" style={{ ...SANS, color: `${INK}a6` }}>{sec.blurb}</p>
              </div>
              {graded > 0 && (
                <span className="text-[12px] uppercase tracking-[0.14em] tabular-nums" style={{ ...MONO, color: passed === graded ? TEAL : INK }}>
                  {passed} of {graded} right
                </span>
              )}
            </div>
            {open.length > 0 && (
              <ul className="px-6 sm:px-8">
                {open.map((c) => <ScanRow key={c.id} c={c} />)}
              </ul>
            )}
            {right.length > 0 && (
              <ul className="flex flex-wrap gap-px" style={{ background: RULE, borderTop: open.length ? `1px solid ${RULE}` : undefined }}>
                {right.map((c) => (
                  <li key={c.id} className="flex min-w-0 grow basis-full gap-3 px-6 py-4 sm:basis-[calc(50%-1px)] sm:px-8" style={{ background: c.status === 'pass' ? '#fbfcf6' : '#ffffff' }}>
                    <Chip status={c.status} />
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold leading-snug" style={{ ...SANS, color: INK }}>{c.label}</span>
                      <span className="mt-1 block break-words text-[13px] leading-relaxed [overflow-wrap:anywhere]" style={{ ...MONO, color: `${INK}b3` }}>{c.found}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** The strengths, picked from everything that passed. Specific beats flattering. */
function strengths(r: PresenceAuditReport): { title: string; line: string }[] {
  const out: { title: string; line: string }[] = [];
  for (const p of r.pillars ?? []) {
    if (!p.unknown && p.score >= 80) out.push({ title: `${p.key === 'profile' ? 'Google profile' : p.label}: ${p.score}`, line: p.verdict });
  }
  const rev = (r.pillars ?? []).find((p) => p.key === 'reviews' && !p.unknown);
  const stars = rev?.checks.find((c) => c.label === 'Star rating' && c.passed);
  if (stars && !out.some((o) => o.title.startsWith('Reviews'))) out.push({ title: 'Your star rating', line: stars.detail });
  const prof = (r.pillars ?? []).find((p) => p.key === 'profile' && !p.unknown);
  for (const c of prof?.checks ?? []) {
    if (c.passed && /Phone|Website|Hours/.test(c.label) && out.length < 4) out.push({ title: c.label, line: c.detail });
  }
  const WANT = ['indexable', 'dmarc', 'tap-to-call', 'capture', 'schema', 'ai-bots', 'cert', 'ttfb', 'llms', 'analytics', 'title', 'reviews-on-site'];
  const passes = (r.deep_scan?.sections ?? []).flatMap((s) => s.checks).filter((c) => c.status === 'pass');
  for (const id of WANT) {
    const c = passes.find((x) => x.id === id);
    if (c && out.length < 6) out.push({ title: c.label, line: c.found });
  }
  return out.slice(0, 6);
}

type PlanItem = { title: string; how: string; tag: string };

function plan(r: PresenceAuditReport): { week: PlanItem[]; month: PlanItem[]; later: PlanItem[] } {
  const week: PlanItem[] = [];
  const month: PlanItem[] = [];
  const later: PlanItem[] = [];
  const firsts = new Set((r.top_fixes ?? []).map((f) => f.title));
  for (const c of scanFixes(r.deep_scan)) {
    if (firsts.has(c.label)) continue;
    const item = { title: c.label, how: c.fix!, tag: c.section };
    (c.effort === 'minutes' ? week : c.effort === 'build' ? later : month).push(item);
  }
  for (const t of r.website_todo ?? []) {
    const item = { title: t.task, how: '', tag: `Website · ${t.category}` };
    (t.priority === 'high' ? month : later).push(item);
  }
  return { week, month, later };
}

export default function StudioAudit({ r, auditId, leadId }: { r: PresenceAuditReport; auditId: string; leadId: string }) {
  const pillars = r.pillars ?? [];
  const business = r.business_name || 'your business';
  const scan = r.deep_scan ?? null;
  const generated = r.generated_at
    ? new Date(r.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' })
    : '';
  const t = tone(r.overall_score);
  const domain = (r.website || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const pillarChecks = pillars.filter((p) => !p.unknown).reduce((n, p) => n + p.checks.length, 0);
  const cats = r.website_categories ? Object.values(r.website_categories).filter((c) => c && typeof c.score === 'number').length : 0;
  const checksRun = pillarChecks + cats + (scan?.counts.total ?? 0);
  const fixesCount = (r.top_fixes?.length ?? 0) + scanFixes(scan).filter((c) => !(r.top_fixes ?? []).some((f) => f.title === c.label)).length;
  const good = strengths(r);
  const p = plan(r);
  const ref = auditId.slice(0, 8).toUpperCase();

  const chapters: { id: string; label: string; show: boolean }[] = [
    { id: 'working', label: 'What is working', show: good.length > 0 },
    { id: 'pillars', label: 'The three pillars', show: true },
    { id: 'first', label: 'Do these first', show: (r.top_fixes?.length ?? 0) > 0 },
    { id: 'show-up', label: 'How you show up', show: Boolean(scan) },
    { id: 'deep-scan', label: 'The deep scan', show: Boolean(scan?.sections.length) },
    { id: 'listing', label: 'Profile and reviews', show: pillars.some((x) => x.checks.length > 0 && !x.unknown) },
    { id: 'website', label: 'Website, read closely', show: Boolean(r.website_categories && cats) },
    { id: 'plan', label: 'The plan', show: p.week.length + p.month.length + p.later.length > 0 },
    { id: 'receipts', label: 'Receipts', show: true },
  ];
  const shown = chapters.filter((c) => c.show);
  const num = (id: string) => String(shown.findIndex((c) => c.id === id) + 1).padStart(2, '0');

  return (
    <main data-audit-edition="studio" className="min-h-screen print:bg-white" style={{ ...SANS, background: PAPER, color: INK }}>
      {/* ── masthead ── */}
      <div style={{ borderBottom: `1px solid ${INK}` }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <a href="https://modernmustardseed.com" className="flex items-center gap-2.5 text-[15px] font-bold tracking-[-0.02em]" style={{ color: INK }}>
            <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: MUSTARD, boxShadow: `0 0 0 2px ${INK}` }} />
            Modern Mustard Seed
          </a>
          <span className="text-[11px] uppercase tracking-[0.2em]" style={{ ...MONO, color: `${INK}99` }}>
            The Audit · No. {ref}{generated ? ` · ${generated}` : ''}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-20 px-5 pb-20 pt-10 sm:space-y-28 sm:px-8 sm:pt-16">
        {/* ── the cover ── */}
        <section className="grid grid-cols-1 gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <Label>Website, presence and everything under them</Label>
            <h1 className="mt-5 break-words text-[44px] font-bold leading-[0.95] tracking-[-0.055em] [text-wrap:balance] sm:text-[72px]" style={{ ...SANS, color: INK }}>
              {business}
            </h1>
            <p className="mt-6 text-[26px] leading-[1.15] sm:text-[34px] [text-wrap:balance]" style={{ ...ACCENT, color: TEAL }}>
              {r.headline}
            </p>
            <p className="mt-6 max-w-2xl text-[17px] leading-relaxed sm:text-[18px]" style={{ ...SANS, color: `${INK}cc` }}>{r.summary}</p>
            {domain && (
              <p className="mt-6 break-words text-[13px] [overflow-wrap:anywhere]" style={{ ...MONO, color: `${INK}99` }}>
                {domain}{scan?.platform ? ` · built on ${scan.platform}` : ''}
              </p>
            )}
          </div>

          <aside className="flex min-w-0 flex-col" style={{ border: `1px solid ${INK}`, background: '#ffffff' }}>
            <div className="flex items-center gap-5 p-6 sm:p-7">
              <Ring score={r.overall_score} size={150} />
              <div className="min-w-0">
                <Label color={`${INK}99`}>Overall</Label>
                <p className="mt-2 text-[30px] font-bold leading-none tracking-[-0.04em]" style={{ ...SANS, color: t.color }}>{t.word}</p>
                <p className="mt-2 text-[12px] uppercase tracking-[0.16em]" style={{ ...MONO, color: `${INK}99` }}>Grade {r.letter_grade}</p>
              </div>
            </div>
            <dl className="flex" style={{ borderTop: `1px solid ${INK}` }}>
              {[
                { k: 'Checks run', v: checksRun },
                { k: 'Already right', v: (scan?.counts.pass ?? 0) + pillars.filter((x) => !x.unknown).reduce((n, x) => n + x.checks.filter((c) => c.passed).length, 0) },
                { k: 'Fixes, ranked', v: fixesCount },
              ]
                // A zero on the cover reads as a verdict. On a report filed before
                // the deep scan there may be nothing countable to praise yet.
                .filter((s) => s.v > 0)
                .map((s, i) => (
                <div key={s.k} className="min-w-0 flex-1 px-4 py-4 sm:px-5" style={{ borderLeft: i ? `1px solid ${RULE}` : undefined }}>
                  <dd className="text-[30px] font-bold leading-none tabular-nums tracking-[-0.04em]" style={{ ...SANS, color: INK }}>{s.v}</dd>
                  <dt className="mt-2 text-[10px] uppercase leading-tight tracking-[0.16em]" style={{ ...MONO, color: `${INK}99` }}>{s.k}</dt>
                </div>
              ))}
            </dl>
            <figure className="relative m-0 mt-auto min-h-[150px] flex-1" style={{ borderTop: `1px solid ${INK}` }}>
              <picture>
                <source type="image/webp" srcSet="/storybook/found-800.webp 800w, /storybook/found-1600.webp 1600w" sizes="(min-width: 1024px) 440px, 100vw" />
                <img
                  src="/storybook/found-800.webp"
                  alt="A golden magnifying glass shines down on a storybook lakeside town."
                  width={800}
                  height={450}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </picture>
            </figure>
          </aside>
        </section>

        {/* ── contents ── */}
        <nav aria-label="In this report" className="print:hidden">
          <ol className="flex flex-wrap gap-px" style={{ background: RULE, border: `1px solid ${RULE}` }}>
            {shown.map((c, i) => (
              <li key={c.id} className="grow basis-[150px] sm:basis-[200px]" style={{ background: PAPER }}>
                <a href={`#${c.id}`} className="flex items-baseline gap-3 px-4 py-3.5 text-[14.5px] font-semibold tracking-[-0.01em] transition-colors hover:bg-white" style={{ color: INK }}>
                  <span className="text-[11px] tabular-nums" style={{ ...MONO, color: TEAL }}>{String(i + 1).padStart(2, '0')}</span>
                  {c.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ── what is already working ── */}
        {good.length > 0 && (
          <section className="space-y-8">
            <Chapter n={num('working')} id="working" kicker="Start here" title="What you already" accent="got right.">
              Every business we audit is doing something well. These are yours, and every fix later in this report is built to protect them.
            </Chapter>
            <ul className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: RULE, border: `1px solid ${RULE}` }}>
              {good.map((g) => (
                <li key={g.title} className="flex gap-3 p-6" style={{ background: '#ffffff' }}>
                  <Chip status="pass" />
                  <span className="min-w-0">
                    <span className="block text-[17px] font-semibold leading-snug tracking-[-0.015em]" style={{ ...SANS, color: INK }}>{g.title}</span>
                    <span className="mt-1.5 block break-words text-[14.5px] leading-relaxed [overflow-wrap:anywhere]" style={{ ...SANS, color: `${INK}b3` }}>{g.line}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── the three pillars ── */}
        <section className="space-y-8">
          <Chapter n={num('pillars')} id="pillars" kicker="The grade" title="Three pillars," accent="one number.">
            How a stranger meets you: your website, your reviews and your Google profile. The weights are printed on each one, and anything we could not see is left out of the total rather than counted as a zero.
          </Chapter>
          <div className="grid grid-cols-1 gap-px md:grid-cols-3" style={{ background: INK, border: `1px solid ${INK}` }}>
            {pillars.map((x) => <PillarCell key={x.key} p={x} />)}
          </div>
        </section>

        {/* ── do these first ── */}
        {r.top_fixes?.length > 0 && (
          <section className="space-y-8">
            <Chapter n={num('first')} id="first" kicker="In this order" title="Do these" accent="first.">
              Ranked by what each one is worth against what it costs. The free ones lead on purpose.
            </Chapter>
            <ol className="flex flex-wrap gap-px" style={{ background: `${PAPER}26`, border: `1px solid ${TEAL}` }}>
              {r.top_fixes.map((f, i) => (
                <li key={`${f.title}-${i}`} className="flex min-w-0 grow basis-full gap-5 p-6 sm:p-8 md:basis-[calc(50%-1px)]" style={{ background: TEAL, color: PAPER }}>
                  <span className="text-[44px] font-bold leading-[0.85] tabular-nums tracking-[-0.06em]" style={{ ...SANS, color: MUSTARD }}>{i + 1}</span>
                  <div className="min-w-0">
                    <h3 className="text-[20px] font-semibold leading-snug tracking-[-0.02em]" style={{ ...SANS, color: PAPER }}>{f.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed" style={{ ...SANS, color: `${PAPER}cc` }}>{f.why}</p>
                    <p className="mt-3 text-[15px] leading-relaxed" style={{ ...SANS, color: PAPER }}>
                      <span className="mr-2 text-[10.5px] font-medium uppercase tracking-[0.18em]" style={{ ...MONO, color: MUSTARD }}>How</span>
                      {f.how}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ── how you show up ── */}
        {scan && (
          <section className="space-y-8">
            <Chapter n={num('show-up')} id="show-up" kicker="Seen from outside" title="How you" accent="show up.">
              Before anyone reads a word of your site, they see one of these two things. Both are drawn from your own homepage, exactly as it stood on {generated || 'the day of this audit'}.
            </Chapter>
            <ShowUp scan={scan} business={business} />
          </section>
        )}

        {/* ── the deep scan ── */}
        {scan && scan.sections.length > 0 && (
          <section className="space-y-8">
            <Chapter n={num('deep-scan')} id="deep-scan" kicker={`${scan.counts.total} measured checks`} title="Under the" accent="hood.">
              Speed, security, your domain and email, search, AI search, and the plumbing that turns a visit into a call. Nothing here is an opinion: every line prints what we found, so you or your web person can confirm it in a minute. The deep scan does not change your grade.
            </Chapter>
            <div className="flex flex-wrap gap-x-8 gap-y-3" style={{ ...MONO }}>
              {(['pass', 'warn', 'fail'] as const).map((k) => (
                <span key={k} className="flex items-center gap-2.5 text-[12px] uppercase tracking-[0.14em]" style={{ color: INK }}>
                  <Chip status={k} />
                  <b className="text-[18px] tabular-nums" style={{ ...SANS }}>{scan.counts[k]}</b>
                  {k === 'pass' ? 'already right' : k === 'warn' ? 'to tighten' : 'to fix'}
                </span>
              ))}
            </div>
            {scan.script_rendered && (
              <p className="max-w-3xl text-[14.5px] leading-relaxed" style={{ ...SANS, color: `${INK}b3` }}>
                Your homepage draws its words with JavaScript, so anything that depends on reading the page&apos;s text is marked as a note rather than counted against you.
              </p>
            )}
            <DeepScanSection scan={scan} />
          </section>
        )}

        {/* ── profile and reviews, check by check ── */}
        {pillars.some((x) => x.checks.length > 0 && !x.unknown) && (
          <section className="space-y-8">
            <Chapter n={num('listing')} id="listing" kicker="Arithmetic you can redo" title="Your profile and reviews," accent="line by line." />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {pillars.filter((x) => x.checks.length > 0 && !x.unknown).map((x) => (
                <section key={x.key} style={{ border: `1px solid ${RULE}`, background: '#ffffff' }}>
                  <div className="flex items-baseline justify-between gap-4 px-6 pb-4 pt-6 sm:px-8" style={{ borderBottom: `1px solid ${RULE}` }}>
                    <h3 className="text-[24px] font-bold tracking-[-0.04em]" style={{ ...SANS, color: INK }}>{x.key === 'profile' ? 'Google profile' : x.label}</h3>
                    <span className="text-[12px] uppercase tracking-[0.14em] tabular-nums" style={{ ...MONO, color: INK }}>{x.score} / 100</span>
                  </div>
                  <ul className="px-6 sm:px-8">
                    {x.checks.map((c) => (
                      <li key={c.label} className="grid grid-cols-[auto_1fr_auto] gap-x-4 py-4 border-t first:border-t-0" style={{ borderColor: RULE }}>
                        <Chip status={c.passed ? 'pass' : 'fail'} />
                        <span className="min-w-0">
                          <span className="block text-[16px] font-semibold leading-snug" style={{ ...SANS, color: INK }}>{c.label}</span>
                          <span className="mt-1 block text-[14.5px] leading-relaxed" style={{ ...SANS, color: `${INK}b3` }}>{c.detail}</span>
                        </span>
                        <span className="text-[12px] tabular-nums" style={{ ...MONO, color: `${INK}99` }}>{c.earned}/{c.points}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        )}

        {/* ── the seven website categories ── */}
        {r.website_categories && cats > 0 && (
          <section className="space-y-8">
            <Chapter n={num('website')} id="website" kicker="Seven readings" title="Your website," accent="read closely.">
              The way a stranger reads your site, in seven parts: what it says, whether it is believed, whether Google and the AI engines can find it, whether it works for you after hours, whether it turns a visit into a call, and how it looks doing it.
            </Chapter>
            <div className="flex flex-wrap gap-px" style={{ background: RULE, border: `1px solid ${RULE}` }}>
              {Object.entries(r.website_categories)
                .filter((e): e is [string, { score: number; letter: string; notes: string }] => Boolean(e[1]) && typeof (e[1] as { score?: unknown }).score === 'number')
                .map(([key, cat]) => (
                  <div key={key} className="min-w-0 grow basis-full p-6 sm:basis-[calc(50%-1px)] sm:p-7" style={{ background: '#ffffff' }}>
                    <div className="flex items-baseline justify-between gap-3">
                      <Label color={INK}>{key === 'geo' ? 'GEO · AI search' : key === 'ai_features' ? 'AI features' : key}</Label>
                      <span className="text-[13px] tabular-nums" style={{ ...MONO, color: tone(cat.score).color }}>{cat.score} · {cat.letter}</span>
                    </div>
                    <div className="mt-4"><Bar score={cat.score} /></div>
                    <p className="mt-4 text-[15px] leading-relaxed" style={{ ...SANS, color: `${INK}c2` }}>{cat.notes}</p>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ── the plan ── */}
        {p.week.length + p.month.length + p.later.length > 0 && (
          <section className="space-y-8">
            <Chapter n={num('plan')} id="plan" kicker="Everything else, by effort" title="The plan, sorted by" accent="effort.">
              The rest of what we found, sorted by how long it takes rather than how loud it sounds. A good week clears the first column; most of it costs nothing.
            </Chapter>
            <div className="grid grid-cols-1 gap-px lg:grid-cols-3" style={{ background: INK, border: `1px solid ${INK}` }}>
              {[
                { k: 'This week', sub: 'Minutes each, mostly free', items: p.week, bg: MUSTARD },
                { k: 'This month', sub: 'An afternoon each', items: p.month, bg: '#ffffff' },
                { k: 'When you are ready', sub: 'Worth doing properly', items: p.later, bg: PAPER },
              ].map((col) => (
                <div key={col.k} className="min-w-0 p-6 sm:p-7" style={{ background: col.bg }}>
                  <h3 className="text-[24px] font-bold tracking-[-0.04em]" style={{ ...SANS, color: INK }}>{col.k}</h3>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{ ...MONO, color: `${INK}a6` }}>{col.sub} · {col.items.length}</p>
                  {col.items.length ? (
                    <ul className="mt-5 space-y-4">
                      {col.items.map((it, i) => (
                        <li key={`${it.title}-${i}`} className="border-t pt-4 first:border-t-0 first:pt-0" style={{ borderColor: `${INK}26` }}>
                          <span className="block text-[10.5px] uppercase tracking-[0.14em]" style={{ ...MONO, color: TEAL }}>{it.tag}</span>
                          <span className="mt-1 block text-[15.5px] font-semibold leading-snug" style={{ ...SANS, color: INK }}>{it.title}</span>
                          {it.how && <span className="mt-1 block text-[14px] leading-relaxed" style={{ ...SANS, color: `${INK}b3` }}>{it.how}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-5 text-[15px] leading-relaxed" style={{ ...SANS, color: `${INK}a6` }}>Nothing here. That column is clear.</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── the ask, after the evidence and never instead of it ── */}
        <div className="print:hidden">
          <PresenceAsk business={business} leadId={leadId} auditId={auditId} score={r.overall_score} edition="studio" />
        </div>

        {/* ── the receipts ── */}
        <footer className="space-y-8">
          <Chapter n={num('receipts')} id="receipts" kicker="Where every number came from" title="The" accent="receipts." />
          {r.provenance?.length > 0 && (
            <dl className="flex flex-wrap gap-px" style={{ background: RULE, border: `1px solid ${RULE}` }}>
              {r.provenance.map((x) => (
                <div key={x.label} className="min-w-0 grow basis-full px-5 py-4 sm:basis-[calc(50%-1px)]" style={{ background: '#ffffff' }}>
                  <dt className="text-[10.5px] uppercase tracking-[0.16em]" style={{ ...MONO, color: `${INK}99` }}>{x.label}</dt>
                  <dd className="mt-1 break-words text-[15px] [overflow-wrap:anywhere]" style={{ ...SANS, color: INK }}>
                    {x.value}{' '}
                    {x.sourceUrl ? (
                      <a href={x.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-[13px] underline underline-offset-2" style={{ color: TEAL, textDecorationColor: `${TEAL}55` }}>
                        ({x.source})
                      </a>
                    ) : (
                      <span className="text-[13px]" style={{ color: `${INK}99` }}>({x.source})</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <div className="grid grid-cols-1 gap-8 text-[14.5px] leading-relaxed md:grid-cols-2" style={{ ...SANS, color: `${INK}b3` }}>
            <p>
              <b style={{ color: INK }}>The grade.</b> Website {Math.round(PILLAR_WEIGHTS.website * 100)}%, reviews{' '}
              {Math.round(PILLAR_WEIGHTS.reviews * 100)}%, Google profile {Math.round(PILLAR_WEIGHTS.profile * 100)}%. The website is read live and graded in seven categories. The profile and reviews are arithmetic you can redo yourself: every check shows what it is worth and what it earned. A pillar we could not see is left out of the total, never counted as zero.
            </p>
            <p>
              <b style={{ color: INK }}>The deep scan.</b> {scan
                ? `Measured on ${new Date(scan.scanned_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' })} from our server: your homepage, robots.txt, sitemap and llms.txt, the certificate your site presents, your domain's public registration record, and your domain's public DNS records for email. No logins, nothing private, nothing a stranger could not see. It does not change your grade.`
                : 'This report was filed before the deep scan existed. Ask for a fresh audit and it will include one.'}
            </p>
          </div>
          <p className="pt-2 text-[11px] uppercase tracking-[0.2em]" style={{ ...MONO, color: `${INK}80` }}>
            <a href="https://modernmustardseed.com" style={{ color: TEAL }}>Modern Mustard Seed</a> · Kalispell, Montana · Report No. {ref}
          </p>
        </footer>
      </div>
    </main>
  );
}
