'use client';

import { useCallback, useState } from 'react';

/**
 * Shared pieces for the Bootcamp desk tabs: the cream and ink styles every
 * admin surface uses (ink is set on purpose, the site body is text-white),
 * the row types the API routes return, a fetch helper that turns a failed
 * response into a readable message, and a clipboard hook with a fallback.
 */

export const card = 'bg-white border-2 border-[#161616] rounded-xl text-[#161616]';
export const label = 'block text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#3A3733] mb-1.5';
export const input = 'w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-2 font-body text-sm text-[#161616] outline-none focus:shadow-[3px_3px_0_0_#F5B700]';
export const btn = 'rounded-full border-2 border-[#161616] bg-white px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#161616] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FBF6EA] transition-colors';
export const btnGold = 'rounded-full border-2 border-[#161616] bg-[#F5B700] px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#161616] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FFD23F] transition-colors';
export const btnInk = 'rounded-full border-2 border-[#161616] bg-[#161616] px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#FBF6EA] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3A3733] transition-colors';
export const th = 'text-left px-3 py-2.5 whitespace-nowrap';
export const td = 'px-3 py-2.5 align-top text-[#161616]';
export const muted = 'font-body text-sm text-[#3A3733]';
export const errorBox = 'border-2 border-[#161616] rounded-xl px-4 py-3 font-body text-sm bg-[#E0301E]/15 text-[#161616]';
export const emptyBox = 'rounded-xl border-2 border-dashed border-[#161616]/40 bg-[#FBF6EA] px-5 py-8 text-center font-body text-sm text-[#3A3733]';

export const usdFromCents = (c: number) => `$${Math.round((c || 0) / 100).toLocaleString('en-US')}`;
export const usdWhole = (n: number) => `$${Math.round(n || 0).toLocaleString('en-US')}`;

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export type TierCounts = { masterclass: number; ga: number; vip: number; platinum: number; operator: number };

export type StatsPayload = {
  ok: true;
  launch: string;
  counts: TierCounts;
  revenueCents: Partial<TierCounts>;
  hosts: { applied: number; approved: number; live: number; paused: number; declined: number };
  outreach: OutreachSummary;
  last24h: number;
  next: { key: string; at: string } | null;
};

export type OutreachSummary = {
  state: { armed: boolean; dailyCap: number; startedAt: string | null };
  todaySent: number;
  total: number;
  byStatus: Record<string, number>;
  byVertical: Record<string, number>;
  repliedByVertical: Record<string, number>;
};

export type OutreachStatus = 'queued' | 'hand' | 'sent' | 'replied' | 'hosting' | 'declined' | 'bounced' | 'done' | 'skipped';

export type OutreachRow = {
  id: string;
  name: string;
  brand: string | null;
  email: string | null;
  contact_path: string | null;
  contact_type: 'email' | 'form' | 'booking' | 'dm';
  platforms: string | null;
  audience: string | null;
  sells: string | null;
  hook: string | null;
  vertical: string;
  fit: number;
  tier: string;
  status: OutreachStatus;
  step: number;
  next_at: string | null;
  last_sent_at: string | null;
  replied_at: string | null;
  host_slug: string | null;
  notes: string | null;
  created_at: string;
  message: string | null;
};

export type HostStatus = 'applied' | 'approved' | 'live' | 'paused' | 'declined';

export type HostLinks = { share: string; masterclass: string; dashboard: string | null };

export type HostStatsShape = {
  clicks: number;
  masterclass: number;
  tickets: { ga: number; vip: number; platinum: number };
  ticketRevenueCents: number;
  operatorSeats: number;
  earningsCents: number;
};

export type HostRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  email: string;
  website: string | null;
  platforms: string | null;
  audience: string | null;
  vertical: string | null;
  room: string | null;
  status: HostStatus;
  founding: boolean;
  clicks: number;
  notes: string | null;
  approved_at: string | null;
  created_at: string;
  links: HostLinks | null;
  stats: HostStatsShape | null;
};

export type RegistrationRow = {
  id: string;
  email: string;
  name: string | null;
  business: string | null;
  website: string | null;
  trade: string | null;
  tier: 'masterclass' | 'ga' | 'vip' | 'platinum' | 'operator';
  amount_cents: number;
  host_slug: string | null;
  source: string | null;
  created_at: string;
  unsubscribed_at: string | null;
};

/** fetch that resolves to the JSON body or throws the server's message. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data;
}

export async function post<T>(url: string, body: unknown): Promise<T> {
  return api<T>(url, { method: 'POST', body: JSON.stringify(body) });
}

/** Clipboard with a textarea fallback for contexts where the API is blocked. */
export function useCopy(ms = 1500) {
  const [copied, setCopied] = useState('');
  const copy = useCallback(
    async (text: string, key: string) => {
      let ok = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch {
        ok = false;
      }
      if (!ok) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          ok = document.execCommand('copy');
          document.body.removeChild(ta);
        } catch {
          ok = false;
        }
      }
      setCopied(ok ? key : `fail:${key}`);
      window.setTimeout(() => setCopied(''), ms);
    },
    [ms],
  );
  const labelFor = (key: string, idle = 'Copy') => (copied === key ? 'Copied' : copied === `fail:${key}` ? 'Select by hand' : idle);
  return { copy, copied, labelFor };
}

export const TIER_LABEL: Record<string, string> = {
  masterclass: 'Masterclass',
  ga: 'General',
  vip: 'VIP',
  platinum: 'Platinum',
  operator: 'Operator',
};

export const STATUS_TONE: Record<string, string> = {
  queued: 'bg-[#FBF6EA] border-[#161616]/30',
  hand: 'bg-[#F5B700]/30 border-[#161616]',
  sent: 'bg-[#0b3b44]/10 border-[#0b3b44]',
  replied: 'bg-[#F5B700] border-[#161616]',
  hosting: 'bg-[#0a7c78]/20 border-[#0a7c78]',
  declined: 'bg-[#161616]/10 border-[#161616]/40',
  bounced: 'bg-[#E0301E]/15 border-[#E0301E]',
  done: 'bg-[#161616]/5 border-[#161616]/30',
  skipped: 'bg-[#161616]/5 border-[#161616]/30',
  applied: 'bg-[#F5B700]/30 border-[#161616]',
  approved: 'bg-[#0a7c78]/20 border-[#0a7c78]',
  live: 'bg-[#0a7c78]/30 border-[#0a7c78]',
  paused: 'bg-[#161616]/10 border-[#161616]/40',
};

export function Chip({ value }: { value: string }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#161616] ${STATUS_TONE[value] || 'bg-white border-[#161616]/30'}`}>
      {value}
    </span>
  );
}
