'use client';

import Link from 'next/link';
import Papa from 'papaparse';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import Modal from '@/components/ui/Modal';
import { NICHES, NICHE_LABELS, LEAD_STATUSES, STATUS_LABELS, formatPhone, fmtMoney, phoneKey, isEmail } from '@/lib/outbound';
import type { Niche, OutboundLead, Rep } from '@/lib/outbound';
import { OutboundNav, StatusChip, NicheChip, ToastHost, useToasts, api, card, btnPrimary, btnGhost, inputCls, labelCls, eyebrow } from '@/components/admin/outbound/ui';

type SortKey = 'business_name' | 'contact_name' | 'phone' | 'niche' | 'city' | 'status' | 'owner' | 'avg_job_value' | 'audit_score' | 'created_at';

/** Friendly names for the sources we generate ourselves; anything else (a CSV's
 *  own source column, say) shows its raw value. */
const SOURCE_LABELS: Record<string, string> = {
  'demo-station': 'Self-serve demos',
  'review-mining': 'Review-mined',
  'website-mining': 'No website',
  'csv-import': 'CSV import',
};

/** Worked-first ordering: leads you've invested in (contacted, callback, demo'd,
 *  pilot, won) float above raw "new" imports; dead leads (lost, dnc) sink. Keeps
 *  a big fresh import from ever burying the relationships you've already built. */
const STATUS_RANK: Record<string, number> = {
  won: 0, pilot_live: 0, demo_booked: 0, callback: 0, contacted: 0,
  new: 1,
  lost: 2, dnc: 2,
};
const rankOf = (s: string) => STATUS_RANK[s] ?? 1;

/** Saved views: one-click segments for the highest-intent lead types. "No
 *  website" and "Outdated site" are the leads that most need us and close
 *  fastest; the sourcer flags them (website blank, or a "needs us:" note). */
type ViewKey = 'all' | 'no_site' | 'outdated' | 'needs';
const VIEWS: { key: ViewKey; label: string; desc: string }[] = [
  { key: 'all', label: 'All leads', desc: 'Everything on the floor.' },
  { key: 'no_site', label: 'No website', desc: 'Has a phone but no website at all. Pitch: build them one from scratch.' },
  { key: 'outdated', label: 'Outdated site', desc: 'Has a website, but it is stale, not mobile-friendly, or has no HTTPS. Pitch: redesign.' },
  { key: 'needs', label: 'Needs us', desc: 'No site or a weak site. The whole "needs help" segment in one view.' },
];
const hasSite = (l: OutboundLead) => !!(l.website && l.website.trim());
const isWeak = (l: OutboundLead) => /needs us/i.test(l.notes ?? '');
const matchesView = (l: OutboundLead, v: ViewKey) =>
  v === 'all' ? true : v === 'no_site' ? !hasSite(l) : v === 'outdated' ? hasSite(l) && isWeak(l) : !hasSite(l) || isWeak(l);

/** Small per-row cue so a caller knows which pitch a lead is: build vs redesign. */
function siteFlag(l: OutboundLead): { label: string; tone: 'red' | 'amber' } | null {
  if (!hasSite(l)) return { label: 'No site', tone: 'red' };
  if (isWeak(l)) return { label: 'Stale site', tone: 'amber' };
  return null;
}

/** The table renders heavy rows (two populated <select>s each). On a floor of
 *  thousands, rendering the whole filtered set stalls the main thread on every
 *  keystroke. Cap the DOM to a scannable window; the count and the view chips
 *  still reflect the full set, and searching narrows below the cap immediately. */
const RENDER_CAP = 200;

const EMPTY_FORM = {
  business_name: '',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  niche: 'other' as Niche,
  city: '',
  state: '',
  avg_job_value: '',
  est_missed_calls_week: '',
  source: '',
  owner_rep_id: '',
  notes: '',
  dnc_checked: false,
};

/** Fuzzy CSV header → leads column mapping. */
const HEADER_MAP: [RegExp, string][] = [
  [/^(business|company|biz)/, 'business_name'],
  [/^name$/, 'business_name'],
  [/(contact|owner|first.?name|person)/, 'contact_name'],
  [/(phone|tel|mobile|number)/, 'phone'],
  [/email/, 'email'],
  [/(website|url|site|web|domain)/, 'website'],
  [/(niche|categor|industr|vertical|type)/, 'niche'],
  [/city|town/, 'city'],
  [/^(state|st|region|province)$/, 'state'],
  [/(avg.?job|job.?value|ticket|avg.?sale|value)/, 'avg_job_value'],
  [/miss/, 'est_missed_calls_week'],
  [/source/, 'source'],
  [/note/, 'notes'],
];

function guessNiche(raw: string): Niche | null {
  const v = raw.toLowerCase();
  if (!v) return null;
  if ((NICHES as readonly string[]).includes(v)) return v as Niche;
  if (/dent|medspa|med spa|aesthet|spa|chiro|clinic/.test(v)) return 'dental_medspa';
  if (/real|realt|broker|property/.test(v)) return 'real_estate';
  if (/rest|cafe|food|pizza|grill|bar/.test(v)) return 'restaurant';
  if (/hvac|plumb|roof|electric|landscap|paint|clean|pest|garage|home|contractor|handyman|tree|excavat/.test(v)) return 'home_service';
  return null;
}

type ImportPreview = {
  rows: Record<string, string>[];
  mapped: { [k: string]: string | null };
  headers: string[];
  fileName: string;
};

export default function OutboundLeads() {
  const [leads, setLeads] = useState<OutboundLead[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toasts, push } = useToasts();

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [niche, setNiche] = useState('');
  const [owner, setOwner] = useState('');
  const [stateF, setStateF] = useState('');
  const [cityF, setCityF] = useState('');
  const [sourceF, setSourceF] = useState('');
  const [unscrubbedOnly, setUnscrubbedOnly] = useState(false);
  const [workedFirst, setWorkedFirst] = useState(true);
  const [view, setView] = useState<ViewKey>('all');
  const [sort, setSort] = useState<SortKey>('created_at');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  // Armed after the first render so the URL-sync effect never clobbers the
  // params the mount reader just loaded (both run in the same initial commit).
  const urlWriteArmed = useRef(false);
  // Keep the search box responsive on a big floor: the expensive filtered render
  // reads the DEFERRED query, so keystrokes update the input instantly and the
  // table re-renders at lower priority instead of blocking the main thread.
  const deferredQ = useDeferredValue(q);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);

  // Bulk DNC scrub
  const [scrubOpen, setScrubOpen] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importNiche, setImportNiche] = useState<Niche>('home_service');
  const [importOwner, setImportOwner] = useState('');
  const [importSource, setImportSource] = useState('csv-import');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, r] = await Promise.all([
        api<{ leads: OutboundLead[] }>('/api/admin/outbound/leads'),
        api<{ reps: Rep[] }>('/api/admin/outbound/reps'),
      ]);
      setLeads(l.leads);
      setReps(r.reps);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load leads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Deep-link support (?view=no_site&owner=...) without useSearchParams, so no
    // Suspense boundary is needed (same pattern as the Tracker's ?focus=). This
    // is what makes a saved view a real, bookmarkable/shareable link.
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('dnc') === 'unchecked') setUnscrubbedOnly(true);
      const st = params.get('state');
      if (st) setStateF(st.toUpperCase().slice(0, 2));
      const src = params.get('source');
      if (src) setSourceF(src);
      const ow = params.get('owner');
      if (ow) setOwner(ow);
      const sc = params.get('status');
      if (sc) setStatus(sc);
      const vw = params.get('view');
      if (vw && VIEWS.some((v) => v.key === vw)) setView(vw as ViewKey);
    }
  }, [load]);

  // Reflect the view-defining filters back into the URL so the current view can
  // be bookmarked or texted to a rep. replaceState keeps it out of history.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!urlWriteArmed.current) { urlWriteArmed.current = true; return; }
    const p = new URLSearchParams(window.location.search);
    const set = (k: string, val: string) => (val ? p.set(k, val) : p.delete(k));
    set('view', view === 'all' ? '' : view);
    set('owner', owner);
    set('status', status);
    set('state', stateF);
    set('city', cityF);
    set('source', sourceF);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [view, owner, status, stateF, cityF, sourceF]);

  const repName = useCallback((id: string | null) => reps.find((r) => r.id === id)?.name ?? '', [reps]);

  // Geography filters: options derive from the live list, city narrows to the
  // chosen state, and picking a new state clears a city that no longer fits.
  const stateOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of leads) if (l.state) counts.set(l.state, (counts.get(l.state) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [leads]);

  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of leads) {
      if (!l.city) continue;
      if (stateF && l.state !== stateF) continue;
      counts.set(l.city, (counts.get(l.city) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [leads, stateF]);

  const sourceOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of leads) if (l.source) counts.set(l.source, (counts.get(l.source) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [leads]);

  const pickState = (s: string) => {
    setStateF(s);
    if (cityF && s && !leads.some((l) => l.state === s && l.city === cityF)) setCityF('');
  };

  // Everything EXCEPT the saved-view filter. The view chips filter this set and
  // show their counts against it, so a chip count reflects the current
  // rep/state/search selection (e.g. "No website (37)" for Polly).
  const base = useMemo(() => {
    let rows = leads;
    if (status) rows = rows.filter((l) => l.status === status);
    if (niche) rows = rows.filter((l) => l.niche === niche);
    if (owner) rows = rows.filter((l) => l.owner_rep_id === owner);
    if (stateF) rows = rows.filter((l) => l.state === stateF);
    if (cityF) rows = rows.filter((l) => l.city === cityF);
    if (sourceF) rows = rows.filter((l) => l.source === sourceF);
    if (unscrubbedOnly) rows = rows.filter((l) => !l.dnc_checked);
    if (deferredQ.trim()) {
      const needle = deferredQ.trim().toLowerCase();
      rows = rows.filter((l) =>
        [l.business_name, l.contact_name, l.phone, l.city, l.email].some((v) => v?.toLowerCase().includes(needle)),
      );
    }
    return rows;
  }, [leads, status, niche, owner, stateF, cityF, sourceF, unscrubbedOnly, deferredQ]);

  const viewCounts = useMemo(() => {
    const counts = { all: base.length, no_site: 0, outdated: 0, needs: 0 } as Record<ViewKey, number>;
    for (const l of base) {
      if (!hasSite(l)) { counts.no_site++; counts.needs++; }
      else if (isWeak(l)) { counts.outdated++; counts.needs++; }
    }
    return counts;
  }, [base]);

  const visible = useMemo(() => {
    const rows = base.filter((l) => matchesView(l, view));
    const mul = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (workedFirst) {
        const r = rankOf(a.status) - rankOf(b.status);
        if (r !== 0) return r; // worked leads on top, then fresh, then dead — column sort orders within each group
      }
      const va = sort === 'owner' ? repName(a.owner_rep_id) : (a[sort] ?? '');
      const vb = sort === 'owner' ? repName(b.owner_rep_id) : (b[sort] ?? '');
      if (typeof va === 'number' || typeof vb === 'number') return (Number(va) - Number(vb)) * mul;
      return String(va).localeCompare(String(vb)) * mul;
    });
  }, [base, view, workedFirst, sort, dir, repName]);

  // Only the first RENDER_CAP rows hit the DOM. `visible` stays the full set for
  // the count, the view chips, and the bulk-scrub target.
  const shown = useMemo(() => (visible.length > RENDER_CAP ? visible.slice(0, RENDER_CAP) : visible), [visible]);

  const clickSort = (key: SortKey) => {
    if (sort === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setDir(key === 'created_at' || key === 'avg_job_value' || key === 'audit_score' ? 'desc' : 'asc');
    }
  };

  const patchLead = async (id: string, patch: Partial<OutboundLead>, note?: string) => {
    const before = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    try {
      const { lead } = await api<{ lead: OutboundLead }>(`/api/admin/outbound/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setLeads((ls) => ls.map((l) => (l.id === id ? lead : l)));
      if (note) push(note);
    } catch (e) {
      setLeads(before);
      push(e instanceof Error ? e.message : 'Update failed.', 'error');
    }
  };

  const removeLead = async (l: OutboundLead) => {
    if (!window.confirm(`Delete ${l.business_name}? Call history for it goes too.`)) return;
    const before = leads;
    setLeads((ls) => ls.filter((x) => x.id !== l.id));
    try {
      await api(`/api/admin/outbound/leads/${l.id}`, { method: 'DELETE' });
      push('Lead deleted.');
    } catch (e) {
      setLeads(before);
      push(e instanceof Error ? e.message : 'Delete failed.', 'error');
    }
  };

  const onFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const mapped: Record<string, string | null> = {};
        for (const h of headers) {
          const norm = h.toLowerCase().replace(/[^a-z ]/g, '').trim();
          mapped[h] = HEADER_MAP.find(([re]) => re.test(norm))?.[1] ?? null;
        }
        setPreview({ rows: res.data, mapped, headers, fileName: file.name });
      },
      error: () => push('Could not parse that CSV.', 'error'),
    });
  };

  const importRows = useMemo(() => {
    if (!preview) return [];
    const seen = new Set<string>();
    const out: Record<string, unknown>[] = [];
    for (const raw of preview.rows) {
      const row: Record<string, string> = {};
      for (const [header, col] of Object.entries(preview.mapped)) {
        if (col && raw[header] != null) row[col] = String(raw[header]).trim();
      }
      if (!row.business_name || !row.phone) continue;
      if (!isEmail(row.email)) continue; // a lead needs an email AND a phone
      const key = phoneKey(row.phone);
      if (key.length < 7 || seen.has(key)) continue;
      seen.add(key);
      out.push({
        ...row,
        niche: guessNiche(row.niche ?? '') ?? importNiche,
        owner_rep_id: importOwner || null,
        source: row.source || importSource || 'csv-import',
      });
    }
    return out;
  }, [preview, importNiche, importOwner, importSource]);

  const runImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    try {
      const res = await api<{ inserted: number; skipped: number; skippedNoEmail?: number }>('/api/admin/outbound/leads/import', {
        method: 'POST',
        body: JSON.stringify({ rows: importRows }),
      });
      const parts = [`Imported ${res.inserted} leads`];
      if (res.skipped) parts.push(`${res.skipped} duplicates skipped`);
      if (res.skippedNoEmail) parts.push(`${res.skippedNoEmail} skipped for no email`);
      push(`${parts.join(' · ')}.`);
      setImportOpen(false);
      setPreview(null);
      void load();
    } catch (e) {
      push(e instanceof Error ? e.message : 'Import failed.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const visibleUnscrubbed = useMemo(() => visible.filter((l) => !l.dnc_checked && !['won', 'lost', 'dnc'].includes(l.status)), [visible]);

  const runScrub = async () => {
    setScrubbing(true);
    try {
      const ids = visibleUnscrubbed.map((l) => l.id);
      const res = await api<{ updated: number }>('/api/admin/outbound/leads/bulk-scrub', { method: 'POST', body: JSON.stringify({ ids }) });
      setLeads((ls) => ls.map((l) => (ids.includes(l.id) ? { ...l, dnc_checked: true } : l)));
      setScrubOpen(false);
      push(`${res.updated} leads marked DNC-scrubbed. Mr. Mustard is unlocked for them.`);
    } catch (e) {
      push(e instanceof Error ? e.message : 'Bulk scrub failed.', 'error');
    } finally {
      setScrubbing(false);
    }
  };

  const th = (key: SortKey, label: string, right = false) => (
    <th
      onClick={() => clickSort(key)}
      className={`px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] font-oswald font-medium text-[#1a1815]/50 cursor-pointer select-none hover:text-[#1a1815] whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
    >
      {label} {sort === key ? (dir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  const selectCls = 'bg-white border-2 border-[#1a1815]/20 rounded-lg px-2 py-1.5 font-sans text-xs text-[#1a1815] outline-none focus:border-[#b58a2a]';

  return (
    <div className="min-h-screen bg-[#f7f3e9]">
      <AdminHeader active="outbound" title="Outbound · Leads" onRefresh={() => void load()} />
      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8">
        <OutboundNav
          active="leads"
          right={
            <div className="flex items-center gap-2">
              <button onClick={() => setImportOpen(true)} className={btnGhost}>Import CSV</button>
              <button onClick={() => setAddOpen(true)} className={btnPrimary}>Add lead</button>
            </div>
          }
        />

        {error && (
          <div className={`${card} p-5 mb-6 border-[#a03123] shadow-[5px_5px_0_0_#a03123]`}>
            <p className="font-sans text-sm text-[#a03123] font-medium">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className={`${card} p-4 mb-5`}>
          {/* Saved views: one-click segments for the highest-intent lead types */}
          <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b-2 border-[#1a1815]/10">
            <span className={`${eyebrow} mr-1`}>Saved views</span>
            {VIEWS.map((v) => {
              const active = view === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  title={v.desc}
                  className={`px-3 py-1.5 rounded-lg border-2 font-oswald uppercase tracking-[0.08em] text-[11px] transition-colors ${
                    active
                      ? 'bg-[#1a1815] text-[#f7f3e9] border-[#1a1815] shadow-[2px_2px_0_0_#b58a2a]'
                      : 'bg-white text-[#1a1815]/70 border-[#1a1815]/20 hover:border-[#b58a2a] hover:text-[#1a1815]'
                  }`}
                >
                  {v.label}
                  <span className={`ml-1.5 tabular-nums ${active ? 'text-[#f7b32b]' : 'text-[#1a1815]/40'}`}>{viewCounts[v.key]}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search business, contact, phone, city" className={`${inputCls} !w-64 !py-2`} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filter by status">
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select value={niche} onChange={(e) => setNiche(e.target.value)} className={selectCls} aria-label="Filter by niche">
            <option value="">All niches</option>
            {NICHES.map((n) => <option key={n} value={n}>{NICHE_LABELS[n]}</option>)}
          </select>
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className={selectCls} aria-label="Filter by rep">
            <option value="">All reps</option>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={stateF} onChange={(e) => pickState(e.target.value)} className={selectCls} aria-label="Filter by state">
            <option value="">All states</option>
            {stateOptions.map(([s, n]) => <option key={s} value={s}>{s} ({n})</option>)}
          </select>
          <select value={cityF} onChange={(e) => setCityF(e.target.value)} className={selectCls} aria-label="Filter by city">
            <option value="">All cities</option>
            {cityOptions.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
          </select>
          <select value={sourceF} onChange={(e) => setSourceF(e.target.value)} className={selectCls} aria-label="Filter by source">
            <option value="">All sources</option>
            {sourceOptions.map(([s, n]) => (
              <option key={s} value={s}>{SOURCE_LABELS[s] ?? s} ({n})</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 font-sans text-xs text-[#1a1815]/70 cursor-pointer ml-1">
            <input type="checkbox" checked={unscrubbedOnly} onChange={(e) => setUnscrubbedOnly(e.target.checked)} className="accent-[#a03123] w-4 h-4" />
            DNC unscrubbed only
          </label>
          <label className="flex items-center gap-1.5 font-sans text-xs text-[#1a1815]/70 cursor-pointer" title="Keep contacted, callback, demo'd, pilot and won leads above raw new imports.">
            <input type="checkbox" checked={workedFirst} onChange={(e) => setWorkedFirst(e.target.checked)} className="accent-[#3f5d34] w-4 h-4" />
            Worked leads first
          </label>
          {visibleUnscrubbed.length > 0 && (
            <button onClick={() => setScrubOpen(true)} className={`${btnGhost} !px-3 !py-1.5 !text-xs !border-[#a03123] !text-[#a03123] !shadow-[2px_2px_0_0_#a03123]`}>
              🔒 Scrub visible ({visibleUnscrubbed.length})
            </button>
          )}
          <span className="ml-auto font-oswald text-sm text-[#1a1815]/50 uppercase tracking-[0.1em]">{visible.length} leads</span>
          </div>
        </div>

        {/* Table */}
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans min-w-[1060px]">
              <thead className="border-b-2 border-[#1a1815]/10 bg-[#f7f3e9]/60">
                <tr>
                  {th('business_name', 'Business')}
                  {th('contact_name', 'Contact')}
                  {th('phone', 'Phone')}
                  {th('niche', 'Niche')}
                  {th('city', 'City')}
                  {th('status', 'Status')}
                  {th('owner', 'Rep')}
                  {th('avg_job_value', 'Job value', true)}
                  {th('audit_score', 'Score', true)}
                  <th className="px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] font-oswald font-medium text-[#1a1815]/50 text-center">DNC ok</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={11} className="px-4 py-10 text-center text-[#1a1815]/40">Loading the list...</td></tr>
                )}
                {!loading && visible.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center">
                      <p className="font-oswald uppercase text-lg text-[#1a1815]/50">No leads match</p>
                      <p className="text-xs text-[#1a1815]/50 mt-1">Import a CSV or add your first lead to start dialing.</p>
                    </td>
                  </tr>
                )}
                {shown.map((l) => (
                  <tr key={l.id} className="border-t border-[#1a1815]/[0.07] hover:bg-[#b58a2a]/[0.05] transition-colors">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/outbound/call/${l.id}`} className="font-semibold text-[#1a1815] hover:text-[#b58a2a] transition-colors">
                        {l.business_name}
                      </Link>
                      {(() => {
                        const f = siteFlag(l);
                        return f ? (
                          <span
                            className={`block w-fit mt-0.5 px-1.5 py-0.5 rounded font-oswald uppercase tracking-[0.08em] text-[9px] border ${
                              f.tone === 'red'
                                ? 'bg-[#a03123]/10 text-[#a03123] border-[#a03123]/30'
                                : 'bg-[#b58a2a]/12 text-[#7a5c1a] border-[#b58a2a]/40'
                            }`}
                            title={f.tone === 'red' ? 'No website on file. Pitch: build them one.' : 'Weak or outdated site. Pitch: redesign.'}
                          >
                            {f.label}
                          </span>
                        ) : null;
                      })()}
                    </td>
                    <td className="px-3 py-2.5 text-[#1a1815]/70">
                      {l.contact_name ?? ''}
                      {/* The address the Email button would actually use. */}
                      {l.email ? (
                        <span className="block text-[11px] text-[#1a1815]/45 break-all" title={`Emails go to ${l.email}`}>✉ {l.email}</span>
                      ) : (
                        <span className="block text-[11px] text-[#1a1815]/30" title="No email on file. Open the lead and run Find site & email.">No email</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[#1a1815]/70">{formatPhone(l.phone)}</td>
                    <td className="px-3 py-2.5"><NicheChip niche={l.niche} /></td>
                    <td className="px-3 py-2.5 text-[#1a1815]/70">{l.city ?? ''}</td>
                    <td className="px-3 py-2.5">
                      <select
                        value={l.status}
                        onChange={(e) => void patchLead(l.id, { status: e.target.value as OutboundLead['status'] }, 'Status updated.')}
                        className={`${selectCls} !text-[11px]`}
                        aria-label={`Status for ${l.business_name}`}
                      >
                        {LEAD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={l.owner_rep_id ?? ''}
                        onChange={(e) => void patchLead(l.id, { owner_rep_id: e.target.value || null }, 'Rep assigned.')}
                        className={`${selectCls} !text-[11px]`}
                        aria-label={`Rep for ${l.business_name}`}
                      >
                        <option value="">Unassigned</option>
                        {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-right font-oswald tabular-nums text-[#1a1815]">{l.avg_job_value ? fmtMoney(Number(l.avg_job_value)) : ''}</td>
                    <td className="px-3 py-2.5 text-right">
                      {l.audit_score != null && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border font-oswald font-semibold text-xs tabular-nums ${
                            l.audit_score >= 80
                              ? 'text-[#3f5d34] border-[#3f5d34]/50 bg-[#3f5d34]/10'
                              : l.audit_score >= 60
                                ? 'text-[#7a5c1a] border-[#b58a2a]/60 bg-[#b58a2a]/12'
                                : 'text-[#a03123] border-[#a03123]/50 bg-[#a03123]/8'
                          }`}
                          title={l.email_open_count > 0 ? `Audit ${l.audit_score}/100 · email opened ${l.email_open_count}x` : `Audit ${l.audit_score}/100`}
                        >
                          {l.audit_score}
                          {l.email_open_count > 0 && <span className="ml-1">👁</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={l.dnc_checked}
                        onChange={(e) => void patchLead(l.id, { dnc_checked: e.target.checked }, e.target.checked ? 'Marked DNC-scrubbed.' : 'Marked unscrubbed.')}
                        className="accent-[#3f5d34] w-4 h-4 cursor-pointer"
                        aria-label={`DNC scrubbed for ${l.business_name}`}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/outbound/call/${l.id}`} className={`${btnPrimary} !px-3 !py-1.5 !text-xs`}>Call</Link>
                        <button onClick={() => void removeLead(l)} className="text-[#1a1815]/30 hover:text-[#a03123] transition-colors px-1" aria-label={`Delete ${l.business_name}`}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && visible.length > RENDER_CAP && (
                  <tr>
                    <td colSpan={11} className="px-4 py-4 text-center bg-[#f7f3e9]/60 border-t-2 border-[#1a1815]/10">
                      <p className="font-oswald uppercase tracking-[0.12em] text-xs text-[#1a1815]/55">
                        Showing the first {RENDER_CAP} of {visible.length}. Search or filter to narrow the list.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add lead modal */}
      <AddLeadModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        reps={reps}
        onAdded={(lead) => {
          setLeads((ls) => [lead, ...ls]);
          push(`${lead.business_name} added.`);
        }}
        onError={(msg) => push(msg, 'error')}
      />

      {/* Import CSV modal */}
      <Modal
        open={importOpen}
        onClose={() => { setImportOpen(false); setPreview(null); }}
        eyebrow="Outbound"
        title="Import leads from CSV"
        subtitle="Headers are auto-mapped. Every lead needs an email and a phone; rows missing either, or duplicates, are skipped."
        size="xl"
      >
        {!preview && (
          <div
            className="border-2 border-dashed border-[#1a1815]/30 rounded-2xl p-10 text-center cursor-pointer hover:border-[#b58a2a] hover:bg-[#b58a2a]/[0.04] transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click(); }}
          >
            <p className="font-oswald uppercase text-lg text-[#1a1815]/70">Drop a CSV here or click to browse</p>
            <p className="font-sans text-xs text-[#1a1815]/50 mt-1.5">Columns we understand: business, contact, phone, email, website, niche, city, state, job value, missed calls, source, notes.</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
          </div>
        )}

        {preview && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="font-sans text-sm font-semibold text-[#1a1815]">{preview.fileName}</span>
              <span className="font-sans text-xs text-[#1a1815]/55">{preview.rows.length} rows · {importRows.length} importable after dedupe</span>
              <button onClick={() => setPreview(null)} className="font-sans text-xs text-[#b58a2a] font-semibold hover:text-[#1a1815]">Pick a different file</button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className={labelCls}>Default niche (when unmapped)</label>
                <select className={inputCls} value={importNiche} onChange={(e) => setImportNiche(e.target.value as Niche)}>
                  {NICHES.map((n) => <option key={n} value={n}>{NICHE_LABELS[n]}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Assign to rep</label>
                <select className={inputCls} value={importOwner} onChange={(e) => setImportOwner(e.target.value)}>
                  <option value="">Unassigned</option>
                  {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Source tag</label>
                <input className={inputCls} value={importSource} onChange={(e) => setImportSource(e.target.value)} />
              </div>
            </div>

            <div className="overflow-x-auto border-2 border-[#1a1815]/10 rounded-xl">
              <table className="w-full text-xs font-sans min-w-[720px]">
                <thead className="bg-[#f7f3e9]">
                  <tr>
                    {preview.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left">
                        <span className="block font-semibold text-[#1a1815]">{h}</span>
                        <span className={`block text-[10px] font-oswald uppercase tracking-[0.1em] ${preview.mapped[h] ? 'text-[#3f5d34]' : 'text-[#a03123]/70'}`}>
                          {preview.mapped[h] ? `→ ${preview.mapped[h]}` : 'ignored'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-t border-[#1a1815]/[0.07]">
                      {preview.headers.map((h) => (
                        <td key={h} className="px-3 py-1.5 text-[#1a1815]/70 whitespace-nowrap max-w-[180px] truncate">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setImportOpen(false); setPreview(null); }} className={btnGhost}>Cancel</button>
              <button onClick={() => void runImport()} disabled={importing || importRows.length === 0} className={btnPrimary}>
                {importing ? 'Importing...' : `Import ${importRows.length} leads`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk DNC scrub attestation */}
      <Modal open={scrubOpen} onClose={() => setScrubOpen(false)} eyebrow="House rule" title={`Mark ${visibleUnscrubbed.length} leads as DNC-scrubbed`} subtitle="This unlocks Mr. Mustard for the whole batch." size="sm" headerTone="dark">
        <p className="font-sans text-sm text-[#1a1815]/75 leading-relaxed">
          Confirm the batch: these are business lines you checked against the National Do Not Call registry (sole proprietors can be registered), and anyone who asked not to be called has been marked DNC individually. The filtered view right now is <strong>{visibleUnscrubbed.length}</strong> unscrubbed leads.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setScrubOpen(false)} className={btnGhost}>Cancel</button>
          <button onClick={() => void runScrub()} disabled={scrubbing} className={btnPrimary}>
            {scrubbing ? 'Scrubbing…' : 'I checked them, unlock the batch'}
          </button>
        </div>
      </Modal>

      <ToastHost toasts={toasts} />
    </div>
  );
}

/**
 * Own component with local form state on purpose: with ~1,000 leads loaded,
 * keeping the form state in the page meant every keystroke re-rendered the
 * whole table. Here a keystroke re-renders only the modal.
 */
function AddLeadModal({
  open,
  onClose,
  reps,
  onAdded,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  reps: Rep[];
  onAdded: (lead: OutboundLead) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const { lead } = await api<{ lead: OutboundLead }>('/api/admin/outbound/leads', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          owner_rep_id: form.owner_rep_id || null,
          avg_job_value: form.avg_job_value || null,
          est_missed_calls_week: form.est_missed_calls_week || null,
        }),
      });
      onAdded(lead);
      onClose();
      setForm({ ...EMPTY_FORM });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not add the lead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Outbound" title="Add lead" subtitle="One business, straight onto the dial list." size="lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Business name *</label>
          <input className={inputCls} value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Flathead Roofing Co." />
        </div>
        <div>
          <label className={labelCls}>Contact name</label>
          <input className={inputCls} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Bruce" />
        </div>
        <div>
          <label className={labelCls}>Phone *</label>
          <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(406) 555-0134" />
        </div>
        <div>
          <label className={labelCls}>Email (recommended)</label>
          <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="owner@business.com" />
          {!isEmail(form.email) && (
            <p className="mt-1 text-[11px] text-[#7a5c1a] font-sans">Leads with an email convert far better. Add one if you can, but you can save without it.</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Website</label>
          <input className={inputCls} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="business.com" />
        </div>
        <div>
          <label className={labelCls}>Niche</label>
          <select className={inputCls} value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value as Niche })}>
            {NICHES.map((n) => <option key={n} value={n}>{NICHE_LABELS[n]}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Rep</label>
          <select className={inputCls} value={form.owner_rep_id} onChange={(e) => setForm({ ...form, owner_rep_id: e.target.value })}>
            <option value="">Unassigned</option>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Kalispell" />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input className={inputCls} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="MT" />
        </div>
        <div>
          <label className={labelCls}>Avg job value ($)</label>
          <input className={inputCls} inputMode="decimal" value={form.avg_job_value} onChange={(e) => setForm({ ...form, avg_job_value: e.target.value })} placeholder="450" />
        </div>
        <div>
          <label className={labelCls}>Est. missed calls / week</label>
          <input className={inputCls} inputMode="numeric" value={form.est_missed_calls_week} onChange={(e) => setForm({ ...form, est_missed_calls_week: e.target.value })} placeholder="5" />
        </div>
        <div>
          <label className={labelCls}>Source</label>
          <input className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="google-maps" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls} min-h-[70px]`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <label className="sm:col-span-2 flex items-center gap-2 font-sans text-sm text-[#1a1815]/75 cursor-pointer">
          <input type="checkbox" checked={form.dnc_checked} onChange={(e) => setForm({ ...form, dnc_checked: e.target.checked })} className="accent-[#3f5d34] w-4 h-4" />
          Checked against the DNC registry
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button onClick={() => void submit()} disabled={saving || !form.business_name.trim() || form.phone.replace(/\D/g, '').length < 7} className={btnPrimary}>
          {saving ? 'Saving...' : 'Add lead'}
        </button>
      </div>
    </Modal>
  );
}
