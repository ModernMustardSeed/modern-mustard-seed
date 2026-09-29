'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OfficeState } from '@/lib/office/server';

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

/**
 * One poll, every surface. The dock and the floor both draw from the same
 * state read, so a mission started from chat lights the floor and a Go pressed
 * on the floor shows in the chat without either knowing about the other.
 *
 * The poll slows to a crawl in a hidden tab: Sarah keeps the admin open all
 * day, and a background tab has no one to show a new feed line to.
 */
export function useOffice({ intervalMs, lite = false, enabled = true }: { intervalMs: number; lite?: boolean; enabled?: boolean }) {
  const [state, setState] = useState<OfficeState | null>(null);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/office${lite ? '?lite=1' : ''}`, { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) { setForbidden(true); return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      setState(json as OfficeState);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the office.');
    }
  }, [lite]);

  useEffect(() => {
    if (!enabled || forbidden) return;
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      await load();
      if (!alive) return;
      const wait = typeof document !== 'undefined' && document.hidden ? Math.max(intervalMs, 30_000) : intervalMs;
      timer.current = window.setTimeout(tick, wait);
    };
    tick();
    const onVis = () => { if (!document.hidden) { if (timer.current) window.clearTimeout(timer.current); tick(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      if (timer.current) window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, forbidden, intervalMs, load]);

  const send = useCallback(async (body: string) => {
    const { message } = await call<{ message: OfficeState['messages'][number] }>('/api/admin/office/chat', { method: 'POST', body: JSON.stringify({ body }) });
    // Show it now; the poll will carry Sower's reply.
    setState((s) => (s ? { ...s, messages: [...s.messages, message], thinking: { status: 'queued', last_action: null } } : s));
    load();
  }, [load]);

  const mission = useCallback(async (id: string, action: 'go' | 'stop') => {
    await call(`/api/admin/office/missions/${id}`, { method: 'POST', body: JSON.stringify({ action }) });
    await load();
  }, [load]);

  const decide = useCallback(async (id: string, approve: boolean, note?: string) => {
    await call(`/api/admin/office/approvals/${id}`, { method: 'POST', body: JSON.stringify({ approve, note: note || undefined }) });
    await load();
  }, [load]);

  const settings = useCallback(async (patch: { autoGo?: boolean; autoShip?: boolean }) => {
    await call('/api/admin/office/settings', { method: 'POST', body: JSON.stringify(patch) });
    await load();
  }, [load]);

  const lesson = useCallback(async (id: string, patch: { pinned?: boolean; active?: boolean }) => {
    await call(`/api/admin/office/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await load();
  }, [load]);

  const reset = useCallback(async () => {
    await call('/api/admin/office/chat', { method: 'DELETE' });
    await load();
  }, [load]);

  return { state, error, forbidden, reload: load, send, mission, decide, settings, reset, lesson };
}

export type OfficeApi = ReturnType<typeof useOffice>;
