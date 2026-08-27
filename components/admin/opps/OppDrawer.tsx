'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, btnDanger, btnGhost, btnPrimary, inputCls, labelCls, timeAgo } from '@/components/admin/acquisition/ui';
import { OPP_GROUP_LABELS, OPP_STATUSES, OPP_STATUS_LABELS, draftIntro, type Opp, type OppMessage, type OppStatus } from '@/lib/opps';
import { OppStatusChip } from './OppsDesk';

type Props = {
  id: string;
  onClose: () => void;
  onChange: (opp: Opp) => void;
  onDeleted: (id: string) => void;
  push: (text: string, tone: 'ok' | 'error') => void;
};

export default function OppDrawer({ id, onClose, onChange, onDeleted, push }: Props) {
  const [opp, setOpp] = useState<Opp | null>(null);
  const [messages, setMessages] = useState<OppMessage[]>([]);
  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [nextStepAt, setNextStepAt] = useState('');
  const [note, setNote] = useState('');
  const [composing, setComposing] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<{ opp: Opp; messages: OppMessage[] }>(`/api/admin/opps/${id}`);
    setOpp(data.opp);
    setMessages(data.messages);
    setNotes(data.opp.notes ?? '');
    setContactName(data.opp.contact_name ?? '');
    setContactEmail(data.opp.contact_email ?? '');
    setNextStep(data.opp.next_step ?? '');
    setNextStepAt(data.opp.next_step_at ? data.opp.next_step_at.slice(0, 10) : '');
  }, [id]);

  useEffect(() => {
    load().catch((e) => push(e instanceof Error ? e.message : 'Could not open it.', 'error'));
  }, [load, push]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !composing) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, composing]);

  const patch = async (p: Record<string, unknown>, ok?: string) => {
    if (!opp) return;
    setBusy(true);
    try {
      const data = await api<{ opp: Opp }>(`/api/admin/opps/${id}`, { method: 'PATCH', body: JSON.stringify(p) });
      setOpp(data.opp);
      onChange(data.opp);
      if (ok) push(ok, 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = () =>
    patch(
      {
        notes,
        contact_name: contactName,
        contact_email: contactEmail,
        next_step: nextStep,
        next_step_at: nextStepAt ? new Date(nextStepAt + 'T09:00:00').toISOString() : null,
      },
      'Saved.',
    );

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const data = await api<{ message: OppMessage }>(`/api/admin/opps/${id}`, { method: 'POST', body: JSON.stringify({ note }) });
      setMessages((m) => [data.message, ...m]);
      setNote('');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not add the note.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openCompose = () => {
    if (!opp) return;
    const d = draftIntro(opp, contactName);
    setTo(contactEmail || '');
    setSubject(d.subject);
    setBody(d.body);
    setComposing(true);
  };

  const send = async () => {
    setBusy(true);
    try {
      const data = await api<{ message: OppMessage; opp: Opp }>(`/api/admin/opps/${id}/email`, { method: 'POST', body: JSON.stringify({ to, subject, body }) });
      setMessages((m) => [data.message, ...m]);
      setOpp(data.opp);
      onChange(data.opp);
      setComposing(false);
      push(`Sent to ${to}.`, 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Send failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Take this off the desk? The thread goes with it.')) return;
    try {
      await api(`/api/admin/opps/${id}`, { method: 'DELETE' });
      onDeleted(id);
      push('Removed.', 'ok');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Could not remove it.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#161616]/40" onClick={onClose} />
      <aside className="relative w-full max-w-2xl h-full bg-[#FBF6EA] text-[#161616] border-l-2 border-[#161616] overflow-y-auto shadow-[-8px_0_30px_rgba(0,0,0,.25)]">
        <div className="sticky top-0 z-10 bg-[#FBF6EA]/90 backdrop-blur-md border-b-2 border-[#161616] px-5 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] font-oswald text-[#E0301E]">{opp ? OPP_GROUP_LABELS[opp.group] : 'Opportunity'}</div>
            <h2 className="font-display text-2xl font-bold leading-tight mt-0.5 truncate">{opp?.company ?? 'Loading'}</h2>
            <div className="font-sans text-sm text-[#161616]/75">{opp?.title}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 w-9 h-9 rounded-full border-2 border-[#161616] bg-white font-bold hover:bg-[#F5B700]">&times;</button>
        </div>

        {opp && (
          <div className="px-5 py-5 space-y-6 font-sans text-sm">
            <div className="flex flex-wrap gap-2">
              <a href={opp.url} target="_blank" rel="noopener noreferrer" className={btnPrimary} onClick={() => { if (opp.status === 'new') patch({ status: 'shortlist' }); }}>Open listing</a>
              <button className={btnGhost} onClick={openCompose}>Write the email</button>
              <a href={`mailto:${contactEmail || ''}?subject=${encodeURIComponent(draftIntro(opp, contactName).subject)}`} className={btnGhost}>Open in mail app</a>
            </div>

            <section>
              <div className={labelCls}>Status</div>
              <div className="flex flex-wrap gap-1.5">
                {OPP_STATUSES.map((s) => (
                  <button key={s} disabled={busy} onClick={() => patch({ status: s }, `Marked ${OPP_STATUS_LABELS[s].toLowerCase()}.`)} className={`rounded-full ${opp.status === s ? 'ring-2 ring-[#161616] ring-offset-2 ring-offset-[#FBF6EA]' : 'opacity-70 hover:opacity-100'}`}>
                    <OppStatusChip status={s as OppStatus} />
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={labelCls + ' mb-0'}>Priority</span>
                {([1, 2, 3] as const).map((p) => (
                  <button key={p} disabled={busy} onClick={() => patch({ priority: p })} className={`px-3 py-1 rounded-md border-2 text-[10px] font-oswald uppercase tracking-[0.12em] ${opp.priority === p ? 'bg-[#161616] text-[#F5B700] border-[#161616]' : 'bg-white border-[#161616]/30'}`}>
                    {p === 1 ? 'Now' : p === 2 ? 'Soon' : 'Later'}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-2 bg-[#FFFDF8] border-2 border-[#161616] rounded-2xl p-4">
              <Row k="Listed pay" v={opp.pay || 'Not listed'} />
              <Row k="Type" v={opp.type} />
              {opp.deadline && <Row k="Deadline" v={opp.deadline} hot />}
              <Row k="Source" v={opp.source || ''} />
              <Row k="Verified" v={opp.verified ? 'Listing fetched live when it was added' : 'Not yet checked'} />
              {opp.why_fit && (
                <div className="pt-2 border-t border-[#161616]/10">
                  <div className={labelCls}>Why it fits</div>
                  <p className="text-[#161616]/85">{opp.why_fit}</p>
                </div>
              )}
            </section>

            <section className="grid gap-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div><label className={labelCls}>Contact name</label><input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
                <div><label className={labelCls}>Contact email</label><input className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="who gets the email" /></div>
              </div>
              <div className="grid md:grid-cols-[1fr_160px] gap-3">
                <div><label className={labelCls}>Next step</label><input className={inputCls} value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Follow up, send deck, second call" /></div>
                <div><label className={labelCls}>By</label><input type="date" className={inputCls} value={nextStepAt} onChange={(e) => setNextStepAt(e.target.value)} /></div>
              </div>
              <div><label className={labelCls}>Notes</label><textarea className={`${inputCls} min-h-[110px]`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What you learned, who you talked to, what you want from it." /></div>
              <div className="flex justify-between items-center">
                <button className={btnDanger} onClick={remove}>Remove</button>
                <button className={btnPrimary} disabled={busy} onClick={saveDetails}>Save</button>
              </div>
            </section>

            <section>
              <div className={labelCls}>Thread</div>
              <div className="flex gap-2 mb-3">
                <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note to the thread" onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }} />
                <button className={btnGhost} disabled={busy || !note.trim()} onClick={addNote}>Add</button>
              </div>
              {messages.length === 0 && <div className="text-[#161616]/50">No emails or notes yet.</div>}
              <div className="space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`border-2 rounded-xl p-3 ${m.channel === 'email' ? 'bg-white border-[#161616]' : 'bg-[#FFF3C4] border-[#161616]/30'}`}>
                    <div className="flex justify-between gap-3 text-[10px] uppercase tracking-[0.16em] font-oswald text-[#161616]/60">
                      <span>{m.channel === 'email' ? `Email to ${m.to_addr}` : 'Note'}</span>
                      <span>{timeAgo(m.occurred_at)}</span>
                    </div>
                    {m.subject && m.channel === 'email' && <div className="font-semibold mt-1">{m.subject}</div>}
                    <div className="whitespace-pre-wrap text-[#161616]/85 mt-1">{m.body}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="text-[11px] text-[#161616]/45">Added {new Date(opp.created_at).toLocaleDateString()} &middot; last action {timeAgo(opp.last_action_at)}{opp.applied_at ? ` · applied ${new Date(opp.applied_at).toLocaleDateString()}` : ''}</div>
          </div>
        )}
      </aside>

      {composing && opp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#161616]/50" onClick={() => setComposing(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#FBF6EA] text-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#161616]">
            <div className="shrink-0 px-5 py-4 border-b-2 border-[#161616]">
              <div className="text-[10px] uppercase tracking-[0.3em] font-oswald text-[#E0301E]">From sarah@modernmustardseed.com</div>
              <h3 className="font-display text-xl font-bold">Email {opp.company}</h3>
            </div>
            <div className="overflow-y-auto px-5 py-4 grid gap-3 font-sans text-sm">
              <div><label className={labelCls}>To</label><input className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com" /></div>
              <div><label className={labelCls}>Subject</label><input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
              <div><label className={labelCls}>Body</label><textarea className={`${inputCls} min-h-[280px]`} value={body} onChange={(e) => setBody(e.target.value)} /></div>
              <div className="text-[11px] text-[#161616]/55">Goes out through Resend with your signature block, lands on the thread, and moves the row to Applied if it is still New or Shortlist.</div>
            </div>
            <div className="shrink-0 px-5 py-4 border-t-2 border-[#161616] flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setComposing(false)}>Cancel</button>
              <button className={btnPrimary} disabled={busy || !to.trim() || !subject.trim() || !body.trim()} onClick={send}>{busy ? 'Sending' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, hot }: { k: string; v: string; hot?: boolean }) {
  if (!v) return null;
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <div className="text-[10px] uppercase tracking-[0.18em] font-oswald text-[#161616]/55 pt-0.5">{k}</div>
      <div className={hot ? 'text-[#E0301E] font-semibold' : 'text-[#161616]/85'}>{v}</div>
    </div>
  );
}
