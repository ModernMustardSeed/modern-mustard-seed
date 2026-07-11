'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { formatPhone } from '@/lib/outbound';
import type { OutboundLead, ThreadMessage } from '@/lib/outbound';
import { api, btnGhost, btnPrimary, btnSeed, inputCls, labelCls } from '@/components/admin/outbound/ui';

/**
 * Every way to reach a lead, in one strip: Mr. Mustard AI calls, the audit
 * email, the live conversation thread, plus the intel actions (run the audit,
 * find site & email, send to the pipeline). The human Dial button lives beside
 * it in the cockpit header; this deck carries everything else the old Tracker
 * could do.
 */

type Push = (text: string, tone?: 'ok' | 'error') => void;

export function scoreTone(score: number): { fg: string; bg: string } {
  if (score >= 80) return { fg: '#3f5d34', bg: 'rgba(63,93,52,0.12)' };
  if (score >= 60) return { fg: '#7a5c1a', bg: 'rgba(181,138,42,0.16)' };
  return { fg: '#a03123', bg: 'rgba(160,49,35,0.10)' };
}

const chip =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-oswald font-semibold uppercase tracking-[0.08em] text-xs transition-all disabled:opacity-40 disabled:pointer-events-none';

export function ReachOutDeck({
  lead,
  onLead,
  push,
  onOpenThread,
  auditing,
  onRunAudit,
}: {
  lead: OutboundLead;
  onLead: (l: OutboundLead) => void;
  push: Push;
  onOpenThread: () => void;
  auditing: boolean;
  onRunAudit: () => void;
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [alsoEmail, setAlsoEmail] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [note, setNote] = useState('');
  const [enriching, setEnriching] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [forging, setForging] = useState(false);
  const [forgingSite, setForgingSite] = useState(false);
  const [sendingDemo, setSendingDemo] = useState(false);

  const siteForging = lead.site_demo_status === 'queued' || lead.site_demo_status === 'building';
  const siteReady = lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url);

  const forgeDemo = async () => {
    setForging(true);
    push('Forging their AI receptionist...');
    try {
      const res = await api<{ demo_url: string; lead?: OutboundLead }>(`/api/admin/outbound/leads/${lead.id}/forge-demo`, { method: 'POST' });
      if (res.lead) onLead(res.lead);
      push('Demo forged. It answers as their business now.');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Forge failed.', 'error');
    } finally {
      setForging(false);
    }
  };

  const forgeSite = async () => {
    setForgingSite(true);
    push('Queuing their demo website at the forge...');
    try {
      const res = await api<{ lead?: OutboundLead }>(`/api/admin/outbound/leads/${lead.id}/forge-site`, { method: 'POST' });
      if (res.lead) onLead(res.lead);
      push('Website queued. The forge builds it in the background; the chip flips to live when it is done.');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Website forge failed.', 'error');
    } finally {
      setForgingSite(false);
    }
  };

  // While the forge works, watch for the flip to ready (the build runs on the
  // worker machine, minutes not seconds).
  const siteStatusRef = useRef(lead.site_demo_status);
  siteStatusRef.current = lead.site_demo_status;
  useEffect(() => {
    if (!siteForging) return;
    const t = window.setInterval(async () => {
      try {
        const res = await api<{ lead: OutboundLead }>(`/api/admin/outbound/leads/${lead.id}`);
        if (res.lead.site_demo_status !== siteStatusRef.current) {
          onLead(res.lead);
          if (res.lead.site_demo_status === 'ready') push('Their new website is live. Send it while the call is still warm.');
          if (res.lead.site_demo_status === 'failed') push('The website forge hit a snag. Retry from the deck.', 'error');
        }
      } catch {
        /* transient; next tick retries */
      }
    }, 20000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, siteForging]);

  const sendDemo = async () => {
    setSendingDemo(true);
    try {
      const res = await api<{ lead: OutboundLead }>(`/api/admin/outbound/leads/${lead.id}/follow-up`, {
        method: 'POST',
        body: JSON.stringify({ includeDemo: Boolean(lead.demo_url), includeSite: siteReady }),
      });
      onLead(res.lead);
      push(
        siteReady && lead.demo_url
          ? 'Both demos sent: the website and the receptionist. The pixel will tell you when they open it.'
          : 'Demo link sent. The pixel will tell you when they open it.',
      );
    } catch (e) {
      push(e instanceof Error ? e.message : 'Send failed.', 'error');
    } finally {
      setSendingDemo(false);
    }
  };

  const enrich = async () => {
    setEnriching(true);
    push('Hunting for their site and email...');
    try {
      const res = await api<{ lead: OutboundLead; found: { website: string | null; email: string | null } }>(
        `/api/admin/outbound/leads/${lead.id}/enrich`,
        { method: 'POST' },
      );
      onLead(res.lead);
      const got = [res.found.website && 'site', res.found.email && 'email'].filter(Boolean).join(' + ');
      push(got ? `Found their ${got}.` : 'Nothing new found. They may be offline-only.', got ? 'ok' : 'error');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Lookup failed.', 'error');
    } finally {
      setEnriching(false);
    }
  };

  const promote = async () => {
    setPromoting(true);
    try {
      const res = await api<{ lead?: OutboundLead; created: boolean }>(`/api/admin/outbound/leads/${lead.id}/promote`, { method: 'POST' });
      if (res.lead) onLead(res.lead);
      push(res.created ? 'Added to the pipeline.' : 'Pipeline lead updated.');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not promote.', 'error');
    } finally {
      setPromoting(false);
    }
  };

  const aiCall = async () => {
    setAiBusy(true);
    try {
      const res = await api<{ ok: boolean; skipped?: string; error?: string; to?: string }>(`/api/admin/outbound/leads/${lead.id}/ai-call`, {
        method: 'POST',
      });
      if (res.ok) {
        push(`Mr. Mustard is dialing ${res.to ?? formatPhone(lead.phone)}. Transcript lands in the thread.`);
        if (lead.status === 'new') onLead({ ...lead, status: 'contacted' });
        if (alsoEmail && lead.email) {
          await api(`/api/admin/outbound/leads/${lead.id}/follow-up`, { method: 'POST', body: JSON.stringify({}) });
          push('Audit email is on its way too.');
        }
        setAiOpen(false);
      } else {
        push(res.error ?? 'Call skipped.', 'error');
      }
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not place the call.', 'error');
    } finally {
      setAiBusy(false);
    }
  };

  const sendEmail = async () => {
    setEmailBusy(true);
    try {
      const res = await api<{ lead: OutboundLead }>(`/api/admin/outbound/leads/${lead.id}/follow-up`, {
        method: 'POST',
        body: JSON.stringify({ note: note || undefined }),
      });
      onLead(res.lead);
      push(lead.audit_json ? 'Audit report sent. The pixel will tell you when they open it.' : 'Intro email sent.');
      setEmailOpen(false);
      setNote('');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Send failed.', 'error');
    } finally {
      setEmailBusy(false);
    }
  };

  const opened = lead.email_open_count > 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t-2 border-[#1a1815]/[0.08]">
        <span className="text-[10px] uppercase tracking-[0.2em] font-oswald font-medium text-[#1a1815]/50 mr-1">Reach out</span>

        <button
          onClick={() => setAiOpen(true)}
          disabled={aiBusy}
          className={`${chip} bg-[#1a1815] text-[#b58a2a] border-[#1a1815] hover:-translate-y-0.5 shadow-[3px_3px_0_0_#b58a2a]`}
          title={lead.dnc_checked ? 'Mr. Mustard makes the cold call for you' : 'Scrub against the DNC registry first (toggle DNC ok)'}
        >
          🤖 Mr. Mustard calls
        </button>

        <button
          onClick={() => setEmailOpen(true)}
          disabled={!lead.email || emailBusy}
          className={`${chip} bg-[#b58a2a]/15 text-[#7a5c1a] border-[#b58a2a]/60 hover:border-[#b58a2a] hover:-translate-y-0.5`}
          title={lead.email ? (lead.audit_json ? 'Email them the full audit report' : 'Send a warm intro email') : 'No email on file yet'}
        >
          ✉ {lead.audit_json ? 'Email the audit' : 'Email intro'}
        </button>

        <button onClick={onOpenThread} className={`${chip} bg-white text-[#1a1815]/75 border-[#1a1815]/30 hover:border-[#1a1815] hover:-translate-y-0.5`}>
          💬 Thread
        </button>

        <span className="w-px h-6 bg-[#1a1815]/15 mx-1 hidden sm:block" />

        {lead.audit_score == null ? (
          <button onClick={onRunAudit} disabled={auditing || !lead.website} className={`${chip} bg-white text-[#1a1815]/75 border-[#1a1815]/30 hover:border-[#1a1815]`} title={lead.website ? 'Run the real website audit' : 'Needs a website first'}>
            {auditing ? 'Auditing…' : '⌖ Run audit'}
          </button>
        ) : (
          <button
            onClick={onRunAudit}
            disabled={auditing}
            className={chip}
            style={{ background: scoreTone(lead.audit_score).bg, color: scoreTone(lead.audit_score).fg, borderColor: scoreTone(lead.audit_score).fg }}
            title="Re-run the audit"
          >
            {auditing ? 'Auditing…' : `Audit ${lead.audit_score}/100`}
          </button>
        )}

        {(!lead.website || !lead.email) && (
          <button onClick={() => void enrich()} disabled={enriching} className={`${chip} bg-white text-[#1a1815]/75 border-[#1a1815]/30 hover:border-[#1a1815]`}>
            {enriching ? 'Searching…' : '🔎 Find site & email'}
          </button>
        )}

        {opened && (
          <span className={`${chip} bg-[#3f5d34]/12 text-[#3f5d34] border-[#3f5d34]/50 cursor-default`} title={lead.email_opened_at ? `First opened ${new Date(lead.email_opened_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' })} MT` : undefined}>
            ✓ Opened {lead.email_open_count}x
          </span>
        )}

        {lead.demo_url ? (
          <a href={lead.demo_url} target="_blank" rel="noopener noreferrer" className={`${chip} bg-[#3f5d34] text-[#f7f3e9] border-[#1a1815] hover:-translate-y-0.5 shadow-[3px_3px_0_0_#1a1815]`} title="Their forged receptionist, live">
            ▶ Demo live ↗
          </a>
        ) : (
          <button onClick={() => void forgeDemo()} disabled={forging} className={`${chip} bg-white text-[#1a1815]/75 border-[#1a1815]/30 hover:border-[#1a1815]`} title="Build their branded AI receptionist demo in seconds">
            {forging ? 'Forging…' : '⚒ Forge demo'}
          </button>
        )}

        {siteReady ? (
          <a href={lead.site_demo_url!} target="_blank" rel="noopener noreferrer" className={`${chip} bg-[#b58a2a] text-[#1a1815] border-[#1a1815] hover:-translate-y-0.5 shadow-[3px_3px_0_0_#1a1815]`} title="Their forged demo website, receptionist on board">
            🌐 Website live ↗
          </a>
        ) : siteForging ? (
          <span className={`${chip} bg-[#b58a2a]/15 text-[#7a5c1a] border-[#b58a2a]/60 cursor-default animate-pulse`} title="The forge is building it in the background. This flips to live on its own.">
            🌐 Website forging…
          </span>
        ) : (
          <button
            onClick={() => void forgeSite()}
            disabled={forgingSite}
            className={`${chip} bg-white text-[#1a1815]/75 border-[#1a1815]/30 hover:border-[#1a1815]`}
            title={lead.site_demo_status === 'failed' ? 'Last build failed. Forge it again.' : 'Build them a full demo website with their AI receptionist living on it (runs in the background)'}
          >
            {forgingSite ? 'Queuing…' : lead.site_demo_status === 'failed' ? '🌐 Retry website' : '🌐 Forge website'}
          </button>
        )}

        {(lead.demo_url || siteReady) && (
          <button onClick={() => void sendDemo()} disabled={sendingDemo || !lead.email} className={`${chip} bg-white text-[#3f5d34] border-[#3f5d34]/60 hover:border-[#3f5d34]`} title={lead.email ? (siteReady && lead.demo_url ? 'Email them the website and the receptionist in one send' : 'Email them their demo link') : 'No email on file yet'}>
            {sendingDemo ? 'Sending…' : siteReady && lead.demo_url ? '✉ Send both demos' : '✉ Send demo'}
          </button>
        )}

        {lead.pipeline_lead_id ? (
          <a href="/admin/leads" className={`${chip} bg-transparent text-[#1a1815]/50 border-[#1a1815]/20 hover:text-[#1a1815]`}>In pipeline ↗</a>
        ) : (
          <button onClick={() => void promote()} disabled={promoting} className={`${chip} bg-transparent text-[#1a1815]/50 border-[#1a1815]/20 hover:border-[#1a1815] hover:text-[#1a1815]`}>
            {promoting ? 'Sending…' : 'Send to pipeline'}
          </button>
        )}
      </div>

      {/* Mr. Mustard confirm */}
      <Modal open={aiOpen} onClose={() => setAiOpen(false)} eyebrow="AI wingman" title="Mr. Mustard makes the call" subtitle={`${lead.business_name} · ${formatPhone(lead.phone)}`} size="sm" headerTone="dark">
        <p className="font-sans text-sm text-[#1a1815]/75 leading-relaxed">
          He dials now, discloses the recording, opens with {lead.audit_score != null ? `the real audit findings (${lead.audit_score}/100)` : 'the missed-calls hook'}, and pushes for the demo. The full transcript lands in this lead&apos;s thread when the call ends. Calls only go out 8am to 8pm their time.
        </p>
        {!lead.dnc_checked && (
          <p className="font-sans text-sm text-[#a03123] font-medium mt-3">Blocked: this number is not marked DNC-scrubbed yet. Toggle &ldquo;DNC ok&rdquo; on the lead first.</p>
        )}
        {lead.email && (
          <label className="flex items-center gap-2 font-sans text-sm text-[#1a1815]/75 cursor-pointer mt-3">
            <input type="checkbox" checked={alsoEmail} onChange={(e) => setAlsoEmail(e.target.checked)} className="accent-[#3f5d34] w-4 h-4" />
            Email the {lead.audit_json ? 'audit' : 'intro'} at the same time
          </label>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setAiOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={() => void aiCall()} disabled={aiBusy || !lead.dnc_checked} className={btnPrimary}>
            {aiBusy ? 'Dialing…' : 'Place the call'}
          </button>
        </div>
      </Modal>

      {/* Email confirm */}
      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} eyebrow="Reach out" title={lead.audit_json ? 'Email the audit report' : 'Send the intro email'} subtitle={`To ${lead.email ?? ''}, from sarah@modernmustardseed.com`} size="sm">
        <p className="font-sans text-sm text-[#1a1815]/70 leading-relaxed">
          {lead.audit_json
            ? `The full branded report for ${lead.business_name} (score ${lead.audit_score}/100), with your note on top so it reads one-to-one.`
            : 'A warm intro: the missed-calls problem, the free 30 days, and a demo link.'}
        </p>
        <div className="mt-3">
          <label className={labelCls}>Personal note (optional)</label>
          <textarea className={`${inputCls} min-h-[80px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Great talking just now. Here is the breakdown I mentioned." />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setEmailOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={() => void sendEmail()} disabled={emailBusy} className={btnSeed}>{emailBusy ? 'Sending…' : 'Send it'}</button>
        </div>
      </Modal>
    </>
  );
}

/* ------------------------------ audit intel ------------------------------- */

export function AuditIntelCard({ lead, onRun, auditing }: { lead: OutboundLead; onRun: () => void; auditing: boolean }) {
  const audit = lead.audit_json;
  if (!audit || lead.audit_score == null) {
    return (
      <div className="bg-[#fffdf8] border-2 border-dashed border-[#b58a2a]/60 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#b58a2a]">Audit intel</span>
          <p className="font-sans text-[13px] text-[#1a1815]/60 mt-0.5">
            {lead.website ? 'Run the audit and open the call with their real numbers.' : 'No website on file. Find it first, then audit it.'}
          </p>
        </div>
        {lead.website && (
          <button onClick={onRun} disabled={auditing} className={`${btnPrimary} !px-3.5 !py-2 !text-xs shrink-0`}>
            {auditing ? 'Auditing…' : 'Run audit'}
          </button>
        )}
      </div>
    );
  }

  let domain = lead.website || '';
  try {
    if (domain) domain = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw */
  }
  const tone = scoreTone(lead.audit_score);
  const topFix = audit.top_three_fixes?.[0];

  return (
    <div className="bg-[#fffdf8] border-2 border-[#1a1815] rounded-2xl shadow-[5px_5px_0_0_#1a1815] p-5 relative">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-6 h-6 rounded-full bg-[#b58a2a] text-[#1a1815] font-oswald font-bold text-xs flex items-center justify-center">★</span>
        <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#1a1815]/60">Audit intel · your ammo</span>
      </div>
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-[74px] h-[74px] rounded-2xl border-2 flex flex-col items-center justify-center" style={{ background: tone.bg, borderColor: tone.fg }}>
          <span className="font-oswald font-bold text-3xl leading-none" style={{ color: tone.fg }}>{lead.audit_score}</span>
          <span className="font-oswald text-[10px] uppercase tracking-[0.1em]" style={{ color: tone.fg }}>{audit.letter_grade || '/100'}</span>
        </div>
        <div className="min-w-0">
          <p className="font-sans text-[15px] leading-relaxed text-[#1a1815]">
            &ldquo;I actually took a look at your website{domain ? <>, <strong>{domain}</strong>,</> : null} and ran it through a quick audit. It came back at{' '}
            <mark className="rounded px-1 py-0.5 font-semibold bg-[#b58a2a]/25">{lead.audit_score} out of 100</mark>.
            {audit.headline ? ` The short version: ${audit.headline}` : ''}&rdquo;
          </p>
          {topFix && (
            <p className="font-sans text-[13px] text-[#1a1815]/65 mt-2">
              <span className="font-oswald uppercase tracking-[0.1em] text-[11px] text-[#b58a2a] font-semibold mr-1.5">Then:</span>
              &ldquo;The biggest thing I saw: {topFix.title}. {topFix.why}&rdquo;
            </p>
          )}
          <p className="font-sans text-[12px] text-[#1a1815]/45 mt-2 italic">Close the loop: &ldquo;Want the full breakdown? What&apos;s the best email for it?&rdquo;</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- review ammo ------------------------------- */

/**
 * Mined leads carry their qualifying evidence in notes: review-mined ones as
 * `REVIEWS: "quote" (source url)`, website-mined ones as
 * `WEBSITE: none|broken — what we observed (url)`. Surface either as opener
 * ammo at the top of the script rail.
 */
export function ReviewAmmoCard({ lead }: { lead: OutboundLead }) {
  const site = lead.notes?.match(/^WEBSITE:\s*(none|broken)\s*[—-]\s*(.+)/s);
  if (site) {
    const mode = site[1] as 'none' | 'broken';
    const body = site[2].trim();
    const url = body.match(/\((https?:\/\/[^)]+)\)\s*$/)?.[1];
    const evidence = body.replace(/\((https?:\/\/[^)]+)\)\s*$/, '').trim();
    return (
      <div className="bg-[#fffdf8] border-2 border-[#b58a2a] rounded-2xl shadow-[5px_5px_0_0_#b58a2a] p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-6 rounded-full bg-[#b58a2a] text-[#1a1815] font-oswald font-bold text-xs flex items-center justify-center">◎</span>
          <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#7a5c1a]">
            {mode === 'none' ? 'They have no website' : 'Their website is broken'}
          </span>
        </div>
        <p className="font-sans text-[15px] leading-relaxed text-[#1a1815]">{evidence}</p>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-oswald uppercase tracking-[0.12em] text-[#b58a2a] hover:text-[#1a1815] transition-colors">
            See their current presence ↗
          </a>
        )}
        <p className="font-sans text-[13px] text-[#1a1815]/65 mt-3">
          <span className="font-oswald uppercase tracking-[0.1em] text-[11px] text-[#7a5c1a] font-semibold mr-1.5">Read it back:</span>
          &ldquo;I went looking for your website before I called and {mode === 'none' ? "couldn't find one, just the Facebook page" : 'what came up is not doing you any favors'}. Every customer who Googles you hits the same wall. I build sites for businesses like yours, and I can have a draft of YOURS to show you by the end of the week.&rdquo;
        </p>
      </div>
    );
  }

  const m = lead.notes?.match(/^REVIEWS:\s*(.+)/s);
  if (!m) return null;
  const body = m[1].trim();
  const quote = body.match(/"([^"]{10,300})"/)?.[1];
  const source = body.match(/\(([^)]+)\)/)?.[1];
  if (!quote) return null;
  return (
    <div className="bg-[#fffdf8] border-2 border-[#a03123] rounded-2xl shadow-[5px_5px_0_0_#a03123] p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-[#a03123] text-[#f7f3e9] font-oswald font-bold text-xs flex items-center justify-center">!</span>
        <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#a03123]">Their customers said it first</span>
      </div>
      <blockquote className="font-sans text-[15px] leading-relaxed text-[#1a1815] italic">&ldquo;{quote}&rdquo;</blockquote>
      {source && <cite className="not-italic block text-[10px] font-oswald uppercase tracking-[0.14em] text-[#1a1815]/40 mt-1">{source}</cite>}
      <p className="font-sans text-[13px] text-[#1a1815]/65 mt-3">
        <span className="font-oswald uppercase tracking-[0.1em] text-[11px] text-[#a03123] font-semibold mr-1.5">Read it back:</span>
        &ldquo;I was reading your reviews before I called, and one said <mark className="rounded px-1 py-0.5 bg-[#a03123]/10 text-[#1a1815] font-medium not-italic">{quote.length > 90 ? `${quote.slice(0, 90)}…` : quote}</mark>. That&apos;s the exact call I catch.&rdquo;
      </p>
    </div>
  );
}

/* -------------------------------- thread ---------------------------------- */

const CHANNEL_ICON: Record<string, string> = { email: '✉', call: '☎', open: '👁', booking: '📅', note: '✎' };

export function ThreadPanel({
  lead,
  open,
  onClose,
  push,
}: {
  lead: OutboundLead;
  open: boolean;
  onClose: () => void;
  push: Push;
}) {
  const [messages, setMessages] = useState<ThreadMessage[] | null>(null);
  const [reply, setReply] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ messages: ThreadMessage[] }>(`/api/admin/outbound/leads/${lead.id}/messages`);
      setMessages(res.messages);
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not load the thread.', 'error');
      setMessages([]);
    }
  }, [lead.id, push]);

  useEffect(() => {
    if (open) {
      setMessages(null);
      void load();
    }
  }, [open, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const draft = async () => {
    setDrafting(true);
    try {
      const res = await api<{ draft: string }>(`/api/admin/outbound/leads/${lead.id}/draft-reply`, { method: 'POST' });
      setReply(res.draft);
    } catch (e) {
      push(e instanceof Error ? e.message : 'Draft failed.', 'error');
    } finally {
      setDrafting(false);
    }
  };

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await api<{ message: ThreadMessage }>(`/api/admin/outbound/leads/${lead.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ body: reply.trim() }),
      });
      setMessages((m) => [...(m ?? []), res.message]);
      setReply('');
      push('Reply sent.');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Send failed.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Correspondence" title={lead.business_name} subtitle="Every email, AI call transcript, and reply in one thread." size="xl">
      <div className="space-y-3 min-h-[120px]">
        {messages === null && <p className="font-oswald uppercase text-sm text-[#1a1815]/40 text-center py-6">Loading the thread...</p>}
        {messages?.length === 0 && (
          <p className="font-sans text-sm text-[#1a1815]/55 text-center py-6">
            Nothing yet. Send the audit email or let Mr. Mustard call, and it all lands here.
          </p>
        )}
        {(messages ?? []).map((m) => (
          <div key={m.id} className={`max-w-[92%] ${m.direction === 'outbound' ? 'ml-auto' : ''}`}>
            <div
              className={`rounded-xl border-2 px-3.5 py-2.5 ${
                m.direction === 'outbound' ? 'bg-[#b58a2a]/10 border-[#b58a2a]/50' : 'bg-white border-[#1a1815]/25'
              }`}
            >
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] font-oswald font-semibold text-[#1a1815]/45">
                <span>{CHANNEL_ICON[m.channel] ?? '•'} {m.channel === 'call' ? 'AI call' : m.channel}</span>
                <span>{m.direction === 'outbound' ? '→ them' : '← them'}</span>
                <span className="ml-auto normal-case tracking-normal font-sans">
                  {new Date(m.occurred_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' })} MT
                </span>
              </div>
              {m.subject && <p className="font-sans font-semibold text-[13px] text-[#1a1815] mt-1">{m.subject}</p>}
              {m.body && m.body.length > 260 ? (
                <details className="mt-0.5">
                  <summary className="font-sans text-[13px] text-[#1a1815]/75 cursor-pointer">{(m.snippet || m.body).slice(0, 200)}…</summary>
                  <pre className="font-sans text-[13px] text-[#1a1815]/75 whitespace-pre-wrap mt-1.5">{m.body}</pre>
                </details>
              ) : (
                <p className="font-sans text-[13px] text-[#1a1815]/75 mt-0.5 whitespace-pre-wrap">{m.body || m.snippet}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 pt-4 border-t-2 border-[#1a1815]/10">
        <label className={labelCls}>Reply as Sarah</label>
        <textarea
          className={`${inputCls} min-h-[90px]`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={lead.email ? 'Type the reply, or let the AI draft it from their last message.' : 'No email on file for this lead yet.'}
          disabled={!lead.email}
        />
        <div className="flex items-center justify-end gap-2 mt-2.5">
          <button onClick={() => void draft()} disabled={drafting || !lead.email} className={btnGhost}>
            {drafting ? 'Drafting…' : '✨ AI draft'}
          </button>
          <button onClick={() => void send()} disabled={sending || !reply.trim() || !lead.email} className={btnPrimary}>
            {sending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
