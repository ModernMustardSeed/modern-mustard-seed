'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import type { WlLine } from '@/data/white-label';

/**
 * THE WHITE LABEL DESK. Everything Sarah needs for an agency meeting on one
 * screen: the price list (wholesale, suggested retail, margin), a prep tool
 * that mints the agency's own demo and signed price sheet, the agencies she
 * has prepped, inbound white label inquiries, and the meeting playbook.
 *
 * Prices live in data/white-label.ts. Change them there; this desk, the
 * signed sheet and the demo's margin panel all move together.
 */

export type Prep = {
  agency: string;
  color: string;
  city: string;
  sample: string;
  site?: string;
  contact?: string;
  meetingAt?: string;
  notes?: string;
  updatedAt: string;
  links: { demoPublic: string; demo: string | null; sheet: string | null };
};

export type Inquiry = { id: string; name: string; email: string | null; message: string | null; created_at: string; status: string };

const card = 'bg-white border-2 border-[#161616] rounded-xl';
const label = 'block text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#3A3733] mb-1.5';
const input = 'w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-2 font-body text-sm text-[#161616] outline-none focus:shadow-[3px_3px_0_0_#F5B700]';
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
const money = (s: number, m: number) => [s ? `${usd(s)} setup` : '', m ? `${usd(m)}/mo` : ''].filter(Boolean).join(' + ') || '-';

const AGENDA = [
  ['0 to 3 min', 'Their book', 'How many active clients, what they sell monthly today, and the last time a client asked them about AI.'],
  ['3 to 10 min', 'The demo, in their name', 'Open their signed demo link with the panel visible. Type one of THEIR real clients into the client name. Hand them the call. Let them book an appointment.'],
  ['10 to 15 min', 'The math', 'Scroll to the margin panel. Put in their real client count. Five AI Receptionists at suggested retail is $750 a month to them, every month.'],
  ['15 to 18 min', 'The terms', 'No license fee, no minimum, their name only, changes included, nothing held hostage, founding price lock.'],
  ['18 to 20 min', 'The ask', 'Pick one client to sell first. We build that client’s receptionist as their pilot and they pitch it with that client’s own name on the demo.'],
];

const OBJECTIONS = [
  ['“My clients will find you and go direct.”', 'They will not see us anywhere: not on the agent, not on the reports, not on the invoice. And we never sell to an agency’s client. It is in the terms.'],
  ['“What if the AI says something wrong?”', 'It only speaks from what the client gave it, never invents a price or a policy, and takes a message when it does not know. They approve it before it goes live.'],
  ['“I do not know how to sell this.”', 'They do not have to explain it. They send the demo link with their client’s name on it. The call sells itself.'],
  ['“What does support look like?”', 'They text Sarah. Changes to what we built are included, so a client tweak never turns into a quote.'],
  ['“What if I want out?”', 'Every configuration, knowledge base and number is handed to them. Their clients keep working.'],
];

const AFTER_YES = [
  'Agency: legal name, billing contact, logo file, brand color, the email their client summaries should come from.',
  'Per client: business name, services and prices they are allowed to quote, hours, booking calendar or how they book, transfer number, who gets the summaries.',
  'Stripe: one subscription per agency, one line per client, billed on the 1st.',
  'Build inside seven days, agency approves on a test call, then we port or forward the number.',
];

export default function WhiteLabelDesk({
  lines,
  groups,
  program,
  ladderHolds,
  samples,
  preps,
  inquiries,
  callsToday,
}: {
  lines: WlLine[];
  groups: { key: string; sheetTitle: string }[];
  program: { foundingAgencies: number; foundingMonths: number; answeredMinutes: number };
  ladderHolds: boolean;
  samples: { id: string; label: string }[];
  preps: Prep[];
  inquiries: Inquiry[];
  callsToday: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ agency: '', contact: '', meetingAt: '', city: 'Kalispell', sample: samples[0]?.id ?? 'dental', color: '#0b3b44', site: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState<Prep | null>(null);
  const [copied, setCopied] = useState('');

  const prep = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/white-label/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not prep that agency.');
      setFresh({ ...data.prep, links: data.links });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prep that agency.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (agency: string) => {
    const slug = agency.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    await fetch(`/api/admin/white-label/links?slug=${slug}`, { method: 'DELETE' });
    router.refresh();
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {
      /* clipboard blocked; the link is visible to select by hand */
    }
  };

  const linkRow = (name: string, url: string | null, k: string) =>
    url ? (
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-28 shrink-0 text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#3A3733]">{name}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-mono text-xs text-[#0b3b44] underline">{url}</a>
        <button onClick={() => copy(url, k)} className="rounded-full border-2 border-[#161616] bg-white px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.15em]">
          {copied === k ? 'Copied' : 'Copy'}
        </button>
      </div>
    ) : null;


  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="white-label" title="White Label" onRefresh={() => router.refresh()} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-2">Agencies resell us under their name</span>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold">The White Label Desk</h1>
            <p className="font-body text-sm text-[#3A3733] mt-2 max-w-2xl">
              The price list, a prep tool for every agency meeting, and the playbook for the twenty minutes. Prices live in <code className="font-mono text-xs">data/white-label.ts</code>; the signed sheet and the demo move with them.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/white-label" target="_blank" className="rounded-full border-2 border-[#161616] bg-white px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em]">Public page</a>
            <a href="/white-label/demo" target="_blank" className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em]">Open demo</a>
          </div>
        </header>

        {!ladderHolds && (
          <div className="border-2 border-[#161616] rounded-xl px-4 py-3 font-body text-sm bg-[#E0301E]/15">
            The ladder is broken: the Phone + Website Agent wholesale must sit at or above the priciest single and below the two pieces added together. Fix it in data/white-label.ts before the next sheet goes out.
          </div>
        )}

        {/* ─── THE PRICE LIST ─── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">The price list</h2>
            <p className="font-body text-xs text-[#3A3733]">
              No license fee, no minimum. {program.answeredMinutes} answered minutes per agent, then message mode. Founding rate locked {program.foundingMonths} months for the first {program.foundingAgencies} agencies.
            </p>
          </div>
          {groups.map((g) => [g.sheetTitle, lines.filter((l) => l.group === g.key)] as const).map(([title, rows]) => (
            <div key={title as string} className={`${card} overflow-x-auto`}>
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-[#161616] text-[#FBF6EA] text-[10px] uppercase tracking-[0.15em] font-mono">
                  <tr>
                    <th className="text-left px-4 py-3">{title as string}</th>
                    <th className="text-left px-4 py-3">Agency pays us</th>
                    <th className="text-left px-4 py-3">Suggested retail</th>
                    <th className="text-left px-4 py-3">Agency margin</th>
                    <th className="text-left px-4 py-3">Our direct price</th>
                  </tr>
                </thead>
                <tbody>
                  {(rows as WlLine[]).map((l) => (
                    <tr key={l.slug} className="border-t border-[#161616]/10 align-top">
                      <td className="px-4 py-3">
                        <p className="font-bold">{l.name}</p>
                        <p className="font-body text-xs text-[#3A3733] mt-0.5 max-w-sm">{l.pitch}</p>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">{money(l.wholesale.setup, l.wholesale.monthly)}</td>
                      <td className="px-4 py-3 font-mono whitespace-nowrap">{money(l.retail.setup, l.retail.monthly)}</td>
                      <td className="px-4 py-3 font-mono whitespace-nowrap text-[#0a7c78] font-bold">{money(l.retail.setup - l.wholesale.setup, l.retail.monthly - l.wholesale.monthly)}</td>
                      <td className="px-4 py-3 font-body text-xs text-[#3A3733]">{l.directRef ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <p className="font-body text-xs text-[#3A3733]">The Business Command Center is not on this list and never goes on it. It sells on its own page.</p>
        </section>

        {/* ─── PREP A MEETING ─── */}
        <section className="grid lg:grid-cols-2 gap-6 items-start">
          <form onSubmit={prep} className={`${card} p-5 space-y-3`}>
            <h2 className="font-display text-xl font-semibold">Prep a meeting</h2>
            <p className="font-body text-xs text-[#3A3733]">Mints the agency’s demo link with their name and color, plus their signed price sheet. Add one of their real clients’ websites and the demo opens with the receptionist already answering as that client.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-2">
                <span className={label}>Agency name, exactly as they write it</span>
                <input className={input} required value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} />
              </label>
              <label className="block">
                <span className={label}>Who you are meeting</span>
                <input className={input} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </label>
              <label className="block">
                <span className={label}>When</span>
                <input className={input} placeholder="Tue Oct 6, 10am" value={form.meetingAt} onChange={(e) => setForm({ ...form, meetingAt: e.target.value })} />
              </label>
              <label className="block">
                <span className={label}>Their town</span>
                <input className={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </label>
              <label className="block">
                <span className={label}>Demo client type</span>
                <select className={input} value={form.sample} onChange={(e) => setForm({ ...form, sample: e.target.value })}>
                  {samples.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={label}>Their brand color</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-12 cursor-pointer rounded border-2 border-[#161616]" />
                  <input className={input} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
              </label>
              <label className="block sm:col-span-2">
                <span className={label}>One of their real clients’ websites (optional)</span>
                <input className={input} placeholder="theirclient.com" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
              </label>
              <label className="block sm:col-span-2">
                <span className={label}>Notes</span>
                <textarea className={`${input} min-h-[64px]`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Client count, what they sell monthly, who decides" />
              </label>
            </div>
            {error && <p className="font-body text-sm text-[#E0301E]">{error}</p>}
            <button disabled={busy} className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-[0.15em] disabled:opacity-60">
              {busy ? 'Minting' : 'Mint their links'}
            </button>
            {fresh && (
              <div className="rounded-lg border-2 border-[#161616] bg-[#FBF6EA] p-3 space-y-2">
                <p className="font-bold text-sm">{fresh.agency} is ready.</p>
                {linkRow("Demo + margin", fresh.links.demo, "fresh-demo")}
                {linkRow("Price sheet", fresh.links.sheet, "fresh-sheet")}
                {linkRow("Demo, no prices", fresh.links.demoPublic, "fresh-public")}
              </div>
            )}
          </form>

          <div className={`${card} p-5`}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-semibold">Agencies on the desk</h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3A3733]">Demo calls today: {callsToday} of 40</p>
            </div>
            {preps.length === 0 ? (
              <p className="font-body text-sm text-[#3A3733] mt-3">Nobody prepped yet. Mint the first agency on the left.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#161616]/10">
                {preps.map((p) => (
                  <li key={p.agency} className="py-3 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-4 w-4 rounded-full border border-[#161616]" style={{ background: p.color }} aria-hidden="true" />
                      <p className="font-bold">{p.agency}</p>
                      <p className="font-body text-xs text-[#3A3733]">{[p.contact, p.meetingAt, p.city].filter(Boolean).join(' · ')}</p>
                      <button onClick={() => remove(p.agency)} className="ml-auto text-[10px] font-mono uppercase tracking-[0.15em] text-[#3A3733] underline">Remove</button>
                    </div>
                    {p.notes && <p className="font-body text-xs text-[#3A3733]">{p.notes}</p>}
                    {linkRow("Demo + margin", p.links.demo, `${p.agency}-demo`)}
                    {linkRow("Price sheet", p.links.sheet, `${p.agency}-sheet`)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ─── THE TWENTY MINUTES ─── */}
        <section className="grid lg:grid-cols-2 gap-6 items-start">
          <div className={`${card} p-5`}>
            <h2 className="font-display text-xl font-semibold">The twenty minute meeting</h2>
            <ol className="mt-3 space-y-3">
              {AGENDA.map(([when, what, how]) => (
                <li key={what} className="grid grid-cols-[88px_1fr] gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] font-bold text-[#3A3733] pt-0.5">{when}</span>
                  <div>
                    <p className="font-bold text-sm">{what}</p>
                    <p className="font-body text-sm text-[#3A3733]">{how}</p>
                  </div>
                </li>
              ))}
            </ol>
            <h3 className="font-display text-lg font-semibold mt-6">After they say yes</h3>
            <ul className="mt-2 space-y-1.5 list-disc pl-5 font-body text-sm text-[#3A3733]">
              {AFTER_YES.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className={`${card} p-5`}>
            <h2 className="font-display text-xl font-semibold">What they will say</h2>
            <dl className="mt-3 space-y-3">
              {OBJECTIONS.map(([q, a]) => (
                <div key={q}>
                  <dt className="font-bold text-sm">{q}</dt>
                  <dd className="font-body text-sm text-[#3A3733] mt-0.5">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ─── INQUIRIES ─── */}
        <section className={`${card} p-5`}>
          <h2 className="font-display text-xl font-semibold">White label inquiries</h2>
          <p className="font-body text-xs text-[#3A3733] mt-1">From /inquire with “White label (for agencies)” picked. They also land in the Inbox.</p>
          {inquiries.length === 0 ? (
            <p className="font-body text-sm text-[#3A3733] mt-3">None yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#161616]/10">
              {inquiries.map((q) => (
                <li key={q.id} className="py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="font-bold">{q.name}</p>
                    {q.email && <a href={`mailto:${q.email}`} className="font-mono text-xs underline">{q.email}</a>}
                    <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.15em] text-[#3A3733]">
                      {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {q.status}
                    </span>
                  </div>
                  {q.message && <p className="font-body text-sm text-[#3A3733] mt-1 whitespace-pre-line line-clamp-4">{q.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
