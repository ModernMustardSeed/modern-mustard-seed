'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initials, inkFor, textOnWhite, usd } from '@/components/white-label/brand';

type Line = { slug: string; name: string; group: string; pitch: string; wholesale: { setup: number; monthly: number }; retail: { setup: number; monthly: number }; internal?: boolean };
type Client = {
  id: string;
  business: string;
  website: string | null;
  lines: string[];
  status: string;
  test_number: string | null;
  agency_approved_at: string | null;
  created_at: string;
  live_at: string | null;
  /** The client's own front desk link, once a receptionist answers for them. */
  desk: string | null;
};

const STAGES = [
  { key: 'submitted', label: 'Received' },
  { key: 'building', label: 'Building' },
  { key: 'review', label: 'Your test call' },
  { key: 'live', label: 'Live' },
];

/** Instrument Serif, set by the page wrapper (components/white-label/font.ts). */
const SERIF = '[font-family:var(--wl-serif),Georgia,serif] font-normal';
const input =
  'w-full rounded-xl border border-black/10 bg-[#faf9f6] px-4 py-3 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-black/40 focus:bg-white focus:ring-4 focus:ring-black/[0.04]';
const label = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500';
const darkInput =
  'w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/35 focus:border-white/50 focus:bg-white/[0.1]';
const darkLabel = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50';

export default function AgencyPortal({
  agency,
  portalKey,
  links,
  clients,
  lines,
  groups,
  foundingMonths,
  pricesHeld = false,
  demoAt = null,
}: {
  agency: { name: string; slug: string; contact: string | null; color: string; founding: boolean; status: string; logo?: string | null };
  portalKey: string;
  links: { demo: string | null; sheet: string | null };
  clients: Client[];
  lines: Line[];
  groups: { key: string; title: string }[];
  foundingMonths: number;
  pricesHeld?: boolean;
  /** The agency's own demo URL (https://ai.agency.com/receptionist), once its host is live. */
  demoAt?: string | null;
}) {
  const router = useRouter();
  const ink = inkFor(agency.color);
  const accent = textOnWhite(agency.color);
  const [form, setForm] = useState({ business: '', website: '', city: '', contact_name: '', owner_phone: '', owner_email: '', transfer_number: '', hours: '', services_text: '', lines: ['ai-receptionist'] as string[] });
  const [busy, setBusy] = useState(false);
  const [forStudio, setForStudio] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [demoFor, setDemoFor] = useState({ site: '', name: '' });
  const [copied, setCopied] = useState('');
  const [showMore, setShowMore] = useState(false);

  const byLine = useMemo(() => new Map(lines.map((l) => [l.slug, l])), [lines]);
  const live = clients.filter((c) => c.status === 'live');
  const monthlyToUs = live.reduce((n, c) => n + c.lines.reduce((m, s) => m + (byLine.get(s)?.wholesale.monthly ?? 0), 0), 0);
  const suggested = live.reduce((n, c) => n + c.lines.reduce((m, s) => { const l = byLine.get(s); return m + (l && !l.internal ? l.retail.monthly : 0); }, 0), 0);

  const order = form.lines.map((s) => byLine.get(s)).filter(Boolean) as Line[];
  const orderSetup = order.reduce((n, l) => n + l.wholesale.setup, 0);
  const orderMonthly = order.reduce((n, l) => n + l.wholesale.monthly, 0);

  // On the agency's own host the demo already knows the agency, its color and
  // the client view, so the link a prospect gets carries only their own site.
  const clientDemo = demoAt
    ? `${demoAt}${demoFor.site.trim() || demoFor.name.trim() ? '?' : ''}${new URLSearchParams({
        ...(demoFor.site.trim() ? { site: demoFor.site.trim() } : {}),
        ...(demoFor.name.trim() ? { client: demoFor.name.trim() } : {}),
      }).toString()}`
    : `/white-label/demo?${new URLSearchParams({
        agency: agency.name,
        color: agency.color.replace('#', ''),
        sample: 'dental',
        view: 'client',
        ...(demoFor.site.trim() ? { site: demoFor.site.trim() } : {}),
        ...(demoFor.name.trim() ? { client: demoFor.name.trim() } : {}),
      }).toString()}`;
  const clientDemoFull = () => (demoAt ? clientDemo : `${window.location.origin}${clientDemo}`);

  const copy = async (text: string, k: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(k);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      /* clipboard blocked; the link is on screen */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await fetch(`/api/white-label/hq/${agency.slug}/clients`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, business: forStudio ? form.business || `${agency.name}: studio project` : form.business, k: portalKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setMsg(`${form.business} is on our board. We start within one business day and you will have a test number inside seven days.`);
      setForm({ business: '', website: '', city: '', contact_name: '', owner_phone: '', owner_email: '', transfer_number: '', hours: '', services_text: '', lines: ['ai-receptionist'] });
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async (id: string) => {
    const res = await fetch(`/api/white-label/hq/${agency.slug}/clients/${id}/approve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ k: portalKey }),
    });
    if (res.ok) router.refresh();
  };

  const toggle = (slug: string) =>
    setForm((f) => ({ ...f, lines: f.lines.includes(slug) ? f.lines.filter((x) => x !== slug) : [...f.lines, slug] }));

  const inProgress = clients.filter((c) => ['submitted', 'building', 'review'].includes(c.status)).length;
  const first = agency.contact ? agency.contact.split(' ')[0] : null;
  const ledger: [string, string][] = [
    ['Clients live', String(live.length)],
    ['In progress', String(inProgress)],
    ...(pricesHeld ? [] : ([['You pay us monthly', usd(monthlyToUs)], ['At suggested retail you bill', usd(suggested)]] as [string, string][])),
  ];
  const shownGroups = groups.filter((g) => (forStudio ? g.key !== 'ai' : g.key !== 'agency'));
  const primary = forStudio ? shownGroups : shownGroups.filter((g) => g.key === 'ai');
  const extra = forStudio ? [] : shownGroups.filter((g) => g.key !== 'ai');
  const extraOn = extra.some((g) => lines.some((l) => l.group === g.key && form.lines.includes(l.slug)));
  const rule = ink === '#ffffff' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';

  const chooser = (gs: { key: string; title: string }[]) =>
    gs.map((g) => (
      <div key={g.key} className="mt-6 first:mt-0">
        <p className="text-[13px] font-medium text-neutral-500">{g.title}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {lines
            .filter((l) => l.group === g.key)
            .map((l) => {
              const on = form.lines.includes(l.slug);
              return (
                <button
                  type="button"
                  key={l.slug}
                  onClick={() => toggle(l.slug)}
                  aria-pressed={on}
                  title={l.pitch}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all duration-200 hover:-translate-y-px"
                  style={on ? { background: agency.color, borderColor: agency.color, color: ink } : { borderColor: 'rgba(0,0,0,0.12)', color: '#262626', background: '#ffffff' }}
                >
                  <span aria-hidden="true" className={`grid h-4 w-4 place-items-center rounded-full border text-[9px] ${on ? 'border-current' : 'border-black/20'}`}>{on ? '✓' : ''}</span>
                  {l.name}
                  {!pricesHeld && (l.wholesale.setup || l.wholesale.monthly) ? (
                    <span className="font-normal opacity-60">
                      {[l.wholesale.setup ? usd(l.wholesale.setup) : '', l.wholesale.monthly ? `${usd(l.wholesale.monthly)}/mo` : ''].filter(Boolean).join(' + ')}
                    </span>
                  ) : null}
                </button>
              );
            })}
        </div>
      </div>
    ));

  return (
    <div className="min-h-screen bg-[#f3f1ec] text-[#111111] antialiased">
      {/* ─── MASTHEAD ─── */}
      <header className="relative overflow-hidden" style={{ background: agency.color, color: ink }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '72px 72px' }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-48 -top-48 h-[560px] w-[560px] rounded-full opacity-[0.18] blur-3xl" style={{ background: ink }} />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex items-center justify-between border-b py-5" style={{ borderColor: rule }}>
            {agency.logo ? (
              <span className="inline-flex items-center rounded-full bg-white px-4 py-1.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={agency.logo} alt={agency.name} className="h-6 w-auto max-w-[140px] object-contain sm:h-7" />
              </span>
            ) : (
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full border text-[12px] font-bold tracking-wide" style={{ borderColor: rule }}>
                  {initials(agency.name)}
                </span>
                <span className="text-[14px] font-semibold tracking-wide">{agency.name}</span>
              </div>
            )}
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] opacity-70">Agency portal</span>
          </div>
          <div className="flex flex-col gap-8 pb-28 pt-14 md:flex-row md:items-end md:justify-between md:pb-32 md:pt-20">
            <div className="max-w-2xl">
              {agency.founding && (
                <p className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ borderColor: rule }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} /> Founding agency
                </p>
              )}
              <h1 className={`${SERIF} text-[54px] leading-[0.95] tracking-[-0.015em] sm:text-[84px]`}>
                Welcome back{first ? <>, <em className="italic">{first}</em></> : null}.
              </h1>
              <p className="mt-6 max-w-lg text-[16px] leading-relaxed opacity-75">
                Everything you sell under your name: who is live, who is close, and the next client.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {links.demo && (
                <a
                  href={links.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5"
                >
                  Your demo <span aria-hidden="true">↗</span>
                </a>
              )}
              {links.sheet && (
                <a href={links.sheet} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80" style={{ borderColor: rule }}>
                  Price sheet <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        {/* ─── LEDGER ─── */}
        <section
          className={`relative -mt-16 grid overflow-hidden rounded-[24px] bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)] ring-1 ring-black/5 ${ledger.length > 2 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}
        >
          {ledger.map(([k, v], i) => (
            <div key={k} className={`px-6 py-6 sm:px-9 sm:py-8 ${i % 2 ? 'border-l border-black/[0.07]' : ''} ${i > 1 ? 'border-t border-black/[0.07] md:border-t-0 md:border-l' : ''}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{k}</p>
              <p className={`${SERIF} mt-3 text-[60px] leading-none tabular-nums sm:text-[72px]`}>{v}</p>
            </div>
          ))}
        </section>
        {agency.founding && !pricesHeld && (
          <p className="mt-4 text-[13px] text-neutral-500">Founding agency: your wholesale prices are locked for {foundingMonths} months from your first live client.</p>
        )}

        {/* ─── CLIENTS ─── */}
        <SectionHead n="01" title="Your clients" note={clients.length ? `${clients.length} on the board` : undefined} />
        {clients.length === 0 ? (
          <p className="rounded-[24px] border border-dashed border-black/15 bg-white/60 px-8 py-12 text-center text-neutral-600">
            None yet. Show a business owner the demo with their own website in it, then add them below.
          </p>
        ) : (
          <ul className="space-y-4">
            {clients.map((c) => {
              const stage = STAGES.findIndex((s) => s.key === c.status);
              const stopped = c.status === 'paused' || c.status === 'cancelled';
              return (
                <li key={c.id} className="overflow-hidden rounded-[24px] bg-white ring-1 ring-black/[0.06]">
                  <div className="flex flex-col gap-6 p-6 sm:p-9 md:flex-row md:items-end md:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                        {c.lines.map((s) => byLine.get(s)?.name ?? s).join('  ·  ')}
                      </p>
                      <h3 className={`${SERIF} mt-3 text-[38px] leading-none sm:text-[48px]`}>{c.business}</h3>
                      {c.website && <p className="mt-3 text-[13px] text-neutral-500">{c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>}
                    </div>
                    {c.desk && (
                      <div className="shrink-0 md:text-right">
                        <a
                          href={c.desk}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                          style={{ background: agency.color, color: ink }}
                        >
                          Open their front desk <span aria-hidden="true">↗</span>
                        </a>
                        <p className="mt-2.5 text-[12px] text-neutral-500">Every call, in your brand. Send it to the client.</p>
                      </div>
                    )}
                  </div>

                  {stopped ? (
                    <p className="border-t border-black/[0.06] px-6 py-4 text-sm text-neutral-500 sm:px-9">{c.status === 'paused' ? 'Paused' : 'Cancelled'}</p>
                  ) : (
                    <ol className="grid grid-cols-4 border-t border-black/[0.06]" aria-label={`Stage: ${STAGES[stage]?.label}`}>
                      {STAGES.map((s, i) => {
                        const done = i < stage;
                        const now = i === stage;
                        return (
                          <li key={s.key} className={`relative px-3 py-4 sm:px-9 sm:py-5 ${i > 0 ? 'border-l border-black/[0.06]' : ''}`}>
                            <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: i <= stage ? agency.color : 'transparent' }} />
                            <span className={`block text-[11px] font-semibold tabular-nums ${now ? '' : 'text-neutral-400'}`} style={now ? { color: accent } : undefined}>
                              {done ? '✓' : `0${i + 1}`}
                            </span>
                            <span className={`mt-1 block text-[12px] sm:text-[13px] ${now ? 'font-semibold text-neutral-900' : done ? 'text-neutral-700' : 'text-neutral-400'}`}>{s.label}</span>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {c.status === 'review' && (
                    <div className="flex flex-col gap-4 bg-[#111111] px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-9">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Your test call</p>
                        <p className="mt-1.5 text-[15px] text-white/80">
                          Call{' '}
                          {c.test_number ? (
                            <a href={`tel:${c.test_number.replace(/[^\d+]/g, '')}`} className={`${SERIF} text-[26px] text-white underline decoration-white/25 underline-offset-[6px]`}>
                              {c.test_number}
                            </a>
                          ) : (
                            'the test line'
                          )}{' '}
                          as a customer would.
                        </p>
                      </div>
                      {c.agency_approved_at ? (
                        <span className="text-sm font-semibold text-emerald-300">Approved. We are switching it on.</span>
                      ) : (
                        <button onClick={() => approve(c.id)} className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition-transform hover:-translate-y-0.5">
                          It sounds right: approve
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-x-10 lg:grid-cols-[1.45fr_1fr]">
          {/* ─── ADD A CLIENT ─── */}
          <div>
            <SectionHead n="02" title={forStudio ? 'Start a project' : 'Add a client'} />
            <form onSubmit={submit} className="rounded-[24px] bg-white p-6 ring-1 ring-black/[0.06] sm:p-9">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <p className="max-w-sm text-[14px] leading-relaxed text-neutral-600">
                  {forStudio
                    ? 'Overflow you do not have room for, the Bench, or AI inside your own studio. Tell us what to build; we scope it in writing before anything starts.'
                    : 'They said yes. Tell us who they are and what to switch on. Nothing is billed until you approve the test call.'}
                </p>
                <div className="inline-flex shrink-0 self-start rounded-full bg-[#f3f1ec] p-1 text-[13px] font-semibold" role="tablist" aria-label="Who is it for">
                  {[
                    { v: false, l: 'For a client' },
                    { v: true, l: 'For my agency' },
                  ].map((o) => (
                    <button
                      type="button"
                      key={o.l}
                      role="tab"
                      aria-selected={forStudio === o.v}
                      onClick={() => {
                        setForStudio(o.v);
                        setForm((f) => ({ ...f, lines: o.v ? ['bench'] : ['ai-receptionist'] }));
                      }}
                      className="rounded-full px-4 py-1.5 transition-colors"
                      style={forStudio === o.v ? { background: '#111111', color: '#ffffff' } : { color: '#525252' }}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className={label}>{forStudio ? 'Project name' : 'Business name'}</span>
                  <input className={input} required={!forStudio} placeholder={forStudio ? 'Riverside Dental site build, or our reporting automation' : ''} value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} />
                </label>
                {!forStudio && (
                  <>
                    <label>
                      <span className={label}>Website</span>
                      <input className={input} placeholder="theirbusiness.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                    </label>
                    <label>
                      <span className={label}>Town</span>
                      <input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </label>
                    <label>
                      <span className={label}>Owner’s name</span>
                      <input className={input} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                    </label>
                    <label>
                      <span className={label}>Owner’s cell, for call summaries</span>
                      <input className={input} type="tel" value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} />
                    </label>
                    <label>
                      <span className={label}>Owner’s email, for transcripts</span>
                      <input className={input} type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
                    </label>
                    <label>
                      <span className={label}>Transfer urgent calls to</span>
                      <input className={input} type="tel" value={form.transfer_number} onChange={(e) => setForm({ ...form, transfer_number: e.target.value })} />
                    </label>
                    <label className="sm:col-span-2">
                      <span className={label}>Hours</span>
                      <input className={input} placeholder="Mon to Fri 8 to 5, Sat 9 to 1" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                    </label>
                  </>
                )}
                <label className="sm:col-span-2">
                  <span className={label}>{forStudio ? 'What should we build?' : 'What they offer, what they charge, how they book'}</span>
                  <textarea
                    className={`${input} min-h-[124px] leading-relaxed`}
                    placeholder={
                      forStudio
                        ? 'The brief: what it is, who it is for, the design file or examples, the deadline, and the tools it has to connect to.'
                        : 'Services and any prices they quote, the questions they get most, how appointments work, anything the receptionist must never say.'
                    }
                    value={form.services_text}
                    onChange={(e) => setForm({ ...form, services_text: e.target.value })}
                  />
                </label>
              </div>

              <div className="mt-9 border-t border-black/[0.07] pt-7">
                <p className={label}>Switch on</p>
                <div className="mt-4">{chooser(primary)}</div>
                {extra.length > 0 && (
                  <div className="mt-6">
                    {showMore || extraOn ? (
                      chooser(extra)
                    ) : (
                      <button type="button" onClick={() => setShowMore(true)} className="text-[13px] font-semibold text-neutral-500 underline decoration-black/20 underline-offset-4 transition-colors hover:text-neutral-900">
                        + Websites, agents and dashboards
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-9 flex flex-col gap-4 rounded-2xl bg-[#f3f1ec] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                {pricesHeld ? (
                  <span className="text-[14px] text-neutral-700">Sarah confirms the price for {forStudio ? 'this project' : 'this client'} with you before we start.</span>
                ) : (
                  <span className="text-[14px] text-neutral-700">
                    {forStudio ? 'For this project' : 'For this client'} you pay us <strong>{orderSetup ? `${usd(orderSetup)} setup` : 'no setup'}</strong>
                    {orderMonthly ? <> then <strong>{usd(orderMonthly)}/mo</strong></> : ''}, once it is live.
                  </span>
                )}
                <button
                  disabled={busy || (!forStudio && !form.business) || !form.lines.length}
                  className="shrink-0 rounded-full px-7 py-3.5 text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
                  style={{ background: agency.color, color: ink }}
                >
                  {busy ? 'Sending' : forStudio ? 'Send the project' : 'Start this client'} <span aria-hidden="true">→</span>
                </button>
              </div>
              {msg && <p className="mt-4 text-sm font-semibold text-emerald-700">{msg}</p>}
              {err && <p className="mt-4 text-sm text-red-700">{err}</p>}
            </form>
          </div>

          <div>
            {/* ─── A DEMO FOR A PROSPECT ─── */}
            <SectionHead n="03" title="Demo a prospect" />
            <div className="rounded-[24px] bg-[#111111] p-6 text-white sm:p-9">
              <p className="text-[14px] leading-relaxed text-white/65">Paste a business’s website and send them this link. Their own receptionist, in your name. No prices, no panel.</p>
              <label className="mt-7 block">
                <span className={darkLabel}>Their website</span>
                <input className={darkInput} value={demoFor.site} onChange={(e) => setDemoFor({ ...demoFor, site: e.target.value })} placeholder="theirbusiness.com" />
              </label>
              <label className="mt-4 block">
                <span className={darkLabel}>Their business name, optional</span>
                <input className={darkInput} value={demoFor.name} onChange={(e) => setDemoFor({ ...demoFor, name: e.target.value })} />
              </label>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <button onClick={() => copy(clientDemoFull(), 'demo')} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition-transform hover:-translate-y-0.5">
                  {copied === 'demo' ? 'Copied' : 'Copy link'}
                </button>
                <a href={clientDemo} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/60">
                  Preview <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            {/* ─── HOW IT WORKS ─── */}
            <SectionHead n="04" title="How a client goes live" />
            <ol className="overflow-hidden rounded-[24px] bg-white ring-1 ring-black/[0.06]">
              {[
                'You add them here. We start within one business day.',
                'Inside seven days you get a test number by email.',
                'You call it and press Approve. We switch it onto their real number.',
                `It shows Live, and the setup and monthly land on your next invoice from us${pricesHeld ? ' at the price we agreed' : ''}. You bill your client your price.`,
              ].map((t, i) => (
                <li key={i} className={`flex gap-5 px-6 py-5 sm:px-8 ${i > 0 ? 'border-t border-black/[0.06]' : ''}`}>
                  <span className={`${SERIF} w-6 shrink-0 text-[30px] leading-[0.9]`} style={{ color: accent }}>
                    {i + 1}
                  </span>
                  <span className="text-[14px] leading-relaxed text-neutral-700">{t}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 px-1 text-[13px] leading-relaxed text-neutral-500">
              Changes to anything we built are included: tell us what and we do it. Questions go straight to Sarah at{' '}
              <a className="text-neutral-900 underline decoration-black/20 underline-offset-4" href="mailto:sarah@modernmustardseed.com">
                sarah@modernmustardseed.com
              </a>
              .
            </p>
          </div>
        </div>

        <footer className="mt-20 flex flex-col items-center justify-between gap-2 border-t border-black/[0.08] pt-6 text-[12px] text-neutral-400 sm:flex-row">
          <span>White Label Program</span>
          <span>Built and run by Modern Mustard Seed for {agency.name}</span>
        </footer>
      </main>
    </div>
  );
}

function SectionHead({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <div className="mb-5 mt-20 flex items-end justify-between gap-4 border-b border-black/[0.08] pb-4">
      <h2 className="flex items-baseline gap-4">
        <span className="text-[11px] font-semibold tabular-nums tracking-[0.2em] text-neutral-400">{n}</span>
        <span className={`${SERIF} text-[36px] leading-none sm:text-[44px]`}>{title}</span>
      </h2>
      {note && <span className="pb-1 text-[12px] text-neutral-500">{note}</span>}
    </div>
  );
}
