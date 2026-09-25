'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Label, Skeleton, cx, waited } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * YOUR DAY, in the order a day runs.
 *
 * Who is coming, what you said you would do, who is waiting, what goes out
 * without you. Every room already knew its own corner of this, which meant the
 * first thing anybody did each morning was walk five rooms and hold the answer
 * in their head.
 *
 * Nothing on this card is written or judged by a machine: an appointment is an
 * appointment, a next step is what somebody typed, a wait is arithmetic on a
 * timestamp. When the day is empty it says the day is empty, in the same type,
 * because a quiet morning is a real answer and a business owner deserves to be
 * told it rather than shown an empty box.
 */

type Appointment = { id: string; name: string | null; phone: string | null; at: string; kind: string | null; note: string | null };
type Due = { id: string; job: string; step: string | null; on: string | null; late: boolean; phone: string | null; owner: string | null };
type Quiet = { id: string; job: string; why: string | null; value_cents: number | null };
type Waiting = { id: string; name: string; phone: string | null; since: string; owner: string | null };
type Post = { id: string; headline: string; status: string; platforms: string[] };

type Day = { today: string; who: string | null; appointments: Appointment[]; dueToday: Due[]; quiet: Quiet[]; waiting: Waiting[]; posting: Post[] };

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' }).replace(':00', '').toLowerCase();

const PLATFORM: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', gbp: 'Google', tiktok: 'TikTok', houzz: 'Houzz' };

export default function Today({ go }: { go: (room: string) => void }) {
  const [day, setDay] = useState<Day | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/cc/today', { cache: 'no-store' });
      if (!r.ok) return setDay(null);
      setDay((await r.json()) as Day);
    } catch {
      setDay(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (day === undefined) {
    return (
      <Card>
        <Skeleton rows={3} />
      </Card>
    );
  }
  if (day === null) return null;

  const nothing = !day.appointments.length && !day.dueToday.length && !day.waiting.length && !day.posting.length && !day.quiet.length;
  const date = new Date(`${day.today}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[19px] leading-tight">{day.who ? `${day.who}, here is your day` : 'Your day'}</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--cc-muted)]">{date}</span>
      </div>

      {nothing ? (
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--cc-muted)]">
          Nothing is booked, nothing is due, nobody is waiting on a call, and nothing goes out today. That is a real answer, not an empty screen.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {day.appointments.length > 0 && (
            <div>
              <span className="mb-2 block"><Label>Who is coming</Label></span>
              <ul className="space-y-2">
                {day.appointments.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-lg border border-[var(--cc-line)] px-3 py-2">
                    <span className="flex-none pt-0.5 font-mono text-[12px] font-bold tabular-nums">{clock(a.at)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">{a.name ?? 'Someone'}</span>
                      <span className="block truncate text-[12.5px] text-[var(--cc-muted)]">{[a.kind === 'site-walk' ? 'Walking the lot' : 'A call', a.note].filter(Boolean).join(' · ')}</span>
                    </span>
                    {a.phone && (
                      <a href={`tel:${a.phone.replace(/[^\d+]/g, '')}`} className="flex-none text-[var(--cc-accent)]" aria-label={`Call ${a.name ?? 'them'}`}>
                        <Icon name="phone" size={16} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {day.dueToday.length > 0 && (
            <div>
              <span className="mb-2 block"><Label>You said you would</Label></span>
              <ul className="space-y-2">
                {day.dueToday.map((d) => (
                  <li key={d.id} className={cx('rounded-lg border px-3 py-2', d.late ? 'border-[#FEDF89] bg-[#FFFAEB]' : 'border-[var(--cc-line)]')}>
                    <p className="text-[13.5px] font-semibold">{d.step}</p>
                    <p className="text-[12.5px] text-[var(--cc-muted)]">
                      {d.job}
                      {d.late ? ' · was due earlier' : ' · today'}
                      {d.owner ? ` · ${d.owner}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {day.waiting.length > 0 && (
            <div>
              <span className="mb-2 block"><Label>Waiting on a call</Label></span>
              <ul className="space-y-2">
                {day.waiting.slice(0, 5).map((w) => {
                  const wait = waited(w.since);
                  return (
                    <li key={w.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cc-line)] px-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold">{w.name}</span>
                        <span className={cx('text-[12.5px]', wait.tone === 'cold' ? 'text-[#B42318]' : wait.tone === 'late' ? 'text-[#B54708]' : 'text-[var(--cc-muted)]')}>Waiting {wait.text}</span>
                      </span>
                      {w.phone && (
                        <a href={`tel:${w.phone.replace(/[^\d+]/g, '')}`} className="flex-none text-[var(--cc-accent)]" aria-label={`Call ${w.name}`}>
                          <Icon name="phone" size={16} />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {day.posting.length > 0 && (
              <div>
                <span className="mb-2 block"><Label>Goes out today</Label></span>
                <ul className="space-y-2">
                  {day.posting.map((p) => (
                    <li key={p.id} className="rounded-lg border border-[var(--cc-line)] px-3 py-2">
                      <p className="truncate text-[13.5px] font-semibold">{p.headline}</p>
                      <p className="truncate text-[12.5px] text-[var(--cc-muted)]">
                        {(p.platforms ?? []).map((x) => PLATFORM[x] ?? x).join(', ') || 'Every connected feed'}
                        {p.status === 'published' ? ' · gone' : p.status === 'held' ? ' · waiting on you' : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {day.quiet.length > 0 && (
              <div>
                <span className="mb-2 block"><Label>Gone quiet</Label></span>
                <ul className="space-y-1.5">
                  {day.quiet.map((q) => (
                    <li key={q.id} className="text-[13px]">
                      <span className="font-semibold">{q.job}</span>
                      <span className="text-[var(--cc-muted)]">{q.why ? `, ${q.why.toLowerCase()}` : ''}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2">
                  <Button onClick={() => go('jobs')}>Open the board</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
