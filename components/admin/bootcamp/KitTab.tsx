'use client';

import { EMAIL_SUBJECTS, HOST_SWIPE, LINKEDIN_POSTS, MASTERCLASS_SCRIPT, META_HEADLINES, META_PRIMARY, PRESS_BLURB, TRADE_SECRETS_POSTS, type Copy } from '@/data/bootcamp-marketing';
import { MARKETING_VIDEOS } from '@/data/marketing-videos';
import { useState } from 'react';
import { btn, card, muted, useCopy } from './shared';

/** The bootcamp commercial, declared once in data/marketing-videos.ts (it shows on /admin/videos too). */
const FILM = MARKETING_VIDEOS.find((v) => v.id === 'come-take-a-seat');

/**
 * The commercial first, then every piece of launch copy, each in a card with
 * the body ready to copy. Words live in data/bootcamp-marketing.ts and the
 * film in data/marketing-videos.ts; this tab only shows them.
 */

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-[#161616]">{title}</h2>
        {note && <p className={muted}>{note}</p>}
      </div>
      {children}
    </section>
  );
}

function CopyCard({ id, title, body, note, labelFor, copy }: { id: string; title: string; body: string; note?: string; labelFor: (k: string, idle?: string) => string; copy: (t: string, k: string) => void }) {
  return (
    <article className={`${card} p-4 flex flex-col gap-2`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm text-[#161616]">{title}</h3>
        <button type="button" onClick={() => copy(body, id)} className={`${btn} shrink-0`}>
          {labelFor(id)}
        </button>
      </div>
      <pre className="whitespace-pre-wrap font-body text-sm text-[#161616] bg-[#FBF6EA] border border-[#161616]/20 rounded-lg p-3 leading-relaxed">{body}</pre>
      {note && <p className="font-body text-xs text-[#3A3733]">{note}</p>}
    </article>
  );
}

function Film() {
  const [cut, setCut] = useState(0);
  if (!FILM) return null;
  const f = FILM.formats[cut];
  const tall = f.height > f.width;
  return (
    <Section title={`The commercial: ${FILM.title}`} note={`${Math.round(FILM.runtime)} seconds · ${FILM.formats.map((c) => c.label).join(' and ')}`}>
      <div className={`${card} p-4 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5`}>
        <div className={`bg-[#161616] rounded-lg overflow-hidden flex justify-center ${tall ? 'py-3' : ''}`}>
          <video
            key={f.file}
            src={f.file}
            poster={FILM.poster}
            controls
            playsInline
            preload="metadata"
            className={tall ? 'max-h-[70vh] w-auto aspect-[9/16]' : 'w-full aspect-video'}
          />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Cut">
            {FILM.formats.map((c, i) => (
              <button
                key={c.file}
                type="button"
                role="tab"
                aria-selected={i === cut}
                onClick={() => setCut(i)}
                className={`${btn} ${i === cut ? '!bg-[#F5B700]' : ''}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="font-body text-sm text-[#161616]">{FILM.summary}</p>
          <ul className="space-y-1.5">
            {FILM.formats.map((c) => (
              <li key={c.file}>
                <a href={c.file} download className="font-mono text-xs text-[#161616] underline underline-offset-2">
                  Download {c.label} ({c.width}x{c.height})
                </a>
              </li>
            ))}
            {FILM.watchUrl && (
              <li>
                <a href={FILM.watchUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#161616] underline underline-offset-2">
                  Watch page with the full-quality masters
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </Section>
  );
}

export default function KitTab() {
  const { copy, labelFor } = useCopy();
  const grid = 'grid md:grid-cols-2 gap-3';
  const cards = (items: Copy[]) => items.map((c) => <CopyCard key={c.id} id={c.id} title={c.title} body={c.body} note={c.note} labelFor={labelFor} copy={copy} />);
  const scriptText = MASTERCLASS_SCRIPT.map((b) => `${String(b.minute).padStart(2, '0')}:00  ${b.beat}\n        On screen: ${b.onScreen}`).join('\n\n');

  return (
    <div className="space-y-8">
      <Film />

      <Section title="Meta primary texts" note={`${META_PRIMARY.length} variants for the masterclass ad set`}>
        <div className={grid}>{cards(META_PRIMARY)}</div>
      </Section>

      <Section title="Meta headlines" note={`${META_HEADLINES.length} headlines, pair any with any primary`}>
        <div className={`${card} p-4`}>
          <ul className="divide-y divide-[#161616]/10">
            {META_HEADLINES.map((h, i) => (
              <li key={h} className="flex items-center justify-between gap-3 py-2">
                <span className="font-body text-sm text-[#161616]">{h}</span>
                <button type="button" onClick={() => copy(h, `headline-${i}`)} className={`${btn} shrink-0`}>
                  {labelFor(`headline-${i}`)}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => copy(META_HEADLINES.join('\n'), 'headlines-all')} className={btn}>
              {labelFor('headlines-all', 'Copy all')}
            </button>
          </div>
        </div>
      </Section>

      <Section title="LinkedIn posts" note="Sarah's voice, first person">
        <div className={grid}>{cards(LINKEDIN_POSTS)}</div>
      </Section>

      <Section title="Trade Secrets posts" note={`${TRADE_SECRETS_POSTS.length} posts for @sarahscaranobuilds, one a week to January 26`}>
        <div className={grid}>{cards(TRADE_SECRETS_POSTS)}</div>
      </Section>

      <Section title="Host swipe" note="What every approved host gets: an email, a post, a DM and a story">
        <div className={grid}>{cards(HOST_SWIPE)}</div>
      </Section>

      <Section title="Email subjects" note="Three options per step; the drip picks the first unless you change it">
        <div className={grid}>
          {Object.entries(EMAIL_SUBJECTS).map(([step, subjects]) => (
            <article key={step} className={`${card} p-4`}>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A3733]">{step}</h3>
              <ul className="mt-2 space-y-1.5">
                {subjects.map((s, i) => (
                  <li key={s} className="flex items-center justify-between gap-3">
                    <span className="font-body text-sm text-[#161616]">{s}</span>
                    <button type="button" onClick={() => copy(s, `${step}-${i}`)} className={`${btn} shrink-0`}>
                      {labelFor(`${step}-${i}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Masterclass script" note={`${MASTERCLASS_SCRIPT.length} beats across 60 minutes`}>
        <div className={`${card} p-4`}>
          <div className="flex justify-end mb-3">
            <button type="button" onClick={() => copy(scriptText, 'script-all')} className={btn}>
              {labelFor('script-all', 'Copy the whole script')}
            </button>
          </div>
          <ol className="space-y-3">
            {MASTERCLASS_SCRIPT.map((b) => (
              <li key={`${b.minute}-${b.beat}`} className="grid grid-cols-[56px_1fr] gap-3">
                <span className="font-mono text-xs font-bold text-[#161616] pt-0.5">{String(b.minute).padStart(2, '0')}:00</span>
                <div>
                  <p className="font-body text-sm text-[#161616]">{b.beat}</p>
                  <p className="font-body text-xs text-[#3A3733] mt-0.5">On screen: {b.onScreen}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section title="Press blurb" note="Third person is allowed here only">
        <div className="grid md:grid-cols-2 gap-3">
          <CopyCard id={PRESS_BLURB.id} title={PRESS_BLURB.title} body={PRESS_BLURB.body} note={PRESS_BLURB.note} labelFor={labelFor} copy={copy} />
        </div>
      </Section>
    </div>
  );
}
