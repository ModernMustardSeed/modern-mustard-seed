'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminHeader from './AdminHeader';

/**
 * THE SITE TEMPLATE GALLERY (2026-08-24). Every visual system the Forge can
 * build, named, with the real reference site embedded whole, its real palette
 * and type rendered in the real fonts, what it fits, what it carries, and how
 * many live sites wear it. Above the templates sit the three STRUCTURES (the
 * tiers) the templates are built on, each with its reference embedded too.
 *
 * This is the page Sarah reads before she picks one on a contact card. The
 * registry is code (lib/site-templates.mjs); this page is its face.
 */

type Reference = { label: string; url: string; notes: string; source: 'repo' | 'demo' | 'live' };

type Template = {
  key: string;
  name: string;
  origin: string;
  source: 'house' | 'package' | 'studio';
  feel: string;
  fits: string[];
  fitsLabels: string[];
  alsoFits: string;
  avoidFor: string[];
  avoidLabels: string[];
  palette: { ground: string; paper: string; ink: string; accent: string; support: string; dark: boolean };
  type: { display: string; body: string; third: string; thirdRole: string; googleFamilies: string[] };
  skeleton: string[];
  devices: string[];
  copy: string;
  imagery: string;
  law: string;
  fontsHref: string;
  usage: { count: number; lastAt: string | null; examples: { id: string; business: string; url: string; at: string }[] };
  reference: Reference | null;
  referenceNotes: string;
};

type Structure = {
  key: string;
  name: string;
  status: string;
  feel: string;
  carries: string[];
  references: Reference[];
  doc: string;
};

type Payload = { shared: string[]; structures: Structure[]; templates: Template[] };

const SOURCE_LABEL: Record<Template['source'], string> = {
  house: 'House style, lifted off an approved build',
  package: 'Template package',
  studio: 'Studio design',
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');

const btn = 'text-[10px] uppercase tracking-[0.18em] font-sans font-bold rounded-lg border-2 px-3 py-1.5 transition-all';
const btnGold = `${btn} text-[#161616] bg-[#F5B700] border-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5`;
const btnInk = `${btn} bg-[#161616] text-[#FBF6EA] border-[#161616]`;
const btnPaper = `${btn} bg-white text-[#161616]/70 border-[#161616]/25 hover:border-[#161616]`;
const eyebrowCls = 'text-[9px] uppercase tracking-[0.22em] font-mono font-bold text-[#C4160B] mb-2';

function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="w-6 h-6 rounded-md border border-[#161616]/25 shrink-0" style={{ background: hex }} aria-hidden="true" />
      <span className="text-[11px] font-mono text-[#161616]/70 truncate">
        <span className="uppercase tracking-[0.12em] text-[9px] text-[#161616]/50 mr-1">{label}</span>
        {hex}
      </span>
    </div>
  );
}

/**
 * The heaviest weight the display family actually loads. Ultra and Anton ship
 * one weight; Cormorant loads 300 to 600; asking for 700 everywhere would make
 * the browser fake-bold half the specimens.
 */
function displayWeight(t: Template): number {
  const spec = t.type.googleFamilies[0] ?? '';
  const weights = Array.from(spec.matchAll(/(\d{3})(?=[;&]|$)/g)).map((m) => Number(m[1]));
  return weights.length ? Math.max(...weights) : 400;
}

/** A live specimen: the template's default ground, ink, accent and three faces. */
function Specimen({ t }: { t: Template }) {
  const { ground, paper, ink, accent } = t.palette;
  const weight = displayWeight(t);
  return (
    <div className="rounded-xl border-2 border-[#161616] overflow-hidden" style={{ background: ground, color: ink }} aria-label={`${t.name} type and colour specimen`}>
      <div className="px-5 pt-5 pb-3">
        <div className="text-[10px] uppercase tracking-[0.28em] mb-3 opacity-70" style={{ fontFamily: `'${t.type.body}', system-ui, sans-serif` }}>
          {t.type.display} + {t.type.body} + {t.type.third.replace(/\s*\(.*\)$/, '')}
        </div>
        <div className="leading-[0.95] text-[40px] sm:text-[46px]" style={{ fontFamily: `'${t.type.display}', Georgia, serif`, fontWeight: weight }}>
          Built for <span style={{ color: accent }}>them</span> alone.
        </div>
        <p className="mt-3 text-[13px] leading-relaxed max-w-[38ch] opacity-85" style={{ fontFamily: `'${t.type.body}', system-ui, sans-serif` }}>
          {t.feel}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-t" style={{ borderColor: `${ink}22`, background: paper, color: ink }}>
        <span className="text-[12px]" style={{ fontFamily: `'${t.type.third.replace(/\s*\(.*\)$/, '')}', monospace` }}>
          {t.type.thirdRole}
        </span>
        <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: accent, color: t.palette.dark ? ink : paper, fontFamily: `'${t.type.body}', sans-serif` }}>
          Book now
        </span>
      </div>
    </div>
  );
}

/**
 * The reference site, embedded whole. Desktop and phone widths, the real page,
 * every interaction live. A reference that does not exist yet says so and says
 * how to make one, instead of leaving a grey box.
 */
function ReferenceFrame({ reference, notes, name }: { reference: Reference | null; notes: string; name: string }) {
  const [width, setWidth] = useState<'desktop' | 'phone'>('desktop');
  const [loaded, setLoaded] = useState(false);
  if (!reference) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#161616]/30 bg-[#FBF6EA] p-5 text-[13px] font-body text-[#161616]/75">
        <div className={eyebrowCls}>Reference build</div>
        {notes || `No reference build for ${name} yet.`}
      </div>
    );
  }
  const frameHeight = width === 'phone' ? 720 : 620;
  return (
    <div className="rounded-xl border-2 border-[#161616] overflow-hidden bg-[#161616]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#161616] text-[#FBF6EA]">
        <div className="min-w-0 text-[12px] font-body truncate">
          <span className="text-[9px] uppercase tracking-[0.2em] font-mono text-[#F5B700] mr-2">Reference</span>
          {reference.label}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setWidth('desktop')} aria-pressed={width === 'desktop'} className={`${btn} ${width === 'desktop' ? 'bg-[#F5B700] text-[#161616] border-[#F5B700]' : 'bg-transparent text-[#FBF6EA]/80 border-[#FBF6EA]/30'}`}>Desktop</button>
          <button onClick={() => setWidth('phone')} aria-pressed={width === 'phone'} className={`${btn} ${width === 'phone' ? 'bg-[#F5B700] text-[#161616] border-[#F5B700]' : 'bg-transparent text-[#FBF6EA]/80 border-[#FBF6EA]/30'}`}>Phone</button>
          <a href={reference.url} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#FBF6EA] text-[#161616] border-[#FBF6EA]`}>Open full ↗</a>
        </div>
      </div>
      <div className="relative bg-[#0f0f0f] flex justify-center" style={{ height: frameHeight }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] uppercase tracking-[0.2em] font-mono text-[#FBF6EA]/50" aria-live="polite">
            Loading the site…
          </div>
        )}
        <iframe
          key={`${reference.url}-${width}`}
          src={reference.url}
          title={`${reference.label}, ${width} width`}
          onLoad={() => setLoaded(true)}
          loading="lazy"
          className="bg-white border-0 h-full"
          style={{ width: width === 'phone' ? 390 : '100%' }}
        />
      </div>
      {notes && <p className="px-4 py-3 text-[12px] font-body text-[#FBF6EA]/80 bg-[#161616] border-t border-[#FBF6EA]/15">{notes}</p>}
    </div>
  );
}

function StructureCard({ s }: { s: Structure }) {
  const [ref, setRef] = useState(0);
  return (
    <article id={s.key} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 sm:p-6 scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-sans font-extrabold text-2xl leading-tight">{s.name}</h2>
          <p className="text-[12px] font-body text-[#161616]/60 mt-1">{s.status} Law: <code className="font-mono text-[11px] bg-[#FBF6EA] border border-[#161616]/15 rounded px-1">{s.doc}</code></p>
        </div>
      </div>
      <p className="text-[14px] font-body text-[#161616]/85 max-w-3xl mb-4">{s.feel}</p>
      <ul className="list-disc pl-5 space-y-1 text-[13px] font-body text-[#161616]/85 mb-5">
        {s.carries.map((c) => <li key={c}>{c}</li>)}
      </ul>
      {s.references.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Choose a reference build">
          {s.references.map((r, i) => (
            <button key={r.url} onClick={() => setRef(i)} aria-pressed={ref === i} className={ref === i ? btnInk : btnPaper}>{r.label}</button>
          ))}
        </div>
      )}
      <ReferenceFrame reference={s.references[ref] ?? null} notes={s.references[ref]?.notes ?? ''} name={s.name} />
    </article>
  );
}

function TemplateCard({ t, open, onToggle }: { t: Template; open: boolean; onToggle: () => void }) {
  return (
    <article id={t.key} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden scroll-mt-24">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="font-sans font-extrabold text-2xl leading-tight">{t.name}</h2>
            <p className="text-[12px] font-body text-[#161616]/60 mt-1">
              {SOURCE_LABEL[t.source]}: {t.origin}. Key <code className="font-mono text-[11px] bg-[#FBF6EA] border border-[#161616]/15 rounded px-1">{t.key}</code>
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-sans font-extrabold text-2xl leading-none">{t.usage.count}</div>
            <div className="text-[9px] uppercase tracking-[0.18em] font-mono text-[#161616]/55">
              {t.usage.count === 1 ? 'live site' : 'live sites'}{t.usage.lastAt ? ` · last ${fmtDate(t.usage.lastAt)}` : ''}
            </div>
          </div>
        </div>

        <ReferenceFrame reference={t.reference} notes={t.referenceNotes} name={t.name} />

        <div className="mt-5 grid lg:grid-cols-[1.1fr_1fr] gap-4">
          <Specimen t={t} />
          <div className="text-[13px] font-body">
            <div className={eyebrowCls}>Default colour roles</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Swatch hex={t.palette.ground} label="ground" />
              <Swatch hex={t.palette.paper} label="paper" />
              <Swatch hex={t.palette.ink} label="ink" />
              <Swatch hex={t.palette.accent} label="accent" />
              <Swatch hex={t.palette.support} label="support" />
            </div>
            <p className="text-[12px] text-[#161616]/65">
              Defaults only. A business with a logo or an established colour fills these roles with its own: their primary becomes the accent, the ground and ink take its temperature. The template keeps its contrast, not its hexes.
            </p>
          </div>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-4 text-[13px] font-body">
          <div>
            <div className={eyebrowCls}>Fits</div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {t.fitsLabels.map((f) => (
                <span key={f} className="text-[11px] px-2 py-0.5 rounded-full border border-[#161616]/25 bg-[#FBF6EA]">{f}</span>
              ))}
            </div>
            <p className="text-[#161616]/70">{t.alsoFits}.</p>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/50 mb-2">Reads wrong on</div>
            <div className="flex flex-wrap gap-1.5">
              {t.avoidLabels.map((f) => (
                <span key={f} className="text-[11px] px-2 py-0.5 rounded-full border border-[#161616]/15 text-[#161616]/60">{f}</span>
              ))}
            </div>
          </div>
        </div>

        {t.usage.examples.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-body">
            <span className="text-[9px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/50">Sites wearing it</span>
            {t.usage.examples.map((e) => (
              <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer" className="text-[#1E50C8] font-semibold hover:text-[#161616]">
                {e.business} ↗
              </a>
            ))}
          </div>
        )}

        <button onClick={onToggle} aria-expanded={open} aria-controls={`${t.key}-law`} className={`${btnGold} mt-5`}>
          {open ? 'Hide the law' : 'Skeleton, devices and the law'}
        </button>
      </div>

      {open && (
        <div id={`${t.key}-law`} className="border-t-2 border-[#161616] bg-[#FBF6EA] p-5 sm:p-6 space-y-5 text-[13px] font-body">
          <div>
            <div className={eyebrowCls}>Skeleton, top to bottom</div>
            <ol className="flex flex-wrap gap-1.5">
              {t.skeleton.map((s, i) => (
                <li key={s} className="text-[11px] px-2 py-0.5 rounded-md border border-[#161616]/25 bg-white">
                  <span className="font-mono text-[#161616]/45 mr-1">{String(i + 1).padStart(2, '0')}</span>{s}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <div className={eyebrowCls}>Devices</div>
            <ul className="list-disc pl-5 space-y-1 text-[#161616]/85">
              {t.devices.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className={eyebrowCls}>Copy register</div>
              <p className="text-[#161616]/85">{t.copy}</p>
            </div>
            <div>
              <div className={eyebrowCls}>Imagery</div>
              <p className="text-[#161616]/85">{t.imagery}</p>
            </div>
          </div>
          <div>
            <div className={eyebrowCls}>The law the builder receives</div>
            <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed bg-white border border-[#161616]/20 rounded-xl p-4 overflow-x-auto text-[#161616]/85">{t.law}</pre>
          </div>
        </div>
      )}
    </article>
  );
}

export default function SiteTemplates() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Template['source']>('all');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/site-templates', { cache: 'no-store' });
      if (!res.ok) { setError(res.status === 401 ? 'Sign in to see the templates.' : 'Could not load the templates.'); return; }
      setData(await res.json());
      setError(null);
    } catch {
      setError('Could not load the templates.');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // One stylesheet link per template so every specimen renders in its real faces.
  const fontLinks = useMemo(() => Array.from(new Set((data?.templates ?? []).map((t) => t.fontsHref))), [data]);

  const shown = (data?.templates ?? []).filter((t) => filter === 'all' || t.source === filter);
  const total = data?.templates.reduce((s, t) => s + t.usage.count, 0) ?? 0;
  const withRef = data?.templates.filter((t) => t.reference).length ?? 0;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      {fontLinks.map((href) => (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <AdminHeader active="templates" title="Site Templates" onRefresh={load} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <p className="text-[#161616]/65 text-sm font-body max-w-2xl">
            Every structure and every visual system the Forge can build, each with its real reference site embedded whole. Pick a template on a contact card and the build wears it;
            leave the picker on Random and the studio rotates by trade. The structure (World or Journey) is the bones, the template is the skin, and the colours are always the
            client&apos;s own.
          </p>
          <div className="text-right shrink-0">
            <div className="font-sans font-extrabold text-3xl leading-none">{data ? data.templates.length : '·'}</div>
            <div className="text-[9px] uppercase tracking-[0.18em] font-mono text-[#161616]/55">templates · {withRef} with a reference · {total} live sites tagged</div>
          </div>
        </div>

        {error && <p className="text-[#C4160B] text-sm font-body mb-5">{error}</p>}
        {!data && !error && <p className="text-[#161616]/55 text-sm font-body mb-5">Loading the gallery…</p>}

        {data && (
          <>
            <section className="mb-10">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <h2 className="font-sans font-extrabold text-xl">The structures</h2>
                <p className="text-[12px] font-body text-[#161616]/60 max-w-xl">The bones every template is built on. The picker offers World and Journey; the Award tier is listed with its status so nothing here pretends.</p>
              </div>
              <div className="grid gap-6">
                {data.structures.map((s) => <StructureCard key={s.key} s={s} />)}
              </div>
            </section>

            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <h2 className="font-sans font-extrabold text-xl">The templates</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-6" role="group" aria-label="Filter templates by source">
              {(['all', 'house', 'package', 'studio'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={filter === f ? btnInk : btnPaper}>
                  {f === 'all' ? `All ${data.templates.length}` : f === 'house' ? 'House styles' : f === 'package' ? 'Packages' : 'Studio designs'}
                </button>
              ))}
              <nav className="ml-auto flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-body" aria-label="Jump to a template">
                {shown.map((t) => (
                  <a key={t.key} href={`#${t.key}`} className="text-[#1E50C8] hover:text-[#161616] font-semibold">{t.name}</a>
                ))}
              </nav>
            </div>

            <section className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 sm:p-6 mb-8">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-3">Every template carries</span>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] font-body text-[#161616]/85 list-disc pl-5">
                {data.shared.map((s) => <li key={s}>{s}</li>)}
              </ul>
              <p className="text-[12px] font-body text-[#161616]/60 mt-3">
                Plus the outline moment where the trade has swagger (solid and hollow words mixed in the hero, the hollow word tinted so it survives a dark plate). Measured by the judge in lib/demo-quality.mjs on every finished build, not requested.
              </p>
            </section>

            <div className="grid gap-6">
              {shown.map((t) => (
                <TemplateCard key={t.key} t={t} open={open === t.key} onToggle={() => setOpen(open === t.key ? null : t.key)} />
              ))}
            </div>

            <section className="mt-10 bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 sm:p-6">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-3">Adding one</span>
              <p className="text-[13px] font-body text-[#161616]/85 max-w-3xl">
                A template is an entry in <code className="font-mono text-[12px] bg-[#FBF6EA] border border-[#161616]/15 rounded px-1">lib/site-templates.mjs</code>: key, name, origin, default colour roles, three type
                families, skeleton, devices, copy register, imagery and the law block. Its reference build is pinned in the gallery route. Merge to master and it appears here, in every picker,
                and in the worker&apos;s roster on the next build. The <Link href="/admin/outbound/forge" className="text-[#1E50C8] font-semibold hover:text-[#161616]">Forge board</Link> and every
                contact card pick from the same list.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
