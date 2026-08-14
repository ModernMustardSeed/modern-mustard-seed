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
  blocking: string[];
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

  // Blocked first, then live, then everything else. The work queue, in order.
  const sorted = [...offices].sort((a, b) => {
    if (a.blocking.length !== b.blocking.length) return b.blocking.length - a.blocking.length;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });

  const live = offices.filter((o) => o.status === 'live').length;
  const waiting = offices.filter((o) => o.blocking.length > 0).length;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="front-office" title="Front Office" onRefresh={() => void load()} />
      <main className="mx-auto max-w-[86rem] px-5 py-6 md:px-6">
        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Tile label="Offices" value={offices.length} />
          <Tile label="Answering" value={live} tone="seed" />
          <Tile label="Waiting on us" value={waiting} tone={waiting > 0 ? 'red' : 'ink'} />
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
                <span
                  className={`rounded-lg border-2 border-[#161616] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
                    o.status === 'live' ? 'bg-[#F5B700]' : o.blocking.length ? 'bg-[#E0301E]/10' : 'bg-white'
                  }`}
                >
                  {o.status}
                </span>
              </div>

              <div className="mt-3 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
                <Fact label="Number" value={o.agent_phone ?? 'not assigned'} />
                <Fact label="Forwards from" value={o.forward_from ?? 'not set'} />
                <Fact label="Answers" value={o.forward_mode.replace(/_/g, ' ')} />
                <Fact label="Voice" value={`${o.voice_gender}, ${o.languages.join('/')}`} />
                <Fact label="Team" value={`${o.teamSize} to transfer to`} />
                <Fact label="This week" value={`${o.week.total} calls, ${o.week.booked} booked`} />
                {o.week.needsHuman > 0 && <Fact label="Needs a human" value={String(o.week.needsHuman)} tone="red" />}
              </div>

              {o.blocking.length > 0 && (
                <div className="mt-3 rounded-lg border-2 border-[#E0301E] bg-[#E0301E]/[0.06] p-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#E0301E]">Waiting on us</p>
                  <ul className="mt-1 space-y-0.5">
                    {o.blocking.map((b) => (
                      <li key={b} className="text-[13px] text-[#161616]/80">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Btn onClick={() => void act(o.id, 'sync')} busy={busy === `${o.id}:sync`}>
                  {o.vapi_assistant_id ? 'Update agent' : 'Build agent'}
                </Btn>
                <Btn onClick={() => void act(o.id, 'preview')} busy={busy === `${o.id}:preview`} ghost>
                  Read what it will say
                </Btn>
                <PhoneBtn onAssign={(phone, vapiPhoneNumberId) => void act(o.id, 'assign-phone', { phone, vapiPhoneNumberId })} />
                {o.status === 'live' ? (
                  <Btn onClick={() => void act(o.id, 'pause')} busy={busy === `${o.id}:pause`} ghost>
                    Pause
                  </Btn>
                ) : (
                  <Btn onClick={() => void act(o.id, 'go-live')} busy={busy === `${o.id}:go-live`}>
                    Go live
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

function PhoneBtn({ onAssign }: { onAssign: (phone: string, vapiId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [vapiId, setVapiId] = useState('');
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border-2 border-[#161616] bg-white px-3 py-1.5 text-[13px] font-bold hover:bg-[#FBF6EA]">
        Assign number
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(406) 555-0100" className="rounded-lg border-2 border-[#161616] px-2 py-1.5 text-[13px]" />
      <input value={vapiId} onChange={(e) => setVapiId(e.target.value)} placeholder="Vapi phone number id" className="rounded-lg border-2 border-[#161616] px-2 py-1.5 text-[13px]" />
      <button
        onClick={() => {
          onAssign(phone, vapiId);
          setOpen(false);
        }}
        className="rounded-lg border-2 border-[#161616] bg-[#F5B700] px-3 py-1.5 text-[13px] font-bold shadow-[3px_3px_0_0_#161616]"
      >
        Save
      </button>
    </div>
  );
}

function Btn({ children, onClick, busy, ghost }: { children: React.ReactNode; onClick: () => void; busy?: boolean; ghost?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`rounded-lg border-2 border-[#161616] px-3 py-1.5 text-[13px] font-bold disabled:opacity-50 ${
        ghost ? 'bg-white hover:bg-[#FBF6EA]' : 'bg-[#F5B700] shadow-[3px_3px_0_0_#161616]'
      }`}
    >
      {busy ? '...' : children}
    </button>
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
