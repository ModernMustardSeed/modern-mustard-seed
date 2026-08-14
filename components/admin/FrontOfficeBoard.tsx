'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

/**
 * THE DELIVERY BOARD FOR EVERY FRONT OFFICE.
 *
 * Ordered by what is BLOCKING, not by what is newest, because this screen has
 * one job: show Sarah whose phone we have promised to answer and are not
 * answering yet. An office nobody has finished is worse than one nobody has
 * started, so those sort to the top and say exactly what they are waiting on.
 */

type Gate = { ok: boolean; blockers: string[] };
type Readiness = { canSync: Gate; canTest: Gate; canBuyNumber: Gate; canGoLive: Gate; summary: string };

type Office = {
  id: string;
  business_name: string;
  client_email: string;
  status: string;
  agent_phone: string | null;
  forward_from: string | null;
  forward_mode: string;
  voice_gender: string;
  languages: string[];
  vapi_assistant_id: string | null;
  created_at: string;
  week: { total: number; booked: number; needsHuman: number };
  teamSize: number;
  billing_status: string;
  test_call_at: string | null;
  test_call_passed: boolean | null;
  phone_purchased_at: string | null;
  readiness: Readiness;
  suggestedAreaCode: string | null;
};

export default function FrontOfficeBoard() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState<{ id: string; instructions: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/front-office');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not load the board.');
      setOffices(((await res.json()) as { offices: Office[] }).offices);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the board.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (officeId: string, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(`${officeId}:${action}`);
    setNotice('');
    setError('');
    try {
      const res = await fetch('/api/admin/front-office', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ officeId, action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'That did not work.');
      if (action === 'preview') setPreview({ id: officeId, instructions: json.instructions });
      else {
        setNotice(`${action} done.`);
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setBusy('');
    }
  };

  // Closest to going live first. An office one step away is where the next
  // hour is best spent; one waiting on the customer's card is not.
  const sorted = [...offices].sort((a, b) => {
    const d = a.readiness.canGoLive.blockers.length - b.readiness.canGoLive.blockers.length;
    if (d !== 0) return d;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });

  const live = offices.filter((o) => o.status === 'live').length;
  const waiting = offices.filter((o) => !o.readiness.canGoLive.ok && o.status !== 'live').length;
  const readyNow = offices.filter((o) => o.readiness.canGoLive.ok && o.status !== 'live').length;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="front-office" title="Front Office" onRefresh={() => void load()} />
      <main className="mx-auto max-w-[86rem] px-5 py-6 md:px-6">
        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        <div className="mb-6 grid gap-3 sm:grid-cols-5">
          <Tile label="Offices" value={offices.length} />
          <Tile label="Answering" value={live} tone="seed" />
          <Tile label="Ready to go live" value={readyNow} tone={readyNow > 0 ? 'seed' : 'ink'} />
          <Tile label="Not ready" value={waiting} tone={waiting > 0 ? 'red' : 'ink'} />
          <Tile label="Calls this week" value={offices.reduce((s, o) => s + o.week.total, 0)} />
        </div>

        {!offices.length && (
          <p className="rounded-xl border-2 border-[#161616] bg-white p-5 text-[15px] text-[#161616]/70">
            No Front Offices yet. One is created automatically the moment somebody buys a voice agent.
          </p>
        )}

        <div className="space-y-4">
          {sorted.map((o) => (
            <div key={o.id} className="rounded-2xl border-2 border-[#161616] bg-white p-5 shadow-[5px_5px_0_0_#161616]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[20px] font-bold leading-tight">{o.business_name}</h2>
                  <p className="font-mono text-[11px] text-[#161616]/55">{o.client_email}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-lg border-2 border-[#161616] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
                      o.status === 'live' ? 'bg-[#F5B700]' : o.readiness.canGoLive.ok ? 'bg-white' : 'bg-[#E0301E]/10'
                    }`}
                  >
                    {o.status}
                  </span>
                  <p className="mt-1.5 max-w-[16rem] text-[12px] text-[#161616]/60">{o.readiness.summary}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
                <Fact label="Number" value={o.agent_phone ?? 'not bought yet'} />
                <Fact label="Forwards from" value={o.forward_from ?? 'not set'} />
                <Fact label="Answers" value={o.forward_mode.replace(/_/g, ' ')} />
                <Fact label="Voice" value={`${o.voice_gender}, ${o.languages.join('/')}`} />
                <Fact label="Team" value={`${o.teamSize} to transfer to`} />
                <Fact label="Billing" value={o.billing_status} tone={o.billing_status === 'active' ? undefined : 'red'} />
                <Fact
                  label="Tested"
                  value={o.test_call_passed === true ? 'passed' : o.test_call_passed === false ? 'FAILED' : o.test_call_at ? 'not judged yet' : 'never'}
                  tone={o.test_call_passed === true ? undefined : 'red'}
                />
                <Fact label="This week" value={`${o.week.total} calls, ${o.week.booked} booked`} />
                {o.week.needsHuman > 0 && <Fact label="Needs a human" value={String(o.week.needsHuman)} tone="red" />}
              </div>

              {!o.readiness.canGoLive.ok && o.status !== 'live' && (
                <div className="mt-3 rounded-lg border-2 border-[#E0301E] bg-[#E0301E]/[0.06] p-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#E0301E]">Before this can answer their calls</p>
                  <ul className="mt-1 space-y-0.5">
                    {o.readiness.canGoLive.blockers.map((b) => (
                      <li key={b} className="text-[13px] text-[#161616]/80">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* The order is the real sequence: build it, hear it, judge it,
                  and only then spend money and point real customers at it.
                  Every button is disabled by the SAME gate the server enforces,
                  so the screen can never offer what the API would refuse. */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Btn onClick={() => void act(o.id, 'sync')} busy={busy === `${o.id}:sync`} gate={o.readiness.canSync}>
                  {o.vapi_assistant_id ? 'Update agent' : 'Build agent'}
                </Btn>
                <Btn onClick={() => void act(o.id, 'preview')} busy={busy === `${o.id}:preview`} ghost>
                  Read what it will say
                </Btn>
                <TestBtn gate={o.readiness.canTest} onCall={(to) => void act(o.id, 'test-call', { to })} />
                {o.test_call_at && o.test_call_passed === null && (
                  <>
                    <Btn onClick={() => void act(o.id, 'judge-test', { passed: true })} busy={busy === `${o.id}:judge-test`}>
                      It sounded good
                    </Btn>
                    <Btn onClick={() => void act(o.id, 'judge-test', { passed: false })} busy={busy === `${o.id}:judge-test`} ghost>
                      Not good enough
                    </Btn>
                  </>
                )}
                {!o.agent_phone && (
                  <Btn
                    onClick={() => void act(o.id, 'buy-number', { areaCode: o.suggestedAreaCode })}
                    busy={busy === `${o.id}:buy-number`}
                    gate={o.readiness.canBuyNumber}
                  >
                    Buy the line{o.suggestedAreaCode ? ` (${o.suggestedAreaCode})` : ''}
                  </Btn>
                )}
                <ForwardBtn onSet={(forwardFrom) => void act(o.id, 'set-forwarding', { forwardFrom })} />
                {o.status === 'live' ? (
                  <Btn onClick={() => void act(o.id, 'pause')} busy={busy === `${o.id}:pause`} ghost>
                    Pause
                  </Btn>
                ) : (
                  <Btn onClick={() => void act(o.id, 'go-live')} busy={busy === `${o.id}:go-live`} gate={o.readiness.canGoLive}>
                    Go live
                  </Btn>
                )}
                {o.agent_phone && o.phone_purchased_at && (
                  <Btn onClick={() => void act(o.id, 'release-number', { reason: 'released from the board' })} busy={busy === `${o.id}:release-number`} ghost>
                    Release the line
                  </Btn>
                )}
              </div>

              {preview?.id === o.id && (
                <pre className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border-2 border-[#161616]/20 bg-[#FBF6EA] p-3 font-mono text-[11.5px] leading-relaxed">
                  {preview.instructions}
                </pre>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Btn({
  children,
  onClick,
  busy,
  ghost,
  gate,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  ghost?: boolean;
  gate?: Gate;
}) {
  const blocked = gate ? !gate.ok : false;
  return (
    <button
      onClick={onClick}
      disabled={busy || blocked}
      // A disabled button with no explanation reads as a bug. The tooltip
      // carries the exact reason the server would have given.
      title={blocked ? gate!.blockers.join('; ') : undefined}
      className={`rounded-lg border-2 border-[#161616] px-3 py-1.5 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${
        ghost ? 'bg-white hover:bg-[#FBF6EA]' : 'bg-[#F5B700] shadow-[3px_3px_0_0_#161616]'
      }`}
    >
      {busy ? '...' : children}
    </button>
  );
}

/** Ring the agent, at a number typed by whoever is about to listen to it. */
function TestBtn({ gate, onCall }: { gate: Gate; onCall: (to: string) => void }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  if (!open) {
    return (
      <Btn onClick={() => setOpen(true)} gate={gate} ghost>
        Test call
      </Btn>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Call me at..." className="rounded-lg border-2 border-[#161616] px-2 py-1.5 text-[13px]" />
      <button
        onClick={() => {
          onCall(to);
          setOpen(false);
        }}
        className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 text-[13px] font-bold shadow-[3px_3px_0_0_#161616]"
      >
        Ring it
      </button>
    </div>
  );
}

/** Which of THEIR numbers forwards to us. The last step before go-live. */
function ForwardBtn({ onSet }: { onSet: (from: string) => void }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border-2 border-[#161616] bg-white px-3 py-1.5 text-[13px] font-bold hover:bg-[#FBF6EA]">
        Forwarding
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Their number" className="rounded-lg border-2 border-[#161616] px-2 py-1.5 text-[13px]" />
      <button
        onClick={() => {
          onSet(from);
          setOpen(false);
        }}
        className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 text-[13px] font-bold shadow-[3px_3px_0_0_#161616]"
      >
        Save
      </button>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: 'seed' | 'red' | 'ink' }) {
  return (
    <div className={`rounded-xl border-2 border-[#161616] p-3.5 ${tone === 'seed' ? 'bg-[#F5B700]' : 'bg-white'}`}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60">{label}</p>
      <p className={`mt-1 font-display text-3xl font-extrabold leading-none ${tone === 'red' ? 'text-[#E0301E]' : ''}`}>{value}</p>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'red' }) {
  return (
    <p className={tone === 'red' ? 'text-[#E0301E] font-semibold' : ''}>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#161616]/50">{label}: </span>
      {value}
    </p>
  );
}
