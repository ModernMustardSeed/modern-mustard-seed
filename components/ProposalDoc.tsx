import Image from 'next/image';
import { byId, isRecurring, isHourly, formatMoney as money, TERMS, type Service } from '@/data/proposal-menu';

/**
 * The shared, on-brand proposal document. One component renders the live token
 * proposal, the public sample, AND the builder preview so they can never drift
 * again (the old builder preview had its own navy/parchment design, which is
 * exactly how Sarah ended up sending a document that was not her brand).
 *
 * Pop-art system: midnight header (dark is reserved for the proposal doc header
 * by brand law), gold halftone, Playfair display for names and money, JetBrains
 * mono eyebrows, DM Sans body, hard sticker shadows. The "Already built for
 * you" showcase renders the built demos as clickable gold cards, because the
 * demo IS the pitch.
 */

export type ProposalLine = { id: string; price: number; qty: number; scope?: string[]; framing?: string };
export type ProposalDemoLink = { label: string; url: string };

export type ProposalDocProps = {
  preparedFor?: string;
  /** Company (or name) used for the display headline: "A plan for X." */
  headlineFor?: string | null;
  dateStr?: string | null;
  siteUrl?: string | null;
  /** Live demo/site links built for this prospect. Rendered as the clickable showcase. */
  demoLinks?: ProposalDemoLink[] | null;
  prose: { intro?: string; situation?: string; recommendation?: string; close?: string };
  situationFallback?: string | null;
  lines: ProposalLine[];
  oneTime: number;
  monthly: number;
  depositDue: number;
  balanceDue: number;
  hasVariable: boolean;
  /** Hide dollar figures (used by the public sample so we never publish hard
   * prices that scare off a fit before the call). Shows "Quoted per project"
   * per line and a words-only payment note instead of the totals. */
  hidePrices?: boolean;
};

function linePriceLabel(s: Service, l: ProposalLine, hidePrices = false): string {
  if (s.unit === 'free') return 'Included';
  if (hidePrices) return s.variable ? 'Billed at cost' : 'Quoted per project';
  if (isHourly(s.unit)) return `${money(l.price)}/hr × ${l.qty} = ${money(l.price * l.qty)}`;
  if (isRecurring(s.unit)) return `${money(l.price)}/mo`;
  const base = money(l.price * (l.qty || 1));
  return s.unit === 'fixed_from' ? `from ${base}` : base;
}

function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function bareUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

/** Only our own demo pages get embedded live (anything else may send
 * X-Frame-Options and render a blank hole in the middle of a sales doc). */
function canEmbed(url: string): boolean {
  return /modernmustardseed\.com\/demo\//i.test(url) || /localhost:\d+\/demo\//i.test(url);
}

/** A live, scrolling preview of the built site inside a drawn browser frame.
 * The iframe renders at 2x container size scaled to 0.5, so the demo lays out
 * like a desktop page at any doc width, phones included. Click-through overlay
 * carries the whole frame to the real thing. */
function LiveFrame({ label, url }: { label: string; url: string }) {
  const href = withProtocol(url);
  return (
    <div className="rounded-xl border-2 border-[#161616] overflow-hidden shadow-[4px_4px_0_0_#161616] bg-white">
      <div className="flex items-center gap-1.5 bg-[#161616] px-3 py-2">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#E0301E]" />
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#F5B700]" />
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#1E50C8]" />
        <span className="ml-2 flex-1 truncate rounded bg-white/10 px-2 py-0.5 font-mono text-[9.5px] text-white/70">
          {bareUrl(url)}
        </span>
      </div>
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
        <iframe
          src={href}
          title={label}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute left-0 top-0 border-0 pointer-events-none"
          style={{ width: '200%', height: '200%', transform: 'scale(0.5)', transformOrigin: 'top left' }}
        />
        <a href={href} target="_blank" rel="noopener noreferrer" className="group absolute inset-0" aria-label={`${label}, open it live`}>
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 font-sans text-[11px] font-extrabold text-[#161616] shadow-[2px_2px_0_0_#161616] group-hover:-translate-y-0.5 transition-transform">
            {label} <span aria-hidden="true">↗</span>
          </span>
        </a>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold">
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <Eyebrow>{title}</Eyebrow>
      <p className="mt-2 text-[15px] text-[#3a3733] font-body leading-relaxed whitespace-pre-line">{children}</p>
    </div>
  );
}

export default function ProposalDoc({
  preparedFor,
  headlineFor,
  dateStr,
  siteUrl,
  demoLinks,
  prose,
  situationFallback,
  lines,
  oneTime,
  monthly,
  depositDue,
  balanceDue,
  hasVariable,
  hidePrices = false,
}: ProposalDocProps) {
  const situation = prose.situation || situationFallback || '';
  const showcase = (demoLinks ?? []).filter((d) => d && d.url);

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl overflow-hidden shadow-[6px_6px_0_0_#161616]">
      {/* One orchestrated entrance, then stillness: a document you sign should
          settle, not perform. CSS-only so every render path (token page, sample,
          builder preview) gets it for free; reduced-motion and print opt out. */}
      <style>{`
        @keyframes pdRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .pd-head { animation: pdRise 0.55s ease both; }
        .pd-body > * { animation: pdRise 0.55s ease both; }
        .pd-body > *:nth-child(1) { animation-delay: 0.08s; }
        .pd-body > *:nth-child(2) { animation-delay: 0.14s; }
        .pd-body > *:nth-child(3) { animation-delay: 0.2s; }
        .pd-body > *:nth-child(4) { animation-delay: 0.26s; }
        .pd-body > *:nth-child(5) { animation-delay: 0.32s; }
        .pd-body > *:nth-child(6) { animation-delay: 0.38s; }
        .pd-body > *:nth-child(7) { animation-delay: 0.44s; }
        .pd-body > *:nth-child(8) { animation-delay: 0.5s; }
        .pd-body > *:nth-child(n+9) { animation-delay: 0.56s; }
        @media (prefers-reduced-motion: reduce), print {
          .pd-head, .pd-body > * { animation: none; }
        }
      `}</style>
      {/* Midnight header band. Dark is reserved for exactly this, by brand law. */}
      <div className="pd-head relative bg-[#080C16] px-8 pt-10 pb-12 text-center overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(245,183,0,0.16) 1.3px, transparent 1.4px)',
            backgroundSize: '18px 18px',
          }}
        />
        {/* Gold baseline strip, the one thing the eye hits on the dark canvas. */}
        <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#F5B700]" />
        <div className="relative">
          <Image
            src="/brand/mascot.png"
            alt=""
            width={885}
            height={1180}
            className="h-14 w-auto mx-auto mb-4 drop-shadow-[3px_3px_0_rgba(245,183,0,0.35)]"
          />
          <div className="text-[10px] tracking-[0.45em] uppercase text-[#F5B700] font-mono font-bold">
            Modern Mustard Seed
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-white tracking-tight mt-2.5 leading-[1.06] text-balance">
            {headlineFor ? `A plan for ${headlineFor}.` : 'Your proposal.'}
          </h1>
          <p className="text-white/55 font-mono text-[10.5px] tracking-[0.22em] uppercase mt-4">
            {[dateStr, preparedFor ? `Prepared for ${preparedFor}` : null].filter(Boolean).join('  ·  ')}
          </p>
        </div>
      </div>

      <div className="pd-body px-7 md:px-9 py-8">
        {siteUrl && (
          <p className="mb-5">
            <span className="block text-[9px] uppercase tracking-[0.25em] text-[#161616]/40 font-mono font-bold mb-1">
              Your site today
            </span>
            <a
              href={withProtocol(siteUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-baseline gap-1.5 text-[13px] font-mono text-[#1E50C8] hover:text-[#161616] underline decoration-[#1E50C8]/30 underline-offset-4 break-all transition-colors"
            >
              {bareUrl(siteUrl)} <span aria-hidden="true">↗</span>
            </a>
          </p>
        )}

        {prose.intro && (
          <p className="text-[16px] text-[#3a3733] font-body leading-relaxed mb-7">{prose.intro}</p>
        )}

        {/* The showcase: work that already exists, live, clickable. This sells
            harder than any paragraph, so it sits above the situation. Our own
            built demos render as LIVE embedded previews (the prospect sees
            their new site breathing inside the proposal); everything else gets
            a gold card. */}
        {showcase.length > 0 && (() => {
          const embeds = showcase.filter((d) => canEmbed(d.url)).slice(0, 2);
          const embedded = new Set(embeds.map((d) => d.url));
          const cards = showcase.filter((d) => !embedded.has(d.url));
          return (
          <div className="mb-8">
            <Eyebrow>Already built for you</Eyebrow>
            <p className="mt-2 text-[14px] text-[#3a3733] font-body leading-relaxed">
              We do not pitch with promises. Before this proposal was written, we built. Everything below
              is live right now.
            </p>
            {embeds.length > 0 && (
              <div className="space-y-4 mt-4">
                {embeds.map((d, i) => (
                  <LiveFrame key={`${d.url}-${i}`} label={d.label || 'See it live'} url={d.url} />
                ))}
              </div>
            )}
            {cards.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {cards.map((d, i) => (
                <a
                  key={`${d.url}-${i}`}
                  href={withProtocol(d.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-xl border-2 border-[#161616] bg-[#F5B700] px-4 py-3.5 shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] transition-all"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-display font-black text-[16px] text-[#161616] leading-snug">
                      {d.label || 'See it live'}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-[#161616] font-black text-[15px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                    >
                      ↗
                    </span>
                  </span>
                  <span className="block font-mono text-[10.5px] text-[#161616]/60 mt-1 break-all">
                    {bareUrl(d.url)}
                  </span>
                </a>
              ))}
            </div>
            )}
          </div>
          );
        })()}

        {situation && <Section title="Where you are">{situation}</Section>}
        {prose.recommendation && <Section title="What we recommend">{prose.recommendation}</Section>}

        {/* Scope and pricing */}
        <Eyebrow>Scope and pricing</Eyebrow>
        <div className="space-y-4 mt-3.5">
          {lines.map((l, i) => {
            const s = byId(l.id);
            if (!s) return null;
            const scope = l.scope?.length ? l.scope : s.scope ?? [];
            return (
              <div
                key={i}
                className="border-2 border-[#161616] rounded-xl p-5"
                style={{ boxShadow: `inset 6px 0 0 0 ${s.variable ? '#1E50C8' : '#F5B700'}` }}
              >
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="flex items-baseline gap-2.5 min-w-0">
                    <span className="font-mono text-[10px] font-bold text-[#8f6600] tracking-[0.12em] shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display font-black text-[19px] text-[#161616] tracking-tight leading-snug">
                      {s.name}
                    </span>
                  </span>
                  <span className="text-right whitespace-nowrap">
                    <span className="font-display text-[16px] font-black text-[#161616]">
                      {linePriceLabel(s, l, hidePrices)}
                    </span>
                    {s.variable && (
                      <span className="block text-[10px] text-[#161616]/45 font-mono uppercase tracking-wider">
                        at cost, varies with usage
                      </span>
                    )}
                  </span>
                </div>
                {l.framing && (
                  <p className="text-[13.5px] text-[#3a3733] font-body leading-relaxed mb-3">{l.framing}</p>
                )}
                <ul className="space-y-1.5">
                  {scope.map((b, j) => (
                    <li key={j} className="text-[13px] text-[#3a3733] font-body leading-relaxed pl-4 relative">
                      <span className="absolute left-0 text-[#C4160B] font-black">&bull;</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        {hidePrices ? (
          <div className="mt-7 rounded-xl bg-[#FFF3CC] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] p-5">
            <p className="text-[14px] text-[#3a3733] font-body leading-relaxed">
              Every line is quoted per project, in writing, before any work begins. Most builds run on a
              50% deposit to start and the balance on delivery, with software and compute billed at cost.
              You will see your exact, fixed numbers on your own proposal after a free call.
            </p>
          </div>
        ) : (
        <div className="mt-7 space-y-4">
          {oneTime > 0 && (
            <>
              <div className="flex items-baseline justify-between border-t-2 border-[#161616]/10 pt-4">
                <span className="text-[12px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/55">
                  Project total
                </span>
                <span className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
                  {money(oneTime)}
                </span>
              </div>
              <div className="rounded-xl bg-[#FFF3CC] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] p-4 space-y-2.5">
                {balanceDue <= 0 ? (
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-[#3a3733] font-body">One payment. Nothing due later.</span>
                    <span className="font-display text-[17px] font-black text-[#161616]">{money(depositDue)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] text-[#3a3733] font-body">To start, 50% deposit</span>
                      <span className="font-display text-[17px] font-black text-[#161616]">{money(depositDue)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] text-[#3a3733] font-body">Balance on delivery</span>
                      <span className="font-display text-[17px] font-black text-[#161616]">{money(balanceDue)}</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          {monthly > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-[#3a3733] font-body">
                Monthly{hasVariable ? ', estimated' : ''}
              </span>
              <span className="font-display text-[18px] font-black text-[#161616]">{money(monthly)}/mo</span>
            </div>
          )}
          {hasVariable && (
            <p className="text-[12px] text-[#161616]/45 font-body leading-relaxed">
              Software and compute is billed at cost and moves with the compute used each month. The monthly
              figure is an estimate, not a fixed charge.
            </p>
          )}
        </div>
        )}

        {/* Terms */}
        <div className="mt-8">
          <Eyebrow>Terms</Eyebrow>
          <ul className="space-y-1.5 mt-3">
            {TERMS.map((t, i) => (
              <li key={i} className="text-[12.5px] text-[#3a3733] font-body leading-relaxed pl-4 relative">
                <span className="absolute left-0 text-[#C4160B] font-black">&bull;</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {prose.close && (
          <p className="text-[16px] text-[#3a3733] font-body leading-relaxed mt-7 pt-6 border-t-2 border-[#161616]/10">
            {prose.close}
          </p>
        )}

        {/* Signature */}
        <div className="mt-9 pt-6 border-t-2 border-[#161616]/10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold">With faith,</p>
            <p className="font-display text-3xl font-black text-[#161616] mt-1">Sarah</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8f6600] font-mono font-bold mt-1">
              Founder, Modern Mustard Seed
            </p>
          </div>
          <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-11 w-auto" />
        </div>
        <p className="mt-7 text-center font-serif italic text-[14.5px] text-[#161616]/55 leading-relaxed">
          &ldquo;If you have faith as small as a mustard seed, nothing will be impossible for you.&rdquo;{' '}
          <span className="not-italic font-mono text-[9.5px] tracking-[0.15em] uppercase text-[#161616]/40">
            Matthew 17:20
          </span>
        </p>
      </div>
    </div>
  );
}
