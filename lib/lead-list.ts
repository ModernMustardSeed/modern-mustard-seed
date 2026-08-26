/**
 * The shape of a printed or emailed lead list.
 *
 * One definition, two consumers: the browser renders the print sheet and the CSV
 * from it, and app/api/admin/outbound/leads/send-list renders the email from it.
 * Keeping the columns here is what makes the paper Sarah hands someone and the
 * email in their inbox the same list, in the same order, with the same wording.
 */
import { NICHE_LABELS, STATUS_LABELS, formatPhone, fmtMoney } from '@/lib/outbound';
import type { LeadStatus, Niche } from '@/lib/outbound';

/** Every field the list can carry. `select` on the server pulls exactly these. */
export type ListLead = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  niche: Niche;
  city: string | null;
  state: string | null;
  status: LeadStatus;
  avg_job_value: number | null;
  rating: number | null;
  review_count: number | null;
  notes: string | null;
  rep_notes: string | null;
};

export const LEAD_LIST_FIELDS =
  'id,business_name,contact_name,phone,email,website,niche,city,state,status,avg_job_value,rating,review_count,notes,rep_notes';

export type ColumnKey =
  | 'business_name' | 'contact_name' | 'phone' | 'email' | 'website'
  | 'location' | 'niche' | 'status' | 'avg_job_value' | 'rating' | 'notes';

export type ListColumn = {
  key: ColumnKey;
  label: string;
  /** Right-align on the printed sheet: money and counts read better that way. */
  right?: boolean;
  /** Roughly how much of the printed row this column deserves. */
  weight: number;
};

export const LEAD_LIST_COLUMNS: ListColumn[] = [
  { key: 'business_name', label: 'Business', weight: 20 },
  { key: 'contact_name', label: 'Contact', weight: 12 },
  { key: 'phone', label: 'Phone', weight: 12 },
  { key: 'email', label: 'Email', weight: 20 },
  { key: 'location', label: 'City', weight: 12 },
  { key: 'niche', label: 'Trade', weight: 10 },
  { key: 'website', label: 'Website', weight: 18 },
  { key: 'status', label: 'Status', weight: 9 },
  { key: 'avg_job_value', label: 'Job value', right: true, weight: 8 },
  { key: 'rating', label: 'Rating', right: true, weight: 8 },
  { key: 'notes', label: 'Notes', weight: 26 },
];

const COLUMN_KEYS = LEAD_LIST_COLUMNS.map((c) => c.key);

/** What a fresh list carries: everything a person needs to actually call or
 *  email the business, and nothing that only means something inside the app. */
export const DEFAULT_COLUMNS: ColumnKey[] = ['business_name', 'contact_name', 'phone', 'email', 'location', 'niche', 'website'];

/** Keeps the picked order stable no matter what order the caller sent. */
export function normalizeColumns(raw: unknown): ListColumn[] {
  const wanted = new Set(Array.isArray(raw) ? raw.filter((k): k is ColumnKey => COLUMN_KEYS.includes(k as ColumnKey)) : []);
  const picked = LEAD_LIST_COLUMNS.filter((c) => wanted.has(c.key));
  return picked.length ? picked : LEAD_LIST_COLUMNS.filter((c) => DEFAULT_COLUMNS.includes(c.key));
}

/**
 * A site URL a person can read: no scheme, no www, no tracking tail. The sourcer
 * saves Google Business Profile links with their utm_source query attached, and
 * printed on paper that string is three unreadable lines nobody will ever type.
 */
export function tidyUrl(url: string): string {
  return url.trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

/**
 * One cell, as text. Everything downstream (paper, CSV, email, clipboard) is
 * built from this, so a lead reads identically in all four.
 */
export function cellValue(l: ListLead, key: ColumnKey): string {
  switch (key) {
    case 'business_name': return l.business_name ?? '';
    case 'contact_name': return l.contact_name?.trim() ?? '';
    case 'phone': return l.phone ? formatPhone(l.phone) : '';
    case 'email': return l.email?.trim() ?? '';
    case 'website': return l.website?.trim() ? tidyUrl(l.website) : 'No website';
    case 'location': return [l.city?.trim(), l.state?.trim()].filter(Boolean).join(', ');
    case 'niche': return NICHE_LABELS[l.niche] ?? String(l.niche ?? '');
    case 'status': return STATUS_LABELS[l.status] ?? String(l.status ?? '');
    case 'avg_job_value': return l.avg_job_value ? fmtMoney(Number(l.avg_job_value)) : '';
    case 'rating': return l.rating ? `${Number(l.rating).toFixed(1)}${l.review_count ? ` (${l.review_count})` : ''}` : '';
    case 'notes': return (l.rep_notes?.trim() || l.notes?.trim() || '').replace(/\s+/g, ' ').slice(0, 180);
    default: return '';
  }
}

/** "August 26, 2026" in Sarah's timezone, for the line under the title. */
export function listDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', month: 'long', day: 'numeric', year: 'numeric' }).format(now);
}

/** The plain-text list: what Copy puts on the clipboard and what every email
 *  carries as its text part. Numbered, one block per lead, phone-readable. */
export function listAsText(leads: ListLead[], columns: ListColumn[], title: string): string {
  const lines = [title, '='.repeat(Math.min(title.length, 60)), ''];
  leads.forEach((l, i) => {
    lines.push(`${i + 1}. ${l.business_name}`);
    for (const c of columns) {
      if (c.key === 'business_name') continue;
      const v = cellValue(l, c.key);
      if (v) lines.push(`   ${c.label}: ${v}`);
    }
    lines.push('');
  });
  lines.push(`${leads.length} ${leads.length === 1 ? 'lead' : 'leads'} - ${listDate()}`);
  return lines.join('\n');
}
