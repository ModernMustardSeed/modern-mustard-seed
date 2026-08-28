'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { templateName } from '@/components/admin/TemplatePicker';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import EmailThread from '@/components/admin/EmailThread';
import DeliveryEmailPanel from '@/components/admin/DeliveryEmailPanel';

/**
 * The single per-client command view. One screen for one customer: who they are,
 * everything they own (the unified layer), their build, billing, orders, and a
 * two-way message thread you can answer right here (lands in their portal + inbox).
 */

type Product = { id: string; kind: string; label: string; tier: string | null; status: string; home_url: string | null; detail: string | null; amount_cents: number | null; created_at: string };
type Project = { id: string; name: string; status: string; summary: string | null; progress: number | null; launch_target: string | null; care_plan: boolean | null; site_live_url: string | null; moodboard_status: string | null; revisions_included: number | null; revisions_used: number | null; site_template?: string | null; edit_status?: string | null; edit_error?: string | null; edit_instruction?: string | null; edit_requested_at?: string | null; has_site?: boolean; demo_site_id?: string | null };
type Order = { stripe_session_id: string; product_name: string; item_type: string | null; price_paid_cents: number | null; status: string; created_at: string };
type Billing = { one_time_total: number | null; monthly_total: number | null; deposit_status: string | null; balance_status: string | null; signed_at: string | null; subscription_status: string | null } | null;
type Message = { id: string; body: string; source: string; status: string; reply_body: string | null; replied_at: string | null; proposed_date: string | null; created_at: string };
type Client = { email: string; name: string | null; company: string | null; tier: string | null; status: string | null; welcome_note: string | null; created_at: string } | null;
type ClientFile = { id: string; label: string; url: string; kind: string; created_at: string };
type ProposalRow = { id: string; status: string; one_time_total: number | null; monthly_total: number | null; deposit_status: string | null; balance_status: string | null; signed_at: string | null; sent_at: string | null; share_token: string | null; updated_at: string };
type Payload = { email: string; client: Client; products: Product[]; projects: Project[]; orders: Order[]; billing: Billing; messages: Message[]; files?: ClientFile[]; proposals?: ProposalRow[];
  intake?: { answers?: Record<string, unknown>; status?: string; submitted_at?: string } | null };

const dollars = (cents: number | null | undefined) => (cents == null ? null : `$${Math.round(cents / 100).toLocaleString('en-US')}`);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

const PRODUCT_STATUS: Record<string, string> = {
  provisioning: 'bg-[#F5B700]/20 text-[#8f6600] border-[#8f6600]/30',
  building: 'bg-[#F5B700]/20 text-[#161616] border-[#161616]/30',
  in_production: 'bg-blue-100 text-[#1E50C8] border-[#1E50C8]/30',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-800/25',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-800/25',
};
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-4">{children}</span>
);
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">{children}</div>
);

export default function ClientCommandView() {
  const params = useParams<{ email: string }>();
  const emailParam = decodeURIComponent(Array.isArray(params.email) ? params.email[0] : params.email || '');

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  // Edit their site from the card (2026-08-24): one sentence, applied by the forge as
  // a draft for approval on the Delivery board. Copy, colours, a new photograph.
  const [editOpen, setEditOpen] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editNote, setEditNote] = useState<{ id: string; text: string; error?: boolean } | null>(null);

  const sendEdit = async (projectId: string) => {
    const instruction = editText.trim();
    if (!instruction || editBusy) return;
    setEditBusy(true);
    setEditNote(null);
    try {
      const res = await fetch(`/api/admin/delivery/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', instruction }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; already?: boolean };
      if (!res.ok) { setEditNote({ id: projectId, text: j.error || 'Could not queue that edit.', error: true }); return; }
      setEditNote({ id: projectId, text: j.already ? 'An edit was already on the forge; it keeps going.' : 'Edit queued. The forge applies it in the background and it lands as a draft on the Delivery board for approval.' });
      setEditOpen(null);
      setEditText('');
      await load();
    } catch {
      setEditNote({ id: projectId, text: 'Could not reach the forge. Try again.', error: true });
    } finally {
      setEditBusy(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(emailParam)}`);
      if (!res.ok) { setError(res.status === 401 ? 'Sign in to view this client.' : 'Could not load this client.'); return; }
      setData(await res.json());
      setError(null);
    } catch {
      setError('Could not load this client.');
    } finally {
      setLoading(false);
    }
  }, [emailParam]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async (id: string) => {
    const reply = replyText.trim();
    if (!reply) return;
    setSending(true);
    try {
      await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply }),
      });
      setReplyOpen(null);
      setReplyText('');
      load();
    } catch { /* ignore */ } finally { setSending(false); }
  };

  const c = data?.client;
  const displayName = c?.name || data?.email || emailParam;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="clients" title={displayName} onRefresh={load} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/admin/clients" className="text-[11px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]">← Client Book</Link>

        {loading ? (
          <p className="text-center text-[#161616]/50 py-20 font-body italic">Opening the file...</p>
        ) : error ? (
          <div className="mt-6 bg-white border-2 border-[#E0301E] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6"><p className="text-[#C4160B] text-sm font-body">{error}</p></div>
        ) : data ? (
          <div className="mt-5 space-y-6">
            {/* Identity */}
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">{displayName}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[#161616]/70 font-body text-sm">
                <span>{data.email}</span>
                {c?.company && <><span className="text-[#161616]/25">·</span><span>{c.company}</span></>}
                {c?.tier && <><span className="text-[#161616]/25">·</span><span className="uppercase font-mono text-[11px] tracking-[0.15em]">{c.tier}</span></>}
                {c?.status && <span className={`text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded-full border ${c.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-800/25' : 'bg-[#161616]/[0.06] text-[#161616]/65 border-[#161616]/15'}`}>{c.status}</span>}
              </div>
              {!c && <p className="mt-2 text-[#8f6600] font-body text-sm">No client record yet. They may be a lead or an unprovisioned buyer.</p>}
            </div>

            {/* What they own */}
            {data.products.length > 0 && (
              <div>
                <Eyebrow>What they own</Eyebrow>
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.products.map((p) => (
                    <div key={p.id} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-sans font-bold leading-tight truncate">{p.label}</h3>
                          {p.tier && p.tier !== p.label && <span className="text-[11px] font-mono text-[#161616]/55 block mt-0.5 truncate">{p.tier}</span>}
                        </div>
                        <span className={`shrink-0 text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2.5 py-1 rounded-full border ${PRODUCT_STATUS[p.status] ?? PRODUCT_STATUS.active}`}>{p.status.replace('_', ' ')}</span>
                      </div>
                      {p.detail && <p className="text-[#161616]/70 font-body text-sm mt-3 leading-snug">{p.detail}</p>}
                      <div className="flex items-center justify-between mt-3">
                        {dollars(p.amount_cents) && <span className="font-mono text-[11px] text-[#161616]/55">{dollars(p.amount_cents)}</span>}
                        {p.home_url && <Link href={p.home_url} className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616] ml-auto">Open →</Link>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What he told us.
              *
              * client_intake has existed and been written to since the first
              * brand intake and this card never read it, so everything a client
              * said about his own business was invisible on the one screen
              * built to show us that client. */}
            {data.intake?.answers ? (
              <div>
                <Eyebrow>What he told us</Eyebrow>
                <Card>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-800/25">
                      {data.intake.status ?? 'submitted'}
                    </span>
                    {data.intake.submitted_at && (
                      <span className="font-mono text-[11px] text-[#161616]/55">
                        {fmtDate(data.intake.submitted_at)}
                      </span>
                    )}
                    {/* The delivery board already has the button that does
                      * this: "Rebuild from their intake". Sending her there
                      * beats a second route that would queue the same job by a
                      * different name and drift from it. */}
                    <a
                      href="/admin/delivery"
                      className="ml-auto text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
                    >
                      Build the site from this &rarr;
                    </a>
                  </div>
                  <dl className="grid sm:grid-cols-2 gap-x-6">
                    {Object.entries(data.intake.answers)
                      .filter(([, v]) => v != null && String(v).trim() !== '')
                      .map(([k, v]) => (
                        <div key={k} className="border-b border-[#161616]/10 py-2.5">
                          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#161616]/50">{k}</dt>
                          <dd className="m-0 mt-1 font-body text-[14px] leading-snug">{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                </Card>
              </div>
            ) : null}

            {/* Build */}
            {data.projects.length > 0 && (
              <Card>
                <Eyebrow>Build</Eyebrow>
                <div className="space-y-4">
                  {data.projects.map((p) => (
                    <div key={p.id} className="border-b border-[#161616]/10 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-sans font-bold">{p.name}</h3>
                        <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2.5 py-1 rounded-full border bg-[#F5B700]/20 text-[#161616] border-[#161616]/30">{p.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[13px] font-body text-[#161616]/75">
                        <span>Progress {Number(p.progress) || 0}%</span>
                        {p.launch_target && <span>Launch {fmtDate(p.launch_target)}</span>}
                        {Number(p.revisions_used) > 0 && <span>{Number(p.revisions_used)} edit{Number(p.revisions_used) === 1 ? '' : 's'}</span>}
                        {p.care_plan && <span className="text-emerald-700 font-semibold">Care Plan ✓</span>}
                        {p.moodboard_status && <span>Moodboard: {p.moodboard_status}</span>}
                        {p.site_live_url && <a href={p.site_live_url} target="_blank" rel="noopener noreferrer" className="text-[#1E50C8] font-semibold hover:text-[#161616]">Live site ↗</a>}
                        {templateName(p.site_template) && (
                          <a href={`/admin/templates#${p.site_template}`} className="text-[#161616]/75 hover:text-[#161616]" title="The template their site wears. Opens the gallery.">◧ {templateName(p.site_template)}</a>
                        )}
                        {p.edit_status && p.edit_status !== 'ready' && p.edit_status !== 'approved' && (
                          <span className={p.edit_status === 'failed' ? 'text-[#C4160B] font-semibold' : 'text-[#8f6600] font-semibold'}>
                            Edit {p.edit_status}{p.edit_status === 'failed' && p.edit_error ? `: ${p.edit_error}` : ''}
                          </span>
                        )}
                        {p.edit_status === 'ready' && <a href="/admin/delivery" className="text-[#1E50C8] font-semibold hover:text-[#161616]">Edit ready to approve →</a>}
                      </div>
                      {p.has_site && (
                        <div className="mt-3">
                          {editOpen === p.id ? (
                            <div>
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                autoFocus
                                maxLength={4000}
                                placeholder="e.g. Swap the hero for a night shot of the shop, make the phone number bigger, and use their green on every button."
                                className="w-full text-[13px] font-body bg-white border-2 border-[#161616]/20 focus:border-[#161616] rounded-lg px-3 py-2 outline-none resize-y"
                              />
                              <div className="flex items-center justify-between gap-2 mt-2">
                                <span className="text-[11px] font-body text-[#161616]/55">Copy, colours, sections, or a new photograph. It lands as a draft for approval; their live site keeps serving.</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button onClick={() => { setEditOpen(null); setEditText(''); }} className="text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616]/55 hover:text-[#161616] px-2 py-1.5">Cancel</button>
                                  <button onClick={() => void sendEdit(p.id)} disabled={editBusy || !editText.trim()} className="text-[9px] uppercase tracking-[0.15em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] px-3 py-1.5 disabled:opacity-45 hover:-translate-y-0.5 transition-all">{editBusy ? 'Queuing…' : 'Send to the forge'}</button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditOpen(p.id); setEditText(''); setEditNote(null); }}
                              disabled={p.edit_status === 'queued' || p.edit_status === 'building'}
                              className="text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#1E50C8] hover:text-[#161616] disabled:opacity-45"
                              title={p.edit_status === 'queued' || p.edit_status === 'building' ? 'An edit is on the forge now. Send the next one when it lands.' : 'Change their site from one sentence'}
                            >
                              ✎ Edit this site →
                            </button>
                          )}
                          {editNote && editNote.id === p.id && (
                            <p className={`text-[12px] font-body mt-2 ${editNote.error ? 'text-[#C4160B]' : 'text-emerald-700'}`}>{editNote.text}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Type his address, read what will go, press send.
              *
              * Sarah, 2026-08-28: "i dont see the call sheet or email draft and
              * send or any of that in my client card for him." The call sheet
              * was on the card, as one grey pill among a dozen in "Everything
              * we made", which is the same as not being there. Anything she
              * uses BEFORE a client pays now sits above the fold with the two
              * buttons that use it. */}
            <DeliveryEmailPanel clientEmail={emailParam} onSent={() => void load()} />

            {(data.files ?? []).some((f) => /call sheet|runbook|go-?live/i.test(f.label)) && (
              <Card>
                <Eyebrow>Before you ring him</Eyebrow>
                <div className="flex flex-wrap gap-3">
                  {(data.files ?? [])
                    .filter((f) => /call sheet|runbook|go-?live/i.test(f.label))
                    .map((f) => (
                      <a
                        key={f.id}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] px-4 py-3 font-sans text-[14px] font-bold text-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform no-underline"
                      >
                        {f.label} <span aria-hidden="true">&rarr;</span>
                      </a>
                    ))}
                </div>
                <p className="mt-3 mb-0 font-body text-[13px] leading-relaxed text-[#6e7c87]">
                  Open it and print it. Every question on it has a blank to write in.
                </p>
              </Card>
            )}

            {/* Everything we made them: live sites, demos, files. Always clickable. */}
            {((data.files?.length ?? 0) > 0 || data.projects.some((p) => p.site_live_url)) && (
              <Card>
                <Eyebrow>Everything we made</Eyebrow>
                <div className="flex flex-wrap gap-2">
                  {data.projects.filter((p) => p.site_live_url).map((p) => (
                    <a
                      key={p.id}
                      href={p.site_live_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 font-sans text-[12px] font-bold text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform no-underline"
                    >
                      {p.name}: live site <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                  {(data.files ?? []).map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-1.5 font-sans text-[12px] font-bold text-[#161616] hover:-translate-y-0.5 transition-transform no-underline"
                    >
                      {f.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {/* Proposals: the documents themselves, one click away. */}
            {(data.proposals?.length ?? 0) > 0 && (
              <Card>
                <Eyebrow>Proposals</Eyebrow>
                <div className="space-y-2.5">
                  {(data.proposals ?? []).map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-body border-b border-[#161616]/10 last:border-0 pb-2.5 last:pb-0">
                      <span className="font-mono text-[12px] text-[#161616]/70">
                        {p.one_time_total ? `$${Number(p.one_time_total).toLocaleString('en-US')}` : ''}
                        {p.monthly_total ? ` + $${Number(p.monthly_total).toLocaleString('en-US')}/mo` : ''}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border text-[#161616]/70 border-[#161616]/20 bg-[#FBF6EA]">
                        {p.signed_at ? 'signed' : p.status}
                      </span>
                      {p.sent_at && <span className="text-[#161616]/50 font-mono text-[11px]">sent {fmtDate(p.sent_at)}</span>}
                      <span className="ml-auto flex items-center gap-3">
                        {p.share_token && (
                          <a href={`/proposal/${p.share_token}`} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]">
                            Open ↗
                          </a>
                        )}
                        <Link href={`/admin/proposals?email=${encodeURIComponent(data.email)}`} className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]">
                          Builder →
                        </Link>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Billing */}
            {data.billing && ((Number(data.billing.one_time_total) || 0) > 0 || (Number(data.billing.monthly_total) || 0) > 0) && (
              <Card>
                <Eyebrow>Billing</Eyebrow>
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-body">
                  {(Number(data.billing.one_time_total) || 0) > 0 && <span>Project {dollars((Number(data.billing.one_time_total) || 0) * 100)}</span>}
                  <span>Deposit: <b className={data.billing.deposit_status === 'paid' ? 'text-emerald-700' : ''}>{data.billing.deposit_status ?? 'pending'}</b></span>
                  <span>Balance: <b className={data.billing.balance_status === 'paid' ? 'text-emerald-700' : ''}>{data.billing.balance_status ?? 'pending'}</b></span>
                  {(Number(data.billing.monthly_total) || 0) > 0 && <span>Monthly {dollars((Number(data.billing.monthly_total) || 0) * 100)} <b className={data.billing.subscription_status === 'active' ? 'text-emerald-700' : ''}>({data.billing.subscription_status ?? 'none'})</b></span>}
                  {data.billing.signed_at && <span className="text-emerald-700">Signed ✓</span>}
                </div>
              </Card>
            )}

            {/* Orders */}
            {data.orders.length > 0 && (
              <Card>
                <Eyebrow>Orders</Eyebrow>
                <div className="space-y-2">
                  {data.orders.map((o) => (
                    <div key={o.stripe_session_id} className="flex items-center justify-between gap-3 text-sm font-body border-b border-[#161616]/10 last:border-0 pb-2 last:pb-0">
                      <span className="truncate">{o.product_name}</span>
                      <span className="flex items-center gap-3 shrink-0 text-[#161616]/60 font-mono text-[12px]">
                        {dollars(o.price_paid_cents) && <span className="text-[#161616]">{dollars(o.price_paid_cents)}</span>}
                        <span>{fmtDate(o.created_at)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Every email this client has been sent, with the bytes */}
            <EmailThread email={data.email} title="Their mail" />

            {/* Thread */}
            <Card>
              <Eyebrow>Messages</Eyebrow>
              {data.messages.length === 0 ? (
                <p className="text-[#161616]/50 font-body text-sm">No messages yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.messages.map((m) => (
                    <div key={m.id} className={`rounded-lg border px-4 py-3 ${m.status === 'new' ? 'bg-[#FFF8E6] border-[#F5B700]' : 'bg-[#FFFDF6] border-[#161616]/15'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {m.source === 'chatbot' && <span className="text-[8px] uppercase tracking-[0.15em] font-mono text-[#161616]/50 border border-[#161616]/20 rounded px-1.5 py-0.5">via Mr. Mustard</span>}
                        <span className="text-[#161616]/45 font-mono text-[10px]">{fmtDate(m.created_at)}</span>
                        {m.replied_at && <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-emerald-700 ml-auto">Replied ✓</span>}
                      </div>
                      <p className="text-[#3A3733] font-body text-[13px] leading-relaxed whitespace-pre-wrap">{m.body}</p>
                      {m.reply_body && (
                        <div className="mt-2 pl-3 border-l-2 border-emerald-600/40">
                          <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-emerald-700 block mb-0.5">You</span>
                          <p className="text-[#3A3733] font-body text-[13px] leading-relaxed whitespace-pre-wrap">{m.reply_body}</p>
                        </div>
                      )}
                      {!m.reply_body && (
                        replyOpen === m.id ? (
                          <div className="mt-3">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows={3}
                              autoFocus
                              placeholder="Your reply lands in their portal thread and their inbox."
                              className="w-full text-[13px] font-body bg-white border-2 border-[#161616]/20 focus:border-[#161616] rounded-lg px-3 py-2 outline-none resize-y"
                            />
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <button onClick={() => { setReplyOpen(null); setReplyText(''); }} className="text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616]/55 hover:text-[#161616] px-2 py-1.5">Cancel</button>
                              <button onClick={() => sendReply(m.id)} disabled={sending || !replyText.trim()} className="text-[9px] uppercase tracking-[0.15em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] px-3 py-1.5 disabled:opacity-45 hover:-translate-y-0.5 transition-all">{sending ? 'Sending…' : 'Send reply'}</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setReplyOpen(m.id); setReplyText(''); }} className="mt-2 text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#1E50C8] hover:text-[#161616]">Reply →</button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}
