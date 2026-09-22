'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, CardHead, Empty, ErrorNote, Label, Skeleton, cx, dayLabel } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';
import Composer from '@/components/cc/modules/Composer';
import type { Session } from '@/components/cc/Workspace';

/**
 * WHAT GOES OUT. The week ahead, what is waiting on a word, and the composer
 * where a post is written once and read six ways before it is scheduled. The
 * owner types the thing they would have said at the tailgate; the shaping for
 * each feed happens on this screen, in front of them, not behind it.
 */

type Platform = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'gbp' | 'houzz';
type Post = { id: string; scheduled_for: string; headline: string | null; captions: Record<string, string>; platforms: string[] | null; status: string; image_url: string | null; link: string | null; results?: { note?: string } | null };
type Account = { provider: string; connected: boolean; manualOnly?: boolean; label?: string | null; error?: string | null };
type Payload = {
  settings: { visible: boolean; post_hour_mt?: number; approve_first?: boolean; platforms?: Platform[] } | null;
  today: string;
  posts: Post[];
  accounts: Account[];
  emptyDays?: number;
};

const LABEL: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', gbp: 'Google', houzz: 'Houzz' };

export default function Marketing({ session, refreshPulse }: { session: Session; refreshPulse: () => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [filling, setFilling] = useState(false);
  // What the composer opens with when a project page is picked. Changing it is
  // what tells the composer to start over on new words.
  const [seed, setSeed] = useState<{ text: string; photo: string | null; link: string }>({ text: '', photo: null, link: '' });

  // A post that starts from a project page: its story in their voice, its
  // cover, and a link to the page. Their words, edited on the way out.
  const pages = session.projects.filter((p) => p.story && p.image);
  const startFrom = (p: (typeof pages)[number]) => {
    setSeed({ text: p.story ?? '', photo: p.image ?? null, link: `${session.publicUrl}/projects/${p.slug}` });
    setNote(null);
  };

  // Five posts, one project page each, oldest-posted first. Each one lands in
  // the queue the same way a typed post does, editable until the hour it goes.
  const fillWeek = async () => {
    setFilling(true);
    setNote(null);
    const said = new Set((data?.posts ?? []).map((x) => x.link ?? ''));
    const pick = pages.filter((p) => !said.has(`${session.publicUrl}/projects/${p.slug}`)).slice(0, 5);
    let n = 0;
    for (const p of pick) {
      const r = await fetch('/api/portal/posting', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'post', text: p.story, url: p.image, link: `${session.publicUrl}/projects/${p.slug}` }),
      }).catch(() => null);
      if (r?.ok) n += 1;
    }
    setNote({ ok: n > 0, text: n ? `${n} posts from your website are in the queue, one a day. Each can be edited until the hour it goes out.` : 'Nothing was added. Every project page is already in the queue.' });
    setFilling(false);
    void load();
    refreshPulse();
  };

  const load = useCallback(async () => {
    setError(false);
    try {
      const r = await fetch('/api/portal/posting', { cache: 'no-store' });
      const j = (await r.json()) as Payload;
      setData(j);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch('/api/portal/posting', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await r.json()) as { error?: string };
      if (!r.ok || j.error) {
        setNote({ ok: false, text: j.error ?? 'That did not go through.' });
        return;
      }
      setNote({ ok: true, text: ok });
      void load();
      refreshPulse();
    } catch {
      setNote({ ok: false, text: 'That did not go through.' });
    } finally {
      setBusy(false);
    }
  };

  if (data && !data.settings) {
    return <Card><Empty title="Daily Posting is not on this account" note="It writes, schedules and posts to your feeds every day, and it is sold on its own. Ask Sarah to switch it on." /></Card>;
  }

  const today = data?.today ?? '';
  const upcoming = (data?.posts ?? []).filter((p) => p.scheduled_for >= today).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  // The engine holds a post with status 'held'; there has never been an
  // 'awaiting_approval'. Filtering on the name that does not exist meant a
  // client on approve-first never saw the thing they had to approve, and the
  // day sat held until it passed.
  const waiting = (data?.posts ?? []).filter((p) => p.status === 'held');
  const recent = (data?.posts ?? []).filter((p) => p.scheduled_for < today).slice(0, 8);
  const platforms: Platform[] = data?.settings?.platforms?.length ? data.settings.platforms : (['facebook', 'instagram', 'linkedin', 'x', 'gbp', 'houzz'] as Platform[]);

  return (
    <div className="space-y-5">
      {pages.length > 0 && (
        <Card>
          <CardHead
            title="From your website"
            hint="Pick a home and its story, its photograph and a link to the page fill the box below. Or fill the week and five go into the queue, one a day."
            right={<Button kind="primary" onClick={fillWeek} disabled={filling || busy}>{filling ? 'Filling the week' : 'Fill next week from the site'}</Button>}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {pages.map((p) => (
              <button key={p.slug} type="button" onClick={() => startFrom(p)} className="group overflow-hidden rounded-lg border border-[var(--cc-line)] text-left transition hover:border-[var(--cc-accent)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <span className="block px-2.5 py-2 text-[12.5px] font-semibold leading-snug text-[var(--cc-ink)] group-hover:text-[var(--cc-accent)]">{p.title}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <Composer
            session={session}
            platforms={platforms}
            accounts={data?.accounts ?? []}
            seedText={seed.text}
            seedPhoto={seed.photo}
            seedLink={seed.link}
            onScheduled={() => {
              void load();
              refreshPulse();
            }}
          />
        </div>

        <Card className="lg:col-span-2">
          <CardHead title="Where it goes" hint="Connected feeds post themselves. The rest go on a sheet you can post by hand." />
          {!data ? (
            <Skeleton rows={4} />
          ) : (
            <ul className="space-y-2">
              {(data.accounts ?? []).map((a) => (
                <li key={a.provider} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cc-line)] px-3.5 py-2.5">
                  <span className="text-[14px] font-semibold">{LABEL[a.provider] ?? a.provider}</span>
                  {a.connected ? <Badge tone="good">Connected</Badge> : a.manualOnly ? <Badge>By hand</Badge> : <Badge>Not yet</Badge>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12.5px] text-[var(--cc-muted)]">
            Connect a feed once in Connections and it posts itself from then on.{' '}
            <a href="#accounts" className="font-semibold text-[var(--cc-accent)] hover:underline">Open Connections</a>
          </p>
        </Card>
      </div>

      {note && !busy && (
        <p className={cx('text-[13px]', note.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{note.text}</p>
      )}

      {waiting.length > 0 && (
        <Card>
          <CardHead title="Waiting on your word" hint="Nothing goes out until you approve it." />
          <ul className="space-y-3">
            {waiting.map((p) => (
              <li key={p.id} className="rounded-lg border border-[var(--cc-line)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-[var(--cc-muted)]">{dayLabel(p.scheduled_for)}</p>
                    <p className="mt-1 font-semibold">{p.headline ?? 'Post'}</p>
                    <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed">{Object.values(p.captions ?? {})[0] ?? ''}</p>
                    {p.results?.note && <p className="mt-2 text-[12.5px] text-[var(--cc-muted)]">{p.results.note}</p>}
                  </div>
                  {/* A day can be held for a graphic instead of a word, and
                      approving that one changes nothing: it stays held until
                      the picture lands. So the button only appears on the
                      hold a person can actually clear. */}
                  {/graphic/i.test(p.results?.note ?? '') ? (
                    <Badge tone="warn">Waiting on the graphic</Badge>
                  ) : (
                    <Button kind="primary" disabled={busy} onClick={() => act({ action: 'approve', id: p.id }, 'Approved.')}>
                      <Icon name="check" size={15} /> Approve
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHead title="Going out" hint="The next days on the calendar." />
          {error ? (
            <ErrorNote onRetry={load}>The calendar did not load.</ErrorNote>
          ) : !data ? (
            <Skeleton rows={4} />
          ) : upcoming.length === 0 ? (
            <Empty title="Nothing scheduled yet" note="Say something above and it goes into the queue." />
          ) : (
            <ul className="divide-y divide-[var(--cc-line)]">
              {upcoming.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-start gap-3 py-3 first:pt-0">
                  <span className="flex-none w-24"><Label>{dayLabel(p.scheduled_for)}</Label></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{p.headline ?? 'Post'}</p>
                    <p className="truncate text-[12.5px] text-[var(--cc-muted)]">{(p.platforms ?? []).map((x) => LABEL[x] ?? x).join(', ') || 'Every connected feed'}</p>
                  </div>
                  <Badge tone={p.status === 'published' ? 'good' : p.status === 'awaiting_approval' ? 'warn' : 'plain'}>{p.status.replace(/_/g, ' ')}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHead title="Went out" hint="The last of what was published." />
          {!data ? (
            <Skeleton rows={4} />
          ) : recent.length === 0 ? (
            <Empty title="Nothing has gone out yet" />
          ) : (
            <ul className="divide-y divide-[var(--cc-line)]">
              {recent.map((p) => (
                <li key={p.id} className="flex items-start gap-3 py-3 first:pt-0">
                  <span className="flex-none w-24"><Label>{dayLabel(p.scheduled_for)}</Label></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{p.headline ?? 'Post'}</p>
                    <p className="truncate text-[12.5px] text-[var(--cc-muted)]">{Object.values(p.captions ?? {})[0] ?? ''}</p>
                  </div>
                  <Badge tone={p.status === 'published' ? 'good' : 'plain'}>{p.status.replace(/_/g, ' ')}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
