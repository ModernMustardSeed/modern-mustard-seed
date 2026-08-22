'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Chip, Section, Stat, api, card, cardFlat, btnPrimary, btnGhost, btnDanger, inputCls, labelCls, eyebrow, timeAgo } from '@/components/admin/acquisition/ui';

type Lead = Record<string, unknown> & {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_title: string | null;
  email: string | null;
  phone: string;
  website: string | null;
  trade: string | null;
  city: string | null;
  state: string | null;
  lead_score: number | null;
  call_volume_score: number | null;
  missed_call_score: number | null;
  score_reasons: { label: string; points: number }[] | null;
  email_status: string | null;
  email_confidence: number | null;
  email_source_url: string | null;
  contact_source_url: string | null;
  source_urls: string[] | null;
  rating: number | null;
  review_count: number | null;
  hours: Record<string, string> | null;
  open_24_7: boolean;
  emergency_service: boolean;
  service_area: string | null;
  acq_stage: string;
  acq_eligible: boolean;
  acq_ineligible_reason: string | null;
  email_stage: number;
  consent_status: string | null;
  consent_at: string | null;
  call_stage: string | null;
  call_attempts: number;
  demo_status: string | null;
  demo_emailed_at: string | null;
  hub_demo_url: string | null;
  demo_url: string | null;
  checkout_sent_at: string | null;
  client_status: string | null;
  unsubscribed_at: string | null;
  needs_human: string | null;
  notes: string | null;
  rep_notes: string | null;
  is_test: boolean;
};
type Event = { id: string; type: string; label: string; occurred_at: string; detail: Record<string, unknown> };
type Call = { id?: string; summary: string | null; transcript: string | null; intel: Record<string, unknown> | null; duration_sec: number | null; roleplay_scenario: string | null; status?: string; requested_at?: string; ended_reason?: string | null };
type Consent = { id: string; phone_e164: string; consent_version: string; consent_text: string; typed_name: string | null; ip: string | null; user_agent: string | null; created_at: string; revoked_at: string | null };
type Brief = { headline: string; facts: { label: string; value: string }[]; intent: string; lines: string[]; call: { duration: string | null; scenario: string | null; summary: string | null } | null };
type Detail = {
  lead: Lead;
  timeline: Event[];
  calls: Call[];
  queue: { id: string; kind: string; step: number; status: string; run_after: string; error: string | null }[];
  consents: Consent[];
  messages: { id: string; direction: string; channel: string; subject: string | null; snippet: string | null; occurred_at: string }[];
  nextEmail: { subject: string; html: string; step: number; variant: string } | null;
  checkoutUrl: string;
  brief: Brief;
};

export default function ProspectDetail({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [openTranscript, setOpenTranscript] = useState<number | null>(null);
  const [mustardLink, setMustardLink] = useState<{ url: string; expiresAt: string; message: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<Detail>(`/api/admin/acquisition/prospects/${id}`));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the prospect.');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    setNotice('');
    setError('');
    try {
      await api(`/api/admin/acquisition/prospects/${id}`, { method: 'POST', body: JSON.stringify({ action, ...extra }) });
      setNotice(`${action.replace(/-/g, ' ')} done.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setBusy('');
    }
  };

  /**
   * Mint the prefilled link. The token comes back exactly once, in this
   * response, because only its hash is stored. Copy it now or mint another.
   */
  const mintLink = async (source: string) => {
    setBusy(`link:${source}`);
    setError('');
    try {
      const res = await api<{ url: string; expiresAt: string; message: string }>('/api/admin/acquisition/mustard', {
        method: 'POST',
        body: JSON.stringify({ action: 'mint', leadId: id, source }),
      });
      setMustardLink(res);
      setLinkCopied(false);
      await copyLink(res.url);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mint the link.');
    } finally {
      setBusy('');
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      /* the URL is on screen either way */
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
        <AdminHeader active="acquisition" title="Acquisition" />
        <main className="max-w-6xl mx-auto px-5 py-6">
          <AcqNav active="prospects" />
          <p className="text-sm text-[#161616]/65">{error || 'Loading...'}</p>
        </main>
      </div>
    );
  }

  const l = data.lead;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[86rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav
          active="prospects"
          right={
            <Link href="/admin/acquisition/prospects" className={btnGhost}>
              ← All prospects
            </Link>
          }
        />

        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        {l.needs_human && (
          <div className="mb-5 rounded-2xl border-[3px] border-[#E0301E] bg-[#E0301E]/[0.06] p-4 shadow-[5px_5px_0_0_#E0301E] flex items-start justify-between gap-4">
            <div>
              <p className={eyebrow}>Mr. Mustard flagged this for you</p>
              <p className="mt-1 font-semibold">{l.needs_human}</p>
            </div>
            <button className={btnGhost} onClick={() => void act('clear-human-flag')}>
              Handled
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
          <div className="space-y-6">
            {/* ── who they are ── */}
            <section className={`${card} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={eyebrow}>{l.trade?.toUpperCase() ?? 'PROSPECT'}</p>
                  <h1 className="font-oswald text-3xl font-bold uppercase tracking-tight">{l.business_name}</h1>
                  <p className="mt-1 text-sm text-[#161616]/65">
                    {[l.contact_name, l.contact_title, [l.city, l.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || 'No contact on file'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Chip label={l.acq_stage.replace(/_/g, ' ')} tone={l.client_status === 'client' ? 'good' : 'neutral'} />
                    {l.is_test && <Chip label="TEST PROSPECT" tone="warn" />}
                    {l.acq_eligible ? <Chip label="campaign ready" tone="good" /> : <Chip label="held back" tone="warn" title={l.acq_ineligible_reason ?? undefined} />}
                    {l.unsubscribed_at && <Chip label="opted out" tone="bad" />}
                  </div>
                  {!l.acq_eligible && l.acq_ineligible_reason && (
                    <p className="mt-2 text-[13px] text-[#161616]/60">Held because: {l.acq_ineligible_reason}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 shrink-0">
                  <Stat label="Score" value={l.lead_score ?? '—'} tone={(l.lead_score ?? 0) >= 70 ? 'seed' : 'ink'} />
                  <Stat label="Call volume" value={l.call_volume_score ?? '—'} />
                  <Stat label="Missed calls" value={l.missed_call_score ?? '—'} tone="red" />
                </div>
              </div>

              <dl className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                <Fact label="Phone" value={l.phone} />
                <Fact label="Email" value={l.email ?? '—'} sub={l.email_status ? `${l.email_status}${l.email_confidence ? ` · confidence ${l.email_confidence}` : ''}` : undefined} href={l.email_source_url ?? undefined} hrefLabel="source" />
                <Fact label="Website" value={l.website ?? '—'} href={l.website ?? undefined} />
                <Fact label="Reviews" value={l.review_count ? `${l.review_count.toLocaleString()}${l.rating ? ` at ${l.rating} stars` : ''}` : '—'} />
                <Fact label="Service area" value={l.service_area ?? '—'} />
                <Fact label="After hours" value={l.open_24_7 ? 'Advertises 24/7' : l.emergency_service ? 'Advertises emergency service' : '—'} />
              </dl>

              {l.hours && (
                <p className="mt-3 text-[12px] text-[#161616]/65">
                  Posted hours: {Object.entries(l.hours).map(([d, h]) => `${d.slice(0, 3)} ${h}`).join(' · ')}
                </p>
              )}

              {l.score_reasons?.length ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-oswald uppercase tracking-[0.16em] text-[#161616]/65">Why it scored {l.lead_score}</summary>
                  <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
                    {l.score_reasons.map((r, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-[#161616]/70">{r.label}</span>
                        <span className={`font-mono tabular-nums ${r.points > 0 ? 'text-[#3f5d34]' : 'text-[#E0301E]'}`}>
                          {r.points > 0 ? '+' : ''}
                          {r.points}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {l.source_urls?.length ? (
                <p className="mt-3 text-[11px] text-[#161616]/60 break-all">
                  Sources: {l.source_urls.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="underline mr-2">
                      {u.replace(/^https?:\/\//, '').slice(0, 48)}
                    </a>
                  ))}
                </p>
              ) : null}
            </section>

            {/* ── the timeline ── */}
            <Section title="Timeline" note="Everything that has happened to this prospect, in order.">
              {data.timeline.length === 0 ? (
                <p className="text-sm text-[#161616]/60">Nothing yet.</p>
              ) : (
                <ol className="relative border-l-2 border-[#161616]/15 ml-2 space-y-3">
                  {data.timeline.map((e) => (
                    <li key={e.id} className="pl-5 relative">
                      <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-[#161616] ${dotFor(e.type)}`} />
                      <p className="text-[13px] leading-snug">
                        <span className="font-mono text-[11px] text-[#161616]/60 tabular-nums mr-2">
                          {new Date(e.occurred_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {e.label}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            {/* ── Mr. Mustard ── */}
            <Section title="Mr. Mustard" note="What he heard, and what he did about it.">
              {data.calls.length === 0 ? (
                <p className="text-sm text-[#161616]/60">He has not spoken to them yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.calls.map((c, i) => (
                    <div key={i} className={`${cardFlat} p-4`}>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Chip label={c.status ?? 'call'} tone={c.status === 'completed' ? 'good' : c.status === 'failed' ? 'bad' : 'neutral'} />
                        {c.duration_sec ? <Chip label={`${Math.floor(c.duration_sec / 60)}m ${c.duration_sec % 60}s`} /> : null}
                        {c.roleplay_scenario && <Chip label={`roleplay: ${c.roleplay_scenario}`} tone="warn" />}
                        {c.ended_reason && <span className="text-[11px] font-mono text-[#161616]/60">{c.ended_reason}</span>}
                        <span className="ml-auto text-[11px] font-mono text-[#161616]/60">{timeAgo(c.requested_at)}</span>
                      </div>
                      {c.summary && <p className="text-[13px] leading-relaxed text-[#161616]/80">{c.summary}</p>}
                      {c.intel && <IntelGrid intel={c.intel} />}
                      {c.transcript && (
                        <>
                          <button className="mt-3 text-xs underline font-semibold" onClick={() => setOpenTranscript(openTranscript === i ? null : i)}>
                            {openTranscript === i ? 'Hide transcript' : 'Read the transcript'}
                          </button>
                          {openTranscript === i && (
                            <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed bg-white border-2 border-[#161616]/15 rounded-lg p-3">
                              {c.transcript}
                            </pre>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* ── consent evidence ── */}
            <Section title="Consent record" note="Exactly what they agreed to, when, and from where. Append only.">
              {data.consents.length === 0 ? (
                <p className="text-sm text-[#161616]/60">No consent on file, so Mr. Mustard will not call.</p>
              ) : (
                <div className="space-y-3">
                  {data.consents.map((c) => (
                    <div key={c.id} className={`${cardFlat} p-4`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip label={c.consent_version} />
                        <Chip label={c.phone_e164} tone="good" />
                        {c.revoked_at && <Chip label="revoked" tone="bad" />}
                        <span className="ml-auto text-[11px] font-mono text-[#161616]/60">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-[#161616]/70">{c.consent_text}</p>
                      <p className="mt-2 text-[11px] font-mono text-[#161616]/60">
                        Typed name: {c.typed_name ?? '—'} · IP {c.ip ?? '—'} · {(c.user_agent ?? '').slice(0, 70)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* ── the side rail: act on it ── */}
          <div className="space-y-6">
            <Section
              title="Send Mustard link"
              note="The human cold-call move. Get them to yes on the phone, send this, and they press one button."
            >
              {mustardLink ? (
                <>
                  <button
                    className={`${btnGhost} w-full justify-start font-mono text-[11px] normal-case tracking-normal truncate`}
                    onClick={() => void copyLink(mustardLink.url)}
                    title={mustardLink.url}
                  >
                    {linkCopied ? 'Copied to your clipboard' : mustardLink.url.replace(/^https:\/\//, '')}
                  </button>
                  <p className="mt-2 text-[12px] text-[#161616]/60">{mustardLink.message}</p>
                  <p className="mt-1 text-[11px] font-mono text-[#161616]/60">
                    Expires {new Date(mustardLink.expiresAt).toLocaleString()}
                  </p>
                  <button className={`${btnGhost} mt-2`} onClick={() => setMustardLink(null)}>
                    Make another
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  {(['human-call', 'facebook-dm', 'linkedin-dm', 'cold-email'] as const).map((src) => (
                    <button key={src} className={btnGhost} disabled={busy !== ''} onClick={() => void mintLink(src)}>
                      {busy === `link:${src}` ? 'Minting...' : `Link for ${src.replace(/-/g, ' ')}`}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[11px] leading-snug text-[#161616]/65">
                It fills their number in. It does not consent for them and it never dials on its own. They still tick
                the box and press the button.
              </p>
            </Section>

            <Section title="Do something">
              <div className="flex flex-col gap-2">
                <button className={btnPrimary} disabled={busy !== '' || !l.acq_eligible} onClick={() => void act('queue-email')}>
                  Queue email {Math.min(3, (l.email_stage ?? 0) + 1)}
                </button>
                <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('call-now')} title={l.consent_status !== 'granted' ? 'Needs consent first' : undefined}>
                  Have Mr. Mustard call now
                </button>
                <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('forge')}>
                  {busy === 'forge' ? 'Forging...' : 'Forge their agent'}
                </button>
                <button className={btnGhost} disabled={busy !== '' || !l.hub_demo_url} onClick={() => void act('send-demo')}>
                  Email their demo
                </button>
                <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('send-checkout')}>
                  Send the checkout link
                </button>
                <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('recheck-eligibility')}>
                  Recheck eligibility
                </button>
                <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('mark-won')}>
                  Mark as won
                </button>
                <button className={btnDanger} disabled={busy !== ''} onClick={() => { if (window.confirm('Opt this prospect out permanently?')) void act('unsubscribe'); }}>
                  Opt them out
                </button>
              </div>
              {l.hub_demo_url && (
                <p className="mt-3 text-[12px]">
                  <a href={l.hub_demo_url} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                    Open their demo suite ↗
                  </a>
                </p>
              )}
              <p className="mt-1 text-[12px]">
                <a href={data.checkoutUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  Their checkout link ↗
                </a>
              </p>
            </Section>

            {data.nextEmail && (
              <Section
                title="The next email"
                note={`Step ${data.nextEmail.step}, variant ${data.nextEmail.variant}. These are the exact bytes that would ship.`}
                right={
                  <button className={btnGhost} onClick={() => setShowEmail((v) => !v)}>
                    {showEmail ? 'Hide' : 'Preview'}
                  </button>
                }
              >
                <p className="text-sm font-semibold">{data.nextEmail.subject}</p>
                {showEmail && (
                  <iframe
                    title="Email preview"
                    className="mt-3 w-full h-[30rem] border-2 border-[#161616]/20 rounded-lg bg-white"
                    srcDoc={data.nextEmail.html}
                    sandbox=""
                  />
                )}
              </Section>
            )}

            <Section title="Prep brief" note="What Sarah should know before she talks to them.">
              <p className="font-oswald text-lg font-bold uppercase tracking-tight">{data.brief.headline}</p>
              <p className="mt-1 text-xs font-mono text-[#161616]/65">Buying intent: {data.brief.intent}</p>
              <dl className="mt-3 space-y-1 text-[13px]">
                {data.brief.facts.map((f) => (
                  <div key={f.label} className="flex gap-2">
                    <dt className="w-32 shrink-0 text-[#161616]/65">{f.label}</dt>
                    <dd className="min-w-0 break-words">{f.value}</dd>
                  </div>
                ))}
              </dl>
              {data.brief.lines.length > 0 && (
                <ul className="mt-3 space-y-1 text-[13px] text-[#161616]/80 list-disc pl-4">
                  {data.brief.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Queued work">
              {data.queue.length === 0 ? (
                <p className="text-sm text-[#161616]/60">Nothing scheduled.</p>
              ) : (
                <ul className="space-y-1.5 text-[13px]">
                  {data.queue.map((j) => (
                    <li key={j.id} className="flex items-center gap-2">
                      <Chip label={j.kind} tone={j.status === 'failed' ? 'bad' : j.status === 'done' ? 'good' : 'neutral'} />
                      <span className="text-[#161616]/65">
                        {j.status}
                        {j.step ? ` · step ${j.step}` : ''}
                      </span>
                      <span className="ml-auto font-mono text-[11px] text-[#161616]/60">{timeAgo(j.run_after)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Notes">
              {l.rep_notes && <pre className="whitespace-pre-wrap text-[13px] text-[#161616]/75 mb-3">{l.rep_notes}</pre>}
              <label className={labelCls}>Add a note</label>
              <textarea className={`${inputCls} h-24`} value={note} onChange={(e) => setNote(e.target.value)} />
              <button
                className={`${btnGhost} mt-2`}
                disabled={!note.trim() || busy !== ''}
                onClick={async () => {
                  await act('note', { note });
                  setNote('');
                }}
              >
                Save note
              </button>
              {l.notes && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-oswald uppercase tracking-[0.16em] text-[#161616]/65">Sourcing record</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-[12px] text-[#161616]/65">{l.notes}</pre>
                </details>
              )}
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Fact({ label, value, sub, href, hrefLabel }: { label: string; value: string; sub?: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-[#161616]/60">{label}</dt>
      <dd className="min-w-0 break-words">
        {value}
        {sub && <span className="block text-[11px] text-[#161616]/60">{sub}</span>}
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[11px] underline text-[#161616]/65">
            {hrefLabel ?? 'open'} ↗
          </a>
        )}
      </dd>
    </div>
  );
}

function IntelGrid({ intel }: { intel: Record<string, unknown> }) {
  const entries = Object.entries(intel).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0));
  if (!entries.length) return null;
  return (
    <dl className="mt-3 grid sm:grid-cols-2 gap-x-5 gap-y-1 text-[12px]">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="w-32 shrink-0 text-[#161616]/60">{k.replace(/_/g, ' ')}</dt>
          <dd className="min-w-0 break-words text-[#161616]/80">{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function dotFor(type: string): string {
  if (/purchase|client|won/.test(type)) return 'bg-[#3f5d34]';
  if (/fail|bounce|unsub|suppress|needs_human/.test(type)) return 'bg-[#E0301E]';
  if (/call|consent|forge|demo|checkout|meeting/.test(type)) return 'bg-[#F5B700]';
  return 'bg-white';
}
