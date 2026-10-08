'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, btn, btnGold, btnInk, card, Chip, emptyBox, errorBox, fmtDateTime, input, label, muted, post, td, th, useCopy, type OutreachRow, type OutreachSummary } from './shared';

const STATUSES = ['queued', 'hand', 'sent', 'replied', 'hosting', 'declined', 'bounced', 'done', 'skipped'] as const;
const CAP_MIN = 1;
const CAP_MAX = 12;

type ListPayload = { ok: true; rows: OutreachRow[]; summary: OutreachSummary; verticals: string[] };

function armingSentence(cap: number) {
  return `Every weekday at 9:38 AM Mountain, up to ${cap} host${cap === 1 ? '' : 's'} get a personal email from sarah@modernmustardseed.com. Replies stop the sequence.`;
}

export default function OutreachTab({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<OutreachRow[]>([]);
  const [summary, setSummary] = useState<OutreachSummary | null>(null);
  const [verticals, setVerticals] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [vertical, setVertical] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [cap, setCap] = useState(CAP_MAX);
  const [confirming, setConfirming] = useState<'arm' | 'disarm' | null>(null);
  const [switchError, setSwitchError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const { copy, labelFor } = useCopy();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (vertical) qs.set('vertical', vertical);
      const data = await api<ListPayload>(`/api/admin/bootcamp/outreach?${qs.toString()}`);
      setRows(data.rows);
      setSummary(data.summary);
      if (data.verticals.length) setVerticals((v) => (v.length >= data.verticals.length ? v : data.verticals));
      setCap(data.summary.state.dailyCap || CAP_MAX);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load outreach.');
    } finally {
      setLoading(false);
    }
  }, [status, vertical]);

  useEffect(() => {
    void load();
  }, [load]);

  const flip = async (action: 'arm' | 'disarm' | 'cap') => {
    setBusy(`switch:${action}`);
    setSwitchError('');
    try {
      const data = await post<{ ok: true; summary: OutreachSummary }>('/api/admin/bootcamp/outreach', { action, dailyCap: cap });
      setSummary(data.summary);
      setCap(data.summary.state.dailyCap || cap);
      setConfirming(null);
      onChanged();
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : 'Could not change the switch.');
    } finally {
      setBusy('');
    }
  };

  const act = async (row: OutreachRow, action: 'send' | 'replied' | 'hosting' | 'skip' | 'requeue') => {
    setBusy(`${row.id}:${action}`);
    setRowError((e) => ({ ...e, [row.id]: '' }));
    try {
      await post(`/api/admin/bootcamp/outreach/${row.id}`, { action });
      await load();
      onChanged();
    } catch (err) {
      setRowError((e) => ({ ...e, [row.id]: err instanceof Error ? err.message : 'That action failed.' }));
    } finally {
      setBusy('');
    }
  };

  const armed = Boolean(summary?.state.armed);
  const capClamped = Math.min(CAP_MAX, Math.max(CAP_MIN, Math.round(Number(cap) || CAP_MAX)));

  return (
    <div className="space-y-6">
      {/* The switch */}
      <section className={`${card} p-5`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className={`inline-block h-3.5 w-3.5 rounded-full border-2 border-[#161616] ${armed ? 'bg-[#0a7c78]' : 'bg-[#E0301E]'}`} aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold text-[#161616]">
                {summary ? (armed ? `Armed, sending up to ${summary.state.dailyCap} a day on weekday mornings` : 'Off') : 'Loading the switch'}
              </h2>
            </div>
            <p className={`${muted} mt-1`}>
              {armed
                ? `${armingSentence(summary?.state.dailyCap || capClamped)} Sent today: ${summary?.todaySent ?? 0} of ${summary?.state.dailyCap ?? 0}.${summary?.state.startedAt ? ` Armed ${fmtDateTime(summary.state.startedAt)}.` : ''}`
                : 'Nothing sends while it is off. Send now still works row by row.'}
            </p>
            {switchError && <p className="font-body text-sm text-[#E0301E] mt-2">{switchError}</p>}
          </div>

          <div className="flex flex-wrap items-end gap-3 shrink-0">
            <label className="block">
              <span className={label}>Daily cap ({CAP_MIN} to {CAP_MAX})</span>
              <input
                type="number"
                min={CAP_MIN}
                max={CAP_MAX}
                step={1}
                value={cap}
                onChange={(e) => setCap(Number(e.target.value))}
                onBlur={() => setCap(capClamped)}
                className={`${input} w-24`}
              />
            </label>
            {armed && summary && capClamped !== summary.state.dailyCap && (
              <button type="button" onClick={() => flip('cap')} disabled={busy.startsWith('switch')} className={btn}>
                {busy === 'switch:cap' ? 'Saving' : 'Save cap'}
              </button>
            )}
            {armed ? (
              <button type="button" onClick={() => setConfirming('disarm')} disabled={busy.startsWith('switch')} className={btnInk}>
                Turn off
              </button>
            ) : (
              <button type="button" onClick={() => setConfirming('arm')} disabled={busy.startsWith('switch') || !summary} className={btnGold}>
                Arm outreach
              </button>
            )}
          </div>
        </div>

        {confirming === 'arm' && (
          <div className="mt-4 rounded-lg border-2 border-[#161616] bg-[#F5B700]/25 p-4">
            <p className="font-bold text-sm text-[#161616]">Before it arms, read this once.</p>
            <p className="font-body text-sm text-[#161616] mt-1">{armingSentence(capClamped)}</p>
            <p className="font-body text-xs text-[#3A3733] mt-1">
              Three emails over about two weeks, then the row is done. Rows with a form or a DM instead of an address never send on their own; they show up here as by hand.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={() => flip('arm')} disabled={busy === 'switch:arm'} className={btnGold}>
                {busy === 'switch:arm' ? 'Arming' : `Yes, arm it at ${capClamped} a day`}
              </button>
              <button type="button" onClick={() => setConfirming(null)} className={btn}>
                Not yet
              </button>
            </div>
          </div>
        )}

        {confirming === 'disarm' && (
          <div className="mt-4 rounded-lg border-2 border-[#161616] bg-[#FBF6EA] p-4">
            <p className="font-bold text-sm text-[#161616]">Turn outreach off?</p>
            <p className="font-body text-sm text-[#161616] mt-1">Tomorrow morning nothing sends. Every row keeps its step and its next send date, so arming again picks up where it stopped.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={() => flip('disarm')} disabled={busy === 'switch:disarm'} className={btnInk}>
                {busy === 'switch:disarm' ? 'Turning off' : 'Yes, turn it off'}
              </button>
              <button type="button" onClick={() => setConfirming(null)} className={btn}>
                Keep it armed
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className={label}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${input} w-44`}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
                {summary?.byStatus?.[s] ? ` (${summary.byStatus[s]})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Vertical</span>
          <select value={vertical} onChange={(e) => setVertical(e.target.value)} className={`${input} w-48`}>
            <option value="">All</option>
            {verticals.map((v) => (
              <option key={v} value={v}>
                {v}
                {summary?.byVertical?.[v] ? ` (${summary.byVertical[v]})` : ''}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void load()} className={btn} disabled={loading}>
          {loading ? 'Loading' : 'Reload'}
        </button>
        <p className={`${muted} ml-auto`}>{rows.length.toLocaleString('en-US')} rows</p>
      </section>

      {error && <div className={errorBox}>{error}</div>}

      {!error && !loading && rows.length === 0 && (
        <div className={emptyBox}>
          {status || vertical ? 'Nothing matches those filters. Clear them to see the whole list.' : 'No hosts yet. Run scripts/bootcamp-seed-outreach.mjs to load the list, then arm outreach or send the first fifty by hand.'}
        </div>
      )}

      {rows.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-[#161616] text-[#FBF6EA] text-[10px] uppercase tracking-[0.15em] font-mono">
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Brand</th>
                <th className={th}>Vertical</th>
                <th className={th}>Fit</th>
                <th className={th}>Tier</th>
                <th className={th}>Status</th>
                <th className={th}>Step</th>
                <th className={th}>Next send</th>
                <th className={th}>Last sent</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const hand = r.status === 'hand' || r.contact_type !== 'email';
                const terminal = r.status === 'hosting' || r.status === 'declined' || r.status === 'done' || r.status === 'bounced' || r.status === 'skipped';
                const isOpen = open === r.id;
                return (
                  <tr key={r.id} className="border-t border-[#161616]/10">
                    <td className={td}>
                      <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} className="font-bold text-left text-[#161616] underline decoration-[#161616]/30 underline-offset-2">
                        {r.name}
                      </button>
                      {r.email && <p className="font-mono text-[11px] text-[#3A3733]">{r.email}</p>}
                      {!r.email && r.contact_path && (
                        <a href={r.contact_path} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-[#0b3b44] underline break-all">
                          {r.contact_type}: {r.contact_path}
                        </a>
                      )}
                      {isOpen && (
                        <div className="mt-2 max-w-md space-y-1 font-body text-xs text-[#3A3733]">
                          {r.audience && <p><span className="font-bold text-[#161616]">Audience:</span> {r.audience}</p>}
                          {r.platforms && <p><span className="font-bold text-[#161616]">Platforms:</span> {r.platforms}</p>}
                          {r.sells && <p><span className="font-bold text-[#161616]">Sells:</span> {r.sells}</p>}
                          {r.hook && <p><span className="font-bold text-[#161616]">Hook:</span> {r.hook}</p>}
                          {r.notes && <p><span className="font-bold text-[#161616]">Notes:</span> {r.notes}</p>}
                          {r.host_slug && <p><span className="font-bold text-[#161616]">Host:</span> {r.host_slug}</p>}
                          {hand && r.message && (
                            <pre className="whitespace-pre-wrap font-body text-xs text-[#161616] bg-[#FBF6EA] border border-[#161616]/20 rounded-lg p-3 mt-2">{r.message}</pre>
                          )}
                        </div>
                      )}
                      {rowError[r.id] && <p className="font-body text-xs text-[#E0301E] mt-1">{rowError[r.id]}</p>}
                    </td>
                    <td className={td}>{r.brand || ''}</td>
                    <td className={`${td} font-mono text-xs`}>{r.vertical}</td>
                    <td className={`${td} font-mono`}>{r.fit}</td>
                    <td className={`${td} font-mono`}>{r.tier}</td>
                    <td className={td}><Chip value={r.status} /></td>
                    <td className={`${td} font-mono`}>{r.step} / 3</td>
                    <td className={`${td} font-mono text-xs whitespace-nowrap`}>{hand ? 'by hand' : fmtDateTime(r.next_at) || ''}</td>
                    <td className={`${td} font-mono text-xs whitespace-nowrap`}>{fmtDateTime(r.last_sent_at) || ''}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                        {hand ? (
                          <>
                            <button type="button" onClick={() => r.message && copy(r.message, r.id)} disabled={!r.message} className={btnGold}>
                              {labelFor(r.id, 'Copy message')}
                            </button>
                            {r.contact_path && (
                              <a href={r.contact_path} target="_blank" rel="noopener noreferrer" className={btn}>
                                Open {r.contact_type}
                              </a>
                            )}
                          </>
                        ) : (
                          !terminal && r.step < 3 && (
                            <button type="button" onClick={() => act(r, 'send')} disabled={busy === `${r.id}:send` || !r.email} className={btnGold}>
                              {busy === `${r.id}:send` ? 'Sending' : 'Send now'}
                            </button>
                          )
                        )}
                        {r.status !== 'replied' && r.status !== 'hosting' && (
                          <button type="button" onClick={() => act(r, 'replied')} disabled={busy === `${r.id}:replied`} className={btn}>
                            Mark replied
                          </button>
                        )}
                        {r.status !== 'hosting' && (
                          <button type="button" onClick={() => act(r, 'hosting')} disabled={busy === `${r.id}:hosting`} className={btn}>
                            Mark hosting
                          </button>
                        )}
                        {r.status !== 'skipped' && r.status !== 'hosting' && (
                          <button type="button" onClick={() => act(r, 'skip')} disabled={busy === `${r.id}:skip`} className={btn}>
                            Skip
                          </button>
                        )}
                        {r.status !== 'queued' && (
                          <button type="button" onClick={() => act(r, 'requeue')} disabled={busy === `${r.id}:requeue`} className={btn}>
                            Requeue
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
