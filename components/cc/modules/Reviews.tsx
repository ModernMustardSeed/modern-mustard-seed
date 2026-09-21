'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, CardHead, Empty, ErrorNote, Field, Label, Skeleton, cx, dayLabel, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * THE ASK. One short note from the business with the places to leave a
 * review, Google first. Every ask is kept, so nobody is asked twice and the
 * owner can see at a glance who was asked and when.
 */

type Ask = { id: string; name: string; email: string | null; phone: string | null; project: string | null; sent_email: boolean; sent_sms: boolean; error: string | null; created_at: string };
type Payload = { reviews: { links: Array<{ key: string; label: string; url: string }>; asks: Ask[]; projects: Array<{ slug: string; title: string }> } | null };

export default function Reviews() {
  const [data, setData] = useState<Payload['reviews']>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', project: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/portal/reviews', { cache: 'no-store' });
      const j = (await r.json()) as Payload;
      setData(j.reviews);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch('/api/portal/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const j = (await r.json()) as { ok?: boolean; error?: string; sent_email?: boolean; sent_sms?: boolean };
      if (!r.ok || !j.ok) {
        setResult({ ok: false, text: j.error ?? 'Nothing went out.' });
        return;
      }
      const ways = [j.sent_email && 'email', j.sent_sms && 'text'].filter(Boolean).join(' and ');
      setResult({ ok: true, text: `Asked ${form.name} by ${ways || 'email'}.` });
      setForm({ name: '', email: '', phone: '', project: '', note: '' });
      void load();
    } catch {
      setResult({ ok: false, text: 'Nothing went out.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-5">
      <Card className="lg:col-span-3">
        <CardHead title="Ask for a review" hint="Send it the day the job closes, while they are still standing in it." />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Their name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Carrie Ranger" /></Field>
          <Field label="Which build" hint="Optional.">
            <select className={inputCls} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
              <option value="">Not tied to one</option>
              {(data?.projects ?? []).map((p) => (
                <option key={p.slug} value={p.title}>{p.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="them@example.com" /></Field>
          <Field label="Mobile" hint="One of the two is enough."><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(406) 555 0134" /></Field>
        </div>
        <div className="mt-3">
          <Field label="A personal line" hint="Optional. It goes above the links, in your voice.">
            <textarea className={cx(inputCls, 'min-h-[80px] resize-y')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="It was a pleasure building on the lake with you." />
          </Field>
        </div>
        {result && <p className={cx('mt-3 text-[13px]', result.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{result.text}</p>}
        <div className="mt-4">
          <Button kind="primary" onClick={send} disabled={busy || !form.name.trim() || (!form.email.trim() && !form.phone.trim())}>
            {busy ? 'Sending' : 'Send the ask'}
          </Button>
        </div>
      </Card>

      <div className="lg:col-span-2 space-y-5">
        <Card>
          <CardHead title="Where they land" hint="Google first, every time." />
          <div className="space-y-2">
            {(data?.links ?? []).map((l) => (
              <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cc-line)] px-4 py-2.5 text-[14px] font-semibold hover:border-[var(--cc-ink)]">
                {l.label}
                <span className="text-[var(--cc-muted)]"><Icon name="out" size={16} /></span>
              </a>
            ))}
            {loaded && !data?.links.length && <Empty title="No review links yet" note="Once your profiles are connected they show here." />}
          </div>
        </Card>

        <Card>
          <CardHead title="Asked already" hint="So nobody gets asked twice." />
          {error ? (
            <ErrorNote onRetry={load}>The history did not load.</ErrorNote>
          ) : !loaded ? (
            <Skeleton rows={3} />
          ) : !data?.asks.length ? (
            <Empty title="Nobody asked yet" note="The first ask you send shows here with the day it went and how it was delivered. The best moment is the day a job closes, while they are still standing in it." />
          ) : (
            <ul className="divide-y divide-[var(--cc-line)]">
              {data.asks.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{a.name}</p>
                    <p className="truncate text-[12.5px] text-[var(--cc-muted)]">{dayLabel(a.created_at)}{a.project ? ` · ${a.project}` : ''}</p>
                  </div>
                  <div className="flex-none">
                    {a.error ? <Badge tone="warn">Did not send</Badge> : <Badge tone="good">{[a.sent_email && 'Email', a.sent_sms && 'Text'].filter(Boolean).join(' + ') || 'Sent'}</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
