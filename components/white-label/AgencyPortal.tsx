'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { inkFor, textOnWhite, usd } from '@/components/white-label/brand';

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

const input = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-900';
const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500';

export default function AgencyPortal({
  agency,
  portalKey,
  links,
  clients,
  lines,
  groups,
  foundingMonths,
}: {
  agency: { name: string; slug: string; contact: string | null; color: string; founding: boolean; status: string };
  portalKey: string;
  links: { demo: string | null; sheet: string | null };
  clients: Client[];
  lines: Line[];
  groups: { key: string; title: string }[];
  foundingMonths: number;
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

  const byLine = useMemo(() => new Map(lines.map((l) => [l.slug, l])), [lines]);
  const live = clients.filter((c) => c.status === 'live');
  const monthlyToUs = live.reduce((n, c) => n + c.lines.reduce((m, s) => m + (byLine.get(s)?.wholesale.monthly ?? 0), 0), 0);
  const suggested = live.reduce((n, c) => n + c.lines.reduce((m, s) => { const l = byLine.get(s); return m + (l && !l.internal ? l.retail.monthly : 0); }, 0), 0);

  const order = form.lines.map((s) => byLine.get(s)).filter(Boolean) as Line[];
  const orderSetup = order.reduce((n, l) => n + l.wholesale.setup, 0);
  const orderMonthly = order.reduce((n, l) => n + l.wholesale.monthly, 0);

  const clientDemo = `/white-label/demo?${new URLSearchParams({
    agency: agency.name,
    color: agency.color.replace('#', ''),
    sample: 'dental',
    view: 'client',
    ...(demoFor.site.trim() ? { site: demoFor.site.trim() } : {}),
    ...(demoFor.name.trim() ? { client: demoFor.name.trim() } : {}),
  }).toString()}`;

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

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-neutral-900">
      <header style={{ background: agency.color, color: ink }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-5 py-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] opacity-70">Agency portal{agency.founding ? ' · Founding agency' : ''}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{agency.name}</h1>
            <p className="mt-2 opacity-80">Welcome back{agency.contact ? `, ${agency.contact.split(' ')[0]}` : ''}. Everything you sell under your name, in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {links.demo && <a href={links.demo} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900">Your demo</a>}
            {links.sheet && <a href={links.sheet} target="_blank" rel="noopener noreferrer" className="rounded-full border border-current px-5 py-2.5 text-sm font-bold">Price sheet</a>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        {/* ─── NUMBERS ─── */}
        <section className="grid gap-4 sm:grid-cols-4">
          {[
            ['Clients live', String(live.length)],
            ['In progress', String(clients.filter((c) => ['submitted', 'building', 'review'].includes(c.status)).length)],
            ['You pay us monthly', usd(monthlyToUs)],
            ['At suggested retail you bill', usd(suggested)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500">{k}</p>
              <p className="mt-1.5 text-3xl font-black tabular-nums">{v}</p>
            </div>
          ))}
        </section>
        {agency.founding && (
          <p className="text-sm text-neutral-600">Founding agency: your wholesale prices are locked for {foundingMonths} months from your first live client.</p>
        )}

        {/* ─── CLIENTS ─── */}
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-xl font-black">Your clients</h2>
          {clients.length === 0 ? (
            <p className="mt-3 text-neutral-600">None yet. Show a business owner the demo with their own website in it, then add them below.</p>
          ) : (
            <ul className="mt-4 divide-y divide-black/5">
              {clients.map((c) => {
                const stage = STAGES.findIndex((s) => s.key === c.status);
                return (
                  <li key={c.id} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-bold">{c.business}</p>
                      <p className="text-xs text-neutral-500">{c.lines.map((s) => byLine.get(s)?.name ?? s).join(' · ')}</p>
                    </div>
                    {c.desk && (
                      <p className="mt-1 text-sm">
                        <a href={c.desk} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-1 underline-offset-4" style={{ color: agency.color }}>
                          Open their front desk
                        </a>
                        <span className="text-neutral-500">: every call, in your brand. Send this link to the client.</span>
                      </p>
                    )}
                    {c.status === 'paused' || c.status === 'cancelled' ? (
                      <p className="mt-2 text-sm text-neutral-500">{c.status === 'paused' ? 'Paused' : 'Cancelled'}</p>
                    ) : (
                      <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`Stage: ${STAGES[stage]?.label}`}>
                        {STAGES.map((s, i) => (
                          <li key={s.key}>
                            <span className="block h-1.5 rounded-full" style={{ background: i <= stage ? agency.color : '#e5e5e5' }} />
                            <span className={`mt-1.5 block text-[11px] ${i === stage ? 'font-bold text-neutral-900' : 'text-neutral-500'}`}>{s.label}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {c.status === 'review' && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-neutral-50 p-3 text-sm">
                        <span>
                          Call the test line{c.test_number ? <> at <strong>{c.test_number}</strong></> : ''} as a customer would.
                        </span>
                        {c.agency_approved_at ? (
                          <span className="font-semibold text-green-700">Approved. We are switching it on.</span>
                        ) : (
                          <button onClick={() => approve(c.id)} className="rounded-full px-4 py-2 text-xs font-bold" style={{ background: agency.color, color: ink }}>
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
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* ─── ADD A CLIENT ─── */}
          <form onSubmit={submit} className="rounded-2xl border border-black/10 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">{forStudio ? 'Start a project' : 'Add a client'}</h2>
              <div className="inline-flex rounded-full bg-neutral-100 p-1 text-sm font-bold" role="tablist" aria-label="Who is it for">
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
                    className="rounded-full px-4 py-1.5"
                    style={forStudio === o.v ? { background: agency.color, color: ink } : undefined}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-sm text-neutral-600">
              {forStudio
                ? 'Overflow you do not have room for, the Bench, or AI inside your own studio. Tell us what to build; we scope it in writing before anything starts.'
                : 'They said yes. Tell us who they are and what to switch on. Nothing is billed until you approve the test call.'}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                <span className={label}>Owner’s cell (for call summaries)</span>
                <input className={input} type="tel" value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} />
              </label>
              <label>
                <span className={label}>Owner’s email (for transcripts)</span>
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
                  className={`${input} min-h-[110px]`}
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

            <p className={`${label} mt-6`}>Switch on</p>
            <div className="space-y-4">
              {groups.filter((g) => (forStudio ? g.key !== 'ai' : g.key !== 'agency')).map((g) => (
                <div key={g.key}>
                  <p className="text-sm font-bold">{g.title}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
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
                            className="rounded-xl border p-3 text-left text-sm transition-colors"
                            style={on ? { borderColor: agency.color, boxShadow: `inset 0 0 0 1px ${agency.color}` } : { borderColor: '#e5e5e5' }}
                          >
                            <span className="flex items-center justify-between gap-2 font-bold">
                              {l.name}
                              <span aria-hidden="true" style={{ color: on ? accent : '#d4d4d4' }}>{on ? '✓' : '+'}</span>
                            </span>
                            <span className="mt-0.5 block text-xs text-neutral-500">
                              You pay {[l.wholesale.setup ? `${usd(l.wholesale.setup)} setup` : '', l.wholesale.monthly ? `${usd(l.wholesale.monthly)}/mo` : ''].filter(Boolean).join(' + ')}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 p-4 text-sm">
              <span>
                {forStudio ? 'For this project' : 'For this client'} you pay us <strong>{orderSetup ? `${usd(orderSetup)} setup` : 'no setup'}</strong>
                {orderMonthly ? <> then <strong>{usd(orderMonthly)}/mo</strong></> : ''}, once it is live.
              </span>
              <button disabled={busy || (!forStudio && !form.business) || !form.lines.length} className="rounded-full px-6 py-3 text-sm font-bold disabled:opacity-50" style={{ background: agency.color, color: ink }}>
                {busy ? 'Sending' : forStudio ? 'Send the project' : 'Start this client'}
              </button>
            </div>
            {msg && <p className="mt-3 text-sm font-semibold text-green-700">{msg}</p>}
            {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
          </form>

          <div className="space-y-6">
            {/* ─── A DEMO FOR A PROSPECT ─── */}
            <div className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-xl font-black">A demo for a prospect</h2>
              <p className="mt-1 text-sm text-neutral-600">Paste a business’s website and send them this link. Their own receptionist, in your name. No prices, no panel.</p>
              <label className="mt-4 block">
                <span className={label}>Their website</span>
                <input className={input} value={demoFor.site} onChange={(e) => setDemoFor({ ...demoFor, site: e.target.value })} placeholder="theirbusiness.com" />
              </label>
              <label className="mt-3 block">
                <span className={label}>Their business name (optional)</span>
                <input className={input} value={demoFor.name} onChange={(e) => setDemoFor({ ...demoFor, name: e.target.value })} />
              </label>
              <div className="mt-4 flex gap-2">
                <a href={clientDemo} target="_blank" rel="noopener noreferrer" className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-bold">
                  Preview
                </a>
                <button onClick={() => copy(`${window.location.origin}${clientDemo}`, 'demo')} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: agency.color, color: ink }}>
                  {copied === 'demo' ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>

            {/* ─── HOW IT WORKS ─── */}
            <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm leading-relaxed text-neutral-700">
              <h2 className="text-xl font-black text-neutral-900">How a client goes live</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>You add them here. We start within one business day.</li>
                <li>Inside seven days you get a test number by email.</li>
                <li>You call it and press Approve. We switch it onto their real number.</li>
                <li>It shows Live, and the setup and monthly land on your next invoice from us. You bill your client your price.</li>
              </ol>
              <p className="mt-4">Changes to anything we built are included: tell us what and we do it. Questions go straight to Sarah at <a className="underline" href="mailto:sarah@modernmustardseed.com">sarah@modernmustardseed.com</a>.</p>
            </div>
          </div>
        </div>

        <p className="pb-6 text-center text-xs text-neutral-400">White Label Program · built and run by Modern Mustard Seed for {agency.name}</p>
      </main>
    </div>
  );
}
