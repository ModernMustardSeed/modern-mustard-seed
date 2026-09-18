'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { PostingTile, LeadsCard, ArticlesCard } from '@/components/portal/PortalExtras';
import { ConversationsCard, DomainsCard, AccountsCard } from '@/components/portal/CommandCenter';
import { TodayCard, CampaignsCard, MailCard } from '@/components/portal/CommandCenterMore';
import { ProjectPhotosCard, ReviewsCard } from '@/components/portal/CommandCenterOps';
import Appointments from '@/components/portal/Appointments';
import ContactsCard from '@/components/portal/ContactsCard';
import { PortalAssistant } from '@/components/portal/ClientPortal';

/**
 * THEIR SHELL, NOT OURS. The Command Center cards are the portal's cards,
 * unchanged; what changes is the door: their name, their logo, their green
 * and sienna, their type, and a guide that introduces itself as theirs. The
 * skin below remaps the portal's mustard, red and blue to their colours by
 * class name, so no card had to be rewritten to look like it belongs here.
 * Only the footer credit says who built it.
 */
type Office = { name: string; business: string; host: string; logo: string; logoOnDark: string; colors: { ink: string; paper: string; accent: string; accent2: string }; guideName: string; siteUrl: string; publicUrl: string };
type Data = { email: string; client: { name: string | null } | null; audience: string; posting?: boolean; commandCenter?: boolean; office?: Office | null };

export default function OfficeShell() {
  const [state, setState] = useState<'loading' | 'login' | 'waiting' | 'ready' | 'none'>('loading');
  const [data, setData] = useState<Data | null>(null);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/data', { cache: 'no-store' });
      if (r.status === 401) {
        setState('login');
        return;
      }
      const j = (await r.json()) as Data;
      setData(j);
      if (!j.office) setState('none');
      else if (!j.commandCenter) setState('waiting');
      else setState('ready');
    } catch {
      setState('login');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, refresh]);

  const office = data?.office ?? null;
  const c = office?.colors ?? { ink: '#161616', paper: '#f6f3ee', accent: '#48603c', accent2: '#9b4f2f' };
  const firstName = (data?.client?.name ?? data?.email ?? '').split(/[\s@]/)[0] || 'there';

  const skin = `
    .office-skin{--ink:${c.ink};--paper:${c.paper};--accent:${c.accent};--accent2:${c.accent2}}
    .office-skin{background:var(--paper);color:var(--ink);font-family:Jost,"Source Sans 3",system-ui,sans-serif}
    .office-skin .font-display,.office-skin h1,.office-skin h2,.office-skin h3{font-family:"Cormorant Garamond",Georgia,serif;letter-spacing:0}
    .office-skin .font-mono{font-family:Jost,system-ui,sans-serif;letter-spacing:.18em}
    .office-skin .bg-\\[\\#F5B700\\]{background-color:var(--accent)!important;color:#fff!important}
    .office-skin .bg-\\[\\#F5B700\\]\\/50{background-color:color-mix(in srgb,var(--accent) 35%,#fff)!important}
    .office-skin .bg-\\[\\#F5B700\\]\\/25{background-color:color-mix(in srgb,var(--accent) 20%,#fff)!important}
    .office-skin .text-\\[\\#C4160B\\],.office-skin .text-\\[\\#E0301E\\],.office-skin .text-\\[\\#C4380C\\]{color:var(--accent2)!important}
    .office-skin .text-\\[\\#1E50C8\\]{color:var(--accent)!important}
    .office-skin .bg-\\[\\#FBF6EA\\]{background-color:#faf8f3!important}
    .office-skin .border-\\[\\#C4160B\\]{border-color:var(--accent2)!important}
    .office-skin .shadow-\\[4px_4px_0_0_\\#161616\\],.office-skin .shadow-\\[3px_3px_0_0_\\#161616\\],.office-skin .shadow-\\[6px_6px_0_0_\\#161616\\],.office-skin .shadow-\\[2px_2px_0_0_\\#161616\\]{box-shadow:0 1px 2px rgba(22,22,22,.06),0 10px 30px rgba(22,22,22,.08)!important}
    .office-skin .border-2.border-\\[\\#161616\\]{border-color:rgba(22,22,22,.14)!important}
    .office-skin .rounded-2xl{border-radius:14px}
    .office-skin .halftone-bg{background-image:none}
  `;

  return (
    <div className="office-skin min-h-screen">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: skin }} />

      {state === 'loading' && <div className="min-h-screen flex items-center justify-center"><p className="font-body text-sm opacity-60">One moment.</p></div>}

      {state === 'login' && <OfficeLogin />}

      {state === 'none' && (
        <div className="min-h-screen flex items-center justify-center px-6 text-center">
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold mb-2">This is not your door</h1>
            <p className="font-body text-sm opacity-70">Your portal is at <a className="underline" href="/portal">modernmustardseed.com/portal</a>.</p>
          </div>
        </div>
      )}

      {(state === 'waiting' || state === 'ready') && office && (
        <>
          <header className="sticky top-0 z-30 border-b border-[rgba(22,22,22,.12)]" style={{ background: 'rgba(246,243,238,.94)', backdropFilter: 'blur(10px)' }}>
            <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
              <a href="/office" className="flex items-center gap-4 min-w-0">
                <img src={office.logo} alt={office.business} className="h-12 w-auto" />
                <span className="hidden sm:block">
                  <span className="block text-[10px] uppercase tracking-[0.3em] font-medium" style={{ color: c.accent2 }}>{office.business}</span>
                  <span className="block text-2xl font-semibold leading-none" style={{ fontFamily: '"Cormorant Garamond",Georgia,serif' }}>Command Center</span>
                </span>
              </a>
              <nav className="flex items-center gap-1 sm:gap-3">
                <a href={office.siteUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.2em] font-medium px-3 py-2" style={{ color: c.accent }}>Your website ↗</a>
                <a href="/api/portal/manual" target="_blank" rel="noopener noreferrer" className="hidden sm:inline text-[11px] uppercase tracking-[0.2em] font-medium px-3 py-2" style={{ color: c.accent }}>Manual</a>
                <button type="button" onClick={async () => { await fetch('/api/portal/logout', { method: 'POST' }); setState('login'); }} className="text-[11px] uppercase tracking-[0.2em] font-medium px-3 py-2 opacity-60 hover:opacity-100">Sign out</button>
              </nav>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-6 py-10">
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.3em] font-medium mb-2" style={{ color: c.accent2 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <h1 className="text-4xl sm:text-5xl font-semibold leading-tight" style={{ fontFamily: '"Cormorant Garamond",Georgia,serif' }}>Good to see you, {firstName}.</h1>
              <p className="font-body text-base opacity-70 mt-2 max-w-2xl">Everything that keeps {office.business} running, on one page. What is waiting on you is at the top.</p>
            </div>

            {state === 'waiting' ? (
              <section className="rounded-2xl bg-white p-8 max-w-2xl" style={{ boxShadow: '0 10px 30px rgba(22,22,22,.08)' }}>
                <p className="text-[10px] uppercase tracking-[0.3em] font-medium mb-1" style={{ color: c.accent2 }}>Almost</p>
                <h2 className="text-2xl font-semibold mb-2">Your Command Center is built and waiting for your yes</h2>
                <p className="font-body text-sm opacity-75 mb-4">Leads into Buildertrend, the chat conversations, QR codes for signs, review asks, project photos, your inbox sorted with replies drafted, every domain and its renewal, and a guide you can talk to. It turns on the day you tick it on your start page.</p>
                <div className="flex flex-wrap items-center gap-4">
                  <a href="https://built-right-prep.vercel.app/add" className="inline-block rounded-lg px-5 py-3 text-[11px] uppercase tracking-[0.2em] font-semibold text-white" style={{ background: c.accent }}>Turn it on</a>
                  <a href="/api/portal/manual" target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.2em] font-medium" style={{ color: c.accent }}>Read the manual first ↗</a>
                </div>
              </section>
            ) : null}

            {state === 'waiting' && (
              <div className="mt-8">
                <p className="text-[10px] uppercase tracking-[0.3em] font-medium mb-3" style={{ color: c.accent2 }}>Yours already, with the website</p>
                {data?.posting && <PostingTile />}
                <LeadsCard />
                <ArticlesCard />
              </div>
            )}

            {state === 'ready' && (
              <>
                <TodayCard />
                <Appointments />
                {data?.posting && <PostingTile />}
                <LeadsCard />
                <ContactsCard />
                <MailCard />
                <ConversationsCard />
                <CampaignsCard />
                <ReviewsCard />
                <ProjectPhotosCard />
                <ArticlesCard />
                <DomainsCard />
                <AccountsCard />
                <div className="mt-10">
                  <PortalAssistant firstName={firstName} audience={data?.audience ?? 'client'} intro={`Hi ${firstName}. I am ${office.guideName}. Ask me who is waiting on a call, which sign is being scanned, or what came in this week. Tell me to draft an email, send a review ask, mark a lead called, or make a QR code, and I will. Anything for Sarah, I pass straight to her.`} onNoteSent={() => setRefresh((n) => n + 1)} />
                </div>
              </>
            )}
          </main>

          <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-[rgba(22,22,22,.12)] flex flex-wrap items-center justify-between gap-4">
            <span className="font-body text-xs opacity-60">{office.business} · {office.host}</span>
            <a href="https://modernmustardseed.com" target="_blank" rel="noopener noreferrer" className="font-body text-xs font-semibold" style={{ color: '#F5B700' }}>Built by Modern Mustard Seed</a>
          </footer>
        </>
      )}
    </div>
  );
}

function OfficeLogin() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/portal/request-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), next: '/office', origin: window.location.origin }) });
      const j = (await res.json()) as { error?: string };
      if (res.ok) setSent(true);
      else setError(j.error ?? 'Something went wrong.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] font-medium mb-3" style={{ color: '#9b4f2f' }}>Built Right in Montana</p>
        <h1 className="text-4xl font-semibold mb-2" style={{ fontFamily: '"Cormorant Garamond",Georgia,serif' }}>Command Center</h1>
        <p className="font-body text-sm opacity-70 mb-8">Sign in with your email. No password; we send a one-tap link.</p>
        {sent ? (
          <div className="rounded-2xl bg-white p-8" style={{ boxShadow: '0 10px 30px rgba(22,22,22,.08)' }}>
            <h2 className="text-xl font-semibold mb-2">Check your email</h2>
            <p className="font-body text-sm opacity-75">If {email} is on file, a sign-in link is on its way. It works for 20 minutes.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl bg-white p-8 text-left" style={{ boxShadow: '0 10px 30px rgba(22,22,22,.08)' }}>
            <label className="block text-[10px] uppercase tracking-[0.3em] opacity-60 mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbusiness.com" autoFocus className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2" style={{ borderColor: 'rgba(22,22,22,.2)' }} />
            {error && <p className="text-xs mt-3" style={{ color: '#9b4f2f' }}>{error}</p>}
            <button type="submit" disabled={sending || !email.trim()} className="w-full mt-4 rounded-lg px-5 py-3 text-[11px] uppercase tracking-[0.2em] font-semibold text-white disabled:opacity-40" style={{ background: '#48603c' }}>
              {sending ? 'Sending' : 'Email me a sign-in link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
