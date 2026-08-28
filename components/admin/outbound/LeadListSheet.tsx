'use client';

import Papa from 'papaparse';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from '@/components/ui/Modal';
import { api, btnGhost, btnPrimary, btnSeed, inputCls, labelCls } from '@/components/admin/outbound/ui';
import { DEFAULT_COLUMNS, LEAD_LIST_COLUMNS, cellValue, listAsText, listDate } from '@/lib/lead-list';
import type { ColumnKey, ListLead } from '@/lib/lead-list';
import type { OutboundLead } from '@/lib/outbound';

/**
 * Take a stack of leads off the screen and into the real world: onto paper, into
 * a clipboard, into a spreadsheet, or into somebody's inbox.
 *
 * The printed sheet is a real second document, not the admin table with its
 * chrome hidden. It is portalled to its own child of <body> and parked off-screen,
 * so the print stylesheet can switch the whole app off and leave one clean page
 * run, at full width, with the column header repeating on every sheet.
 */

/** Paper stops being readable past this, and the browser crawls rendering it. */
const MAX_ROWS = 1000;
const TO_KEY = 'mms_lead_list_to';
const COLS_KEY = 'mms_lead_list_columns';
const PRINT_HOST_ID = 'lead-print-root';

const COLUMN_KEYS = LEAD_LIST_COLUMNS.map((c) => c.key);

/** The admin's lead rows carry far more than a printed list needs. */
function toListLead(l: OutboundLead): ListLead {
  return {
    id: l.id,
    business_name: l.business_name,
    contact_name: l.contact_name,
    phone: l.phone,
    email: l.email,
    website: l.website,
    niche: l.niche,
    city: l.city,
    state: l.state,
    status: l.status,
    avg_job_value: l.avg_job_value,
    rating: l.rating ?? null,
    review_count: l.review_count ?? null,
    notes: l.notes,
    rep_notes: l.rep_notes,
  };
}

export default function LeadListSheet({
  open,
  onClose,
  leads,
  scopeLabel,
  selectionCount,
  defaultTitle = 'Outbound leads',
  push,
}: {
  open: boolean;
  onClose: () => void;
  /** Already in the order they appear on screen. */
  leads: OutboundLead[];
  /** Which slice of the floor this is, e.g. "No website + MT + Never worked". */
  scopeLabel: string;
  /** How many rows are ticked, so the sheet can say what it is about to send. */
  selectionCount: number;
  /** What the sheet is called before anybody renames it. */
  defaultTitle?: string;
  push: (msg: string, tone?: 'ok' | 'error') => void;
}) {
  const [columns, setColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [title, setTitle] = useState(defaultTitle);
  const [landscape, setLandscape] = useState(false);
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  // Remembered per browser: the columns Sarah likes and the address she sends to
  // are the same every time, and retyping them is the reason a tool goes unused.
  useEffect(() => {
    try {
      const savedTo = window.localStorage.getItem(TO_KEY);
      if (savedTo) setTo(savedTo);
      const savedCols: unknown = JSON.parse(window.localStorage.getItem(COLS_KEY) ?? 'null');
      if (Array.isArray(savedCols)) {
        const clean = savedCols.filter((k): k is ColumnKey => COLUMN_KEYS.includes(k as ColumnKey));
        if (clean.length) setColumns(clean);
      }
    } catch {
      /* a browser with storage blocked still gets the defaults */
    }
  }, []);

  // The sheet is portalled to a direct child of <body> so the print stylesheet
  // can switch off every OTHER body child. Hiding the app with `visibility`
  // instead leaves it laid out, and Chrome then pads the job with however many
  // blank pages the admin screen is tall: six, for a twelve-lead list.
  const [printHost, setPrintHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const el = document.createElement('div');
    el.id = PRINT_HOST_ID;
    document.body.appendChild(el);
    setPrintHost(el);
    return () => {
      el.remove();
      setPrintHost(null);
    };
  }, [open]);

  const picked = useMemo(() => LEAD_LIST_COLUMNS.filter((c) => columns.includes(c.key)), [columns]);
  const rows = useMemo(() => leads.slice(0, MAX_ROWS).map(toListLead), [leads]);
  const truncated = leads.length - rows.length;

  const toggleColumn = (key: ColumnKey) => {
    setColumns((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      // A list with no columns is not a list, so the last one off falls back to
      // the default set instead of printing a page of row numbers.
      const kept = next.length ? next : DEFAULT_COLUMNS;
      const ordered = COLUMN_KEYS.filter((k) => kept.includes(k));
      try { window.localStorage.setItem(COLS_KEY, JSON.stringify(ordered)); } catch { /* storage blocked */ }
      return ordered;
    });
  };

  const doPrint = () => {
    // The sheet is already mounted; the print stylesheet is what reveals it.
    window.print();
  };

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(listAsText(rows, picked, title));
      push(`${rows.length} leads copied. Paste them anywhere.`);
    } catch {
      push('The browser blocked the clipboard. Download the CSV instead.', 'error');
    }
  };

  const doCsv = () => {
    const csv = Papa.unparse({
      fields: picked.map((c) => c.label),
      data: rows.map((l) => picked.map((c) => cellValue(l, c.key))),
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'leads';
    // Excel reads a bare UTF-8 CSV as Windows-1252 and mangles any accent in a
    // business name; the byte order mark is what makes it open correctly.
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    push(`${slug}-${stamp}.csv downloaded.`);
  };

  const doEmail = async () => {
    const addrs = to.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!addrs.length) { push('Put an email address in first.', 'error'); return; }
    if (addrs.some((a) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a))) { push('One of those addresses is not an email address.', 'error'); return; }
    setSending(true);
    try {
      const res = await api<{ sent: number }>('/api/admin/outbound/leads/send-list', {
        method: 'POST',
        body: JSON.stringify({
          ids: rows.map((l) => l.id),
          to: addrs,
          title,
          note: note.trim() || undefined,
          columns: picked.map((c) => c.key),
        }),
      });
      try { window.localStorage.setItem(TO_KEY, addrs.join(', ')); } catch { /* storage blocked */ }
      push(`${res.sent} leads sent to ${addrs.join(', ')}.`);
      onClose();
    } catch (e) {
      push(e instanceof Error ? e.message : 'The list did not send.', 'error');
    } finally {
      setSending(false);
    }
  };

  const scopeLine = selectionCount > 0
    ? `${rows.length} selected ${rows.length === 1 ? 'lead' : 'leads'}`
    : `All ${rows.length.toLocaleString()} ${rows.length === 1 ? 'lead' : 'leads'} in this view`;

  return (
    <>
      <style jsx global>{`
        @media print {
          /* The list is the whole document while it prints: the admin behind it
             is switched off, not merely made invisible, so the job is exactly as
             many pages as the list is long. */
          body > *:not(#${PRINT_HOST_ID}) { display: none !important; }
          #${PRINT_HOST_ID} { display: block !important; }
          html, body {
            background: #ffffff !important;
            height: auto !important;
            overflow: visible !important;
          }
          .lead-print-sheet {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            padding: 0 !important;
          }
          .lead-print-sheet tr { page-break-inside: avoid; }
          .lead-print-sheet thead { display: table-header-group; }
          @page { margin: 12mm; size: ${landscape ? 'landscape' : 'portrait'}; }
        }
      `}</style>

      <Modal
        open={open}
        onClose={onClose}
        eyebrow="Outbound"
        title="Print or send this list"
        subtitle={scopeLine}
        size="lg"
      >
        <div className="space-y-5">
          {truncated > 0 && (
            <p className="font-sans text-xs text-[#a03123] bg-[#a03123]/8 border-2 border-[#a03123]/30 rounded-lg px-3 py-2 leading-relaxed">
              This view holds {(rows.length + truncated).toLocaleString()} leads. A list stops at {MAX_ROWS.toLocaleString()}, so the last {truncated.toLocaleString()} are not on it. Narrow the filter, or tick the rows you want.
            </p>
          )}

          <div>
            <label className={labelCls}>List title</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Outbound leads" />
            <p className="mt-1 font-sans text-[11px] text-[#1a1815]/50">Prints at the top of the page and becomes the email subject. This list is {scopeLabel}.</p>
          </div>

          <div>
            <label className={labelCls}>Columns</label>
            <div className="flex flex-wrap gap-1.5">
              {LEAD_LIST_COLUMNS.map((c) => {
                const on = columns.includes(c.key);
                return (
                  <button
                    key={c.key}
                    onClick={() => toggleColumn(c.key)}
                    aria-pressed={on}
                    className={`px-2.5 py-1.5 rounded-lg border-2 font-oswald uppercase tracking-[0.08em] text-[11px] transition-colors ${
                      on
                        ? 'bg-[#1a1815] text-[#f7f3e9] border-[#1a1815] shadow-[2px_2px_0_0_#3f5d34]'
                        : 'bg-white text-[#1a1815]/60 border-[#1a1815]/20 hover:border-[#3f5d34] hover:text-[#1a1815]'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border-2 border-[#1a1815]/15 bg-[#f7f3e9]/60 p-4">
            <p className="font-oswald uppercase tracking-[0.16em] text-[11px] text-[#1a1815]/60 mb-2.5">On paper</p>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={doPrint} className={btnPrimary}>Print {rows.length}</button>
              <label className="flex items-center gap-1.5 font-sans text-xs text-[#1a1815]/70 cursor-pointer">
                <input type="checkbox" checked={landscape} onChange={(e) => setLandscape(e.target.checked)} className="accent-[#3f5d34] w-4 h-4" />
                Landscape
              </label>
              <span className="w-px self-stretch bg-[#1a1815]/15 mx-1" aria-hidden />
              <button onClick={() => void doCopy()} className={btnGhost}>Copy as text</button>
              <button onClick={doCsv} className={btnGhost}>Download CSV</button>
            </div>
            <p className="mt-2 font-sans text-[11px] text-[#1a1815]/50">
              Print goes to your printer or to Save as PDF. Landscape fits more columns on a page.
            </p>
          </div>

          <div className="rounded-xl border-2 border-[#1a1815]/15 bg-[#f7f3e9]/60 p-4">
            <p className="font-oswald uppercase tracking-[0.16em] text-[11px] text-[#1a1815]/60 mb-2.5">By email</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Send to</label>
                <input className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" type="email" />
              </div>
              <div>
                <label className={labelCls}>Note at the top (optional)</label>
                <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Here is the Bozeman batch." />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <button onClick={() => void doEmail()} disabled={sending} className={btnSeed}>
                {sending ? 'Sending...' : `Email ${rows.length} ${rows.length === 1 ? 'lead' : 'leads'}`}
              </button>
              <span className="font-sans text-[11px] text-[#1a1815]/50">
                Sends from sarah@modernmustardseed.com. The leads themselves get nothing.
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={onClose} className={btnGhost}>Done</button>
          </div>
        </div>
      </Modal>

      {/* The document itself. Parked off-screen until the print stylesheet
          promotes it, and out of the accessibility tree so a screen reader does
          not read the whole floor a second time. */}
      {printHost && createPortal(
        <div
          aria-hidden
          className="lead-print-sheet fixed top-0 left-[-20000px] w-[1100px] bg-white text-[#1a1815] p-8"
        >
          <div className="border-b-2 border-[#1a1815] pb-3 mb-4">
            <p className="text-[10px] uppercase tracking-[0.3em] font-semibold text-[#1a1815]/55">Modern Mustard Seed</p>
            <h1 className="text-[26px] font-bold leading-tight mt-1">{title}</h1>
            <p className="text-[12px] text-[#1a1815]/60 mt-1">
              {rows.length} {rows.length === 1 ? 'lead' : 'leads'} &middot; {scopeLabel} &middot; {listDate()}
            </p>
          </div>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="text-left align-bottom border-b-2 border-[#1a1815] pb-1.5 pr-2 text-[10px] uppercase tracking-[0.12em] text-[#1a1815]/60 w-[26px]">#</th>
                {picked.map((c) => (
                  <th
                    key={c.key}
                    className={`align-bottom border-b-2 border-[#1a1815] pb-1.5 px-2 text-[10px] uppercase tracking-[0.12em] text-[#1a1815]/60 ${c.right ? 'text-right' : 'text-left'}`}
                    style={{ width: `${c.weight}%` }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l, i) => (
                <tr key={l.id} className="border-b border-[#1a1815]/20">
                  <td className="py-1.5 pr-2 align-top text-[#1a1815]/45 tabular-nums">{i + 1}</td>
                  {picked.map((c) => (
                    <td
                      key={c.key}
                      className={`py-1.5 px-2 align-top leading-snug ${c.right ? 'text-right tabular-nums' : ''} ${c.key === 'business_name' ? 'font-semibold' : ''} ${c.key === 'email' || c.key === 'website' ? 'break-all' : ''}`}
                    >
                      {cellValue(l, c.key) || <span className="text-[#1a1815]/25">&middot;</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 pt-2 border-t border-[#1a1815]/20 text-[10px] text-[#1a1815]/50">
            Printed from the Modern Mustard Seed Command Center on {listDate()}. Business contact information, for calling and emailing only.
          </p>
        </div>,
        printHost,
      )}
    </>
  );
}
