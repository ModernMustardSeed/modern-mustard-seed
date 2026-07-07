'use client';

import { useMemo, useState } from 'react';
import type { Prospect, ProspectStatus } from '@/lib/prospects';
import { buildLeadScript, type LeadScript } from '@/lib/lead-script';
import AuditReport, { siteHref } from './AuditReport';

/**
 * The closed-loop call card: everything a rep needs on one prospect, in one
 * place. Capture their site and email, run a real website audit, generate a
 * custom AI script that references what the audit found, dial, then send the
 * follow-up, book the demo, or push them into the pipeline. Good leads (booked
 * or won) also flow into the pipeline automatically on the server.
 *
 * Self-contained: it owns its working state and calls the prospect endpoints
 * itself, bubbling row updates to the parent through `onPatch` so the table and
 * the call session stay in sync.
 */

type Slot = { startIso: string; display: string; shortLabel: string; dayLabel: string; timeLabel: string };

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-[#2D6A4F] text-white border-[#2D6A4F]';
  if (score >= 65) return 'bg-[#1E50C8] text-white border-[#1E50C8]';
  if (score >= 50) return 'bg-[#F5B700] text-[#161616] border-[#161616]';
  return 'bg-[#9B3022] text-white border-[#9B3022]';
}

export default function CallCard({
  prospect,
  repName,
  bookDisplay,
  onPatch,
  compact = false,
}: {
  prospect: Prospect;
  repName: string;
  bookDisplay: string;
  onPatch: (id: string, patch: Partial<Prospect>) => void;
  /** In the power-dialer, the session owns the big dial and the outcome bar,
   *  so we hide CallCard's own dial row and status buttons but keep the rest. */
  compact?: boolean;
}) {
  const [customScript, setCustomScript] = useState<LeadScript | null>(null);
  const [scriptMeta, setScriptMeta] = useState<{ custom: boolean; usedAudit: boolean } | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [contact, setContact] = useState({ website: prospect.website ?? '', email: prospect.email ?? '' });
  const [scriptCopied, setScriptCopied] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingIso, setBookingIso] = useState<string | null>(null);
  const [convOpen, setConvOpen] = useState(false);
  const [msgs, setMsgs] = useState<Array<{ id: string; direction: string; channel?: string; subject: string | null; snippet: string | null; body: string | null; occurred_at: string }> | null>(null);
  const [reply, setReply] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [aiCalling, setAiCalling] = useState(false);
  const [emailWithCall, setEmailWithCall] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [textBody, setTextBody] = useState('');
  const [textBusy, setTextBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [showFullAudit, setShowFullAudit] = useState(false);

  const id = prospect.id;
  const audit = prospect.audit_json;
  const shownScript = useMemo<LeadScript>(
    () => customScript ?? buildLeadScript(prospect, repName, bookDisplay),
    [customScript, prospect, repName, bookDisplay]
  );

  const telHref = prospect.phone ? `tel:${prospect.phone.replace(/[^0-9+]/g, '')}` : null;
  const inp = 'bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';
  const pill = 'px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold rounded-full border-2 transition-all disabled:opacity-40';

  const ensureEmailSaved = async () => {
    if (contact.email.trim() && contact.email.trim() !== (prospect.email ?? '')) {
      await fetch(`/api/admin/prospects/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: contact.email }),
      });
      onPatch(id, { email: contact.email.trim() });
    }
  };

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(shownScript.fullText);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  const saveContact = async () => {
    setSavingContact(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/prospects/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: contact.website, email: contact.email }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        onPatch(id, { website: contact.website.trim() || null, email: contact.email.trim() || null });
        setMsg({ kind: 'ok', text: 'Saved.' });
      } else setMsg({ kind: 'err', text: json.error ?? 'Could not save.' });
    } catch {
      setMsg({ kind: 'err', text: 'Network error.' });
    } finally {
      setSavingContact(false);
    }
  };

  const runAudit = async (urlArg?: string) => {
    const url = (urlArg ?? contact.website).trim();
    if (!url) { setMsg({ kind: 'err', text: 'Add their website first.' }); return; }
    if (url !== contact.website) setContact((c) => ({ ...c, website: url }));
    setAuditLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/prospects/${id}/audit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (res.ok && json.report) {
        onPatch(id, {
          website: url,
          audit_url: json.url ?? url,
          audit_score: Math.round(json.report.overall_score),
          audit_json: json.report,
          audit_at: new Date().toISOString(),
        });
        setMsg({ kind: 'ok', text: `Audit done: ${Math.round(json.report.overall_score)}/100. Now make the script use it.` });
      } else setMsg({ kind: 'err', text: json.error ?? 'Audit failed.' });
    } catch {
      setMsg({ kind: 'err', text: 'Audit hit a network error.' });
    } finally {
      setAuditLoading(false);
    }
  };

  // Find the prospect's website + email from its name + city, fill the fields,
  // and (if a site turns up and we have not audited yet) run the audit too.
  const [finding, setFinding] = useState(false);
  const findContact = async () => {
    setFinding(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/prospects/${id}/enrich`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setContact({ website: json.website ?? '', email: json.email ?? '' });
        onPatch(id, { website: json.website ?? null, email: json.email ?? null, phone: json.phone ?? prospect.phone });
        const bits = [json.website ? 'site' : '', json.email ? 'email' : ''].filter(Boolean);
        setMsg(bits.length ? { kind: 'ok', text: `Found ${bits.join(' + ')}.` } : { kind: 'err', text: 'Could not find a site or email. Add them manually.' });
        if (json.website && !audit) await runAudit(json.website);
      } else setMsg({ kind: 'err', text: json.error ?? 'Lookup failed.' });
    } catch {
      setMsg({ kind: 'err', text: 'Lookup hit a network error.' });
    } finally {
      setFinding(false);
    }
  };

  const generateScript = async () => {
    setScriptLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/prospects/${id}/script`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repName, bookDisplay }),
      });
      const json = await res.json();
      if (res.ok && json.script) {
        setCustomScript(json.script);
        setScriptMeta({ custom: !json.fallback, usedAudit: !!json.usedAudit });
        if (json.fallback) setMsg({ kind: 'err', text: 'AI script unavailable right now, showing the standard one.' });
      } else setMsg({ kind: 'err', text: json.error ?? 'Could not generate the script.' });
    } catch {
      setMsg({ kind: 'err', text: 'Script generation hit a network error.' });
    } finally {
      setScriptLoading(false);
    }
  };

  const setStatus = async (status: ProspectStatus) => {
    onPatch(id, { status });
    setBusy(`st-${status}`);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/prospects/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.promoted && json.leadId) {
        onPatch(id, { lead_id: json.leadId });
        setMsg({ kind: 'ok', text: 'Sent to the pipeline. It is in the CRM and the follow-up loop now.' });
      } else if (json.needsContact) {
        setMsg({ kind: 'err', text: 'Marked. Add a phone or email to send it into the pipeline.' });
      }
    } finally {
      setBusy(null);
    }
  };

  const sendFollowUp = async () => {
    if (!contact.email.trim()) { setMsg({ kind: 'err', text: 'Add their email first.' }); return; }
    setBusy('fu');
    setMsg(null);
    try {
      await ensureEmailSaved();
      const res = await fetch(`/api/admin/prospects/${id}/follow-up`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const json = await res.json();
      if (res.ok) {
        if (json.prospect) onPatch(id, json.prospect);
        setMsg({ kind: 'ok', text: audit ? 'Audit report emailed to them.' : 'Intro emailed to them.' });
      } else setMsg({ kind: 'err', text: json.error ?? 'Email failed.' });
    } catch {
      setMsg({ kind: 'err', text: 'Network error.' });
    } finally {
      setBusy(null);
    }
  };

  const sendToPipeline = async () => {
    if (!contact.email.trim() && !prospect.phone) { setMsg({ kind: 'err', text: 'Add a phone number or email first.' }); return; }
    setBusy('pl');
    setMsg(null);
    try {
      await ensureEmailSaved();
      const res = await fetch(`/api/admin/prospects/${id}/promote`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.leadId) {
        onPatch(id, { lead_id: json.leadId });
        setMsg({ kind: 'ok', text: 'In the pipeline. It will surface in the daily digest and follow-up loop.' });
      } else setMsg({ kind: 'err', text: json.error ?? 'Could not promote.' });
    } finally {
      setBusy(null);
    }
  };

  const toggleBooking = async () => {
    setBookOpen((v) => !v);
    if (slots.length || slotsLoading) return;
    setSlotsLoading(true);
    try {
      const res = await fetch('/api/book/slots');
      const json = await res.json();
      setSlots(json.slots ?? []);
    } catch {
      setMsg({ kind: 'err', text: 'Could not load times.' });
    } finally {
      setSlotsLoading(false);
    }
  };

  const book = async (startIso: string) => {
    if (!contact.email.trim()) { setMsg({ kind: 'err', text: 'Add their email first.' }); return; }
    setBookingIso(startIso);
    setMsg(null);
    try {
      await ensureEmailSaved();
      const res = await fetch(`/api/admin/prospects/${id}/book`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startIso }),
      });
      const json = await res.json();
      if (res.ok) {
        onPatch(id, { status: 'booked', lead_id: json.leadId ?? prospect.lead_id });
        setBookOpen(false);
        setMsg({ kind: 'ok', text: `Booked for ${json.display}. Invite sent, and it is in the pipeline.` });
      } else setMsg({ kind: 'err', text: json.error ?? 'Could not book that time.' });
    } catch {
      setMsg({ kind: 'err', text: 'Network error.' });
    } finally {
      setBookingIso(null);
    }
  };

  const aiCall = async () => {
    setAiCalling(true);
    setMsg(null);
    try {
      if (emailWithCall && contact.email.trim()) {
        await ensureEmailSaved();
        fetch(`/api/admin/prospects/${id}/follow-up`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      }
      const r = await fetch(`/api/admin/prospects/${id}/ai-call`, { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        onPatch(id, { status: 'contacted' });
        setMsg({ kind: 'ok', text: `Mr. Mustard is calling ${prospect.phone}. The transcript lands in the thread when the call ends.${emailWithCall && contact.email.trim() ? ' Audit emailed too.' : ''}` });
      } else if (j.needsSetup) setMsg({ kind: 'err', text: 'Outbound calling is not configured yet (Vapi number/key).' });
      else setMsg({ kind: 'err', text: j.error ?? 'Could not place the call.' });
    } catch {
      setMsg({ kind: 'err', text: 'Network error.' });
    } finally { setAiCalling(false); }
  };

  const openText = async () => {
    if (textOpen) { setTextOpen(false); return; }
    setTextOpen(true);
    setMsg(null);
    if (!textBody) {
      try {
        const r = await fetch(`/api/admin/prospects/${id}/text`);
        const j = await r.json().catch(() => ({}));
        if (j.body) setTextBody(j.body);
        if (j.configured === false) setMsg({ kind: 'err', text: 'Texting is not wired yet (add the Twilio credentials).' });
      } catch { /* leave blank */ }
    }
  };
  const sendText = async (ignoreQuietHours = false) => {
    if (!textBody.trim()) return;
    setTextBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/prospects/${id}/text`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: textBody, ignoreQuietHours }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        onPatch(id, { status: 'contacted', last_sms_at: new Date().toISOString() } as Partial<typeof prospect>);
        setMsg({ kind: 'ok', text: `Text sent to ${prospect.phone}. Their reply lands in the Conversation thread.` });
        setTextOpen(false);
      } else if (r.status === 409 && j.error === 'quiet-hours') {
        if (confirm(`${j.message}\n\nSend it now anyway?`)) { setTextBusy(false); return sendText(true); }
      } else setMsg({ kind: 'err', text: j.error ?? 'Could not send the text.' });
    } catch {
      setMsg({ kind: 'err', text: 'Network error.' });
    } finally { setTextBusy(false); }
  };

  const draftReply = async () => {
    setDraftBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/prospects/${id}/draft-reply`, { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.draft) setReply(j.draft);
      else setMsg({ kind: 'err', text: j.error ?? 'Could not draft a reply.' });
    } catch {
      setMsg({ kind: 'err', text: 'Network error.' });
    } finally { setDraftBusy(false); }
  };

  const loadConv = async () => {
    setConvOpen((v) => !v);
    if (msgs !== null) return;
    try {
      const r = await fetch(`/api/admin/prospects/${id}/messages`);
      const j = await r.json();
      setMsgs(j.messages ?? []);
    } catch { setMsgs([]); }
  };
  const sendReply = async () => {
    if (!reply.trim()) return;
    setReplyBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/prospects/${id}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setMsgs((m) => [...(m ?? []), { id: `tmp-${Date.now()}`, direction: 'outbound', channel: 'email', subject: null, snippet: reply.slice(0, 500), body: reply, occurred_at: new Date().toISOString() }]);
        setReply('');
        onPatch(id, { last_email_at: new Date().toISOString() });
        setMsg({ kind: 'ok', text: 'Reply sent.' });
      } else setMsg({ kind: 'err', text: j.error ?? 'Reply failed.' });
    } catch {
      setMsg({ kind: 'err', text: 'Network error.' });
    } finally { setReplyBusy(false); }
  };

  return (
    <>
      {msg && (
        <div className={`mb-4 rounded-xl border-2 px-4 py-2.5 text-sm font-body ${msg.kind === 'ok' ? 'bg-[#EAF3EE] border-[#2D6A4F] text-[#1f4e3a]' : 'bg-[#FBEAE7] border-[#9B3022] text-[#9B3022]'}`}>{msg.text}</div>
      )}

      {/* Dial + copy (hidden in the dialer, which has its own big dial) */}
      {!compact ? (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {telHref ? (
            <a href={telHref} className="px-5 py-2.5 text-sm font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all">📞 Call {prospect.phone}</a>
          ) : (
            <span className="text-[#161616]/55 font-body text-sm italic">No phone on file. Add it on the row, or look it up on Google Maps.</span>
          )}
          <button onClick={copyScript} className="px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">{scriptCopied ? 'Copied ✓' : 'Copy script'}</button>
        </div>
      ) : (
        <div className="flex justify-end mb-3">
          <button onClick={copyScript} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">{scriptCopied ? 'Copied ✓' : 'Copy script'}</button>
        </div>
      )}

      {/* Reach out: human dial or Mr. Mustard, optionally email at the same time */}
      <div className="bg-white border-2 border-[#161616] rounded-xl p-4 mb-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#E0301E] font-mono font-bold block mb-2">Reach out</span>
        <div className="flex flex-wrap items-center gap-2">
          {telHref && <a href={telHref} className={`${pill} bg-[#F5B700] text-[#161616] border-[#161616] hover:bg-[#FFD23F]`}>📞 I&apos;ll call</a>}
          <button onClick={aiCall} disabled={aiCalling || !prospect.phone} className={`${pill} bg-[#1E50C8] text-white border-[#1E50C8] hover:opacity-90`}>{aiCalling ? 'Dialing...' : '🤖 Mr. Mustard calls'}</button>
          <button onClick={openText} disabled={!prospect.phone} className={`${pill} bg-[#2D6A4F] text-white border-[#2D6A4F] hover:opacity-90`}>💬 {textOpen ? 'Hide text' : 'Text them'}</button>
          <label className="inline-flex items-center gap-1.5 text-[12px] font-body text-[#161616]/70 cursor-pointer">
            <input type="checkbox" checked={emailWithCall} onChange={(e) => setEmailWithCall(e.target.checked)} className="accent-[#F5B700] w-4 h-4" />
            email the audit at the same time
          </label>
        </div>
        {textOpen && (
          <div className="mt-3 rounded-xl border-2 border-[#161616] bg-[#FFFDF6] p-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#2D6A4F] font-mono font-bold block mb-1.5">Personalized text (Cahill)</span>
            <textarea value={textBody} onChange={(e) => setTextBody(e.target.value)} rows={4}
              placeholder={prospect.phone ? 'Loading a personalized draft...' : 'No phone on file.'}
              className="w-full rounded-lg border-2 border-[#161616] px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-[11px] font-mono text-[#161616]/45">{textBody.length} chars. STOP replies are auto-honored.</span>
              <button onClick={() => sendText(false)} disabled={textBusy || !textBody.trim()} className={`${pill} bg-[#161616] text-[#FBF6EA] border-[#161616] hover:opacity-90`}>{textBusy ? 'Sending...' : 'Send text'}</button>
            </div>
          </div>
        )}
        <p className="text-[#161616]/45 font-body text-[11px] mt-2">Mr. Mustard opens by saying he is an AI, pitches the fit, and books a call. The full transcript lands in the Conversation thread when the call ends.</p>
      </div>

      {/* Their site & email */}
      <div className="bg-white border-2 border-[#161616] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#E0301E] font-mono font-bold">Their site & email</span>
          {contact.website.trim() && (
            <a
              href={siteHref(contact.website.trim())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#1E50C8] border border-[#1E50C8]/40 rounded-full px-2 py-0.5 hover:bg-[#1E50C8] hover:text-white transition-colors"
            >
              🌐 See the live site ↗
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[180px]">
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/45 font-mono block mb-1">Website</span>
            <input value={contact.website} onChange={(e) => setContact((c) => ({ ...c, website: e.target.value }))} placeholder="glacierdiner.com" className={`${inp} w-full`} />
          </label>
          <label className="flex-1 min-w-[180px]">
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#161616]/45 font-mono block mb-1">Email</span>
            <input value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} type="email" placeholder="owner@glacierdiner.com" className={`${inp} w-full`} />
          </label>
          <button onClick={saveContact} disabled={savingContact} className={`${pill} bg-white text-[#161616] border-[#161616] hover:bg-[#FFF8E6]`}>{savingContact ? 'Saving...' : 'Save'}</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={findContact} disabled={finding} className={`${pill} bg-[#2D6A4F] text-white border-[#2D6A4F] hover:opacity-90`}>{finding ? 'Looking them up...' : '🔎 Find site & email'}</button>
          <button onClick={() => runAudit()} disabled={auditLoading} className={`${pill} bg-[#1E50C8] text-white border-[#1E50C8] hover:opacity-90`}>{auditLoading ? 'Auditing their site...' : audit ? 'Re-run audit' : 'Run website audit'}</button>
          <button onClick={generateScript} disabled={scriptLoading} className={`${pill} bg-[#161616] text-[#FBF6EA] border-[#161616] hover:opacity-90`}>{scriptLoading ? 'Writing script...' : audit ? '✨ Make script use the audit' : '✨ Make script custom'}</button>
        </div>
      </div>

      {/* Audit summary */}
      {audit && (
        <details className="group bg-white border-2 border-[#161616] rounded-xl mb-4 overflow-hidden" open>
          <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-[#FFF8E6]">
            <span className="text-[11px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] flex items-center gap-2">
              Audit
              {prospect.audit_score != null && <span className={`text-[10px] font-mono font-bold rounded-full border-2 px-2 py-0.5 ${scoreColor(prospect.audit_score)}`}>{prospect.audit_score}/100</span>}
              <span className="text-[#161616]/50">({audit.letter_grade})</span>
            </span>
            <span className="text-[#F5B700] text-xl font-bold group-open:rotate-45 transition-transform">+</span>
          </summary>
          <div className="px-4 pb-4">
            <p className="font-body text-sm text-[#161616] italic mb-3">&ldquo;{audit.headline}&rdquo;</p>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-1.5">Fix these first</span>
            <ol className="space-y-1.5">
              {(audit.top_three_fixes ?? []).slice(0, 3).map((f, i) => (
                <li key={i} className="text-sm text-[#3A3733] font-body"><span className="font-bold text-[#161616]">{i + 1}. {f.title}.</span> {f.why}</li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => setShowFullAudit((v) => !v)}
                className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full hover:bg-[#FFD23F] transition-all"
              >
                {showFullAudit ? 'Hide the full audit' : 'See the whole audit'}
              </button>
              {(prospect.audit_url ?? prospect.website) && (
                <a
                  href={siteHref((prospect.audit_url ?? prospect.website)!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-white bg-[#1E50C8] border-2 border-[#1E50C8] rounded-full hover:opacity-90 transition-all"
                >
                  🌐 See the live site ↗
                </a>
              )}
            </div>
            {showFullAudit && (
              <div className="mt-3">
                <AuditReport audit={audit} variant="inline" />
              </div>
            )}
          </div>
        </details>
      )}

      {/* Script badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[#161616]/55 font-body text-xs">Read it top to bottom. Pause and let them answer. You are only booking a quick demo.</p>
        {scriptMeta?.custom && (
          <span className="shrink-0 text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-white bg-[#161616] rounded-full px-2.5 py-1">{scriptMeta.usedAudit ? 'Custom · from audit' : 'Custom'}</span>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-2.5">
        {shownScript.steps.map((step, i) => (
          <div key={i} className="bg-white border-2 border-[#161616] rounded-xl p-4">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#E0301E] font-mono font-bold flex items-center gap-2 mb-1.5"><span className="font-display text-base text-[#F5B700]">{i + 1}</span>{step.label}</span>
            <p className="font-body text-[16px] leading-relaxed text-[#161616]">{step.line}</p>
          </div>
        ))}
      </div>

      {/* Voicemail */}
      <div className="bg-[#FFF8E6] border-2 border-[#161616] rounded-xl p-4 mt-2.5">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#E0301E] font-mono font-bold block mb-1.5">If you get voicemail</span>
        <p className="font-body text-[15px] leading-relaxed text-[#161616] italic">{shownScript.voicemail}</p>
      </div>

      {/* Objections */}
      <details className="group bg-white border-2 border-[#161616] rounded-xl mt-2.5 overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-[#FFF8E6]">
          <span className="text-[11px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616]">If they push back</span>
          <span className="text-[#F5B700] text-xl font-bold group-open:rotate-45 transition-transform">+</span>
        </summary>
        <div className="px-4 pb-4 space-y-3">
          {shownScript.objections.map((o, i) => (
            <div key={i}>
              <p className="font-sans font-bold text-sm text-[#161616]">{o.q}</p>
              <p className="font-body text-sm text-[#3A3733] leading-relaxed italic">"{o.a}"</p>
            </div>
          ))}
        </div>
      </details>

      {/* Book a demo */}
      <div className="bg-white border-2 border-[#161616] rounded-xl mt-4 overflow-hidden">
        <button onClick={toggleBooking} className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#FFF8E6]">
          <span className="text-[11px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616]">📅 Book a demo on the calendar</span>
          <span className={`text-[#F5B700] text-xl font-bold transition-transform ${bookOpen ? 'rotate-45' : ''}`}>+</span>
        </button>
        {bookOpen && (
          <div className="px-4 pb-4">
            {!contact.email.trim() && <p className="text-[#9B3022] text-xs font-body mb-2">Add their email above first, so we can send the invite.</p>}
            {slotsLoading ? (
              <p className="text-[#161616]/55 text-sm italic py-3">Loading open times...</p>
            ) : slots.length === 0 ? (
              <p className="text-[#161616]/55 text-sm italic py-3">No open times right now.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((sl) => (
                  <button key={sl.startIso} onClick={() => book(sl.startIso)} disabled={!!bookingIso} className="px-3 py-2 text-xs font-sans font-bold text-[#161616] bg-[#FFF8E6] border-2 border-[#161616] rounded-lg hover:bg-[#F5B700] transition-all disabled:opacity-40">
                    {bookingIso === sl.startIso ? 'Booking...' : `${sl.dayLabel} ${sl.timeLabel}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* After the call. In the dialer, the session's outcome bar owns the
          status buttons, so we show only the email + pipeline actions. */}
      <div className="mt-5 pt-4 border-t-2 border-[#161616]/10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono font-bold block mb-2">{compact ? 'Send it' : 'After the call'}</span>
        <div className="flex flex-wrap gap-2">
          {!compact && (
            <>
              <button onClick={() => setStatus('contacted')} disabled={busy === 'st-contacted'} className={`${pill} bg-white text-[#161616] border-[#161616] hover:bg-[#FFF8E6]`}>Talked</button>
              <button onClick={() => setStatus('booked')} disabled={busy === 'st-booked'} className={`${pill} bg-[#2D6A4F] text-white border-[#2D6A4F] hover:opacity-90`}>Booked a demo</button>
              <button onClick={() => setStatus('not-interested')} disabled={busy === 'st-not-interested'} className={`${pill} bg-[#9B3022] text-white border-[#9B3022] hover:opacity-90`}>Not interested</button>
            </>
          )}
          <button onClick={sendFollowUp} disabled={busy === 'fu'} className={`${pill} bg-[#1E50C8] text-white border-[#1E50C8] hover:opacity-90`}>{busy === 'fu' ? 'Sending...' : audit ? 'Email the audit' : 'Send follow-up'}</button>
          {!prospect.lead_id ? (
            <button onClick={sendToPipeline} disabled={busy === 'pl'} className={`${pill} bg-[#F5B700] text-[#161616] border-[#161616] hover:bg-[#FFD23F]`}>{busy === 'pl' ? 'Sending...' : 'Send to pipeline'}</button>
          ) : (
            <a href="/admin/leads" className={`${pill} bg-[#EAF3EE] text-[#1f4e3a] border-[#2D6A4F] hover:bg-[#d9ebe0] inline-flex items-center`}>✓ In pipeline — view</a>
          )}
        </div>
        {prospect.email_opened_at ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-sans font-bold text-[#1f4e3a] bg-[#EAF3EE] border-2 border-[#2D6A4F] rounded-full px-3 py-1">👁 Opened the email{(prospect.email_open_count ?? 0) > 1 ? ` ${prospect.email_open_count}x` : ''} · {new Date(prospect.email_opened_at).toLocaleDateString()}</p>
        ) : prospect.last_email_at ? (
          <p className="mt-2 text-[12px] font-body text-[#161616]/45">Email sent {new Date(prospect.last_email_at).toLocaleDateString()}, not opened yet.</p>
        ) : null}
        {!compact && <p className="text-[#161616]/45 font-body text-[11px] mt-2">Booked or Won moves them into the pipeline automatically. Follow-up and booking both need their email.</p>}
      </div>

      {/* Conversation: full thread (sent, opened, replies) + reply box. */}
      <div className="bg-white border-2 border-[#161616] rounded-xl mt-4 overflow-hidden">
        <button onClick={loadConv} className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#FFF8E6]">
          <span className="text-[11px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616]">💬 Conversation</span>
          <span className={`text-[#F5B700] text-xl font-bold transition-transform ${convOpen ? 'rotate-45' : ''}`}>+</span>
        </button>
        {convOpen && (
          <div className="px-4 pb-4">
            {msgs === null ? (
              <p className="text-[#161616]/55 text-sm italic py-3">Loading...</p>
            ) : msgs.length === 0 ? (
              <p className="text-[#161616]/55 text-sm italic py-3">No messages yet. Send the audit or a note to start the thread.</p>
            ) : (
              <div className="space-y-2 mb-3 max-h-72 overflow-y-auto">
                {msgs.map((m) => (
                  <div key={m.id} className={`rounded-lg border-2 px-3 py-2 text-sm ${m.direction === 'inbound' ? 'bg-[#FFF8E6] border-[#161616]' : 'bg-[#EAF3EE] border-[#2D6A4F] ml-6'}`}>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#E0301E]">{m.direction === 'inbound' ? 'They wrote' : 'You sent'}{m.channel && m.channel !== 'email' ? ` · ${m.channel}` : ''}</span>
                      <span className="text-[10px] text-[#161616]/45 font-mono">{new Date(m.occurred_at).toLocaleDateString()}</span>
                    </div>
                    {m.subject && <p className="font-sans font-bold text-[13px] text-[#161616]">{m.subject}</p>}
                    <p className="font-body text-[#3A3733] whitespace-pre-wrap">{m.snippet || m.body}</p>
                  </div>
                ))}
              </div>
            )}
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply, or let AI draft one..." rows={3} className={`${inp} w-full`} />
            <div className="flex flex-wrap gap-2 mt-2">
              <button onClick={draftReply} disabled={draftBusy} className={`${pill} bg-white text-[#161616] border-[#161616] hover:bg-[#FFF8E6]`}>{draftBusy ? 'Drafting...' : '✨ AI draft'}</button>
              <button onClick={sendReply} disabled={replyBusy || !reply.trim()} className={`${pill} bg-[#161616] text-[#FBF6EA] border-[#161616] hover:opacity-90`}>{replyBusy ? 'Sending...' : 'Send reply'}</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
