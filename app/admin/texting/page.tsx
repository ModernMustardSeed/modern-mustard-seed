'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { SMS_TEMPLATES, templateByKey, toGsmAscii } from '@/lib/sms-templates';

type Campaign = {
  id: string; name: string; status: string; template_key: string | null;
  quiet_hours: boolean; verify_mobile: boolean; throttle_per_min: number;
  total: number; queued: number; sent: number; delivered: number; failed: number;
  replied: number; opted_out: number; skipped: number; created_at: string;
};
type Stats = Omit<Campaign, 'id' | 'name' | 'status' | 'template_key' | 'quiet_hours' | 'verify_mobile' | 'throttle_per_min' | 'created_at'>;
type Recipient = { id: string; business: string; phone: string; body: string; status: string; error: string | null; sent_at: string | null };

const CARD = 'rounded-xl border-2 border-[#161616]';
const BTN = 'rounded-lg border-2 border-[#161616] bg-white px-3.5 py-2 text-[12px] font-sans font-bold uppercase tracking-[0.12em] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform disabled:opacity-40 disabled:shadow-none disabled:translate-y-0';
const BTN_GO = BTN.replace('bg-white', 'bg-[#F5B700]');
const FIELD = 'w-full rounded-lg border-2 border-[#161616] px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-[#F5B700]';
const STATUS_COLOR: Record<string, string> = { draft: '#8A8378', ready: '#3f5d34', sending: '#F5B700', paused: '#b58a2a', done: '#3f5d34', cancelled: '#E0301E' };

export default function TextingPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<{ campaign: Campaign; stats: Stats; recipients: Recipient[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/sms/campaigns');
    const j = await r.json();
    setConfigured(j.configured ?? false);
    setCampaigns(j.campaigns ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    const r = await fetch(`/api/admin/sms/campaigns/${id}`);
    if (r.ok) setDetail(await r.json());
  };
  const control = async (id: string, action: string) => {
    setBusy(true);
    try { await fetch(`/api/admin/sms/campaigns/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }); await load(); if (detail) openDetail(id); }
    finally { setBusy(false); }
  };
  const sendBatch = async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/sms/campaigns/${id}/send?n=25`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) alert(j.error || 'Send failed');
      await load(); openDetail(id);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#f7f3e9]">
      <AdminHeader active="texting" title="Texting" onRefresh={load} />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-3xl font-bold text-[#1a1815]">Cold-text campaigns</h2>
            <p className="text-[#1a1815]/60 font-body text-sm mt-0.5">Personalized outreach by text, Cahill-style. Opt-out, quiet hours, and do-not-text are enforced automatically.</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} disabled={!configured} className={BTN_GO}>{showForm ? 'Close' : 'New campaign'}</button>
        </div>

        {/* Compliance banner */}
        <div className={`${CARD} bg-[#fffdf6] px-4 py-3 mb-5 flex items-start gap-3`}>
          <span className="text-lg">🛡️</span>
          <p className="text-[12px] font-body text-[#3A3733] leading-relaxed">
            <b>Compliant by design.</b> Every text names the sender + business and ends with an opt-out. Replies of STOP are honored instantly and never texted again. Sends only fire 9a-8p in the lead’s local time. <b>Before your first real send</b>, your Twilio number needs A2P 10DLC brand + campaign registration or carriers will filter it. See the go-live steps below.
          </p>
        </div>

        {configured === false && (
          <div className={`${CARD} bg-white p-6 shadow-[4px_4px_0_0_#1a1815] max-w-2xl mb-6`}>
            <h3 className="font-sans font-bold text-lg text-[#1a1815] mb-1">Texting is not wired yet</h3>
            <p className="text-[#3A3733] font-body text-sm">Add your Twilio credentials (Account SID, Auth Token, and a Messaging Service SID) to turn on texting. The whole engine is built and waiting.</p>
          </div>
        )}

        {showForm && <CreateForm onDone={() => { setShowForm(false); load(); }} />}

        {/* Campaign list */}
        <div className="space-y-3 mt-6">
          {campaigns.length === 0 && configured !== false && (
            <p className="text-[#1a1815]/50 italic font-body">No campaigns yet. Build your first one.</p>
          )}
          {campaigns.map((c) => (
            <div key={c.id} className={`${CARD} bg-white shadow-[3px_3px_0_0_#1a1815] p-4`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[c.status] || '#8A8378' }} />
                <button onClick={() => openDetail(c.id)} className="font-sans font-bold text-[#1a1815] hover:underline">{c.name}</button>
                <span className="text-[10px] uppercase tracking-wider font-mono text-[#1a1815]/60 border border-[#1a1815]/25 rounded-full px-2 py-0.5">{c.status}</span>
                <div className="ml-auto flex items-center gap-4 text-[12px] font-mono text-[#1a1815]/70">
                  <span><b className="text-[#3f5d34]">{c.sent}</b> sent</span>
                  <span><b className="text-[#b58a2a]">{c.replied}</b> replied</span>
                  <span>{c.queued} queued</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {(c.status === 'ready' || c.status === 'paused') && <button onClick={() => control(c.id, c.status === 'paused' ? 'resume' : 'start')} disabled={busy} className={BTN_GO}>{c.status === 'paused' ? 'Resume' : 'Start sending'}</button>}
                {c.status === 'sending' && <>
                  <button onClick={() => sendBatch(c.id)} disabled={busy} className={BTN_GO}>Send next 25</button>
                  <button onClick={() => control(c.id, 'pause')} disabled={busy} className={BTN}>Pause</button>
                </>}
                <button onClick={() => openDetail(c.id)} className={BTN}>Details</button>
                {c.status !== 'done' && c.status !== 'cancelled' && <button onClick={() => control(c.id, 'cancel')} disabled={busy} className={BTN}>Cancel</button>}
              </div>
            </div>
          ))}
        </div>
      </main>

      {detail && <DetailDrawer data={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-3xl font-bold" style={{ color: color || '#1a1815' }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider font-mono text-[#1a1815]/50">{label}</div>
    </div>
  );
}

function DetailDrawer({ data, onClose }: { data: { campaign: Campaign; stats: Stats; recipients: Recipient[] }; onClose: () => void }) {
  const { campaign, stats, recipients } = data;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-[#f7f3e9] border-l-2 border-[#1a1815] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#f7f3e9] border-b-2 border-[#1a1815] px-5 py-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-[#1a1815]">{campaign.name}</h3>
          <button onClick={onClose} className="text-[#1a1815]/50 hover:text-[#1a1815] text-xl">×</button>
        </div>
        <div className="p-5">
          <div className={`${CARD} bg-[#1a1815] text-[#f7f3e9] p-5 grid grid-cols-4 gap-3 mb-5`}>
            <Stat label="Sent" value={stats.sent} color="#F5B700" />
            <Stat label="Delivered" value={stats.delivered} color="#7fb069" />
            <Stat label="Replied" value={stats.replied} color="#F5B700" />
            <Stat label="Opted out" value={stats.opted_out} color="#E0301E" />
          </div>
          <div className="grid grid-cols-4 gap-3 mb-5 text-center">
            <Stat label="Total" value={stats.total} />
            <Stat label="Queued" value={stats.queued} />
            <Stat label="Failed" value={stats.failed} color="#E0301E" />
            <Stat label="Skipped" value={stats.skipped} />
          </div>
          <h4 className="font-sans font-bold text-[#1a1815] mb-2 text-sm uppercase tracking-wider">Recipients</h4>
          <div className="space-y-2">
            {recipients.map((r) => (
              <div key={r.id} className={`${CARD} bg-white p-3`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans font-bold text-[13px] text-[#1a1815] truncate">{r.business}</span>
                  <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full border border-[#1a1815]/25 text-[#1a1815]/60">{r.status}</span>
                </div>
                <p className="text-[11px] font-mono text-[#1a1815]/50">{r.phone}</p>
                <p className="text-[12px] font-body text-[#3A3733] mt-1 line-clamp-2">{r.body}</p>
                {r.error && <p className="text-[11px] text-[#E0301E] font-mono mt-0.5">{r.error}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [rep, setRep] = useState('');
  const [city, setCity] = useState('');
  const [statuses, setStatuses] = useState<string[]>(['to-contact']);
  const [auditedOnly, setAuditedOnly] = useState(false);
  const [limit, setLimit] = useState(200);
  const [templateKey, setTemplateKey] = useState<string>('auto');
  const [custom, setCustom] = useState('');
  const [link, setLink] = useState('');
  const [quietHours, setQuietHours] = useState(true);
  const [verifyMobile, setVerifyMobile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string>('');

  const toggle = (s: string) => setStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  // Live preview against a sample lead, so the copy is judged the way a real
  // recipient sees it (tokens filled, link baked in, GSM-safe characters).
  const tpl = templateByKey(templateKey);
  const needsLink = Boolean(tpl?.needsLink) || /\{\{\s*link\s*\}\}/i.test(custom);
  const preview = toGsmAscii(
    custom
      .replace(/\{\{\s*business\s*\}\}/gi, 'Glacier Auto')
      .replace(/\{\{\s*city\s*\}\}/gi, 'Kalispell')
      .replace(/\{\{\s*sender\s*\}\}/gi, 'Sarah')
      .replace(/\{\{\s*score\s*\}\}/gi, '62')
      .replace(/\{\{\s*book\s*\}\}/gi, 'modernmustardseed.com/book')
      .replace(/\{\{\s*link\s*\}\}/gi, link || 'https://modernmustardseed.com/demos')
  ).replace(/\s{2,}/g, ' ').trim();
  const segments = preview.length === 0 ? 0 : preview.length <= 160 ? 1 : Math.ceil(preview.length / 153);

  const submit = async () => {
    if (!name.trim()) { setResult('Give it a name.'); return; }
    setSaving(true); setResult('');
    try {
      const r = await fetch('/api/admin/sms/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, template_key: templateKey,
          custom_template: templateKey === 'auto' ? undefined : custom,
          link: link || undefined,
          quiet_hours: quietHours, verify_mobile: verifyMobile,
          audience: { rep_email: rep || undefined, city: city || undefined, statuses, auditedOnly, limit },
        }),
      });
      const j = await r.json();
      if (!r.ok) { setResult(j.error || 'Failed'); return; }
      setResult(`Built ${j.queued} ready to text, ${j.skipped} skipped. Start it from the list.`);
      setTimeout(onDone, 1400);
    } finally { setSaving(false); }
  };

  return (
    <div className={`${CARD} bg-white shadow-[4px_4px_0_0_#1a1815] p-5 space-y-4`}>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block"><span className="text-[12px] font-sans font-bold uppercase tracking-wider text-[#1a1815]">Campaign name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="July cold texts – Kalispell" className={`${FIELD} mt-1`} /></label>
        <label className="block"><span className="text-[12px] font-sans font-bold uppercase tracking-wider text-[#1a1815]">Rep (owner email, blank = everyone)</span>
          <input value={rep} onChange={(e) => setRep(e.target.value)} placeholder="thompsonpolly71@gmail.com" className={`${FIELD} mt-1`} /></label>
        <label className="block"><span className="text-[12px] font-sans font-bold uppercase tracking-wider text-[#1a1815]">City (optional)</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Kalispell" className={`${FIELD} mt-1`} /></label>
        <label className="block"><span className="text-[12px] font-sans font-bold uppercase tracking-wider text-[#1a1815]">Max leads</span>
          <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={`${FIELD} mt-1`} /></label>
      </div>

      <div>
        <span className="text-[12px] font-sans font-bold uppercase tracking-wider text-[#1a1815]">Include statuses</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {['to-contact', 'contacted', 'demoed'].map((s) => (
            <button key={s} onClick={() => toggle(s)} className={`px-3 py-1.5 rounded-full border-2 border-[#1a1815] text-[12px] font-sans font-bold ${statuses.includes(s) ? 'bg-[#F5B700]' : 'bg-white'}`}>{s}</button>
          ))}
          <label className="flex items-center gap-1.5 text-[12px] font-body text-[#1a1815] ml-2"><input type="checkbox" checked={auditedOnly} onChange={(e) => setAuditedOnly(e.target.checked)} /> audited sites only</label>
        </div>
      </div>

      <div>
        <span className="text-[12px] font-sans font-bold uppercase tracking-wider text-[#1a1815]">Message</span>
        <div className="flex flex-wrap gap-2 mt-1 mb-2">
          {SMS_TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTemplateKey(t.key); setCustom(t.body); }}
              className={`px-3 py-1.5 rounded-full border-2 border-[#1a1815] text-[12px] font-sans font-bold ${templateKey === t.key ? 'bg-[#F5B700]' : 'bg-white'}`}
            >{t.label}</button>
          ))}
        </div>
        <p className="text-[12px] font-body text-[#3A3733] bg-[#fffdf6] border-2 border-[#1a1815]/15 rounded-lg p-3 mb-2">{tpl?.hint}</p>

        {templateKey === 'auto' ? (
          <p className="text-[12px] font-body text-[#3A3733]">Sender name, business, city, and the opt-out line are filled in automatically for every lead.</p>
        ) : (
          <>
            <textarea value={custom} onChange={(e) => setCustom(e.target.value)} rows={4} className={FIELD} />
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <p className="text-[11px] font-mono text-[#1a1815]/50">Tokens: {'{{business}} {{city}} {{sender}} {{score}} {{book}} {{link}}'}</p>
              <span className={`text-[11px] font-mono ${segments > 2 ? 'text-[#E0301E]' : 'text-[#1a1815]/50'}`}>{preview.length} chars · {segments} segment{segments === 1 ? '' : 's'}</span>
              {!/\bstop\b/i.test(custom) && custom.trim() !== '' && (
                <span className="text-[11px] font-mono text-[#b58a2a]">Opt-out line will be added automatically.</span>
              )}
            </div>

            {needsLink && (
              <label className="block mt-3">
                <span className="text-[12px] font-sans font-bold uppercase tracking-wider text-[#1a1815]">Link to send</span>
                <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://modernmustardseed.com/demos" className={`${FIELD} mt-1`} />
                <span className="text-[11px] font-mono text-[#1a1815]/50">Baked into every message in place of {'{{link}}'}.</span>
              </label>
            )}

            <div className="mt-3">
              <span className="text-[11px] uppercase tracking-wider font-mono text-[#1a1815]/50">Preview</span>
              <div className="mt-1 rounded-2xl bg-[#e6f0e0] border-2 border-[#1a1815] px-3.5 py-2.5 max-w-md">
                <p className="text-[13px] font-body text-[#1a1815] whitespace-pre-wrap">{preview}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-[13px] font-body text-[#1a1815]"><input type="checkbox" checked={quietHours} onChange={(e) => setQuietHours(e.target.checked)} /> Enforce quiet hours (9a-8p local)</label>
        <label className="flex items-center gap-2 text-[13px] font-body text-[#1a1815]"><input type="checkbox" checked={verifyMobile} onChange={(e) => setVerifyMobile(e.target.checked)} /> Verify mobile first (skip landlines, costs a Twilio lookup each)</label>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={saving} className={BTN_GO}>{saving ? 'Building…' : 'Build campaign'}</button>
        {result && <span className="text-[13px] font-body text-[#3f5d34]">{result}</span>}
      </div>
    </div>
  );
}
