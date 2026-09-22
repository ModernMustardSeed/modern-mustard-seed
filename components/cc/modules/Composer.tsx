'use client';

import { useCallback, useRef, useState } from 'react';
import { Badge, Button, Card, CardHead, Field, Label, cx, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';
import type { Session } from '@/components/cc/Workspace';

/**
 * THE COMPOSER. Say it once, see it six ways, put it on the calendar.
 *
 * The old box took their words and showed them nothing until the next
 * morning, which asked a business owner to trust a machine with their name on
 * a feed. This shows every platform's version on the same screen, with the
 * one line saying what the edit did and why that shape suits that feed, and
 * every version editable before anything is scheduled. Trust is not a
 * paragraph of reassurance, it is seeing the words.
 *
 * Nothing is written until "Put it on the calendar". The shape step reads.
 */

type Platform = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'gbp' | 'houzz';

const LABEL: Record<Platform, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', gbp: 'Google Business Profile', houzz: 'Houzz' };
const SHORT: Record<Platform, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', gbp: 'Google', houzz: 'Houzz' };

/** What each feed cuts off at. The count turns amber near the line and red past it. */
const LIMIT: Record<Platform, number> = { facebook: 63_206, instagram: 2_200, linkedin: 3_000, x: 280, gbp: 1_500, houzz: 4_000 };

/** Why each feed gets its own shape. Shown once, under the version, in plain words. */
const WHY: Record<Platform, string> = {
  facebook: 'Short paragraphs and a plain invitation. Facebook rewards a post people stop on, not a wall of text.',
  instagram: 'Line breaks and local hashtags, because that is how Instagram gets found by people nearby.',
  linkedin: 'A professional frame and at most two hashtags, for the reader who is at work.',
  x: 'One strong thought under the limit. No hashtags, no link: X buries both.',
  gbp: 'One paragraph a searcher can use, no hashtags. This is the one that shows up next to your map pin.',
  houzz: 'A project note about the work itself, the way Houzz readers browse.',
};

type Composed = {
  headline: string;
  captions: Partial<Record<Platform, string>>;
  notes: Partial<Record<Platform, string>>;
  by: 'claude' | 'template';
  jobId: string | null;
  date: string;
  hours: Array<{ platform: Platform; hour: number; at: string }>;
  accounts?: Array<{ provider: string; connected: boolean; manualOnly?: boolean }>;
};

const prettyDay = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
const prettyHour = (h: number) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`);

export default function Composer({
  session,
  platforms,
  accounts,
  seedText,
  seedPhoto,
  seedLink,
  onScheduled,
}: {
  session: Session;
  /** The platforms this account posts to at all. */
  platforms: Platform[];
  accounts: Array<{ provider: string; connected: boolean; manualOnly?: boolean }>;
  seedText?: string;
  seedPhoto?: string | null;
  seedLink?: string;
  onScheduled: () => void;
}) {
  const [text, setText] = useState(seedText ?? '');
  const [link, setLink] = useState(seedLink ?? '');
  const [photo, setPhoto] = useState<string | null>(seedPhoto ?? null);
  const [chosen, setChosen] = useState<Platform[]>(platforms);
  const [composed, setComposed] = useState<Composed | null>(null);
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState<'shape' | 'schedule' | 'photo' | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Seeds arrive when a project page is picked in the room above. A new seed
  // replaces the box and drops any shaping already on screen, because those
  // versions belong to the words that were there before.
  const seedKey = `${seedText ?? ''}|${seedPhoto ?? ''}|${seedLink ?? ''}`;
  const lastSeed = useRef(seedKey);
  if (seedKey !== lastSeed.current) {
    lastSeed.current = seedKey;
    setText(seedText ?? '');
    setLink(seedLink ?? '');
    setPhoto(seedPhoto ?? null);
    setComposed(null);
    setEdited(false);
    setNote(null);
  }

  const connected = (p: Platform) => accounts.find((a) => a.provider === p)?.connected ?? false;
  const manualOnly = (p: Platform) => accounts.find((a) => a.provider === p)?.manualOnly ?? false;

  const toggle = (p: Platform) => {
    setChosen((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
    setNote(null);
  };

  const upload = async (file: File) => {
    setBusy('photo');
    setNote(null);
    try {
      const ask = await fetch('/api/portal/posting/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size, type: file.type, client: session.email }),
      });
      const j = (await ask.json()) as { ok?: boolean; uploadUrl?: string; url?: string; error?: string };
      if (!j.ok || !j.uploadUrl || !j.url) {
        setNote({ ok: false, text: j.error ?? 'That photo did not upload.' });
        return;
      }
      const put = await fetch(j.uploadUrl, { method: 'PUT', body: file, headers: { 'content-type': file.type } });
      if (!put.ok) {
        setNote({ ok: false, text: 'That photo did not upload.' });
        return;
      }
      setPhoto(j.url);
    } catch {
      setNote({ ok: false, text: 'That photo did not upload.' });
    } finally {
      setBusy(null);
    }
  };

  const shape = useCallback(async () => {
    setBusy('shape');
    setNote(null);
    try {
      const r = await fetch('/api/cc/compose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'shape', text, url: photo, link: link || null, platforms: chosen, date }),
      });
      const j = (await r.json()) as Composed & { ok?: boolean; error?: string };
      if (!r.ok || j.error) {
        setNote({ ok: false, text: j.error ?? 'That did not come back. Try once more.' });
        return;
      }
      setComposed(j);
      setEdited(false);
      setDate(j.date);
    } catch {
      setNote({ ok: false, text: 'That did not come back. Try once more.' });
    } finally {
      setBusy(null);
    }
  }, [text, photo, link, chosen, date]);

  const schedule = async () => {
    if (!composed) return;
    setBusy('schedule');
    setNote(null);
    try {
      const r = await fetch('/api/cc/compose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule',
          text,
          url: photo,
          link: link || null,
          platforms: chosen,
          captions: composed.captions,
          notes: composed.notes,
          headline: composed.headline,
          jobId: composed.jobId,
          edited,
          date: date ?? composed.date,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string; date?: string; hours?: Composed['hours'] };
      if (!r.ok || j.error) {
        setNote({ ok: false, text: j.error ?? 'That did not reach the calendar.' });
        return;
      }
      const when = (j.hours ?? [])
        .map((h) => `${SHORT[h.platform]} ${prettyHour(h.hour)}`)
        .join(', ');
      setNote({ ok: true, text: `On the calendar for ${prettyDay(j.date ?? composed.date)}. ${when}. You can change any line until the hour it goes.` });
      setText('');
      setLink('');
      setPhoto(null);
      setComposed(null);
      setEdited(false);
      setDate(null);
      onScheduled();
    } catch {
      setNote({ ok: false, text: 'That did not reach the calendar.' });
    } finally {
      setBusy(null);
    }
  };

  const setCaption = (p: Platform, v: string) => {
    setEdited(true);
    setComposed((prev) => (prev ? { ...prev, captions: { ...prev.captions, [p]: v } } : prev));
  };

  const hourFor = (p: Platform) => composed?.hours.find((h) => h.platform === p)?.hour ?? null;

  return (
    <Card>
      <CardHead
        title="Say something"
        hint="Your words, once. Every feed gets its own version at the hour that feed rewards, and you read all of them before anything is scheduled."
        right={composed ? <Badge tone="live">{chosen.length} version{chosen.length === 1 ? '' : 's'} ready</Badge> : undefined}
      />

      {photo && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-[var(--cc-line)] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="h-14 w-20 rounded object-cover" />
          <span className="flex-1 text-[13px] text-[var(--cc-muted)]">This photograph goes with it.</span>
          <Button kind="ghost" onClick={() => setPhoto(null)}>Remove</Button>
        </div>
      )}

      <textarea
        className={cx(inputCls, 'min-h-[130px] resize-y leading-relaxed')}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (composed) setComposed(null);
        }}
        placeholder="Poured the footings on the lake house this morning, in the rain, and they are dead level."
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="A link" hint="Optional. It rides on Facebook, LinkedIn and Google, never on X or Instagram.">
          <input className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        </Field>
        <Field label="A photograph" hint="Optional. Phone photos are fine.">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = '';
              }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={busy === 'photo'}>
              {busy === 'photo' ? 'Uploading' : photo ? 'Change the photo' : 'Add a photo'}
            </Button>
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <span className="block mb-2"><Label>Where it goes</Label></span>
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => {
            const on = chosen.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => toggle(p)}
                aria-pressed={on}
                className={cx(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition',
                  on ? 'border-[var(--cc-accent)] bg-[var(--cc-accent)]/8 text-[var(--cc-accent)]' : 'border-[var(--cc-line)] bg-white text-[var(--cc-muted)] hover:border-[var(--cc-ink)]',
                )}
              >
                {on && <Icon name="check" size={13} />}
                {SHORT[p]}
                {!connected(p) && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--cc-muted)]">{manualOnly(p) ? 'by hand' : 'not connected'}</span>
                )}
              </button>
            );
          })}
        </div>
        {chosen.some((p) => !connected(p)) && (
          <p className="mt-2 text-[12.5px] text-[var(--cc-muted)]">
            A feed that is not connected still gets its version written. It goes on the sheet to post by hand until the account is connected in Connections.
          </p>
        )}
      </div>

      {note && <p className={cx('mt-3 text-[13px]', note.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{note.text}</p>}

      {!composed ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button kind="primary" disabled={busy !== null || text.trim().length < 3 || chosen.length === 0} onClick={shape}>
            {busy === 'shape' ? 'Shaping it for each feed' : 'Shape it for every feed'}
          </Button>
          <span className="text-[12.5px] text-[var(--cc-muted)]">Nothing is scheduled until you have read them.</span>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cc-line)] pt-4">
            <div className="min-w-0">
              <p className="font-display text-[17px]">{composed.headline}</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--cc-muted)]">
                {composed.by === 'claude'
                  ? 'Edited for each feed. Your meaning, your facts, your voice.'
                  : 'Your words, shaped for each feed. A closer edit is still being written and will replace this before it goes, unless you change a line yourself.'}
              </p>
            </div>
            <Button kind="ghost" onClick={shape} disabled={busy !== null}>{busy === 'shape' ? 'Shaping' : 'Shape it again'}</Button>
          </div>

          {chosen.map((p) => {
            const value = composed.captions[p] ?? '';
            const over = value.length > LIMIT[p];
            const near = !over && value.length > LIMIT[p] * 0.9;
            const h = hourFor(p);
            return (
              <div key={p} className="rounded-lg border border-[var(--cc-line)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[14.5px] font-semibold">
                    {LABEL[p]}
                    {h !== null && <Badge>{prettyHour(h)}</Badge>}
                    {!connected(p) && <Badge tone="warn">{manualOnly(p) ? 'By hand' : 'Not connected'}</Badge>}
                  </p>
                  <span className={cx('font-mono text-[11px] tabular-nums', over ? 'text-[#B42318]' : near ? 'text-[#B54708]' : 'text-[var(--cc-muted)]')}>
                    {value.length}/{LIMIT[p]}
                  </span>
                </div>
                <textarea
                  className={cx(inputCls, 'mt-2 min-h-[110px] resize-y leading-relaxed', over && 'border-[#FDA29B]')}
                  value={value}
                  onChange={(e) => setCaption(p, e.target.value)}
                  aria-label={`${LABEL[p]} version`}
                />
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--cc-muted)]">
                  {composed.notes[p] ? `${composed.notes[p]} ` : ''}
                  {WHY[p]}
                </p>
                {over && <p className="mt-1 text-[12.5px] text-[#B42318]">Too long for {LABEL[p]}. Trim it or it will be cut off.</p>}
              </div>
            );
          })}

          <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] p-4">
            <Field label="The day it goes" hint="The next open day on your calendar. One post a day.">
              <input type="date" className={inputCls} value={date ?? composed.date} min={composed.date < new Date().toISOString().slice(0, 10) ? composed.date : new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value || null)} />
            </Field>
            <Button
              kind="primary"
              disabled={busy !== null || chosen.some((p) => !(composed.captions[p] ?? '').trim())}
              onClick={schedule}
            >
              {busy === 'schedule' ? 'Putting it on the calendar' : 'Put it on the calendar'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
