'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from '@/components/cc/icons';
import { Button, cx } from '@/components/cc/ui';

/**
 * THE TOUR. The first open of a Command Center walks through it one room at a
 * time, and the room itself is open behind the card, so every sentence here
 * points at something already on the screen.
 *
 * The stops are built from the rooms this account owns, in rail order, so a
 * room that is not theirs is never explained and a room added later is never
 * skipped: a room with no copy below simply gets its rail blurb.
 *
 * It starts once per browser for the account, never for Sarah looking as the
 * client, and "Take the tour" in the rail replays it. Browser storage can be
 * missing or throw (private windows, blocked site data); then the tour starts
 * on every open, which is annoying and never broken.
 *
 * The workspace mounts it only while it is open, so every replay starts at the
 * first card without an effect resetting it.
 */

export type TourRoom = { key: string; label: string; icon: IconName; blurb: string };

type Stop = { key: string; room: string | null; kicker: string; title: string; lead: string; points: string[]; icon: IconName };

const COPY: Record<string, { lead: string; points: string[] }> = {
  overview: {
    lead: 'The screen to open first every morning. It shows only what needs you right now: who is waiting on a call, mail that needs a reply, and posts waiting on your word.',
    points: ['Everything listed here has a button that goes straight to it.', 'Getting set up lists the last few steps of your setup and disappears once they are done.'],
  },
  leads: {
    lead: 'Everyone who reached out through the website, the chat or a sign, with whoever has waited longest at the top.',
    points: ['Open a lead to see what they typed, what they answered, the page they were on, and every note on it.', 'Press Called once you have actually talked to them. Nothing else in the app marks it.', 'Take a lead to make it yours, so everyone at the desk knows who has it.'],
  },
  inbox: {
    lead: 'Your office mail, read twice an hour and sorted into piles, with a reply already drafted where one is needed.',
    points: ['Suggest a reply writes one for you. Polish what I wrote cleans up your own.', 'Nothing is sent, filed or deleted until you press the button, and a reply leaves from the mailbox the message came to.'],
  },
  jobs: {
    lead: 'Every job from the first call to the signed contract. Once it is signed, Buildertrend takes it from there.',
    points: ['The top shows the dollars in play and what needs a person today.', 'Moving a job to its next stage is one press, easy on a phone at the site.'],
  },
  field: {
    lead: 'Made for the job site, one handed. Take photos and they become the job record, a note to the homeowner, and a post.',
    points: ['On a phone the button opens the camera.', 'Untick any of the three you do not want to happen.'],
  },
  conversations: {
    lead: 'Every chat people had with your website, in their own words, with the page they were on.',
    points: ['It is the clearest picture you will get of what buyers want to know before they ever call.'],
  },
  week: {
    lead: 'Seven days of what the website and the desk did, set beside the seven days before.',
    points: ['Every line opens the room behind the number.', 'Print this week, or type an address and send it. Nothing goes out on its own.'],
  },
  contacts: {
    lead: 'Your whole book: customers, trades, suppliers and realtors, sorted by last name.',
    points: ['Search by a town, a trade, or part of a phone number.', 'Tick people to tag them, or save them as a list to use in a campaign.', 'Download CSV any time. The book is yours.'],
  },
  trades: {
    lead: 'The trades you build with, and whether their liability insurance is still in date.',
    points: ['A lapsed certificate shows in red at the top.', 'No certificate on file is its own warning, because nobody asking is not the same as being covered.'],
  },
  reviews: {
    lead: 'When a job closes, send one short note asking for a review, with Google first.',
    points: ['Every ask is kept, so nobody is asked twice and you can see who was asked and when.'],
  },
  marketing: {
    lead: 'What posts this week, what is waiting on your approval, and the composer.',
    points: ['Write a post once and see the version for each platform before anything is scheduled.', 'Change any version you like. A line you wrote is never swapped out.', 'Fill next week from the site builds posts from your own project pages.'],
  },
  website: {
    lead: 'Changes to your live website: new photos on a project page, a QR code for a sign that counts its own scans, and new articles.',
    points: ['Every control says exactly what it will change before it changes anything.'],
  },
  campaigns: {
    lead: 'One email, in your words, to a group of people from your book.',
    points: ['The send button shows exactly how many people it will reach.', 'The preview is the email as it arrives, and you send yourself a test first.'],
  },
  traffic: {
    lead: 'Who came to your website, what they read, how they found you, and how many reached out.',
    points: ['Counted by your own website, so there is no outside tracking script and no cookie banner in front of your customers.', 'The number to watch is the last one: visitors who became leads.'],
  },
  domains: {
    lead: 'Every web address you own, when each one renews, and who holds it.',
    points: ['Read from the public registry, so it always matches the truth.'],
  },
  accounts: {
    lead: 'Everything the Command Center runs on, and whether each one is connected.',
    points: ['Where something is not connected, the one step to connect it is right beside it.', 'Each connection is checked live. No test post ever goes on your feeds.'],
  },
};

const storeKey = (email: string) => `cc-tour:v1:${email.toLowerCase()}`;

export function tourSeen(email: string): boolean {
  try {
    return window.localStorage.getItem(storeKey(email)) === 'done';
  } catch {
    return false;
  }
}

function markSeen(email: string) {
  try {
    window.localStorage.setItem(storeKey(email), 'done');
  } catch {
    /* no storage: the tour offers itself again next time, nothing breaks */
  }
}

export default function Tour({
  open,
  onClose,
  rooms,
  go,
  email,
  business,
  person,
}: {
  open: boolean;
  onClose: () => void;
  rooms: TourRoom[];
  go: (key: string) => void;
  email: string;
  business: string;
  person: string | null;
}) {
  const [i, setI] = useState(0);

  const stops = useMemo<Stop[]>(() => {
    const n = rooms.length;
    return [
      {
        key: 'hello',
        room: 'overview',
        icon: 'spark',
        kicker: 'Welcome',
        title: person ? `Welcome to your Command Center, ${person}` : 'Welcome to your Command Center',
        lead: `Everything that runs ${business} online, in one place. This tour takes about two minutes, one stop for each of your ${n} rooms, and each room opens behind this card as we go.`,
        points: ['Use the arrow keys or the buttons below to move through it.', 'You can leave any time and replay it from Take the tour in the menu.'],
      },
      ...rooms.map((r, n2) => ({
        key: r.key,
        room: r.key,
        icon: r.icon,
        kicker: `Room ${n2 + 1} of ${n}`,
        title: r.label,
        lead: COPY[r.key]?.lead ?? r.blurb,
        points: COPY[r.key]?.points ?? [],
      })),
      {
        key: 'tools',
        room: null,
        icon: 'operator',
        kicker: 'In every room',
        title: 'Four things that work from anywhere',
        lead: 'These sit on every screen, so you never have to go looking for the right room first.',
        points: [
          'The Operator: the bar along the bottom, or the Operator tab on a phone. Ask it anything about the business, or ask it to do something. Try "Who is waiting, and what do we know about them?"',
          'Drop anything, at the top right: a photo of a napkin, a screenshot, a spreadsheet. It is read into rows and you check them before anything is saved.',
          'Search or jump: find a person or open any room. On a keyboard, Ctrl K (Cmd K on a Mac) opens it.',
          'Who is at the desk: pick your name at the bottom of the menu so your notes and leads carry it.',
        ],
      },
      {
        key: 'done',
        room: 'overview',
        icon: 'check',
        kicker: 'You are set',
        title: 'That is the whole Command Center',
        lead: 'A few connections are still being finished. Accounts shows where each one stands, and the rest of the rooms work now.',
        points: ['Replay this tour any time from Take the tour in the menu.', 'Anything that feels off, or anything you wish it did: email sarah@modernmustardseed.com.'],
      },
    ];
  }, [rooms, business, person]);

  const stop = stops[Math.min(i, stops.length - 1)];
  const last = i >= stops.length - 1;

  // The room follows the card, so the words always sit over the thing they describe.
  useEffect(() => {
    if (open && stop.room) go(stop.room);
  }, [open, stop.room, go]);

  const finish = useCallback(() => {
    markSeen(email);
    onClose();
  }, [email, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, stops.length - 1));
      if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0));
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, stops.length, finish]);

  if (!open) return null;

  const bookend = stop.key === 'hello' || stop.key === 'done';

  return (
    <>
      {/* The first and last cards dim the room; the stops in between leave it
          bright, because the room is the thing being shown. */}
      {bookend && <div className="fixed inset-0 z-[55] bg-[#0c111d]/35 print:hidden" aria-hidden onClick={finish} />}
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="cc-tour-title"
        className={cx(
          'fixed z-[60] print:hidden flex flex-col max-h-[min(78vh,640px)] rounded-2xl border border-[var(--cc-line)] bg-white text-[var(--cc-ink)] shadow-[0_24px_60px_-20px_rgba(15,18,24,.45)]',
          'inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] lg:inset-x-auto',
          bookend ? 'lg:right-1/2 lg:translate-x-1/2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:w-[480px]' : 'lg:right-6 lg:bottom-[84px] lg:w-[420px]',
        )}
      >
        <header className="shrink-0 px-5 pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--cc-muted)]">{stop.kicker}</p>
            <button onClick={finish} className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)] hover:text-[var(--cc-ink)]">
              {last ? 'Close' : 'Skip the tour'}
            </button>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl text-[var(--cc-accent)]" style={{ background: 'color-mix(in srgb, var(--cc-accent) 12%, white)' }}>
              <Icon name={stop.icon} size={18} />
            </span>
            <h2 id="cc-tour-title" className="font-display text-[21px] leading-tight">{stop.title}</h2>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-3">
          <p className="text-[14px] leading-relaxed text-[var(--cc-ink)]">{stop.lead}</p>
          {stop.points.length > 0 && (
            <ul className="mt-3 space-y-2">
              {stop.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[var(--cc-muted)]">
                  <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--cc-accent)]" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="shrink-0 border-t border-[var(--cc-line)] px-5 py-3.5">
          <div className="mb-3 flex gap-1" aria-hidden>
            {stops.map((s, n) => (
              <span key={s.key} className={cx('h-1 flex-1 rounded-full transition-colors', n <= i ? 'bg-[var(--cc-accent)]' : 'bg-[var(--cc-line)]')} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] tabular-nums text-[var(--cc-muted)]">
              {i + 1} of {stops.length}
            </span>
            <div className="flex gap-2">
              {i > 0 && <Button onClick={() => setI((v) => Math.max(v - 1, 0))}>Back</Button>}
              {last ? (
                <Button kind="primary" onClick={finish}>Start using it</Button>
              ) : (
                <Button kind="primary" onClick={() => setI((v) => Math.min(v + 1, stops.length - 1))}>{i === 0 ? 'Show me around' : 'Next'}</Button>
              )}
            </div>
          </div>
        </footer>
      </section>
    </>
  );
}
