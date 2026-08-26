'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import EmailThread from '@/components/admin/EmailThread';
import DripButton from '@/components/admin/DripButton';
import { AcqNav, Chip, Section, Stat, ToastHost, api, card, cardFlat, btnPrimary, btnGhost, btnDanger, inputCls, labelCls, eyebrow, timeAgo, useToasts } from '@/components/admin/acquisition/ui';
import FacebookButton from '@/components/admin/acquisition/FacebookButton';
import PersonalVideoCard from '@/components/admin/acquisition/PersonalVideoCard';

type Lead = Record<string, unknown> & {
  id: string;
  business_name: string;
  contact_name: string | null;
  contact_title: string | null;
  email: string | null;
  phone: string;
  website: string | null;
  facebook_url: string | null;
  facebook_source: string | null;
  last_dm_at: string | null;
  dm_count: number;
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
type Suite = {
  stage: string;
  voiceUrl: string | null;
  siteUrl: string | null;
  siteStatus: string | null;
  osUrl: string | null;
  /** Always false: the prospect never sees a command center. */
  osShown: boolean;
  hubUrl: string | null;
  filmStatus: string | null;
  pieces: number;
};
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
  suite: Suite | null;
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
  const [designTier, setDesignTier] = useState<2 | 3>(2);
  const [talkingWebsite, setTalkingWebsite] = useState(false);
  const { toasts, push } = useToasts();

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
                <FacebookFact key={l.facebook_url ?? ''} lead={l} busy={busy === 'patch'} onSave={(facebook_url) => void act('patch', { facebook_url })} onDm={(undo) => void act(undo ? 'undo-dm' : 'dm-sent')} dmBusy={busy === 'dm-sent' || busy === 'undo-dm'} />
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

            {/* ── the mail ── */}
            <EmailThread leadId={id} email={l.email} />

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

            <SuitePanel
              suite={data.suite}
              lead={l}
              busy={busy}
              designTier={designTier}
              talkingWebsite={talkingWebsite}
              onTier={setDesignTier}
              onTalking={setTalkingWebsite}
              act={act}
            />

            <PersonalVideoCard leadId={l.id} business={l.business_name} push={push} />

            <Section title="Do something">
              <div className="flex flex-col gap-2">
                {/* Starting a sequence is an action, so it sits with the actions.
                    It was only in the mail panel's header, a third of the way
                    down the page, which is not a place anybody goes looking for
                    a button. */}
                <DripButton
                  leadId={l.id}
                  businessName={l.business_name}
                  className={btnPrimary}
                  onNotice={(text, tone) => (tone === 'error' ? setError(text) : setNotice(text))}
                />
                <button className={btnPrimary} disabled={busy !== '' || !l.acq_eligible} onClick={() => void act('queue-email')}>
                  Queue email {Math.min(3, (l.email_stage ?? 0) + 1)}
                </button>
                <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('call-now')} title={l.consent_status !== 'granted' ? 'Needs consent first' : undefined}>
                  Have Mr. Mustard call now
                </button>
                <button
                  className={btnGhost}
                  disabled={busy !== ''}
                  onClick={() => void act('forge')}
                  title="Voice agent only, no website. The suite card above builds both pieces."
                >
                  {busy === 'forge' ? 'Building...' : 'Build the instant pieces'}
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
                      <Chip label={j.kind === 'forge' ? 'build' : j.kind} tone={j.status === 'failed' ? 'bad' : j.status === 'done' ? 'good' : 'neutral'} />
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
      <ToastHost toasts={toasts} />
    </div>
  );
}

/**
 * Their Facebook page: the button that opens it, and a paste box so the exact
 * page lands on the record the first time it is found by hand. The search
 * finder never overwrites a hand paste.
 */
function FacebookFact({
  lead,
  busy,
  onSave,
  onDm,
  dmBusy,
}: {
  lead: { business_name: string; city: string | null; state: string | null; website: string | null; facebook_url: string | null; facebook_source: string | null; last_dm_at: string | null; dm_count: number };
  busy: boolean;
  onSave: (url: string) => void;
  onDm: (undo: boolean) => void;
  dmBusy: boolean;
}) {
  const [draft, setDraft] = useState(lead.facebook_url ?? '');

  const dirty = draft.trim() !== (lead.facebook_url ?? '');
  return (
    <div className="flex gap-2 sm:col-span-2">
      <dt className="w-28 shrink-0 text-[#161616]/60">Facebook</dt>
      <dd className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <FacebookButton lead={lead} size="md" />
          <button className={`${btnPrimary} !py-2 !text-xs`} disabled={dmBusy} onClick={() => onDm(false)}>
            {dmBusy ? 'Saving…' : lead.last_dm_at ? 'DM sent again' : 'DM sent'}
          </button>
          {lead.last_dm_at && (
            <span className="text-[11px] text-[#3f5d34] font-semibold">
              ✓ DM sent {timeAgo(lead.last_dm_at)}{lead.dm_count > 1 ? `, ${lead.dm_count} total` : ''}
              {' · '}
              <button className="underline font-normal text-[#161616]/60" disabled={dmBusy} onClick={() => onDm(true)}>undo</button>
            </span>
          )}
          {lead.facebook_url ? (
            <span className="text-[11px] text-[#161616]/60 break-all">
              {lead.facebook_url}
              {lead.facebook_source ? ` · ${lead.facebook_source === 'hand' ? 'pasted by hand' : lead.facebook_source === 'search' ? 'found by search' : 'was their website'}` : ''}
            </span>
          ) : (
            <span className="text-[11px] text-[#161616]/60">Not on file. The button opens Facebook search for them; paste the page here once you find it.</span>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className={`${inputCls} !py-1.5 text-xs`}
            value={draft}
            placeholder="https://www.facebook.com/theirpage"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && dirty && !busy) onSave(draft.trim()); }}
          />
          <button className={`${btnGhost} !py-1.5 !text-xs`} disabled={!dirty || busy} onClick={() => onSave(draft.trim())}>
            {busy ? 'Saving…' : lead.facebook_url && !draft.trim() ? 'Clear' : 'Save'}
          </button>
        </div>
      </dd>
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
  if (/call|consent|build|demo|checkout|meeting/.test(type)) return 'bg-[#F5B700]';
  return 'bg-white';
}

/**
 * THEIR SUITE, on one card.
 *
 * The pieces land at different speeds, so
 * this shows the truth about each one rather than a single "forged" badge: the
 * voice agent is instant, the website takes the local
 * build twenty to forty minutes, and the walkthrough film is cut after it.
 *
 * Every piece that is finished is a link you can open right now. Every piece
 * that is not says exactly what it is waiting on.
 */
function SuitePanel({
  suite,
  lead,
  busy,
  designTier,
  talkingWebsite,
  onTier,
  onTalking,
  act,
}: {
  suite: Suite | null;
  lead: Lead;
  busy: string;
  designTier: 2 | 3;
  talkingWebsite: boolean;
  onTier: (t: 2 | 3) => void;
  onTalking: (v: boolean) => void;
  act: (action: string, extra?: Record<string, unknown>) => Promise<void>;
}) {
  const s = suite;
  const building = s?.siteStatus === 'queued' || s?.siteStatus === 'building';
  const failed = s?.siteStatus === 'failed';
  const nothing = !s || s.pieces === 0;

  const piece = (label: string, url: string | null, pending: string | null, blurb: string) => (
    <div className={`${cardFlat} flex items-start gap-3 p-3.5`} key={label}>
      <span
        className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${url ? 'bg-[#3f5d34]' : pending ? 'animate-pulse bg-[#F5B700]' : 'bg-[#161616]/15'}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-oswald text-[11px] font-semibold uppercase tracking-[0.16em] text-[#161616]/70">{label}</p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[13px] font-semibold text-[#161616] underline decoration-[#F5B700] decoration-2 underline-offset-4"
          >
            Open it ↗
          </a>
        ) : (
          <p className="font-sans text-[12px] leading-snug text-[#161616]/55">{pending ?? blurb}</p>
        )}
      </div>
    </div>
  );

  return (
    <Section
      title="Their suite"
      note={
        nothing
          ? 'Nothing is built for them yet. One press builds all of it.'
          : 'Everything built for this business. The hub is the one link you send.'
      }
      right={
        s?.hubUrl ? (
          <a href={s.hubUrl} target="_blank" rel="noopener noreferrer" className={`${btnGhost} !py-2 !text-xs`}>
            ▦ Open their suite ↗
          </a>
        ) : undefined
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {piece('Voice agent', s?.voiceUrl ?? null, null, 'Not built yet. Instant when you build.')}
        {piece(
          'Website',
          s?.siteUrl ?? null,
          building
            ? 'On the anvil. The build on your machine is building it now.'
            : failed
              ? 'The last build failed. Retry puts it back on the anvil.'
              : null,
          'Not queued yet. The build takes twenty to forty minutes.',
        )}
        {/*
          YOURS, NOT THEIRS. The command center is off the suite and out of the
          offer (Sarah, 2026-08-22 and 2026-08-25). It is sold on its own and
          built by hand, so this row never links the prospect to one and never
          reads as a piece they are missing.
        */}
        {piece(
          'Command center',
          null,
          s?.osUrl
            ? 'Built by hand and yours only. It is not part of the suite or the offer, so their page has no door for it and their email never names it.'
            : null,
          'Not part of the suite. Sold on its own, built by hand from the Build OS button.',
        )}
        {piece(
          'Walkthrough film',
          null,
          s?.filmStatus === 'ready'
            ? 'Cut from their own site and their own agent. It plays on their suite page.'
            : s?.filmStatus === 'queued' || s?.filmStatus === 'filming'
              ? 'Being cut now, off their own suite.'
              : null,
          'Cut automatically once their website lands.',
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t-2 border-[#161616]/10 pt-4">
        <span className={`${eyebrow} mr-1`}>Design</span>
        {([2, 3] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTier(t)}
            title={t === 2 ? 'The Wildmere award-site world. The house style.' : 'The Journey site (the Flathead homepage template)'}
            className={`rounded-lg border-2 px-3 py-1.5 font-oswald text-[11px] uppercase tracking-[0.08em] transition-colors ${
              designTier === t
                ? 'border-[#161616] bg-[#161616] text-[#FBF6EA] shadow-[2px_2px_0_0_#F5B700]'
                : 'border-[#161616]/20 bg-white text-[#161616]/70 hover:border-[#F5B700]'
            }`}
          >
            {t === 3 ? 'Tier 3 · Journey' : 'Tier 2 · World'}
          </button>
        ))}
        <button
          onClick={() => onTalking(!talkingWebsite)}
          aria-pressed={talkingWebsite}
          title="Make the talking layer the star of the demo"
          className={`rounded-lg border-2 px-3 py-1.5 font-oswald text-[11px] uppercase tracking-[0.08em] transition-colors ${
            talkingWebsite
              ? 'border-[#161616] bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616]'
              : 'border-[#161616]/20 bg-white text-[#161616]/70 hover:border-[#F5B700]'
          }`}
        >
          🗣 Talking Website
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <button
          className={btnPrimary}
          disabled={busy !== ''}
          onClick={() => void act('forge-suite', { site: true, designTier, talkingWebsite })}
        >
          {busy === 'forge-suite' ? 'Building…' : nothing ? '⚒ Build the whole suite' : '⚒ Build whatever is missing'}
        </button>

        {/*
          THE WEBSITE, ON ITS OWN BUTTON.

          "Build whatever is missing" is accurate and it is also invisible: when
          the thing missing is the website, the word website appears nowhere on
          the control that builds it. This is the button Sarah went looking for
          and could not find. It says what it does, and it says the other half
          out loud too, because building the website is what turns their command
          center on.
        */}
        {!building && !s?.siteUrl && (
          <button
            className={btnPrimary}
            disabled={busy !== ''}
            onClick={() => void act('forge-suite', { site: true, designTier, talkingWebsite })}
            title="Queue their demo website at the build. Twenty to forty minutes on your machine."
          >
            {busy === 'forge-suite' ? 'Queuing…' : '🌐 Build their website'}
          </button>
        )}
        {(failed || (s?.siteUrl && !building)) && (
          <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('reforge-site', { designTier, talkingWebsite })}>
            {busy === 'reforge-site' ? 'Queuing…' : failed ? 'Retry the website build' : 'Build their website again'}
          </button>
        )}
        <button
          className={btnPrimary}
          disabled={busy !== '' || !s?.hubUrl || (s?.pieces ?? 0) === 0}
          title={!s?.hubUrl ? 'There is nothing built to send yet.' : undefined}
          onClick={() => void act('send-suite', lead.demo_emailed_at ? { resend: true } : {})}
        >
          {busy === 'send-suite' ? 'Sending…' : lead.demo_emailed_at ? '✉ Send their suite again' : '✉ Send them their suite'}
        </button>
      </div>

      {lead.demo_emailed_at && (
        <p className="mt-3 font-sans text-[12px] text-[#161616]/55">
          Their suite went out {timeAgo(lead.demo_emailed_at as string)}. Sending again is deliberate and it is logged.
        </p>
      )}
      {building && (
        <p className="mt-3 font-sans text-[12px] text-[#161616]/55">
          The website builds on your machine. If nothing moves, open{' '}
          <Link href="/admin/acquisition/build" className="underline decoration-[#F5B700] decoration-2 underline-offset-4">
            the Build board
          </Link>
          , which says out loud whether the worker is running.
        </p>
      )}
    </Section>
  );
}
