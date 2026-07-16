'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { formatPhone } from '@/lib/outbound';
import type { EmailPreview, MessageDelivery, OutboundAudit, OutboundLead, ThreadMessage } from '@/lib/outbound';
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

/** Humanize an audit category key ("seo_geo" -> "SEO GEO", "mobile_ux" -> "Mobile UX"). */
const AUDIT_ACRONYMS = new Set(['seo', 'geo', 'ai', 'ux', 'ui', 'cta', 'url', 'faq', 'llm']);
function prettyCategory(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => (AUDIT_ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Priority badge colors for the full punch list. */
function priorityTone(priority: string): { fg: string; bg: string; label: string } {
  const p = priority.toLowerCase();
  if (/high|critical|urgent|p0|p1/.test(p)) return { fg: '#a03123', bg: 'rgba(160,49,35,0.10)', label: priority };
  if (/med|p2/.test(p)) return { fg: '#7a5c1a', bg: 'rgba(181,138,42,0.16)', label: priority };
  return { fg: '#3f5d34', bg: 'rgba(63,93,52,0.12)', label: priority };
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
  // Nothing leaves without Sarah seeing it: both the outreach email and the demo
  // send open the same composer, which previews the real html before it ships.
  const [composer, setComposer] = useState<'outreach' | 'demos' | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [forging, setForging] = useState(false);
  const [forgingSite, setForgingSite] = useState(false);
  const [forgingOs, setForgingOs] = useState(false);
  const [reforgeOpen, setReforgeOpen] = useState(false);

  const siteForging = lead.site_demo_status === 'queued' || lead.site_demo_status === 'building';
  const siteReady = lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url);
  const osReady = lead.os_demo_status === 'ready' && Boolean(lead.os_demo_url);
  const demoCount = [Boolean(lead.demo_url), siteReady, osReady].filter(Boolean).length;

  const forgeOs = async () => {
    setForgingOs(true);
    try {
      const res = await api<{ lead?: OutboundLead }>(`/api/admin/outbound/leads/${lead.id}/forge-os`, { method: 'POST' });
      if (res.lead) onLead(res.lead);
      push('Business OS forged. Their whole back office, one link.');
    } catch (e) {
      push(e instanceof Error ? e.message : 'OS forge failed.', 'error');
    } finally {
      setForgingOs(false);
    }
  };

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
          onClick={() => setComposer('outreach')}
          disabled={!lead.email}
          className={`${chip} bg-[#b58a2a]/15 text-[#7a5c1a] border-[#b58a2a]/60 hover:border-[#b58a2a] hover:-translate-y-0.5`}
          title={lead.email ? `Read it before it goes, then send to ${lead.email}` : 'No email on file yet'}
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

        {osReady ? (
          <a href={lead.os_demo_url!} target="_blank" rel="noopener noreferrer" className={`${chip} bg-[#1a1815] text-[#f7f3e9] border-[#1a1815] hover:-translate-y-0.5 shadow-[3px_3px_0_0_#b58a2a]`} title="Their forged business command center: CRM, reviews, ads, automations, AI assistant">
            ⚙ OS live ↗
          </a>
        ) : (
          <button onClick={() => void forgeOs()} disabled={forgingOs} className={`${chip} bg-white text-[#1a1815]/75 border-[#1a1815]/30 hover:border-[#1a1815]`} title={`For the "I can't manage the volume" lead: forge their business command center instantly (CRM, reviews, ads, automations, AI assistant)`}>
            {forgingOs ? 'Forging…' : '⚙ Forge business OS'}
          </button>
        )}

        {demoCount > 0 && (
          <button
            onClick={() => setReforgeOpen(true)}
            className={`${chip} bg-[#1a1815]/[0.04] text-[#1a1815]/75 border-[#1a1815]/30 hover:border-[#1a1815] hover:-translate-y-0.5`}
            title="Change any demo from a prompt: edit the website, remap the command center, or rewrite the receptionist"
          >
            ✎ Reforge from a prompt
          </button>
        )}

        {demoCount > 0 && (
          <button
            onClick={() => setComposer('demos')}
            disabled={!lead.email}
            className={`${chip} bg-white text-[#3f5d34] border-[#3f5d34]/60 hover:border-[#3f5d34]`}
            title={lead.email ? `Read it before it goes, then send to ${lead.email}` : 'No email on file yet'}
          >
            {demoCount > 1 ? `✉ Send all ${demoCount} demos` : '✉ Send demo'}
          </button>
        )}

        {lead.hub_demo_url && (
          <a href={lead.hub_demo_url} target="_blank" rel="noopener noreferrer" className={`${chip} bg-[#f7f3e9] text-[#7a5c1a] border-[#b58a2a]/60 hover:border-[#b58a2a] hover:-translate-y-0.5`} title="Their Demo Suite hub: all demos + Mr. Mustard video + the Recovery Calculator. This is the link the email leads with.">
            ▦ Suite ↗
          </a>
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

      <EmailComposer
        lead={lead}
        mode={composer}
        onClose={() => setComposer(null)}
        onLead={onLead}
        push={push}
        onSent={onOpenThread}
      />

      <ReforgeModal lead={lead} open={reforgeOpen} onClose={() => setReforgeOpen(false)} onLead={onLead} push={push} />
    </>
  );
}

/* ------------------------------- reforge ---------------------------------- */

type ReforgeTarget = 'site' | 'os' | 'voice';

/**
 * REFORGE FROM A PROMPT. One box, one sentence, any of the lead's three demos
 * rebuilt with that change: edit the website (preserves everything, changes only
 * what you asked), remap the command center's config, or rewrite the receptionist's
 * script. The website edit runs on the forge in the background; the chip flips back
 * to live on its own, same as a fresh build.
 */
const REFORGE_TARGETS: { key: ReforgeTarget; label: string; hint: string }[] = [
  { key: 'site', label: 'Website', hint: 'Edit their demo website. Preserves the design, changes only what you ask.' },
  { key: 'os', label: 'Command center', hint: 'Remap the business OS demo: trade, owner, city, phone, the pain quote.' },
  { key: 'voice', label: 'Receptionist', hint: 'Rewrite the AI receptionist with your instruction folded into its script.' },
];

const PLACEHOLDERS: Record<ReforgeTarget, string> = {
  site: 'e.g. Make the hero photo a night shot, add a booking button under it, and use their green throughout.',
  os: 'e.g. The owner is Jake, they are a plumber in Nashville, and the phone is (615) 555-0199.',
  voice: 'e.g. Open by mentioning they are family-owned since 1998, and always offer a free estimate.',
};

function ReforgeModal({
  lead, open, onClose, onLead, push,
}: { lead: OutboundLead; open: boolean; onClose: () => void; onLead: (l: OutboundLead) => void; push: Push }) {
  const siteReady = lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url);
  const siteBusy = lead.site_demo_status === 'queued' || lead.site_demo_status === 'building';
  const osReady = lead.os_demo_status === 'ready' && Boolean(lead.os_demo_url);
  const voiceReady = Boolean(lead.demo_url);

  const available: Record<ReforgeTarget, boolean> = { site: siteReady, os: osReady, voice: voiceReady };
  const firstAvailable = (['site', 'voice', 'os'] as ReforgeTarget[]).find((t) => available[t]) ?? 'voice';

  const [target, setTarget] = useState<ReforgeTarget>(firstAvailable);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset to a sensible target each time it opens; the lead may have changed.
  useEffect(() => {
    if (open) {
      setTarget(firstAvailable);
      setText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const instruction = text.trim();
    if (!instruction || busy) return;
    setBusy(true);
    try {
      const res = await api<{ lead?: OutboundLead; already?: boolean }>(`/api/admin/outbound/leads/${lead.id}/reforge`, {
        method: 'POST',
        body: JSON.stringify({ target, instruction }),
      });
      if (res.lead) onLead(res.lead);
      push(
        target === 'site'
          ? 'Website reforge queued. The forge applies your change in the background; the chip flips to live when it lands.'
          : target === 'voice'
            ? 'Receptionist reforged. It answers with your change now.'
            : 'Command center remapped from your prompt.',
      );
      onClose();
    } catch (e) {
      push(e instanceof Error ? e.message : 'Reforge failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const meta = REFORGE_TARGETS.find((t) => t.key === target)!;
  const disabledTarget = !available[target];

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Reforge from a prompt"
      title="Change a demo in one sentence"
      subtitle={lead.business_name}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={() => void submit()} disabled={busy || !text.trim() || disabledTarget} className={btnSeed}>
            {busy ? 'Reforging…' : 'Reforge it'}
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2">
        {REFORGE_TARGETS.map((t) => {
          const on = target === t.key;
          const canUse = available[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTarget(t.key)}
              className={`px-3.5 py-2 rounded-xl border-2 font-oswald font-semibold uppercase tracking-[0.08em] text-xs transition-all ${
                on ? 'bg-[#1a1815] text-[#f7f3e9] border-[#1a1815]' : 'bg-white text-[#1a1815]/70 border-[#1a1815]/30 hover:border-[#1a1815]'
              }`}
              title={canUse ? t.hint : 'This demo has not been forged yet.'}
            >
              {t.label}{!canUse && ' ·'}
            </button>
          );
        })}
      </div>

      <p className="font-sans text-[13px] text-[#1a1815]/60 mt-3">{meta.hint}</p>

      {target === 'site' && siteBusy && (
        <p className="font-sans text-sm text-[#7a5c1a] font-medium mt-2">Their website is building right now. Wait for it to go live, then reforge.</p>
      )}
      {disabledTarget && !siteBusy && (
        <p className="font-sans text-sm text-[#a03123] font-medium mt-2">
          {target === 'os' ? 'No command center demo yet. Forge one first.' : target === 'site' ? 'No website demo yet. Forge one first.' : 'No receptionist demo yet. Forge one first.'}
        </p>
      )}

      <div className="mt-4">
        <label className={labelCls}>What should change?</label>
        <textarea
          className={`${inputCls} min-h-[110px]`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDERS[target]}
          disabled={disabledTarget}
        />
      </div>
      <p className="font-sans text-[12px] text-[#1a1815]/45 mt-2">
        {target === 'site'
          ? 'The forge edits their existing site. Everything you do not mention stays exactly as it is.'
          : target === 'voice'
            ? 'This rebuilds the receptionist. The demo link stays the same.'
            : 'Instant. The command center re-renders with the new details.'}
      </p>
    </Modal>
  );
}

/* ------------------------------ email composer ----------------------------- */

/**
 * The send desk. Nothing goes out unseen: it renders the EXACT html the send
 * path will hand Resend (same builder, tracking pixel stripped so previewing
 * cannot fake an open), names the recipient in full, and only then offers Send.
 * On success it reports the address it actually went to and the Resend message
 * id, which is the receipt you can look up later in the thread.
 */
function EmailComposer({
  lead,
  mode,
  onClose,
  onLead,
  push,
  onSent,
}: {
  lead: OutboundLead;
  mode: 'outreach' | 'demos' | null;
  onClose: () => void;
  onLead: (l: OutboundLead) => void;
  push: Push;
  onSent: () => void;
}) {
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const siteReady = lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url);
  const osReady = lead.os_demo_status === 'ready' && Boolean(lead.os_demo_url);
  const opts =
    mode === 'demos'
      ? { includeDemo: Boolean(lead.demo_url), includeSite: siteReady, includeOs: osReady }
      : {};

  // Reset per open so a previous lead's draft can never be sent to this one.
  useEffect(() => {
    if (!mode) {
      setNote('');
      setPreview(null);
      setError(null);
    }
  }, [mode]);

  // Re-render the preview as the note is typed (debounced): the note is part of
  // the email body, so a preview that ignored it would be a lie.
  useEffect(() => {
    if (!mode) return;
    let alive = true;
    const t = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api<EmailPreview>(`/api/admin/outbound/leads/${lead.id}/preview-email`, {
          method: 'POST',
          body: JSON.stringify({ ...opts, note: note.trim() || undefined }),
        });
        if (alive) setPreview(res);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not build the preview.');
      } finally {
        if (alive) setLoading(false);
      }
    }, preview ? 500 : 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, note, lead.id]);

  const send = async () => {
    setSending(true);
    try {
      const res = await api<{ lead: OutboundLead; to: string; messageId: string }>(
        `/api/admin/outbound/leads/${lead.id}/follow-up`,
        { method: 'POST', body: JSON.stringify({ ...opts, note: note.trim() || undefined }) },
      );
      onLead(res.lead);
      push(`Sent to ${res.to}. Open the thread to watch it land.`);
      onClose();
      onSent();
    } catch (e) {
      push(e instanceof Error ? e.message : 'Send failed.', 'error');
    } finally {
      setSending(false);
    }
  };

  const demoCount = [Boolean(lead.demo_url), siteReady, osReady].filter(Boolean).length;
  const title =
    mode === 'demos'
      ? demoCount > 1
        ? `Send all ${demoCount} demos`
        : 'Send their demo'
      : lead.audit_json
        ? 'Email the audit report'
        : 'Send the intro email';

  return (
    <Modal
      open={mode !== null}
      onClose={onClose}
      eyebrow="Read it before it goes"
      title={title}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto font-sans text-xs text-[#161616]/55">
            {loading ? 'Rebuilding the preview…' : preview ? 'This is the email, exactly as they will get it.' : ''}
          </span>
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={() => void send()} disabled={sending || loading || !preview} className={btnSeed}>
            {sending ? 'Sending…' : preview ? `Send to ${preview.to}` : 'Send it'}
          </button>
        </div>
      }
    >
      {/* The envelope: who it is really going to, in full, before anything else. */}
      <div className="rounded-xl border-2 border-[#1a1815] bg-[#fffdf8] p-4 space-y-1.5">
        <EnvelopeRow label="To">
          <span className="font-sans text-[15px] font-semibold text-[#1a1815] break-all">{preview?.to ?? lead.email ?? 'No email on file'}</span>
          {lead.contact_name && <span className="font-sans text-sm text-[#1a1815]/55"> ({lead.contact_name})</span>}
        </EnvelopeRow>
        <EnvelopeRow label="From">
          <span className="font-sans text-sm text-[#1a1815]/70 break-all">{preview?.from ?? 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>'}</span>
        </EnvelopeRow>
        <EnvelopeRow label="Subject">
          <span className="font-sans text-sm font-semibold text-[#1a1815]">{preview?.subject ?? (loading ? 'Building…' : '—')}</span>
        </EnvelopeRow>
      </div>

      <div className="mt-4">
        <label className={labelCls}>Personal note (optional, appears in the body)</label>
        <textarea
          className={`${inputCls} min-h-[70px]`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Great talking just now. Here is the breakdown I mentioned."
        />
      </div>

      {error && (
        <p className="font-sans text-sm text-[#a03123] font-medium mt-3 border-2 border-[#a03123] rounded-xl p-3 bg-[#a03123]/[0.06]">{error}</p>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className={`${labelCls} !mb-0`}>The email itself</label>
          <span className="font-sans text-[11px] text-[#1a1815]/45">Open-tracking pixel hidden so this preview cannot fake an open.</span>
        </div>
        <div className="rounded-xl border-2 border-[#1a1815] overflow-hidden bg-white">
          {preview ? (
            <iframe
              // sandbox="" = no scripts, no forms, no navigation. It is a picture of the mail.
              sandbox=""
              srcDoc={preview.html}
              title="Email preview"
              className="w-full h-[46vh] min-h-[300px] bg-white block"
            />
          ) : (
            <div className="h-[46vh] min-h-[300px] flex items-center justify-center font-oswald uppercase text-sm text-[#1a1815]/40">
              {error ? 'No preview' : 'Building the email…'}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function EnvelopeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="w-[62px] shrink-0 text-[10px] uppercase tracking-[0.2em] font-oswald font-semibold text-[#1a1815]/45">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/* ----------------------------- delivery proof ------------------------------ */

const DELIVERY_LOOK: Record<string, { label: string; cls: string; hint: string }> = {
  delivered: {
    label: '✓ Delivered',
    cls: 'bg-[#3f5d34]/12 text-[#3f5d34] border-[#3f5d34]/50',
    hint: 'Their mail server accepted it. This is real delivery, not just "we tried".',
  },
  sent: {
    label: '↗ Accepted by Resend',
    cls: 'bg-[#b58a2a]/15 text-[#7a5c1a] border-[#b58a2a]/60',
    hint: 'Resend took the message. Delivery to their inbox is not confirmed yet. Open it to check with Resend live.',
  },
  queued: { label: '· Queued', cls: 'bg-[#1a1815]/[0.06] text-[#1a1815]/60 border-[#1a1815]/25', hint: 'Waiting at the provider.' },
  delivery_delayed: {
    label: '⏳ Delayed',
    cls: 'bg-[#b58a2a]/15 text-[#7a5c1a] border-[#b58a2a]/60',
    hint: 'Their server is deferring it. Resend keeps retrying.',
  },
  bounced: { label: '✕ Bounced', cls: 'bg-[#a03123]/10 text-[#a03123] border-[#a03123]/50', hint: 'It did NOT reach them. The address is now suppressed.' },
  complained: { label: '✕ Marked spam', cls: 'bg-[#a03123]/10 text-[#a03123] border-[#a03123]/50', hint: 'They marked it as spam. Stop emailing this address.' },
  suppressed: { label: '✕ Blocked', cls: 'bg-[#a03123]/10 text-[#a03123] border-[#a03123]/50', hint: 'Suppressed before sending. Nothing was delivered.' },
  failed: { label: '✕ Failed', cls: 'bg-[#a03123]/10 text-[#a03123] border-[#a03123]/50', hint: 'The provider could not send it.' },
};

export function DeliveryChip({ delivery }: { delivery: MessageDelivery }) {
  const look = DELIVERY_LOOK[delivery.status ?? 'sent'] ?? DELIVERY_LOOK.sent;
  const when = delivery.delivered_at
    ? new Date(delivery.delivered_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' })
    : null;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-[0.12em] font-oswald font-bold ${look.cls}`}
      title={[look.hint, when ? `Delivered ${when} MT` : null, delivery.detail].filter(Boolean).join(' · ')}
    >
      {look.label}
    </span>
  );
}

/**
 * The receipt. Pulls the stored copy of what went out AND asks Resend live for
 * its own last_event, so "did it actually send" is answered by the provider,
 * not by our optimism.
 */
function SentEmailViewer({ lead, mid, onClose }: { lead: OutboundLead; mid: string | null; onClose: () => void }) {
  type Sent = {
    subject: string;
    to: string;
    from: string;
    sentAt: string;
    html: string | null;
    status: string;
    lastEvent: string | null;
    statusDetail: string | null;
    deliveredAt: string | null;
    openedAt: string | null;
    providerError: string | null;
  };
  const [data, setData] = useState<Sent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api<Sent>(`/api/admin/outbound/leads/${lead.id}/sent-email?mid=${encodeURIComponent(mid)}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the email.');
    } finally {
      setLoading(false);
    }
  }, [lead.id, mid]);

  useEffect(() => {
    if (mid) {
      setData(null);
      void load();
    }
  }, [mid, load]);

  const look = data ? DELIVERY_LOOK[data.status] ?? DELIVERY_LOOK.sent : null;
  const fmt = (iso: string | null) =>
    iso ? `${new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' })} MT` : null;

  return (
    <Modal
      open={mid !== null}
      onClose={onClose}
      eyebrow="Proof of send"
      title="The email that went out"
      subtitle={data ? `To ${data.to} · ${fmt(data.sentAt)}` : undefined}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto font-sans text-xs text-[#161616]/55 break-all">Resend id {mid}</span>
          <button onClick={() => void load()} disabled={loading} className={btnGhost}>
            {loading ? 'Checking…' : 'Re-check with Resend'}
          </button>
          <button onClick={onClose} className={btnPrimary}>Close</button>
        </div>
      }
    >
      {error && <p className="font-sans text-sm text-[#a03123] font-medium border-2 border-[#a03123] rounded-xl p-3 bg-[#a03123]/[0.06]">{error}</p>}

      {data && look && (
        <div className={`rounded-xl border-2 p-4 ${look.cls.replace(/text-\[[^\]]+\]/, 'text-[#1a1815]')}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-oswald font-bold uppercase tracking-[0.1em] text-sm">{look.label}</span>
            {data.lastEvent && (
              <span className="font-sans text-xs text-[#1a1815]/60">
                Resend&apos;s own last event: <strong>{data.lastEvent}</strong>
              </span>
            )}
          </div>
          <p className="font-sans text-sm text-[#1a1815]/75 mt-1.5 leading-relaxed">{look.hint}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 font-sans text-xs text-[#1a1815]/60">
            {fmt(data.deliveredAt) && <span>Delivered {fmt(data.deliveredAt)}</span>}
            {fmt(data.openedAt) && <span>Opened {fmt(data.openedAt)}</span>}
            {data.statusDetail && <span className="text-[#a03123] font-medium">{data.statusDetail}</span>}
            {data.providerError && <span className="text-[#a03123]">Live check unavailable: {data.providerError}</span>}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="font-sans text-[13px] font-semibold text-[#1a1815] mb-1.5">{data?.subject ?? ''}</p>
        <div className="rounded-xl border-2 border-[#1a1815] overflow-hidden bg-white">
          {data?.html ? (
            <iframe sandbox="" srcDoc={data.html} title="Sent email" className="w-full h-[48vh] min-h-[300px] bg-white block" />
          ) : (
            <div className="h-[48vh] min-h-[300px] flex items-center justify-center font-oswald uppercase text-sm text-[#1a1815]/40">
              {loading ? 'Loading the email…' : 'No stored copy of this one.'}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------ audit intel ------------------------------- */

export function AuditIntelCard({ lead, onRun, auditing }: { lead: OutboundLead; onRun: () => void; auditing: boolean }) {
  const [showFull, setShowFull] = useState(false);
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
    <>
      <div className="bg-[#fffdf8] border-2 border-[#1a1815] rounded-2xl shadow-[5px_5px_0_0_#1a1815] p-5 relative">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="w-6 h-6 rounded-full bg-[#b58a2a] text-[#1a1815] font-oswald font-bold text-xs flex items-center justify-center">★</span>
          <span className="text-[11px] uppercase tracking-[0.24em] font-oswald font-semibold text-[#1a1815]/60">Audit intel · your ammo</span>
          <button
            onClick={() => setShowFull(true)}
            className="ml-auto shrink-0 font-oswald uppercase tracking-[0.12em] text-[11px] font-semibold text-[#b58a2a] hover:text-[#1a1815] transition-colors"
          >
            Read the full audit →
          </button>
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
            <button onClick={() => setShowFull(true)} className="font-sans text-[12px] text-[#b58a2a] font-semibold hover:text-[#1a1815] transition-colors mt-2 underline decoration-[#b58a2a]/40 underline-offset-2">
              Read the whole breakdown yourself →
            </button>
          </div>
        </div>
      </div>
      <AuditReportModal open={showFull} onClose={() => setShowFull(false)} lead={lead} audit={audit} domain={domain} />
    </>
  );
}

/* ------------------------- full audit report modal ------------------------ */

/** The complete website audit, readable in the cockpit: overall analysis, every
 *  category with its score + notes, all three fixes (with the "how"), and the
 *  full punch list. The little intel card is the call script; this is the report. */
export function AuditReportModal({
  open,
  onClose,
  lead,
  audit,
  domain,
}: {
  open: boolean;
  onClose: () => void;
  lead: OutboundLead;
  audit: OutboundAudit;
  domain: string;
}) {
  const tone = scoreTone(lead.audit_score ?? audit.overall_score);
  const categories = audit.categories ? Object.entries(audit.categories) : [];
  const fixes = audit.top_three_fixes ?? [];
  const todo = audit.full_todo ?? [];
  const auditedOn = lead.audit_at ? new Date(lead.audit_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null;
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    try {
      navigator.clipboard.writeText(`${window.location.origin}/audit/${lead.id}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Website audit"
      title={`${domain || lead.business_name} · ${lead.audit_score ?? Math.round(audit.overall_score)}/100`}
      subtitle={audit.headline || undefined}
      size="xl"
    >
      <div className="space-y-6">
        {/* Score banner */}
        <div className="flex items-center gap-4 rounded-2xl border-2 p-4" style={{ background: tone.bg, borderColor: tone.fg }}>
          <div className="shrink-0 w-[68px] h-[68px] rounded-xl border-2 flex flex-col items-center justify-center bg-[#fffdf8]" style={{ borderColor: tone.fg }}>
            <span className="font-oswald font-bold text-3xl leading-none" style={{ color: tone.fg }}>{lead.audit_score ?? Math.round(audit.overall_score)}</span>
            <span className="font-oswald text-[10px] uppercase tracking-[0.1em]" style={{ color: tone.fg }}>{audit.letter_grade || '/100'}</span>
          </div>
          <div className="min-w-0">
            {audit.headline && <p className="font-oswald font-semibold text-lg text-[#1a1815] leading-tight">{audit.headline}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12px] text-[#1a1815]/55 font-sans">
              {domain && <span>{domain}</span>}
              <a href={`/audit/${lead.id}`} target="_blank" rel="noopener noreferrer" className="font-oswald uppercase tracking-[0.1em] text-[11px] font-semibold text-[#b58a2a] hover:text-[#1a1815] transition-colors">
                Open the shareable report ↗
              </a>
              <button onClick={copyLink} className="font-oswald uppercase tracking-[0.1em] text-[11px] font-semibold text-[#b58a2a] hover:text-[#1a1815] transition-colors">
                {copied ? 'Copied!' : 'Copy link to text them'}
              </button>
              {lead.audit_url && (
                <a href={lead.audit_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#1a1815] underline decoration-[#1a1815]/25 underline-offset-2">
                  View the audited site ↗
                </a>
              )}
              {auditedOn && <span>Audited {auditedOn}</span>}
            </div>
          </div>
        </div>

        {/* Overall analysis */}
        {audit.overall_analysis && (
          <section>
            <h4 className="font-oswald uppercase tracking-[0.16em] text-[12px] text-[#b58a2a] font-semibold mb-1.5">The read</h4>
            <p className="font-sans text-[14px] text-[#1a1815]/85 leading-relaxed whitespace-pre-line">{audit.overall_analysis}</p>
          </section>
        )}

        {/* Category breakdown */}
        {categories.length > 0 && (
          <section>
            <h4 className="font-oswald uppercase tracking-[0.16em] text-[12px] text-[#b58a2a] font-semibold mb-2.5">Category breakdown</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {categories.map(([key, c]) => {
                const t = scoreTone(c.score);
                return (
                  <div key={key} className="border-2 border-[#1a1815]/12 rounded-xl p-3.5">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-oswald uppercase tracking-[0.1em] text-[12px] text-[#1a1815] font-semibold">{prettyCategory(key)}</span>
                      <span className="font-oswald font-bold text-[13px] px-2 py-0.5 rounded-md border tabular-nums" style={{ color: t.fg, background: t.bg, borderColor: t.fg }}>
                        {c.score}{c.letter ? ` · ${c.letter}` : ''}
                      </span>
                    </div>
                    {c.notes && <p className="font-sans text-[13px] text-[#1a1815]/70 leading-relaxed">{c.notes}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Top three fixes */}
        {fixes.length > 0 && (
          <section>
            <h4 className="font-oswald uppercase tracking-[0.16em] text-[12px] text-[#b58a2a] font-semibold mb-2.5">The biggest fixes</h4>
            <ol className="space-y-3">
              {fixes.map((f, i) => (
                <li key={i} className="border-l-4 border-[#b58a2a] pl-3.5">
                  <p className="font-oswald font-semibold text-[15px] text-[#1a1815] leading-snug">{i + 1}. {f.title}</p>
                  {f.why && <p className="font-sans text-[13px] text-[#1a1815]/70 mt-1 leading-relaxed"><span className="font-semibold text-[#1a1815]">Why it matters:</span> {f.why}</p>}
                  {f.how && <p className="font-sans text-[13px] text-[#1a1815]/70 mt-0.5 leading-relaxed"><span className="font-semibold text-[#1a1815]">How to fix it:</span> {f.how}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Full punch list */}
        {todo.length > 0 && (
          <section>
            <h4 className="font-oswald uppercase tracking-[0.16em] text-[12px] text-[#b58a2a] font-semibold mb-2.5">Full punch list ({todo.length})</h4>
            <ul className="space-y-2">
              {todo.map((t, i) => {
                const pt = priorityTone(t.priority || '');
                return (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] font-sans">
                    {t.priority && (
                      <span className="shrink-0 font-oswald uppercase tracking-[0.08em] text-[10px] font-bold px-1.5 py-0.5 rounded border mt-0.5" style={{ color: pt.fg, background: pt.bg, borderColor: pt.fg }}>
                        {pt.label}
                      </span>
                    )}
                    <span className="text-[#1a1815]/80 leading-relaxed">
                      {t.category && <span className="text-[#1a1815]/45">{prettyCategory(t.category)}: </span>}
                      {t.task}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </Modal>
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
  const [viewing, setViewing] = useState<string | null>(null);
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
    <>
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Correspondence"
      title={lead.business_name}
      subtitle={lead.email ? `Every email, AI call transcript, and reply. Mailing ${lead.email}.` : 'Every email, AI call transcript, and reply in one thread.'}
      size="xl"
    >
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
              {/* The receipt line: who it went to, what the provider says happened, and the email itself. */}
              {m.direction === 'outbound' && m.channel === 'email' && (
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {m.to_addr && <span className="font-sans text-[11px] text-[#1a1815]/60 break-all">To {m.to_addr}</span>}
                  {m.delivery && <DeliveryChip delivery={m.delivery} />}
                  {m.external_id && (
                    <button
                      onClick={() => setViewing(m.external_id!)}
                      className="text-[10px] uppercase tracking-[0.12em] font-oswald font-bold text-[#7a5c1a] border border-[#b58a2a]/60 hover:border-[#b58a2a] hover:bg-[#b58a2a]/10 rounded-md px-1.5 py-0.5 transition-colors"
                    >
                      View the email ↗
                    </button>
                  )}
                </div>
              )}
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
    {/* Sibling, not a child: a nested overlay would let a click on the receipt's
        backdrop bubble up and close the thread underneath it too. */}
    <SentEmailViewer lead={lead} mid={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
