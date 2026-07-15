'use client';

/**
 * FORGE UNDER YOUR FLAG: the shared mint form. Two callers, one component:
 *   - /partners/hq/forge  (endpoint /api/partners/forge, variant 'partner')
 *   - /admin/hq/forge     (endpoint /api/admin/hq/forge,  variant 'admin')
 *
 * The signature moment: a successful mint PUNCHES A TICKET. The form panel
 * stamps down, a perforated brass ticket slides out of the slot with the
 * business name on it, and the status line burns "IN THE FORGE" while the
 * suite builds. Pop-art cabin tokens throughout (see brands/mms.md).
 */

import { useCallback, useEffect, useState } from 'react';

type Variant = 'partner' | 'admin';

type StationState = {
  canForge?: boolean;
  agreementAccepted?: boolean;
  qaApproved?: number;
  qaLift?: number;
  remainingToday?: number;
  remainingWeek?: number;
  dailyCap?: number;
  weeklyCap?: number;
  mints?: Mint[];
};

type Mint = {
  id: string;
  business: string;
  city: string | null;
  state?: string | null;
  createdAt: string;
  siteStatus: string | null;
  qaPending?: boolean;
  hubUrl: string | null;
  mintedBy?: string | null;
};

type Ticket = {
  business: string;
  qaHeld: boolean;
  hubUrl: string | null;
  duplicate?: boolean;
  message?: string;
};

const NICHES = [
  { value: 'home_service', label: 'Home services' },
  { value: 'restaurant', label: 'Restaurant / food' },
  { value: 'dental_medspa', label: 'Health / med spa' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'other', label: 'Something else' },
] as const;

const inputCls =
  'w-full bg-white border-2 border-[#161616] rounded-xl px-3.5 py-2.5 font-body text-[15px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700] focus:ring-offset-1';
const labelCls = 'block text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold mb-1.5';

export default function ForgeMintForm({ endpoint, variant }: { endpoint: string; variant: Variant }) {
  const [station, setStation] = useState<StationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAgreement, setNeedsAgreement] = useState(false);
  const [agree, setAgree] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [form, setForm] = useState({
    business: '', contact: '', phone: '', email: '', city: '', state: '', website: '', niche: 'home_service', notes: '',
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (res.ok) setStation(await res.json());
      else setStation({});
    } catch {
      setStation({});
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { void refresh(); }, [refresh]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function mint(e: React.FormEvent) {
    e.preventDefault();
    if (minting) return;
    setMinting(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...(needsAgreement ? { agree } : {}) }),
      });
      const json = await res.json();
      if (res.status === 428) {
        setNeedsAgreement(true);
        setError(json.message || 'Accept the partner demo agreement to light the forge.');
        return;
      }
      if (!res.ok) {
        setError(json.message || 'The forge choked on that one. Try again in a minute.');
        return;
      }
      if (json.duplicate) {
        setTicket({ business: form.business, qaHeld: false, hubUrl: json.existing?.hubUrl || null, duplicate: true, message: json.message });
      } else {
        setTicket({ business: json.business || form.business, qaHeld: Boolean(json.qaHeld), hubUrl: json.hubUrl || null });
        setForm({ business: '', contact: '', phone: '', email: '', city: '', state: '', website: '', niche: 'home_service', notes: '' });
      }
      void refresh();
    } catch {
      setError('The forge is unreachable. Give it a minute.');
    } finally {
      setMinting(false);
    }
  }

  if (loading) {
    return <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-8 text-center font-mono text-xs uppercase tracking-[0.3em] text-[#161616]/50">Warming the forge…</div>;
  }

  if (variant === 'partner' && station && station.canForge === false) {
    return (
      <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-8 text-center">
        <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Invite only</span>
        <h3 className="font-display text-2xl font-bold mt-2">The forge is not lit for you yet</h3>
        <p className="font-body text-[#3A3733] mt-3 max-w-md mx-auto">
          Minting a demo suite spends real build time, so we grant it partner by partner. Reply to any email from Sarah and ask for forge access; most partners get it after their first conversation.
        </p>
      </div>
    );
  }

  const remainingToday = station?.remainingToday ?? null;
  const remainingWeek = station?.remainingWeek ?? null;
  const outOfSlots = remainingToday === 0 || remainingWeek === 0;

  return (
    <div className="space-y-8">
      <style>{`
        @keyframes forgeStamp{0%{transform:translateY(-6px) scale(1.01)}60%{transform:translateY(2px) scale(.995)}100%{transform:none}}
        @keyframes ticketOut{0%{transform:translateY(24px) rotate(0deg);opacity:0}60%{transform:translateY(-6px) rotate(-2.5deg);opacity:1}100%{transform:translateY(0) rotate(-2deg);opacity:1}}
        @keyframes forgeGlow{0%,100%{opacity:.55}50%{opacity:1}}
      `}</style>

      {/* Slots strip */}
      {(remainingToday != null || remainingWeek != null) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/60">Forge slots</span>
          {remainingToday != null && (
            <span className={`text-[10px] uppercase tracking-[0.15em] font-mono font-bold border-2 border-[#161616] rounded-full px-2.5 py-0.5 shadow-[2px_2px_0_0_#161616] ${remainingToday > 0 ? 'bg-[#F5B700] text-[#161616]' : 'bg-[#161616] text-[#FBF6EA]'}`}>
              {remainingToday} of {station?.dailyCap} today
            </span>
          )}
          {remainingWeek != null && (
            <span className={`text-[10px] uppercase tracking-[0.15em] font-mono font-bold border-2 border-[#161616] rounded-full px-2.5 py-0.5 shadow-[2px_2px_0_0_#161616] ${remainingWeek > 0 ? 'bg-white text-[#161616]' : 'bg-[#161616] text-[#FBF6EA]'}`}>
              {remainingWeek} of {station?.weeklyCap} this week
            </span>
          )}
          {variant === 'partner' && station?.qaLift != null && (station?.qaApproved ?? 0) < station.qaLift && (
            <span className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold border-2 border-[#161616] rounded-full px-2.5 py-0.5 bg-white text-[#161616]/70">
              First {station.qaLift} mints get a human polish pass
            </span>
          )}
        </div>
      )}

      {/* The ticket (signature moment) */}
      {ticket && (
        <div className="relative" aria-live="polite">
          <div
            className="mx-auto max-w-md bg-[#F5B700] border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] px-6 py-5 animate-[ticketOut_.7s_cubic-bezier(.2,.9,.3,1.2)_both]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 0 50%, #FBF6EA 9px, transparent 10px), radial-gradient(circle at 100% 50%, #FBF6EA 9px, transparent 10px)',
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-[#161616]/50 pb-3">
              <span className="text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-[#161616]/70">
                {ticket.duplicate ? 'Already claimed' : 'Forge ticket'}
              </span>
              <span className="text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-[#E0301E]">№ {new Date().getFullYear()}</span>
            </div>
            <p className="font-display text-2xl font-bold mt-3 leading-tight">{ticket.business}</p>
            {ticket.duplicate ? (
              <p className="font-body text-sm text-[#161616]/80 mt-2">{ticket.message}</p>
            ) : ticket.qaHeld ? (
              <p className="font-body text-sm text-[#161616]/80 mt-2">
                In the forge now. Your first mints get a human polish pass; the hand-off email lands in your inbox the moment this one clears (usually same day).
              </p>
            ) : (
              <p className="font-body text-sm text-[#161616]/80 mt-2">
                In the forge now. The receptionist and command center are live in about a minute; the website lands at the same hub in roughly twenty. Your hand-off email is on its way.
              </p>
            )}
            <div className="flex items-center justify-between mt-4">
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]">
                <span className="w-2 h-2 rounded-full bg-[#E0301E] animate-[forgeGlow_1.4s_ease-in-out_infinite]" />
                {ticket.duplicate ? 'On the floor' : 'In the forge'}
              </span>
              {ticket.hubUrl && (
                <a href={ticket.hubUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-sans font-bold uppercase tracking-[0.15em] text-[#161616] underline underline-offset-4 decoration-2">
                  Open the suite
                </a>
              )}
            </div>
          </div>
          <button
            onClick={() => setTicket(null)}
            className="block mx-auto mt-3 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/50 hover:text-[#161616]"
          >
            Forge another
          </button>
        </div>
      )}

      {/* The form */}
      {!ticket && (
        <form onSubmit={mint} className={`bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-6 md:p-8 ${minting ? 'animate-[forgeStamp_.5s_ease-out_both]' : ''}`}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="ff-business">Business name (as on their sign)</label>
              <input id="ff-business" className={inputCls} value={form.business} onChange={set('business')} required maxLength={90} placeholder="Blue Parrot Oceanfront Cafe" />
            </div>
            <div>
              <label className={labelCls} htmlFor="ff-contact">Owner&apos;s name</label>
              <input id="ff-contact" className={inputCls} value={form.contact} onChange={set('contact')} required maxLength={80} placeholder="Steve Rash" />
            </div>
            <div>
              <label className={labelCls} htmlFor="ff-phone">Business phone</label>
              <input id="ff-phone" className={inputCls} value={form.phone} onChange={set('phone')} required maxLength={30} placeholder="(406) 555-0188" inputMode="tel" />
            </div>
            <div>
              <label className={labelCls} htmlFor="ff-website">Their website or Facebook page</label>
              <input id="ff-website" className={inputCls} value={form.website} onChange={set('website')} required maxLength={200} placeholder="blueparrot.com or facebook.com/…" />
            </div>
            <div>
              <label className={labelCls} htmlFor="ff-email">Owner&apos;s email (optional)</label>
              <input id="ff-email" className={inputCls} value={form.email} onChange={set('email')} maxLength={120} placeholder="owner@business.com" inputMode="email" />
            </div>
            <div>
              <label className={labelCls} htmlFor="ff-city">City</label>
              <input id="ff-city" className={inputCls} value={form.city} onChange={set('city')} maxLength={60} placeholder="Kalispell" />
            </div>
            <div>
              <label className={labelCls} htmlFor="ff-state">State</label>
              <input id="ff-state" className={inputCls} value={form.state} onChange={set('state')} maxLength={2} placeholder="MT" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="ff-niche">What kind of business</label>
              <select id="ff-niche" className={inputCls} value={form.niche} onChange={set('niche')}>
                {NICHES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="ff-notes">What should the build brag about? (optional)</label>
              <textarea id="ff-notes" className={`${inputCls} min-h-[88px]`} value={form.notes} onChange={set('notes')} maxLength={600} placeholder="Best huckleberry pancakes on the lake, family-run since 1998, they never answer the phone during rush…" />
            </div>
          </div>

          {needsAgreement && (
            <label className="flex items-start gap-3 mt-5 bg-[#FBF6EA] border-2 border-[#161616] rounded-xl p-4 cursor-pointer">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#F5B700]" />
              <span className="font-body text-sm text-[#3A3733]">
                I have read the{' '}
                <a href="/downloads/mms-partner-forge-agreement.pdf" target="_blank" rel="noopener noreferrer" className="text-[#1E50C8] underline underline-offset-2">
                  Partner Demo Agreement
                </a>{' '}
                (one page): demos carry the Modern Mustard Seed mark, commissions follow the posted schedule, and either of us can end this anytime.
              </span>
            </label>
          )}

          {error && (
            <p className="mt-4 font-body text-sm text-[#E0301E] bg-[#E0301E]/5 border-2 border-[#E0301E]/30 rounded-xl px-4 py-3" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={minting || outOfSlots || (needsAgreement && !agree)}
            className="mt-6 w-full sm:w-auto px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {minting ? 'Forging…' : outOfSlots ? 'Out of forge slots' : 'Forge their suite'}
          </button>
          <p className="font-body text-xs text-[#161616]/50 mt-3">
            Free for them, no strings. The suite is real: an AI receptionist that answers as their business, a designed-from-scratch website, and a command center demo.
          </p>
        </form>
      )}

      {/* Minted history */}
      {station?.mints && station.mints.length > 0 && (
        <div>
          <h3 className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-3">
            {variant === 'partner' ? 'Your mints' : 'Team mints'}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {station.mints.map((m) => (
              <div key={m.id} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-lg font-semibold leading-tight">{m.business}</p>
                  <span className={`shrink-0 text-[9px] uppercase tracking-[0.15em] font-mono font-bold border-2 border-[#161616] rounded-full px-2 py-0.5 ${m.qaPending ? 'bg-white text-[#161616]/60' : m.siteStatus === 'ready' ? 'bg-[#F5B700]' : 'bg-[#FBF6EA]'}`}>
                    {m.qaPending ? 'Polish pass' : m.siteStatus === 'ready' ? 'Suite live' : 'Forging'}
                  </span>
                </div>
                <p className="font-body text-xs text-[#3A3733] mt-1">
                  {[m.city, m.state].filter(Boolean).join(', ') || '—'} · {new Date(m.createdAt).toLocaleDateString()}
                  {m.mintedBy ? ` · by ${m.mintedBy}` : ''}
                </p>
                {m.hubUrl && (
                  <a href={m.hubUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-[10px] font-sans font-bold uppercase tracking-[0.15em] text-[#1E50C8] underline underline-offset-4 decoration-2">
                    Open suite
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
