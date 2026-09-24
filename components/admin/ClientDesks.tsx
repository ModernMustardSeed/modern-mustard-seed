'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import type { DeskForm, DeskListing, DeskPerson } from '@/lib/client-desks';

/**
 * CLIENT DESKS. One form makes everything a client's website leads, Daily
 * Posting and Command Center need to know about them, with no code change and
 * no deploy. Saving switches nothing on for the client: the Show switches stay
 * on the posting desk, and the checklist after a save links straight to them.
 */

const CARD = 'rounded-2xl border-2 border-[#161616] bg-white p-5 shadow-[5px_5px_0_0_#161616]';
const BTN = 'rounded-lg border-2 border-[#161616] bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform';
const BTN_GOLD = BTN.replace('bg-white', 'bg-[#F5B700]');
const INPUT = 'w-full rounded-lg border-2 border-[#161616]/40 bg-[#FBF6EA] px-3 py-2 text-[14px] text-[#161616] focus:border-[#161616] outline-none';
const LABEL = 'mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/70';

const BLANK: DeskForm = { business: '', clientEmail: '', people: [{ name: '', email: '', mailbox: '' }], ink: '#161616', paper: '#FBF6EA', accent: '#F5B700', accent2: '#1E50C8' };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-[#161616]/60">{hint}</span>}
    </label>
  );
}

export default function ClientDesks() {
  const [desks, setDesks] = useState<DeskListing[] | null>(null);
  const [form, setForm] = useState<DeskForm | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ key: string; clientEmail: string; business: string } | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const r = await fetch('/api/admin/desks', { cache: 'no-store' });
      const j = (await r.json()) as { desks?: DeskListing[] };
      setDesks(j.desks ?? []);
    } catch {
      setLoadError(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const set = (k: keyof DeskForm, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const setPerson = (i: number, k: keyof DeskPerson, v: string) =>
    setForm((f) => (f ? { ...f, people: (f.people ?? []).map((p, j) => (j === i ? { ...p, [k]: v } : p)) } : f));

  async function save() {
    if (!form) return;
    setBusy(true);
    setErrors([]);
    try {
      const r = await fetch('/api/admin/desks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ form, editing }) });
      const j = (await r.json()) as { errors?: string[]; desk?: { key: string; clientEmail: string; business: string }; desks?: DeskListing[] };
      if (!r.ok || !j.desk) {
        setErrors(j.errors ?? ['The desk did not save.']);
        return;
      }
      setSaved(j.desk);
      setDesks(j.desks ?? desks);
      setForm(null);
      setEditing(null);
    } catch {
      setErrors(['The desk did not save. Check the connection and press save again.']);
    } finally {
      setBusy(false);
    }
  }

  const text = (k: keyof DeskForm, label: string, hint?: string, placeholder?: string) => (
    <Field label={label} hint={hint}>
      <input className={INPUT} value={String(form?.[k] ?? '')} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} autoComplete="off" />
    </Field>
  );

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="desks" title="Client Desks" onRefresh={() => void load()} />
      <main className="mx-auto max-w-[70rem] px-5 py-6 md:px-6">
        {saved && (
          <div className={`${CARD} mb-6 border-[#3f5d34]`}>
            <p className="font-display text-[22px]">{saved.business} has a desk.</p>
            <p className="mt-1 text-[14px] text-[#161616]/75">Nothing is switched on for them yet. Four steps, in order:</p>
            <ol className="mt-3 space-y-2 text-[14px]">
              <li>
                1. <a className="underline" href={`/api/admin/look?client=${encodeURIComponent(saved.clientEmail)}`}>Open their Command Center as them</a>, then go to Accounts and connect their mailbox, Facebook, Google and the rest.
              </li>
              <li>
                2. <a className="underline" href={`/admin/posting?client=${encodeURIComponent(saved.clientEmail)}`}>On the posting desk</a>, set their brief, then press Show to the client for Daily Posting and Show the Command Center for the desk they bought.
              </li>
              <li>
                3. Point their website forms at <code className="rounded bg-[#FBF6EA] px-1">https://modernmustardseed.com/api/client-lead</code> with <code className="rounded bg-[#FBF6EA] px-1">project: &quot;{saved.key}&quot;</code>.
              </li>
              <li>4. They sign in at modernmustardseed.com/cc/login with the account email or any person&apos;s email on the desk.</li>
            </ol>
            <button className={`${BTN} mt-4`} onClick={() => setSaved(null)}>Close</button>
          </div>
        )}

        {!form && (
          <div className={`${CARD} mb-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[24px]">Every client desk</h2>
                <p className="mt-1 text-[13.5px] text-[#161616]/70">A desk is who a client is to the studio: their sites, their people and inboxes, who hears about a lead, and their Command Center&apos;s look.</p>
              </div>
              <button
                className={BTN_GOLD}
                onClick={() => {
                  setForm({ ...BLANK, people: [{ name: '', email: '', mailbox: '' }] });
                  setEditing(null);
                  setErrors([]);
                  setSaved(null);
                }}
              >
                New client desk
              </button>
            </div>
            {loadError ? (
              <p className="mt-4 text-[14px]">
                The desks did not load. <button className="underline" onClick={() => void load()}>Try again</button>
              </p>
            ) : !desks ? (
              <p className="mt-4 text-[14px] text-[#161616]/60">Loading.</p>
            ) : (
              <ul className="mt-4 divide-y-2 divide-[#161616]/10">
                {desks.map((d) => (
                  <li key={d.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-semibold">{d.business}</p>
                      <p className="text-[12.5px] text-[#161616]/65">
                        {d.clientEmail} · {d.people} {d.people === 1 ? 'person' : 'people'}
                        {d.siteUrl ? ` · ${d.siteUrl.replace(/^https?:\/\//, '')}` : ''} · key {d.key}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a className={BTN} href={`/api/admin/look?client=${encodeURIComponent(d.clientEmail)}`}>Open as them</a>
                      <a className={BTN} href={`/admin/posting?client=${encodeURIComponent(d.clientEmail)}`}>Switches</a>
                      {d.source === 'form' && d.form ? (
                        <button
                          className={BTN}
                          onClick={() => {
                            setForm({ ...d.form!, people: d.form!.people?.length ? d.form!.people : [{ name: '', email: '', mailbox: '' }] });
                            setEditing(d.key);
                            setErrors([]);
                            setSaved(null);
                          }}
                        >
                          Edit
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#161616]/55">Written in code</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {form && (
          <div className="space-y-6">
            <div className={CARD}>
              <h2 className="font-display text-[24px]">{editing ? `Edit ${form.business || editing}` : 'New client desk'}</h2>
              <p className="mt-1 text-[13.5px] text-[#161616]/70">Saving makes their desk and their card. It switches nothing on for them.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {text('business', 'Business name', 'As customers know it. It names their Command Center and every campaign.', 'Built Right in Montana')}
                {text('clientEmail', 'Account email', 'The owner’s address. It holds the account and signs in.', 'owner@business.com')}
                {!editing && text('key', 'Key (optional)', 'Lowercase, dashes. Made from the name when left blank, and fixed once saved.', 'built-right')}
                {text('phone', 'Business phone', 'Printed where the site and messages show their number.')}
                {text('postal', 'Postal address', 'Printed at the foot of every campaign, as the law asks.')}
              </div>
            </div>

            <div className={CARD}>
              <h3 className="font-display text-[20px]">People and their inboxes</h3>
              <p className="mt-1 text-[13.5px] text-[#161616]/70">Each person signs in with their own email. Their own inbox is theirs alone; any mailbox not named here (the office Gmail) is shared by everyone.</p>
              <div className="mt-4 space-y-3">
                {(form.people ?? []).map((p, i) => (
                  <div key={i} className="grid gap-3 md:grid-cols-[1fr_1.4fr_1.4fr_auto] md:items-end">
                    <Field label="Name">
                      <input className={INPUT} value={p.name} onChange={(e) => setPerson(i, 'name', e.target.value)} autoComplete="off" />
                    </Field>
                    <Field label="Signs in with">
                      <input className={INPUT} value={p.email} onChange={(e) => setPerson(i, 'email', e.target.value)} autoComplete="off" />
                    </Field>
                    <Field label="Their own inbox (optional)">
                      <input className={INPUT} value={p.mailbox ?? ''} onChange={(e) => setPerson(i, 'mailbox', e.target.value)} autoComplete="off" />
                    </Field>
                    <button className={BTN} onClick={() => setForm((f) => (f ? { ...f, people: (f.people ?? []).filter((_, j) => j !== i) } : f))}>Remove</button>
                  </div>
                ))}
                <button className={BTN} onClick={() => setForm((f) => (f ? { ...f, people: [...(f.people ?? []), { name: '', email: '', mailbox: '' }] } : f))}>Add a person</button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {text('answers', 'Who answers the phone', 'A first name. The site’s confirmation says they will call. Defaults to the first person.')}
                {text('emailDomain', 'Their email domain', 'The domain their own mailboxes live on, for example brimhomes.com.')}
              </div>
            </div>

            <div className={CARD}>
              <h3 className="font-display text-[20px]">Website and leads</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {text('siteUrl', 'Website address', 'Where the site is served now. Its forms are allowed to send leads.', 'https://brimhomes.com')}
                {text('publicUrl', 'Lasting address (optional)', 'The domain QR codes and printed links use, when it differs.')}
                {text('extraOrigins', 'Other site addresses (optional)', 'Any other address the forms run on, separated by commas.')}
                {text('notifyPhone', 'Lead alerts by text', 'The mobile that is texted for every new lead.')}
                {text('notifyEmails', 'Lead alerts by email', 'Separated by commas. Defaults to the account email.')}
                <Field label="Their CRM">
                  <select className={INPUT} value={form.crm ?? ''} onChange={(e) => set('crm', e.target.value)}>
                    <option value="">None</option>
                    <option value="buildertrend">Buildertrend</option>
                  </select>
                </Field>
                {text('assistantId', 'Website chat assistant (optional)', 'The Vapi assistant id behind their site chat, so conversations show up.')}
              </div>
            </div>

            <div className={CARD}>
              <h3 className="font-display text-[20px]">Reviews</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {text('googleReviewUrl', 'Google review link', 'Where a happy customer is sent to leave a review.')}
                {text('googleMapsUrl', 'Google listing link', 'Their listing on Maps.')}
                {text('houzzUrl', 'Houzz review link (optional)')}
                {text('facebookReviewUrl', 'Facebook review link (optional)')}
              </div>
            </div>

            <div className={CARD}>
              <h3 className="font-display text-[20px]">Their Command Center&apos;s look</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {text('logo', 'Logo address', 'A public image address. It sits at the top of their desk and every campaign.')}
                {text('logoOnDark', 'Logo on dark (optional)', 'A light version for dark backgrounds.')}
                {text('guideName', 'What the Operator is called (optional)', 'Defaults to "your <business> guide".')}
                {text('officeHost', 'Their own office address (optional)', 'For example office.brimhomes.com, once it points at us.')}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {(['ink', 'paper', 'accent', 'accent2'] as const).map((k) => (
                  <Field key={k} label={k === 'accent2' ? 'Second accent' : k[0].toUpperCase() + k.slice(1)}>
                    <div className="flex items-center gap-2">
                      <input type="color" className="h-10 w-12 cursor-pointer rounded border-2 border-[#161616]/40" value={/^#[0-9a-fA-F]{6}$/.test(String(form[k])) ? String(form[k]) : '#000000'} onChange={(e) => set(k, e.target.value)} />
                      <input className={INPUT} value={String(form[k] ?? '')} onChange={(e) => set(k, e.target.value)} autoComplete="off" />
                    </div>
                  </Field>
                ))}
              </div>
            </div>

            {errors.length > 0 && (
              <div role="alert" className="rounded-xl border-2 border-[#E0301E]/40 bg-[#E0301E]/10 px-4 py-3 text-[14px] font-semibold text-[#8f1d12]">
                <p>The desk did not save:</p>
                <ul className="mt-1 list-disc pl-5 font-normal">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button className={BTN_GOLD} disabled={busy} onClick={() => void save()}>
                {busy ? 'Saving' : editing ? 'Save the desk' : 'Make the desk'}
              </button>
              <button className={BTN} disabled={busy} onClick={() => { setForm(null); setEditing(null); setErrors([]); }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
