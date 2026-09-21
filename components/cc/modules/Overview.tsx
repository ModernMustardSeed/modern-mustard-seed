'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Pulse, Session } from '@/components/cc/Workspace';
import { Bars, Button, Card, CardHead, ErrorNote, Label, Skeleton, WAIT_BAR, WAIT_INK, Wait, cx, waited, when } from '@/components/cc/ui';
import { Icon, type IconName } from '@/components/cc/icons';
import { CalledSheet, OwnerControl, doorOf, lastTouch, tel, useLeadDesk, type Lead } from '@/components/cc/lead-desk';
import { eventSentence } from '@/lib/cc-lead-log';
import type { WeekReport } from '@/lib/cc-week';

/**
 * THE FIRST SCREEN answers one question: what needs me right now.
 *
 * It opens on a sentence, not a dashboard, because the owner reads this
 * between two job sites with one hand. The sentence is assembled from rows,
 * never written by a model. Under it, the people waiting, longest wait first,
 * each with who has it and the last thing anyone heard. Then only the other
 * things that are truly theirs to do. Everything that runs without them is
 * pushed to the bottom and said quietly, because it is not a task.
 *
 * When nothing is waiting the screen says so in the same large type. A quiet
 * board is the product working, so it is designed, not left blank.
 */

export default function Overview({ session, pulse, go, refreshPulse, ask }: { session: Session; pulse: Pulse | null; go: (k: string) => void; refreshPulse: () => void; ask: (prompt?: string) => void }) {
  const desk = useLeadDesk(refreshPulse);
  const [calling, setCalling] = useState<Lead | null>(null);
  const [week, setWeek] = useState<WeekReport | null>(null);
  const [weekFailed, setWeekFailed] = useState(false);

  const loadWeek = useCallback(async () => {
    setWeekFailed(false);
    try {
      const r = await fetch('/api/cc/week', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      setWeek(((await r.json()) as { week: WeekReport }).week);
    } catch {
      setWeekFailed(true);
    }
  }, []);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  const waiting = (desk.leads ?? []).filter((l) => !l.handled_at);
  const oldest = waiting.reduce<Lead | null>((a, l) => (!a || l.created_at < a.created_at ? l : a), null);
  const oldestWait = oldest ? waited(oldest.created_at) : null;
  const shown = waiting.slice(0, 6);
  const mineCount = session.who ? waiting.filter((l) => l.owner_key === session.who?.key).length : 0;
  const looseCount = waiting.filter((l) => !l.owner_key).length;

  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', month: 'long', day: 'numeric' });

  // Only what is theirs to do. A row appears when its count is above zero and
  // is otherwise absent, so the list is never padded to look busy.
  const plate: Array<{ icon: IconName; text: string; action: string; room: string }> = [];
  if (pulse?.inbox.needsReply) plate.push({ icon: 'mail', text: `${pulse.inbox.needsReply} ${pulse.inbox.needsReply === 1 ? 'email needs' : 'emails need'} your reply. A draft is written for each.`, action: 'Open inbox', room: 'inbox' });
  if (pulse?.marketing.awaitingApproval && session.modules.marketing !== false) plate.push({ icon: 'marketing', text: `${pulse.marketing.awaitingApproval} ${pulse.marketing.awaitingApproval === 1 ? 'post is' : 'posts are'} waiting on your word before going out.`, action: 'Review', room: 'marketing' });

  const setup: Array<{ text: string; action: string; room: string }> = [];
  if (!session.state.mailConnected) setup.push({ text: 'Connect your mailbox and every email gets sorted, with a reply drafted where one is needed. Nothing sends without your click.', action: 'Connect mail', room: 'inbox' });
  if (session.state.crm === 'buildertrend' && !session.state.crmConnected) setup.push({ text: 'Paste your Buildertrend form once and every website lead lands in your pipeline.', action: 'Connect Buildertrend', room: 'accounts' });
  if (session.state.crm === 'buildertrend' && session.state.crmConnected && session.state.crmCaptcha) setup.push({ text: 'Buildertrend is refusing hand-offs behind a captcha on their side. Every lead is still here and in your inbox. One request to their support fixes it.', action: 'See what to ask', room: 'accounts' });

  // What the Operator could usefully do next, read off the same rows. Picking
  // one only fills in the question. A person still presses send.
  const prompts: string[] = [];
  if (oldest?.email) prompts.push(`Draft an email to ${oldest.name ?? 'the longest waiting lead'}`);
  if (waiting.length) prompts.push('Who is waiting, and what do we know about each?');
  prompts.push('What came in this week?');
  if (pulse && pulse.scans.week === 0) prompts.push('Make a QR code for a jobsite sign');

  return (
    <div className="space-y-5">
      {/* the sentence, and the people behind it */}
      <Card pad={false} className="overflow-hidden">
        <div className="px-5 sm:px-7 pt-6 pb-5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Label>{today}</Label>
            {session.who && <Label>· {session.who.name} at the desk</Label>}
          </p>
          {desk.error ? (
            <div className="mt-4"><ErrorNote onRetry={desk.load}>We could not read your leads just now.</ErrorNote></div>
          ) : !desk.leads ? (
            <div className="mt-4 space-y-2.5" aria-hidden>
              <div className="h-9 w-3/4 max-w-[460px] rounded-lg bg-[#F1F3F6] animate-pulse" />
              <div className="h-5 w-1/2 max-w-[280px] rounded-lg bg-[#F1F3F6] animate-pulse" />
            </div>
          ) : waiting.length === 0 ? (
            <>
              <h2 className="mt-3 font-display text-[28px] sm:text-[34px] leading-[1.12] tracking-[-0.01em]">Nobody is waiting on you.</h2>
              <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-[var(--cc-muted)]">
                Every person who reached out has been called. The next one lands here the moment they press send on {session.brand.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-3 font-display text-[28px] sm:text-[34px] leading-[1.12] tracking-[-0.01em]">
                {waiting.length === 1 ? 'One person is waiting on a call.' : `${waiting.length} people are waiting on a call.`}
              </h2>
              {oldest && oldestWait && (
                <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--cc-muted)]">
                  {waiting.length === 1 ? `${oldest.name ?? 'They'} has waited ` : `${oldest.name ?? 'The first'} has waited longest: `}
                  <span className={cx('font-semibold tabular-nums', WAIT_INK[oldestWait.tone])}>{oldestWait.text}</span>.
                  {session.who && waiting.length > 1 ? ` ${mineCount} ${mineCount === 1 ? 'is' : 'are'} yours, ${looseCount} ${looseCount === 1 ? 'has' : 'have'} no name on ${looseCount === 1 ? 'it' : 'them'}.` : ''}
                </p>
              )}
            </>
          )}
        </div>

        {desk.failed && <div className="px-5 sm:px-7 pb-4"><ErrorNote onRetry={desk.clearFailed}>{desk.failed}</ErrorNote></div>}

        {shown.length > 0 && (
          <ul className="border-t border-[var(--cc-line)]">
            {shown.map((l) => {
              const w = waited(l.created_at);
              const touch = lastTouch(l);
              return (
                <li key={l.id} className="relative border-b border-[var(--cc-line)] last:border-0 pl-5 sm:pl-7 pr-4 sm:pr-5 py-4">
                  <span className={cx('absolute left-0 top-0 bottom-0 w-[4px]', WAIT_BAR[w.tone])} aria-hidden />
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                    <div className="min-w-0 flex-1 basis-[260px]">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <p className="text-[16px] font-semibold leading-tight">{l.name ?? 'Someone'}</p>
                        <Wait since={l.created_at} />
                      </div>
                      <p className="mt-1 text-[13px] text-[var(--cc-muted)]">{[l.project_type, l.town, doorOf(l)].filter(Boolean).join(' · ')}</p>
                      {touch ? (
                        <p className="mt-2 text-[13.5px] leading-snug">
                          <span className="font-medium">{eventSentence(touch)}</span>
                          <span className="text-[var(--cc-muted)]"> · {when(touch.created_at)}</span>
                          {touch.body ? <span className="text-[var(--cc-muted)]">: “{touch.body.length > 140 ? `${touch.body.slice(0, 140).trimEnd()}…` : touch.body}”</span> : null}
                        </p>
                      ) : l.message ? (
                        <p className="mt-2 text-[13.5px] leading-snug text-[var(--cc-muted)]">They wrote: “{l.message.length > 140 ? `${l.message.slice(0, 140).trimEnd()}…` : l.message}”</p>
                      ) : null}
                      <div className="mt-2.5">
                        <OwnerControl lead={l} people={desk.people} who={desk.who} act={desk.act} busy={desk.busy === l.id} />
                      </div>
                    </div>
                    <div className="flex w-full sm:w-auto flex-none items-center gap-2">
                      {l.phone ? (
                        <span className="flex-1 sm:flex-none [&>a]:w-full">
                          <Button href={tel(l.phone)} title={l.phone}><Icon name="phone" size={15} /> Call</Button>
                        </span>
                      ) : l.email ? (
                        <span className="flex-1 sm:flex-none [&>a]:w-full">
                          <Button href={`mailto:${l.email}`} title={l.email}><Icon name="mail" size={15} /> Email</Button>
                        </span>
                      ) : null}
                      <span className="flex-1 sm:flex-none [&>button]:w-full">
                        <Button kind="primary" onClick={() => setCalling(l)} disabled={desk.busy === l.id}><Icon name="check" size={15} /> Called</Button>
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {waiting.length > shown.length && (
          <button onClick={() => go('leads')} className="w-full border-t border-[var(--cc-line)] bg-[#FAFBFC] px-5 py-3 text-left text-[13px] font-semibold text-[var(--cc-accent)] hover:bg-[#F4F5F7]">
            {waiting.length - shown.length} more waiting. Open leads
          </button>
        )}
      </Card>

      {plate.length > 0 && (
        <Card pad={false}>
          <div className="px-5 pt-4 pb-2"><Label>Also yours today</Label></div>
          <ul className="divide-y divide-[var(--cc-line)]">
            {plate.map((p) => (
              <li key={p.room} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="flex-none text-[var(--cc-accent)]"><Icon name={p.icon} /></span>
                <p className="min-w-0 flex-1 basis-[220px] text-[14.5px] leading-snug">{p.text}</p>
                <Button onClick={() => go(p.room)}>{p.action}</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-5">
        {/* the week, in short */}
        <Card className="lg:col-span-3">
          <CardHead title="This week" hint={week ? `${week.range}, beside the seven days before.` : 'Counting from your records.'} right={<Button onClick={() => go('week')}>Open the week</Button>} />
          {weekFailed ? (
            <ErrorNote onRetry={loadWeek}>The week could not be counted just now.</ErrorNote>
          ) : !week ? (
            <Skeleton rows={3} />
          ) : (
            <>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
                {week.lines.slice(0, 4).map((l) => (
                  <div key={l.key} className="min-w-0">
                    <dd className="text-[28px] font-semibold leading-none tabular-nums">{l.value ?? <span className="text-[15px] font-medium text-[var(--cc-muted)]">Not read</span>}</dd>
                    <dt className="mt-1.5 text-[12.5px] leading-snug text-[var(--cc-muted)]">{l.label}</dt>
                    {l.before != null && <p className="mt-0.5 text-[11.5px] tabular-nums text-[#98A2B3]">{l.before} the week before</p>}
                  </div>
                ))}
              </dl>
              {pulse && (
                <div className="mt-5 border-t border-[var(--cc-line)] pt-4">
                  <Bars data={pulse.leads.days} label="Leads by day, last fourteen days" />
                </div>
              )}
            </>
          )}
        </Card>

        {/* the operator, in the room instead of behind a door */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHead title="Your Operator" hint="It has read everything on this screen. It drafts and looks things up. It never sends on its own." />
          <div className="flex flex-col gap-2">
            {prompts.slice(0, 4).map((p) => (
              <button key={p} onClick={() => ask(p)} className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-3.5 py-2.5 max-sm:min-h-[48px] text-left text-[13.5px] font-medium hover:border-[var(--cc-accent)] hover:bg-white">
                <span className="min-w-0">{p}</span>
                <span className="flex-none text-[var(--cc-muted)] group-hover:text-[var(--cc-accent)]"><Icon name="send" size={15} /></span>
              </button>
            ))}
          </div>
          <button onClick={() => ask()} className="mt-3 text-left text-[12.5px] font-semibold text-[var(--cc-accent)] hover:underline">Ask it something else</button>
        </Card>
      </div>

      {setup.length > 0 && (
        <Card pad={false}>
          <div className="px-5 pt-4 pb-2"><Label>Two minutes, once</Label></div>
          <ul className="divide-y divide-[var(--cc-line)]">
            {setup.map((s) => (
              <li key={s.action} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="flex-none text-[var(--cc-muted)]"><Icon name="accounts" /></span>
                <p className="min-w-0 flex-1 basis-[240px] text-[14px] leading-snug">{s.text}</p>
                <Button onClick={() => go(s.room)}>{s.action}</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* what runs without them, said quietly */}
      <section aria-label="Running for you" className="rounded-xl border border-[var(--cc-line)] bg-transparent px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#12B76A] opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#12B76A]" /></span>
            <Label>Running without you</Label>
          </span>
          {[
            { n: pulse?.contacts.total, label: 'people in your book', room: 'contacts' },
            { n: pulse?.domains.total, label: 'domains held and renewed', room: 'domains' },
            { n: pulse?.leads.month, label: 'leads in 30 days', room: 'leads' },
            { n: pulse?.scans.week, label: 'QR scans in 7 days', room: 'website' },
          ]
            .filter((f) => session.modules[f.room] !== false)
            .map((f) => (
              <button key={f.label} onClick={() => go(f.room)} className="group flex items-baseline gap-1.5 text-left">
                <span className="text-[17px] font-semibold tabular-nums">{f.n ?? '–'}</span>
                <span className="text-[13px] text-[var(--cc-muted)] group-hover:text-[var(--cc-ink)] group-hover:underline">{f.label}</span>
              </button>
            ))}
          {pulse?.domains.first && (
            <span className="text-[13px] text-[var(--cc-muted)]">
              Next renewal: <span className="font-medium text-[var(--cc-ink)]">{pulse.domains.first.domain}</span> in {pulse.domains.first.days} days, handled.
            </span>
          )}
        </div>
      </section>

      <CalledSheet key={calling?.id ?? 'none'} lead={calling} onClose={() => setCalling(null)} act={desk.act} busy={Boolean(calling && desk.busy === calling.id)} />
    </div>
  );
}
