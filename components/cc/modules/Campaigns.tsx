'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, CardHead, Empty, ErrorNote, Field, Label, Sheet, Skeleton, cx, inputCls, when } from '@/components/cc/ui';
import type { Audience, Mailing } from '@/lib/client-mailings';

/**
 * CAMPAIGNS. One message, in their words, to the people in their own book.
 *
 * The screen is built around the two mistakes that cost a small business the
 * most with email: sending to the wrong group, and sending something nobody
 * proofread. So the count of who it reaches is on the button itself, the
 * preview is the email as it arrives, and a test to yourself comes first.
 */

type Loaded = { audience: Audience | null; mailings: Mailing[] | null; canSend: boolean; sendsFrom: string | null; testTo: string; cap: number };
type ClientList = { id: string; name: string; tags: string[]; note: string | null; people: number; reachable: number };

const STARTERS: Array<{ label: string; subject: string; body: string }> = [
  {
    label: 'Past client check-in',
    subject: 'Checking in on your home',
    body: 'Hi {first},\n\nIt has been a while since we handed you the keys, and we wanted to check in. How is the house treating you? If anything needs a look before winter, tell us and we will come by.\n\nIf you know someone planning a build or a remodel, we would be honored by the introduction.',
  },
  {
    label: 'Build season note',
    subject: 'Planning a build for next season?',
    body: 'Hi {first},\n\nIf a new home or a remodel is on your mind for next season, now is the time to start the conversation. Design, budgeting and permits come first, and the families who start early are the ones who break ground on time.\n\nReply to this email or call us and we will talk it through.',
  },
  {
    label: 'Referral ask',
    subject: 'A favor, if you have a minute',
    body: 'Hi {first},\n\nMost of the homes we build come from someone like you telling a friend. If you know anybody thinking about building or remodeling in Northwest Montana, we would be grateful if you passed our name along.\n\nThank you for trusting us.',
  },
];

const firstOf = (email: string) => email.split('@')[0];

export default function Campaigns() {
  const [data, setData] = useState<Loaded | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tags, setTags] = useState<string[]>([]);
  // The owner's own named lists. They pick "the realtor list", not a tag.
  const [lists, setLists] = useState<ClientList[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState<'test' | 'send' | null>(null);
  const [note, setNote] = useState<{ tone: 'good' | 'warn'; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/cc/mailings', { cache: 'no-store' });
      if (!r.ok) throw new Error('read');
      setData((await r.json()) as Loaded);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/cc/lists', { cache: 'no-store' });
        const j = (await r.json()) as { lists?: ClientList[] };
        setLists(j.lists ?? []);
      } catch {
        /* the tag chips below still work without saved lists */
      }
    })();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The number on the button. Counted here from the same facets the server
  // sent, then checked again by the server at the moment of sending.
  const reach = data?.audience?.reachable ?? null;
  // A tagged group is counted by the server. The answer is kept with the tags
  // it answers, so a count for an older pick is never shown against a new one.
  const tagKey = useMemo(() => [...tags].sort().join('|'), [tags]);
  const [counted, setCounted] = useState<{ key: string; count: number | null } | null>(null);

  useEffect(() => {
    if (!tagKey) return;
    let live = true;
    void (async () => {
      try {
        const r = await fetch('/api/cc/mailings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'count', tags: tagKey.split('|') }) });
        const j = (await r.json()) as { count: number | null };
        if (live) setCounted({ key: tagKey, count: j.count });
      } catch {
        if (live) setCounted({ key: tagKey, count: null });
      }
    })();
    return () => {
      live = false;
    };
  }, [tagKey]);

  const people = tagKey ? (counted?.key === tagKey ? counted.count : null) : reach;
  const ready = subject.trim().length >= 3 && body.trim().length >= 20;

  const post = async (action: 'test' | 'send') => {
    setBusy(action);
    setNote(null);
    try {
      const r = await fetch('/api/cc/mailings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, subject, body, tags, expect: people ?? 0 }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string; to?: string; mailing?: Mailing };
      if (!r.ok || !j.ok) {
        setNote({ tone: 'warn', text: j.error ?? 'That did not go. Nothing was sent.' });
      } else if (action === 'test') {
        setNote({ tone: 'good', text: `Test sent to ${j.to}. Read it on your phone before you send it to anyone else.` });
      } else if (j.mailing) {
        const m = j.mailing;
        setNote({ tone: m.failedCount ? 'warn' : 'good', text: `Sent to ${m.sentCount} of ${m.audienceCount}.${m.failedCount ? ` ${m.failedCount} did not go. The count is kept below.` : ''}` });
        setSubject('');
        setBody('');
        setTags([]);
        void load();
      }
    } catch {
      setNote({ tone: 'warn', text: 'The connection dropped. Reload before trying again, so nothing goes twice.' });
    } finally {
      setBusy(null);
      setConfirm(false);
    }
  };

  if (state === 'error') return <ErrorNote onRetry={() => void load()}>Your contact book could not be read just now.</ErrorNote>;
  if (state === 'loading' || !data) return <Skeleton rows={4} />;

  const a = data.audience;
  const previewName = firstOf(data.testTo);
  const shown = body.replace(/\{first\}/gi, previewName.charAt(0).toUpperCase() + previewName.slice(1));

  return (
    <div className="space-y-4">
      {!data.canSend && (
        <Card>
          <div className="flex flex-wrap items-start gap-3">
            <Badge tone="warn">Being set up</Badge>
            <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-[var(--cc-ink)]">
              Your campaigns will leave from an address on your own domain, so they land as you and not as us. That address is being
              verified. Until it is, you can write a campaign, see exactly how it arrives and send yourself a test.
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Write it" hint="Your words. Put {first} where their first name goes." />
          <div className="space-y-4">
            <div>
              <Label>Start from</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <Button
                    key={s.label}
                    onClick={() => {
                      setSubject(s.subject);
                      setBody(s.body);
                    }}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Who gets it</Label>
              {!a ? (
                <p className="mt-2 text-[13px] text-[var(--cc-muted)]">Not read</p>
              ) : (
                <>
                  {lists.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-3 py-2.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--cc-muted)]">Your lists</span>
                      {lists.map((l) => {
                        const on = l.tags.length > 0 && l.tags.every((t) => tags.includes(t)) && tags.length === l.tags.length;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setTags(on ? [] : l.tags)}
                            title={`${l.people} in this list, ${l.reachable} with an email`}
                            className={cx(
                              'rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition',
                              on ? 'border-[var(--cc-accent)] bg-[var(--cc-accent)] text-white' : 'border-[var(--cc-line)] bg-white text-[var(--cc-ink)] hover:border-[var(--cc-ink)]',
                            )}
                          >
                            {l.name} · {l.reachable}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTags([])}
                      aria-pressed={!tags.length}
                      className={cx(
                        'rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition',
                        !tags.length ? 'border-[var(--cc-accent)] bg-[var(--cc-accent)] text-white' : 'border-[var(--cc-line)] bg-white text-[var(--cc-ink)] hover:border-[var(--cc-ink)]',
                      )}
                    >
                      Everyone with an email · {a.reachable}
                    </button>
                    {a.tags.map((t) => {
                      const on = tags.includes(t.tag);
                      return (
                        <button
                          key={t.tag}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== t.tag) : [...cur, t.tag]))}
                          className={cx(
                            'rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition',
                            on ? 'border-[var(--cc-accent)] bg-[var(--cc-accent)] text-white' : 'border-[var(--cc-line)] bg-white text-[var(--cc-ink)] hover:border-[var(--cc-ink)]',
                          )}
                        >
                          {t.tag} · {t.count}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[12px] text-[var(--cc-muted)]">
                    {a.total} people in your book. {a.total - a.withEmail} have no email address, so a campaign cannot reach them
                    {a.unsubscribed ? `, and ${a.unsubscribed} asked not to be emailed` : ''}.
                  </p>
                </>
              )}
            </div>

            <Field label="Subject line">
              <input id="cc-campaign-subject" className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} placeholder="What it is about, in a few words" />
            </Field>
            <Field label="Message" hint="Plain paragraphs read best. Leave a blank line between them.">
              <textarea id="cc-campaign-body" className={cx(inputCls, 'min-h-[220px] leading-relaxed')} value={body} onChange={(e) => setBody(e.target.value)} maxLength={6000} placeholder="Write it the way you would say it to them." />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHead title="How it arrives" hint={data.sendsFrom ? `From ${data.sendsFrom}. Replies come to you.` : 'Replies come to you.'} />
          {!ready ? (
            <Empty title="Nothing to show yet" note="Write a subject and a message and the email appears here, exactly as they will see it." />
          ) : (
            <div className="rounded-lg border border-[var(--cc-line)] bg-[#f6f3ee] p-3">
              <p className="px-1 pb-2 text-[12.5px] text-[var(--cc-muted)]">
                <span className="font-semibold text-[var(--cc-ink)]">Subject:</span> {subject.replace(/\{first\}/gi, previewName)}
              </p>
              <div className="border-t-4 border-[var(--cc-accent)] bg-white">
                <div className="space-y-3 px-5 py-5 font-serif text-[15px] leading-relaxed text-[var(--cc-ink)]">
                  {shown
                    .split(/\n{2,}/)
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((p, i) => (
                      <p key={i} className="whitespace-pre-line">
                        {p}
                      </p>
                    ))}
                </div>
                <p className="border-t border-[var(--cc-line)] px-5 py-3 text-[11.5px] leading-relaxed text-[var(--cc-muted)]">
                  Your business name, address and phone go here, with a one-click unsubscribe. Every campaign carries them.
                </p>
              </div>
            </div>
          )}

          {note && (
            <p className={cx('mt-4 rounded-lg border px-3 py-2 text-[13px]', note.tone === 'good' ? 'border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]' : 'border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]')} role="status">
              {note.text}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void post('test')} disabled={!ready || busy !== null}>
              {busy === 'test' ? 'Sending the test' : `Send me a test (${data.testTo})`}
            </Button>
            <Button kind="primary" onClick={() => setConfirm(true)} disabled={!ready || busy !== null || !data.canSend || !people || people > data.cap}>
              {people === null ? 'Counting' : `Send to ${people} ${people === 1 ? 'person' : 'people'}`}
            </Button>
          </div>
          {people !== null && people > data.cap && <p className="mt-2 text-[12px] text-[#B54708]">One campaign goes to {data.cap} people at most. Pick a tag to narrow it.</p>}
        </Card>
      </div>

      <Card>
        <CardHead title="What has gone out" hint="Every campaign, who sent it, and how many it reached." />
        {!data.mailings ? (
          <p className="text-[13px] text-[var(--cc-muted)]">Not read</p>
        ) : !data.mailings.length ? (
          <Empty title="Nothing has gone out yet" note="Your first campaign shows up here the moment it is sent." />
        ) : (
          <ul className="divide-y divide-[var(--cc-line)]">
            {data.mailings.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-[var(--cc-ink)]">{m.subject}</p>
                  <p className="text-[12px] text-[var(--cc-muted)]">
                    {when(m.createdAt)}
                    {m.createdBy ? `, by ${m.createdBy}` : ''} · {m.tags.length ? m.tags.join(', ') : 'Everyone with an email'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.status === 'sending' && <Badge tone="warn">Not finished</Badge>}
                  {m.failedCount > 0 && <Badge tone="warn">{m.failedCount} did not go</Badge>}
                  <Badge tone="good">
                    {m.sentCount} of {m.audienceCount} sent
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Send to ${people ?? 0} ${people === 1 ? 'person' : 'people'}?`}
        hint="This goes out now and cannot be pulled back. Have you read your test?"
        footer={
          <div className="flex justify-end gap-2">
            <Button kind="ghost" onClick={() => setConfirm(false)} disabled={busy !== null}>
              Not yet
            </Button>
            <Button kind="primary" onClick={() => void post('send')} disabled={busy !== null}>
              {busy === 'send' ? 'Sending, keep this open' : 'Yes, send it'}
            </Button>
          </div>
        }
      >
        <p className="text-[14px] leading-relaxed text-[var(--cc-ink)]">
          <span className="font-semibold">{subject}</span>
          <br />
          To {tags.length ? tags.join(', ') : 'everyone with an email'}. Sending takes about a minute for every hundred people. Keep this window
          open until it says it is done.
        </p>
      </Sheet>
    </div>
  );
}
