'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * WHAT THE CUSTOMER SEES.
 *
 * The whole product argument, on one screen: here is who called, here is what
 * they wanted, here is what got booked while you were on a roof. The stat that
 * leads is AFTER HOURS, because that is the number the sale was made on and it
 * is the one that renews the subscription.
 *
 * House grammar: cream canvas, ink outlines, mustard fills, hard sticker
 * shadows, Playfair display, DM Sans body, JetBrains Mono labels.
 */

type Office = {
  id: string;
  business_name: string;
  status: string;
  agent_phone: string | null;
  forward_from: string | null;
  forward_mode: string;
  voice_gender: string;
  agent_name: string;
  greeting: string | null;
  tone: string;
  languages: string[];
  booking_enabled: boolean;
  transfers_enabled: boolean;
  never_do: string[];
  escalate_on: string[];
  notify_email: string | null;
  notify_sms: string | null;
  notify_on: string[];
};
type Call = {
  id: string;
  from_number: string | null;
  started_at: string;
  duration_sec: number | null;
  intent: string | null;
  urgency: string | null;
  summary: string | null;
  booked: boolean;
  transferred: boolean;
  needs_human: boolean;
  language: string | null;
};
type Contact = { id: string; name: string | null; phone: string | null; call_count: number; last_seen_at: string; is_customer: boolean };
type Appt = { id: string; title: string; service: string | null; starts_at: string; status: string; address: string | null };
type Transfer = { id: string; name: string; role: string | null; phone: string; when_to_transfer: string | null };
type Stats = { callsThisMonth: number; booked: number; transferred: number; emergencies: number; afterHours: number; minutes: number };
type Payload = { office: Office | null; calls: Call[]; contacts: Contact[]; appointments: Appt[]; transfers: Transfer[]; stats: Stats };

const FORWARD_LABELS: Record<string, string> = {
  all_calls: 'Every call',
  after_hours: 'Nights and weekends',
  overflow: 'Overflow only',
  voicemail_only: 'Only calls that would have gone to voicemail',
};

export default function FrontOfficeScreen() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/front-office');
      if (res.status === 401) {
        setError('Please sign in to see your Front Office.');
        return;
      }
      setData((await res.json()) as Payload);
      setError('');
    } catch {
      setError('Could not load your Front Office.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true);
    setNotice('');
    try {
      const res = await fetch('/api/portal/front-office', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'That did not save.');
      setNotice('Saved. Your receptionist is using this from the next call.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save.');
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) {
    return (
      <Shell>
        <p className="text-[15px] text-[#161616]/70">{error}</p>
        <Link href="/portal" className="mt-4 inline-block font-bold underline underline-offset-4">
          Back to your portal
        </Link>
      </Shell>
    );
  }

  if (!data) return <Shell><p className="text-[#161616]/50">Loading.</p></Shell>;

  if (!data.office) {
    return (
      <Shell>
        <h1 className="font-display text-4xl font-extrabold">Your Front Office</h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#161616]/75">
          There is no Front Office on this account yet. If you have just bought your voice agent it appears here within a
          few minutes. If it has been longer than that, reply to your welcome email and we will sort it out today.
        </p>
      </Shell>
    );
  }

  const o = data.office;
  const s = data.stats;

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[#C4160B]">Your Front Office</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-none sm:text-5xl">{o.business_name}</h1>
          <p className="mt-2 text-[15px] text-[#161616]/70">
            {o.agent_name} is answering {FORWARD_LABELS[o.forward_mode]?.toLowerCase() ?? o.forward_mode}.
          </p>
        </div>
        <StatusPill status={o.status} />
      </div>

      {notice && <p className="mt-4 text-sm font-semibold text-[#3f5d34]">{notice}</p>}
      {error && <p className="mt-4 text-sm font-semibold text-[#E0301E]">{error}</p>}

      {/* AFTER HOURS LEADS. It is the number the sale was made on. */}
      <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat big label="Answered after hours" value={s.afterHours} sub="Last 30 days" />
        <Stat label="Calls answered" value={s.callsThisMonth} />
        <Stat label="Booked" value={s.booked} />
        <Stat label="Sent to your team" value={s.transferred} />
        <Stat label="Emergencies" value={s.emergencies} tone={s.emergencies > 0 ? 'red' : 'ink'} />
        <Stat label="Minutes" value={s.minutes} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title="Who called" note={data.calls.length ? undefined : 'No calls yet. The first one shows up here the moment it happens.'}>
            <ul className="divide-y divide-[#161616]/10">
              {data.calls.slice(0, 12).map((c) => (
                <li key={c.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display text-[16px] font-bold">{c.from_number ?? 'Unknown number'}</p>
                    <p className="font-mono text-[11px] text-[#161616]/50">{when(c.started_at)}</p>
                  </div>
                  {c.summary && <p className="mt-1 text-[14px] leading-relaxed text-[#161616]/75">{c.summary}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.urgency === 'emergency' && <Tag tone="red">Emergency</Tag>}
                    {c.booked && <Tag tone="seed">Booked</Tag>}
                    {c.transferred && <Tag>Sent to your team</Tag>}
                    {c.needs_human && <Tag tone="red">Needs you</Tag>}
                    {c.language === 'es' && <Tag>Spanish</Tag>}
                    {c.intent && <Tag>{c.intent}</Tag>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Booked in" note={data.appointments.length ? undefined : 'Nothing booked yet.'}>
            <ul className="divide-y divide-[#161616]/10">
              {data.appointments.slice(0, 10).map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                  <div>
                    <p className="font-display text-[15px] font-bold">{a.title}</p>
                    {a.address && <p className="text-[13px] text-[#161616]/60">{a.address}</p>}
                  </div>
                  <p className="font-mono text-[12px] text-[#161616]/60">{when(a.starts_at)}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={`Your customers (${data.contacts.length})`} note={data.contacts.length ? 'Everybody who has ever called, and how often.' : 'Nobody yet.'}>
            <ul className="divide-y divide-[#161616]/10">
              {data.contacts.slice(0, 12).map((c) => (
                <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                  <p className="font-display text-[15px] font-bold">{c.name || c.phone || 'Unknown'}</p>
                  <p className="font-mono text-[12px] text-[#161616]/55">
                    {c.call_count} call{c.call_count === 1 ? '' : 's'} · {when(c.last_seen_at)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Your number">
            <Row label="Callers reach" value={o.agent_phone ?? 'Being set up. We will email you the number.'} />
            <Row label="Forwarded from" value={o.forward_from ?? 'Not set up yet'} />
            <Row label="Answering" value={FORWARD_LABELS[o.forward_mode] ?? o.forward_mode} />
            <p className="mt-3 text-[12.5px] leading-relaxed text-[#161616]/60">
              Your own number never changes hands. You forward to us, which means you can undo the whole thing from your
              phone company in five minutes without asking us first.
            </p>
          </Card>

          <Card title="How it sounds">
            <Field label="Voice">
              <div className="flex gap-2">
                {(['female', 'male'] as const).map((g) => (
                  <button
                    key={g}
                    disabled={busy}
                    onClick={() => void save({ voiceGender: g })}
                    className={`rounded-lg border-2 border-[#161616] px-3.5 py-1.5 text-[13px] font-bold capitalize transition ${
                      o.voice_gender === g ? 'bg-[#F5B700] shadow-[3px_3px_0_0_#161616]' : 'bg-white hover:bg-[#FBF6EA]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Manner">
              <div className="flex flex-wrap gap-2">
                {(['warm', 'professional', 'brisk', 'folksy'] as const).map((t) => (
                  <button
                    key={t}
                    disabled={busy}
                    onClick={() => void save({ tone: t })}
                    className={`rounded-lg border-2 border-[#161616] px-3 py-1.5 text-[13px] font-bold capitalize transition ${
                      o.tone === t ? 'bg-[#F5B700] shadow-[3px_3px_0_0_#161616]' : 'bg-white hover:bg-[#FBF6EA]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Languages">
              <div className="flex gap-2">
                {(['en', 'es'] as const).map((l) => {
                  const on = o.languages.includes(l);
                  return (
                    <button
                      key={l}
                      // English is not removable. A caller who reaches a
                      // Spanish-only agent by mistake is a support call.
                      disabled={busy || l === 'en'}
                      onClick={() => void save({ languages: on ? o.languages.filter((x) => x !== l) : [...o.languages, l] })}
                      className={`rounded-lg border-2 border-[#161616] px-3.5 py-1.5 text-[13px] font-bold transition ${
                        on ? 'bg-[#F5B700] shadow-[3px_3px_0_0_#161616]' : 'bg-white hover:bg-[#FBF6EA]'
                      } ${l === 'en' ? 'cursor-default' : ''}`}
                    >
                      {l === 'en' ? 'English' : 'Español'}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Answering">
              <div className="grid gap-2">
                {Object.entries(FORWARD_LABELS).map(([k, label]) => (
                  <button
                    key={k}
                    disabled={busy}
                    onClick={() => void save({ forwardMode: k })}
                    className={`rounded-lg border-2 border-[#161616] px-3 py-2 text-left text-[13px] font-semibold transition ${
                      o.forward_mode === k ? 'bg-[#F5B700] shadow-[3px_3px_0_0_#161616]' : 'bg-white hover:bg-[#FBF6EA]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="What it says first">
              <Greeting current={o.greeting ?? ''} busy={busy} onSave={(g) => void save({ greeting: g })} />
            </Field>
          </Card>

          <Card title="Who it hands calls to" note={data.transfers.length ? undefined : 'Nobody yet. Tell us who to add and we will set it up.'}>
            <ul className="divide-y divide-[#161616]/10">
              {data.transfers.map((t) => (
                <li key={t.id} className="py-2.5">
                  <p className="font-display text-[15px] font-bold">
                    {t.name} {t.role && <span className="font-sans text-[13px] font-normal text-[#161616]/55">{t.role}</span>}
                  </p>
                  <p className="font-mono text-[12px] text-[#161616]/60">{t.phone}</p>
                  {t.when_to_transfer && <p className="mt-0.5 text-[13px] text-[#161616]/70">{t.when_to_transfer}</p>}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Where we reach you" note="A text is what actually wakes somebody at 2am. The email has the detail.">
            <Alerts office={o} busy={busy} onSave={(patch) => void save(patch)} />
          </Card>

          <Card title="What it will never do">
            <ul className="space-y-1.5">
              {o.never_do.map((r) => (
                <li key={r} className="text-[13.5px] leading-relaxed text-[#161616]/75">
                  {r}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] leading-relaxed text-[#161616]/60">
              Want to add one? Reply to any email from us with the sentence and we will put it in the same day.
            </p>
          </Card>
        </div>
      </div>
    </Shell>
  );
}

/**
 * Where alerts go, and for what.
 *
 * The text number is the important field on this card, so it is first. An
 * owner who fills in nothing here still gets email at their account address,
 * because an office that can reach nobody is the failure this whole screen
 * exists to prevent.
 */
function Alerts({ office, busy, onSave }: { office: Office; busy: boolean; onSave: (patch: Record<string, unknown>) => void }) {
  const [sms, setSms] = useState(office.notify_sms ?? '');
  const [email, setEmail] = useState(office.notify_email ?? '');
  useEffect(() => {
    setSms(office.notify_sms ?? '');
    setEmail(office.notify_email ?? '');
  }, [office.notify_sms, office.notify_email]);

  const events: [string, string][] = [
    ['emergency', 'Emergencies'],
    ['needs_human', 'Somebody needs a callback'],
    ['booked', 'A job gets booked'],
    ['every_call', 'Every single call'],
  ];

  return (
    <div>
      <Field label="Text me at">
        <div className="flex flex-wrap gap-2">
          <input
            value={sms}
            onChange={(e) => setSms(e.target.value)}
            placeholder="(406) 555-0143"
            className="min-w-0 flex-1 rounded-lg border-2 border-[#161616] bg-white px-2.5 py-1.5 text-[14px]"
          />
          <button
            disabled={busy || sms.trim() === (office.notify_sms ?? '')}
            onClick={() => onSave({ notifySms: sms })}
            className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 text-[13px] font-bold shadow-[3px_3px_0_0_#161616] disabled:opacity-40 disabled:shadow-none"
          >
            Save
          </button>
        </div>
        <p className="mt-1 text-[12px] text-[#161616]/55">Leave it blank for email only. Reply STOP to any text and they stop.</p>
      </Field>

      <Field label="Email me at">
        <div className="flex flex-wrap gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="min-w-0 flex-1 rounded-lg border-2 border-[#161616] bg-white px-2.5 py-1.5 text-[14px]"
          />
          <button
            disabled={busy || email.trim() === (office.notify_email ?? '')}
            onClick={() => onSave({ notifyEmail: email })}
            className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 text-[13px] font-bold shadow-[3px_3px_0_0_#161616] disabled:opacity-40 disabled:shadow-none"
          >
            Save
          </button>
        </div>
      </Field>

      <Field label="Tell me about">
        <div className="grid gap-2">
          {events.map(([key, label]) => {
            const on = office.notify_on.includes(key);
            return (
              <button
                key={key}
                disabled={busy}
                onClick={() => onSave({ notifyOn: on ? office.notify_on.filter((x) => x !== key) : [...office.notify_on, key] })}
                className={`rounded-lg border-2 border-[#161616] px-3 py-2 text-left text-[13px] font-semibold transition ${
                  on ? 'bg-[#F5B700] shadow-[3px_3px_0_0_#161616]' : 'bg-white hover:bg-[#FBF6EA]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[12px] text-[#161616]/55">
          Turning on every call is the fastest way to start ignoring these. Most owners leave it on the first three.
        </p>
      </Field>
    </div>
  );
}

function Greeting({ current, busy, onSave }: { current: string; busy: boolean; onSave: (g: string) => void }) {
  const [v, setV] = useState(current);
  useEffect(() => setV(current), [current]);
  return (
    <div>
      <textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        rows={3}
        maxLength={600}
        className="w-full rounded-lg border-2 border-[#161616] bg-white p-2.5 text-[13.5px] leading-relaxed"
      />
      <button
        disabled={busy || v.trim() === current.trim()}
        onClick={() => onSave(v)}
        className="mt-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] px-3.5 py-1.5 text-[13px] font-bold shadow-[3px_3px_0_0_#161616] disabled:opacity-40 disabled:shadow-none"
      >
        Save greeting
      </button>
    </div>
  );
}

/* ─────────────────────────────── furniture ──────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <main className="mx-auto max-w-[80rem] px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-2 border-[#161616] bg-white p-5 shadow-[5px_5px_0_0_#161616]">
      <h2 className="font-display text-[19px] font-bold leading-tight">{title}</h2>
      {note && <p className="mt-1 text-[13px] text-[#161616]/55">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub, big, tone }: { label: string; value: number; sub?: string; big?: boolean; tone?: 'red' | 'ink' }) {
  return (
    <div
      className={`rounded-xl border-2 border-[#161616] p-3.5 ${big ? 'bg-[#F5B700] shadow-[4px_4px_0_0_#161616] sm:col-span-1' : 'bg-white'}`}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60">{label}</p>
      <p className={`mt-1 font-display font-extrabold leading-none ${big ? 'text-4xl' : 'text-2xl'} ${tone === 'red' ? 'text-[#E0301E]' : ''}`}>
        {value.toLocaleString()}
      </p>
      {sub && <p className="mt-1 text-[11px] text-[#161616]/55">{sub}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#161616]/10 py-2 last:border-0">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#161616]/55">{label}</span>
      <span className="text-[14px] font-semibold">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/55">{label}</p>
      {children}
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'red' | 'seed' }) {
  const cls = tone === 'red' ? 'bg-[#E0301E] text-white' : tone === 'seed' ? 'bg-[#F5B700]' : 'bg-[#161616]/[0.07]';
  return <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${cls}`}>{children}</span>;
}

function StatusPill({ status }: { status: string }) {
  const live = status === 'live';
  return (
    <span
      className={`rounded-lg border-2 border-[#161616] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${
        live ? 'bg-[#F5B700] shadow-[3px_3px_0_0_#161616]' : 'bg-white'
      }`}
    >
      {live ? 'Answering' : status === 'provisioning' ? 'Being set up' : status}
    </span>
  );
}

function when(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600_000 && diff > 0) return `${Math.max(1, Math.round(diff / 60_000))}m ago`;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
