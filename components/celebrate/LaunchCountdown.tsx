'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CELEBRATE_LAUNCH, launchClock, type LaunchClock } from '@/data/celebrate';
import { useWaitlist } from '@/components/celebrate/useWaitlist';

/**
 * THE CLOCK ON THE DOOR, and the capture that sits under it.
 *
 * ⚠️ HYDRATION. `serverNow` is a prop, not a Date.now() call in here. The first
 * client render has to produce byte-identical HTML to what the server sent, and
 * a countdown that reads its own clock during render never does. So the first
 * paint is computed from the server's instant, and the real clock takes over in
 * an effect one frame later. The page revalidates hourly, so the server's number
 * is never more than an hour stale and the swap is invisible.
 *
 * The capture is here rather than only inside the parade builder because the
 * builder asks for work first. Somebody who reads "opens in 68 days" and wants
 * in should be able to say so in one field without building anything.
 */

const PAD = (n: number) => String(n).padStart(2, '0');

function Cell({ value, label, big = false }: { value: string; label: string; big?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`${
          big ? 'bg-[#F5B700]' : 'bg-white'
        } border-2 border-[#161616] rounded-xl shadow-[4px_4px_0_0_#161616] px-3 sm:px-5 py-3 sm:py-4 min-w-[68px] sm:min-w-[92px]`}
      >
        <span
          className="block font-display font-black tabular-nums leading-none text-center text-[#161616] text-4xl sm:text-5xl md:text-6xl"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
      </div>
      <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] font-bold text-[#161616]/70 mt-2.5">
        {label}
      </span>
    </div>
  );
}

export default function LaunchCountdown({ serverNow }: { serverNow: number }) {
  const [clock, setClock] = useState<LaunchClock>(() => launchClock(serverNow));
  const w = useWaitlist('countdown');

  useEffect(() => {
    const tick = () => setClock(launchClock(Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const spoken = clock.open
    ? 'Celebrate is open.'
    : `Celebrate opens ${CELEBRATE_LAUNCH.label}, in ${clock.days} ${clock.days === 1 ? 'day' : 'days'}.`;

  return (
    <section
      id="countdown"
      className="relative border-b-2 border-[#161616] bg-[#FFDD55] halftone-bg overflow-hidden scroll-mt-24"
    >
      <div className="relative max-w-4xl mx-auto px-5 py-12 md:py-16 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold">
          {clock.open ? '[ The Doors Are Open ]' : '[ Not Open Yet ]'}
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight mt-3">
          {clock.open ? 'Celebrate is open.' : `Celebrate opens ${CELEBRATE_LAUNCH.label}.`}
        </h2>
        <p className="font-body text-base text-[#161616]/80 max-w-xl mx-auto mt-3">
          {clock.open
            ? `The founding route is running in ${CELEBRATE_LAUNCH.city}. Load your people and the year handles itself.`
            : `The founding route opens at ${CELEBRATE_LAUNCH.timeLabel} in ${CELEBRATE_LAUNCH.city}. Waitlist accounts are seated first, in the order they joined.`}
        </p>

        <p className="sr-only">{spoken}</p>

        {!clock.open && (
          <div className="flex justify-center gap-2.5 sm:gap-4 mt-8" aria-hidden>
            <Cell value={String(clock.days)} label="Days" big />
            <Cell value={PAD(clock.hours)} label="Hours" />
            <Cell value={PAD(clock.minutes)} label="Minutes" />
            <Cell value={PAD(clock.seconds)} label="Seconds" />
          </div>
        )}

        {/* ── The capture ── */}
        <div className="mt-9 bg-[#FBF6EA] border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-5 md:p-7 text-left max-w-2xl mx-auto">
          {w.status === 'done' ? (
            <div className="relative">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#C4160B] font-bold">Dispatch Slip</p>
              <p className="font-display font-black text-2xl mt-1">You are on the parade route.</p>
              <p className="font-body text-sm text-[#161616]/70 mt-1.5 max-w-md">
                Check your inbox for confirmation. Between now and opening day you will hear from us a handful of
                times, never more than once every three days.{' '}
                <a href="#parade" className="font-bold text-[#1E50C8] underline underline-offset-4">
                  Build your parade
                </a>{' '}
                and your dates are loaded before the doors open.
              </p>
              <span
                aria-hidden
                className="absolute right-0 top-0 font-mono font-bold text-sm tracking-[0.3em] text-[#C4160B] border-[3px] border-[#C4160B] rounded px-2 py-1 rotate-[-8deg]"
              >
                SENT
              </span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void w.submit();
              }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#C4160B] font-bold">
                Hold your spot
              </p>

              <fieldset className="mt-3.5">
                <legend className="font-body text-sm text-[#161616]/70 mb-2">Who are you celebrating?</legend>
                <div className="flex gap-2.5">
                  {(
                    [
                      { id: 'team', label: 'My team and clients' },
                      { id: 'family', label: 'My family' },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={w.audience === o.id}
                      onClick={() => w.setAudience(o.id)}
                      className={`font-bold text-sm rounded-full px-5 py-2.5 border-2 border-[#161616] transition ${
                        w.audience === o.id
                          ? 'bg-[#1E50C8] text-white shadow-[3px_3px_0_0_#161616]'
                          : 'bg-white text-[#161616] shadow-[2px_2px_0_0_#161616] hover:translate-y-[1px]'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <input
                  type="email"
                  required
                  value={w.email}
                  onChange={(e) => w.setEmail(e.target.value)}
                  placeholder={w.audience === 'family' ? 'you@email.com' : 'you@company.com'}
                  aria-label="Email"
                  className="border-2 border-[#161616] rounded-full px-4 py-3 font-body text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E50C8]"
                />
                <input
                  value={w.city}
                  onChange={(e) => w.setCity(e.target.value)}
                  placeholder="Your city"
                  aria-label="Your city"
                  className="border-2 border-[#161616] rounded-full px-4 py-3 font-body text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E50C8]"
                />
                <input
                  value={w.business}
                  onChange={(e) => w.setBusiness(e.target.value)}
                  placeholder={w.audience === 'family' ? 'Family name (optional)' : 'Business name (optional)'}
                  aria-label={w.audience === 'family' ? 'Family name' : 'Business name'}
                  className="sm:col-span-2 border-2 border-[#161616] rounded-full px-4 py-3 font-body text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E50C8]"
                />
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={w.honeypot}
                  onChange={(e) => w.setHoneypot(e.target.value)}
                  name="company"
                  aria-hidden
                  className="hidden"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4">
                <button
                  type="submit"
                  disabled={w.status === 'sending'}
                  className="bg-[#E0301E] text-white font-bold text-base rounded-full px-8 py-3.5 border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] disabled:opacity-60 hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#161616] transition"
                >
                  {w.status === 'sending' ? 'Saving…' : 'Hold my spot'}
                </button>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#161616]/70">
                  Free &middot; No card &middot; Unsubscribe in one click
                </span>
              </div>

              <p className="font-body text-xs text-[#161616]/60 mt-3">
                Your city tells us where to open the next vendor route. Every city with enough people on the list gets
                one.{' '}
                {w.audience === 'team' && (
                  <>
                    Running a team and want it handled before launch?{' '}
                    <Link href="/book" className="font-bold text-[#1E50C8] underline underline-offset-4">
                      Book a corporate pilot
                    </Link>
                    .
                  </>
                )}
              </p>

              {w.status === 'error' && (
                <p className="font-body text-sm text-[#C4160B] mt-3">
                  That did not go through. Give it one more try, or email sarah@modernmustardseed.com and we will add
                  you by hand.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
