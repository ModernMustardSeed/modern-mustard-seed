'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import PhotoDrop, { type Uploaded } from '@/components/portal/PhotoDrop';
import { PLATFORMS, PLATFORM_LABEL, type AccountView, type MaterialRow, type Platform, type PostRow, type SettingsRow } from '@/lib/posting/types';
import { prettyDate, prettyHour } from '@/lib/posting/time';

/**
 * THE POSTING DESK. One row per client on Daily Posting; open one and every
 * lever is on the page: connect by token, the bin, the calendar with every
 * caption editable, post now, hold, skip, and the hand-post ticks.
 */
type Overview = { settings: SettingsRow; today: { id: string; status: string; headline: string | null } | null; nextPlanned: string | null; freshPhotos: number; connected: Platform[] };
type Lead = { id: string; source: string; sources: string[]; name: string | null; phone: string | null; email: string | null; town: string | null; project_type: string | null; land: string | null; page: string | null; created_at: string };
type Detail = { settings: SettingsRow; today: string; posts: PostRow[]; materials: MaterialRow[]; accounts: AccountView[]; leads: Lead[]; env: { x: boolean; linkedin: boolean; google: boolean; facebookApp: boolean } };

const CARD = 'rounded-2xl border-2 border-[#161616] bg-white p-5 shadow-[5px_5px_0_0_#161616]';
const BTN = 'rounded-lg border-2 border-[#161616] bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform';
const BTN_GOLD = BTN.replace('bg-white', 'bg-[#F5B700]');
const BTN_RED = BTN.replace('bg-white', 'bg-[#E0301E]/10');
const INPUT = 'w-full rounded-lg border-2 border-[#161616]/40 bg-[#FBF6EA] px-3 py-2 text-[14px] text-[#161616] focus:border-[#161616] outline-none';

export default function PostingDesk() {
  const params = useSearchParams();
  const [clients, setClients] = useState<Overview[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selected, setSelected] = useState<string | null>(params.get('client'));
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/posting${selected ? `?client=${encodeURIComponent(selected)}` : ''}`);
    const j = (await res.json().catch(() => ({}))) as { clients?: Overview[]; detail?: Detail | null; error?: string };
    setClients(j.clients ?? []);
    setDetail(j.detail ?? null);
    if (j.error) setError(j.error);
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const c = params.get('connect');
    if (!c) return;
    if (c.includes('-ok:')) setNotice(`Connected: ${c.split(':').slice(1).join(':')}`);
    else setError(`Connection: ${c}`);
  }, [params]);

  const act = async (body: Record<string, unknown>, label?: string) => {
    setError(null);
    setBusy(label ?? body.action as string);
    try {
      const res = await fetch('/api/admin/posting', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client: selected, ...body }) });
      const j = (await res.json().catch(() => ({}))) as { error?: string; choices?: Array<{ id: string; name: string }> | null; page?: { name: string }; instagram?: { username: string | null } | null; username?: string; outcome?: unknown; locations?: Array<{ name: string; title: string }> };
      if (!res.ok) {
        setError(j.error ?? 'That did not go through.');
        return j;
      }
      await load();
      return j;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="posting" title="Daily Posting" onRefresh={() => void load()} />
      <main className="mx-auto max-w-[86rem] px-5 py-6 md:px-6">
        {error && <p className="mb-3 rounded-xl border-2 border-[#E0301E]/40 bg-[#E0301E]/10 px-4 py-2 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 rounded-xl border-2 border-[#3f5d34]/40 bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <Tile label="Clients posting" value={clients.filter((c) => c.settings.active).length} />
          <Tile label="Out today" value={clients.filter((c) => c.today && ['published', 'partial'].includes(c.today.status)).length} tone="seed" />
          <Tile label="Waiting on a hand" value={clients.filter((c) => c.today && ['failed', 'partial'].includes(c.today.status)).length} tone="red" />
          <Tile label="Fresh photos" value={clients.reduce((n, c) => n + c.freshPhotos, 0)} />
        </div>

        {!clients.length && <p className={`${CARD} text-[15px] text-[#161616]/70`}>Nobody is on Daily Posting yet. Run `node scripts/posting-seed-built-right.mjs` for the first client, or create one below.</p>}

        <div className="space-y-3 mb-8">
          {clients.map((c) => (
            <button
              key={c.settings.client_email}
              type="button"
              onClick={() => setSelected(c.settings.client_email === selected ? null : c.settings.client_email)}
              className={`w-full text-left ${CARD} ${selected === c.settings.client_email ? 'bg-[#F5B700]/20' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-[20px] font-bold leading-tight">{c.settings.business_name}</h2>
                  <p className="font-mono text-[11px] text-[#161616]/55">{c.settings.client_email} · {prettyHour(c.settings.post_hour_mt)} MT · {c.settings.platforms.map((p) => PLATFORM_LABEL[p]).join(', ')}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.12em]">
                  <span className={`rounded-lg border-2 border-[#161616] px-2 py-1 ${c.today?.status === 'published' ? 'bg-[#F5B700]' : c.today?.status === 'failed' ? 'bg-[#E0301E]/10' : 'bg-white'}`}>Today: {c.today ? c.today.status : 'no row'}</span>
                  <span className="rounded-lg border-2 border-[#161616] bg-white px-2 py-1">Connected: {c.connected.length ? c.connected.map((p) => PLATFORM_LABEL[p]).join(', ') : 'none'}</span>
                  <span className="rounded-lg border-2 border-[#161616] bg-white px-2 py-1">{c.freshPhotos} fresh</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {detail && selected && <ClientDetail d={detail} act={act} busy={busy} onNotice={setNotice} client={selected} />}
      </main>
    </div>
  );
}

function ClientDetail({ d, act, busy, onNotice, client }: { d: Detail; act: (b: Record<string, unknown>, label?: string) => Promise<Record<string, unknown>>; busy: string | null; onNotice: (s: string) => void; client: string }) {
  const s = d.settings;
  const [fbToken, setFbToken] = useState('');
  const [fbChoices, setFbChoices] = useState<Array<{ id: string; name: string }> | null>(null);
  const [xAccess, setXAccess] = useState('');
  const [xRefresh, setXRefresh] = useState('');
  const [gbpLocations, setGbpLocations] = useState<Array<{ name: string; title: string }> | null>(null);
  const [note, setNote] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [settings, setSettings] = useState<Partial<SettingsRow>>({});

  const connectFb = async (pageId?: string) => {
    const j = (await act({ action: 'facebook-token', token: fbToken, pageId }, 'fb')) as { choices?: Array<{ id: string; name: string }> | null; page?: { name: string }; instagram?: { username: string | null } | null };
    if (j.choices) setFbChoices(j.choices);
    else if (j.page) {
      setFbChoices(null);
      setFbToken('');
      onNotice(`Facebook connected: ${j.page.name}${j.instagram ? `, Instagram ${j.instagram.username ? `@${j.instagram.username}` : 'linked'}` : ', no Instagram business account on that Page'}`);
    }
  };

  const saveSettings = async () => {
    const patch: Record<string, unknown> = { ...settings };
    for (const k of ['towns', 'services', 'notify_emails'] as const) if (typeof patch[k] === 'string') patch[k] = (patch[k] as string).split(/\n|,/).map((x) => x.trim()).filter(Boolean);
    await act({ action: 'settings', ...patch }, 'settings');
    setSettings({});
    onNotice('Settings saved.');
  };

  const fresh = d.materials.filter((m) => m.kind === 'photo' && m.status === 'fresh');
  const brand = d.materials.filter((m) => m.kind === 'brand');
  const upcoming = d.posts.filter((p) => p.scheduled_for >= d.today).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  const past = d.posts.filter((p) => p.scheduled_for < d.today);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Calendar */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-display text-[18px] font-bold">Calendar</h3>
            <div className="flex gap-2">
              <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'plan', fromToday: true }, 'plan')}>Plan from today</button>
              <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'plan', force: true }, 'plan')}>Re-plan the next 3 days</button>
            </div>
          </div>
          <div className="space-y-3">
            {upcoming.map((p) => <AdminPost key={p.id} p={p} s={s} today={d.today} act={act} busy={busy} />)}
            {upcoming.length === 0 && <p className={`${CARD} text-sm text-[#161616]/60`}>Nothing planned ahead. Plan from today to fill the next four days.</p>}
          </div>
          {past.length > 0 && (
            <>
              <h4 className="mt-6 mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60">Past three weeks</h4>
              <div className="space-y-3">{past.map((p) => <AdminPost key={p.id} p={p} s={s} today={d.today} act={act} busy={busy} />)}</div>
            </>
          )}
        </section>

        {/* Leads */}
        <section className={CARD}>
          <h3 className="font-display text-[18px] font-bold mb-2">Leads from the site</h3>
          {d.leads.length === 0 ? (
            <p className="text-sm text-[#161616]/60">None yet. Every form and the chat on their site post to /api/client-lead.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead><tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#161616]/55 text-left"><th className="py-1 pr-3">When</th><th className="py-1 pr-3">Who</th><th className="py-1 pr-3">Through</th><th className="py-1 pr-3">Town</th><th className="py-1">Starting point</th></tr></thead>
              <tbody>
                {d.leads.map((l) => (
                  <tr key={l.id} className="border-t border-[#161616]/10 align-top">
                    <td className="py-1.5 pr-3 whitespace-nowrap font-mono text-[11px]">{new Date(l.created_at).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                    <td className="py-1.5 pr-3"><strong>{l.name ?? 'No name'}</strong><br /><span className="text-[#161616]/60">{l.phone ?? l.email ?? ''}</span></td>
                    <td className="py-1.5 pr-3">{(l.sources?.length ? l.sources : [l.source]).join(' → ')}</td>
                    <td className="py-1.5 pr-3">{l.town ?? ''}</td>
                    <td className="py-1.5">{l.land ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        {/* Accounts */}
        <section className={CARD}>
          <h3 className="font-display text-[18px] font-bold mb-3">Accounts</h3>
          <ul className="space-y-3">
            {d.accounts.filter((a) => s.platforms.includes(a.provider)).map((a) => (
              <li key={a.provider} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{PLATFORM_LABEL[a.provider]}</span>
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${a.connected ? 'text-[#3f5d34]' : 'text-[#161616]/45'}`}>{a.connected ? 'connected' : a.manualOnly ? 'by hand' : a.status === 'revoked' ? 'dropped' : 'not yet'}</span>
                </div>
                {a.accountName && <p className="font-mono text-[11px] text-[#161616]/60">{a.accountName}</p>}
                {a.error && <p className="text-[12px] text-[#E0301E]">{a.error}</p>}
                {!a.connected && a.needs && !a.manualOnly && <p className="text-[12px] text-[#161616]/60">Needs {a.needs}</p>}
                <div className="flex flex-wrap gap-2 mt-1">
                  {a.connected && <button type="button" className={BTN} onClick={() => void act({ action: 'disconnect', platform: a.provider })}>Disconnect</button>}
                  {!a.connected && a.provider === 'x' && d.env.x && <a className={BTN_GOLD} href={`/api/oauth/x/start?client=${encodeURIComponent(client)}`}>Connect X as them</a>}
                  {!a.connected && a.provider === 'linkedin' && d.env.linkedin && <a className={BTN_GOLD} href={`/api/oauth/linkedin/start?client=${encodeURIComponent(client)}`}>Connect LinkedIn</a>}
                  {a.provider === 'gbp' && d.env.google && (
                    <button type="button" className={BTN} disabled={!!busy} onClick={async () => { const j = (await act({ action: 'gbp-locations' })) as { locations?: Array<{ name: string; title: string }> }; if (j.locations) setGbpLocations(j.locations); }}>Pick the location</button>
                  )}
                </div>
                {a.provider === 'gbp' && gbpLocations && (
                  <ul className="mt-2 space-y-1">
                    {gbpLocations.map((l) => (
                      <li key={l.name}><button type="button" className={BTN_GOLD} onClick={() => { void act({ action: 'gbp-location', location: l.name, title: l.title }); setGbpLocations(null); }}>{l.title}</button></li>
                    ))}
                    {gbpLocations.length === 0 && <li className="text-[12px] text-[#161616]/60">No locations on that Google account.</li>}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t-2 border-[#161616]/10 pt-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60 mb-1">Facebook and Instagram by token</p>
            <p className="text-[12px] text-[#161616]/65 mb-2">Graph API Explorer, their Page under Page, permissions pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish. Generate, extend, paste. Instagram comes with the Page.</p>
            <textarea value={fbToken} onChange={(e) => setFbToken(e.target.value)} rows={2} placeholder="EAAB..." className={INPUT} />
            <button type="button" className={`${BTN_GOLD} mt-2`} disabled={!fbToken.trim() || !!busy} onClick={() => void connectFb()}>Validate and connect</button>
            {fbChoices && (
              <div className="mt-2 space-y-1">
                <p className="text-[12px]">That account manages more than one Page. Which one?</p>
                {fbChoices.map((c) => <button key={c.id} type="button" className={BTN} onClick={() => void connectFb(c.id)}>{c.name}</button>)}
              </div>
            )}
          </div>

          {!d.accounts.find((a) => a.provider === 'x')?.connected && (
            <div className="mt-5 border-t-2 border-[#161616]/10 pt-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60 mb-1">X by pasted tokens</p>
              <p className="text-[12px] text-[#161616]/65 mb-2">From the X developer portal, an OAuth 2.0 user access token for their account (tweet.write, media.write, offline.access). The refresh token keeps it alive.</p>
              <input value={xAccess} onChange={(e) => setXAccess(e.target.value)} placeholder="access token" className={INPUT} />
              <input value={xRefresh} onChange={(e) => setXRefresh(e.target.value)} placeholder="refresh token (optional)" className={`${INPUT} mt-2`} />
              <button type="button" className={`${BTN_GOLD} mt-2`} disabled={!xAccess.trim() || !!busy} onClick={async () => { const j = (await act({ action: 'x-tokens', access: xAccess, refresh: xRefresh || null })) as { username?: string }; if (j.username) { setXAccess(''); setXRefresh(''); onNotice(`X connected as @${j.username}`); } }}>Validate and connect</button>
            </div>
          )}
        </section>

        {/* Bin */}
        <section className={CARD}>
          <h3 className="font-display text-[18px] font-bold mb-2">The bin</h3>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the next photos" className={`${INPUT} mb-2`} />
          <PhotoDrop compact client={client} label="Drop photos for them" onUploaded={async (files: Uploaded[]) => { for (const f of files) await act({ action: 'material', url: f.url, note: note || undefined }); setNote(''); }} />
          {fresh.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {fresh.map((m) => (
                <div key={m.id} className="relative group" title={m.note ?? ''}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="" className="h-16 w-16 rounded-lg border-2 border-[#161616] object-cover" />
                  <button type="button" onClick={() => void act({ action: 'material-archive', id: m.id })} className="absolute -top-2 -right-2 h-5 w-5 rounded-full border-2 border-[#161616] bg-white text-[10px] font-bold leading-none opacity-0 group-hover:opacity-100">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 border-t-2 border-[#161616]/10 pt-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60 mb-1">Brand pool ({brand.length})</p>
            <p className="text-[12px] text-[#161616]/65 mb-2">Evergreen days pull the least-used photo from here. Public JPEG URLs.</p>
            <div className="flex gap-2">
              <input value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} placeholder="https://.../photo.jpg" className={INPUT} />
              <button type="button" className={BTN} disabled={!brandUrl.trim() || !!busy} onClick={async () => { await act({ action: 'material', url: brandUrl.trim(), kind: 'brand' }); setBrandUrl(''); }}>Add</button>
            </div>
            {brand.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {brand.map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={m.url} alt="" title={`used ${m.used_count}×`} className="h-10 w-10 rounded border border-[#161616]/40 object-cover" />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Settings */}
        <section className={CARD}>
          <h3 className="font-display text-[18px] font-bold mb-2">The brief</h3>
          <Field label="Business name"><input defaultValue={s.business_name} onChange={(e) => setSettings((v) => ({ ...v, business_name: e.target.value }))} className={INPUT} /></Field>
          <Field label="Site"><input defaultValue={s.site_url ?? ''} onChange={(e) => setSettings((v) => ({ ...v, site_url: e.target.value || null }))} className={INPUT} /></Field>
          <Field label="Phone"><input defaultValue={s.phone ?? ''} onChange={(e) => setSettings((v) => ({ ...v, phone: e.target.value || null }))} className={INPUT} /></Field>
          <Field label="Towns, lead towns first (one per line)"><textarea defaultValue={s.towns.join('\n')} rows={3} onChange={(e) => setSettings((v) => ({ ...v, towns: e.target.value as unknown as string[] }))} className={INPUT} /></Field>
          <Field label="Services (one per line)"><textarea defaultValue={s.services.join('\n')} rows={3} onChange={(e) => setSettings((v) => ({ ...v, services: e.target.value as unknown as string[] }))} className={INPUT} /></Field>
          <Field label="Facts the writer may use"><textarea defaultValue={s.facts ?? ''} rows={5} onChange={(e) => setSettings((v) => ({ ...v, facts: e.target.value || null }))} className={INPUT} /></Field>
          <Field label="Tone"><textarea defaultValue={s.tone ?? ''} rows={2} onChange={(e) => setSettings((v) => ({ ...v, tone: e.target.value || null }))} className={INPUT} /></Field>
          <Field label="Hard rules"><textarea defaultValue={s.hard_nos ?? ''} rows={3} onChange={(e) => setSettings((v) => ({ ...v, hard_nos: e.target.value || null }))} className={INPUT} /></Field>
          <Field label="Platforms">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const on = (settings.platforms ?? s.platforms).includes(p);
                return (
                  <button key={p} type="button" onClick={() => setSettings((v) => { const cur = v.platforms ?? s.platforms; return { ...v, platforms: on ? cur.filter((x) => x !== p) : [...cur, p] }; })} className={`${on ? BTN_GOLD : BTN}`}>{PLATFORM_LABEL[p]}</button>
                );
              })}
            </div>
          </Field>
          <Field label="Hour, Mountain">
            <select defaultValue={s.post_hour_mt} onChange={(e) => setSettings((v) => ({ ...v, post_hour_mt: Number(e.target.value) }))} className={INPUT}>
              {Array.from({ length: 24 }, (_, h) => h).map((h) => <option key={h} value={h}>{prettyHour(h)}</option>)}
            </select>
          </Field>
          <Field label="Weekly summary to (one per line, blank = the client)"><textarea defaultValue={s.notify_emails.join('\n')} rows={2} onChange={(e) => setSettings((v) => ({ ...v, notify_emails: e.target.value as unknown as string[] }))} className={INPUT} /></Field>
          <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" defaultChecked={s.active} onChange={(e) => setSettings((v) => ({ ...v, active: e.target.checked }))} /> Active</label>
          <button type="button" className={BTN_GOLD} disabled={!Object.keys(settings).length || !!busy} onClick={() => void saveSettings()}>Save the brief</button>
        </section>
      </aside>
    </div>
  );
}

function AdminPost({ p, s, today, act, busy }: { p: PostRow; s: SettingsRow; today: string; act: (b: Record<string, unknown>, label?: string) => Promise<Record<string, unknown>>; busy: string | null }) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<Platform, string>>>({});
  const [links, setLinks] = useState<Partial<Record<Platform, string>>>({});
  const [date, setDate] = useState(p.scheduled_for);
  const locked = ['published', 'publishing'].includes(p.status);
  const tone = p.status === 'published' ? 'bg-[#F5B700]' : ['failed'].includes(p.status) ? 'bg-[#E0301E]/10' : 'bg-white';
  return (
    <div className={CARD}>
      <div className="flex gap-4">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt="" className="h-20 w-20 shrink-0 rounded-lg border-2 border-[#161616] object-cover" />
        ) : <div className="h-20 w-20 shrink-0 rounded-lg border-2 border-dashed border-[#161616]/30" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">{p.scheduled_for === today ? 'Today' : prettyDate(p.scheduled_for)}</span>
            <span className={`rounded-lg border-2 border-[#161616] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${tone}`}>{p.status}</span>
            <span className="font-mono text-[10px] text-[#161616]/50">{p.source}{p.written_by ? ` · ${p.written_by}` : ''}{p.edited_by ? ' · edited' : ''}</span>
          </div>
          <input defaultValue={p.headline ?? ''} placeholder="Headline" onBlur={(e) => e.target.value !== (p.headline ?? '') && void act({ action: 'headline', id: p.id, text: e.target.value })} className="mt-1 w-full bg-transparent font-display text-[17px] font-bold outline-none" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.platforms.map((pl) => {
              const r = p.results[pl];
              const cls = r?.ok ? 'bg-[#F5B700] border-[#161616]' : r?.pending ? 'bg-white border-[#161616]/40 text-[#161616]/70' : r ? 'bg-[#E0301E]/10 border-[#E0301E]' : 'bg-white border-[#161616]/20 text-[#161616]/50';
              return (
                <span key={pl} title={r?.error ?? ''} className={`rounded-md border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${cls}`}>
                  {r?.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{PLATFORM_LABEL[pl]} ↗</a> : PLATFORM_LABEL[pl]}{r?.ok ? ' ✓' : r?.pending ? ' · hand' : r ? ' · failed' : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={BTN} onClick={() => setOpen((v) => !v)}>{open ? 'Close' : 'Open'}</button>
        {!locked && <button type="button" className={BTN_GOLD} disabled={!!busy} onClick={() => void act({ action: 'publish-now', id: p.id }, 'publish')}>Post now</button>}
        {!locked && p.status !== 'held' && p.status !== 'skipped' && <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'hold', id: p.id })}>Hold</button>}
        {(p.status === 'held' || p.status === 'skipped') && <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'release', id: p.id })}>Release</button>}
        {!locked && p.status !== 'skipped' && <button type="button" className={BTN_RED} disabled={!!busy} onClick={() => void act({ action: 'skip', id: p.id })}>Skip</button>}
        {!p.captions.facebook && <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'words-now', id: p.id }, 'words')}>Write it now</button>}
        {!locked && <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'rewrite', id: p.id })}>Ask Claude again</button>}
        {!locked && (
          <span className="ml-auto flex items-center gap-1">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border-2 border-[#161616]/40 bg-white px-2 py-1 font-mono text-[11px]" />
            <button type="button" className={BTN} disabled={date === p.scheduled_for || !!busy} onClick={() => void act({ action: 'reschedule', id: p.id, date })}>Move</button>
          </span>
        )}
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t-2 border-[#161616]/10 pt-4">
          {s.platforms.map((pl) => {
            const r = p.results[pl];
            return (
              <div key={pl}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#C4160B]">{PLATFORM_LABEL[pl]}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#1E50C8]" onClick={() => void navigator.clipboard.writeText(p.captions[pl] ?? '')}>Copy</button>
                    {!r?.ok && (
                      <>
                        <input value={links[pl] ?? ''} onChange={(e) => setLinks((v) => ({ ...v, [pl]: e.target.value }))} placeholder="live link (optional)" className="w-44 rounded border border-[#161616]/40 px-2 py-0.5 font-mono text-[10px]" />
                        <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'mark-manual', id: p.id, platform: pl, url: links[pl] || null })}>Posted by hand</button>
                      </>
                    )}
                  </div>
                </div>
                <textarea
                  value={drafts[pl] ?? p.captions[pl] ?? ''}
                  onChange={(e) => setDrafts((v) => ({ ...v, [pl]: e.target.value }))}
                  onBlur={() => drafts[pl] != null && drafts[pl] !== (p.captions[pl] ?? '') && void act({ action: 'caption', id: p.id, platform: pl, text: drafts[pl] })}
                  rows={pl === 'x' ? 2 : 4}
                  disabled={locked}
                  className={`${INPUT} mt-1 font-body`}
                />
                {r?.error && !r.ok && <p className="mt-1 text-[12px] font-semibold text-[#E0301E]">{r.error}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#161616]/60">{label}</span>
      {children}
    </label>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: 'seed' | 'red' | 'ink' }) {
  return (
    <div className={`rounded-xl border-2 border-[#161616] p-3.5 ${tone === 'seed' ? 'bg-[#F5B700]' : 'bg-white'}`}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60">{label}</p>
      <p className={`mt-1 font-display text-3xl font-extrabold leading-none ${tone === 'red' && value > 0 ? 'text-[#E0301E]' : ''}`}>{value}</p>
    </div>
  );
}
