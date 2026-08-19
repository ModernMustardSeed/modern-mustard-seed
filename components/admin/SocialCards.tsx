'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { SOCIAL_SETS, postToText, type SocialSet, type SocialPost, type SocialCard } from '@/data/social-cards';

/**
 * The social card library. Finished graphic sets with their group-post copy,
 * every card downloadable in the feed cut (1080x1350) and the X cut (1080x1080).
 *
 * The graphics are real static files under public/social/, so the download
 * buttons are ordinary anchors with a download attribute. That matters: these
 * sets first shipped as a Claude artifact, where a sandboxed iframe silently
 * blocks every file write and the buttons looked dead. On a normal page they
 * just work, including "save all six".
 *
 * Browsing: the Overview tab shows every card in every set at a glance; each
 * set tab shows the full kit (cards, rules, posts, replies) with jump chips.
 * The active tab is mirrored into the URL hash so a set can be linked directly.
 */

type Fmt = 'feed' | 'square';

function assetPath(setId: string, file: string, fmt: Fmt) {
  return `/social/${setId}/${file}${fmt === 'square' ? '-square' : ''}.png`;
}
function assetName(file: string, fmt: Fmt) {
  return `${file}${fmt === 'square' ? '-square' : ''}.png`;
}

const btn =
  'text-[11px] uppercase tracking-[0.14em] font-sans font-bold px-3.5 py-2 border-2 border-[#161616] bg-white text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 active:translate-y-0 transition-transform disabled:opacity-50 disabled:hover:translate-y-0';
const btnSolid =
  'text-[11px] uppercase tracking-[0.14em] font-sans font-bold px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 active:translate-y-0 transition-transform disabled:opacity-50';

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={done ? btnSolid : btn}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        });
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

function CardTile({ set, card, fmt }: { set: SocialSet; card: SocialCard; fmt: Fmt }) {
  const src = assetPath(set.id, card.file, fmt);
  /*
    A retired card keeps its thumbnail, because seeing what went out is how
    somebody understands why it was pulled, but it loses the download button and
    the image is dimmed so it cannot be grabbed on autopilot. The reason is
    printed in full: a warning with no reason gets ignored by the third time.
  */
  const dead = Boolean(card.retired);
  return (
    <figure className="flex flex-col gap-3">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className={`block border-2 border-[#161616] bg-white transition-all ${
          dead
            ? 'opacity-40 grayscale shadow-[4px_4px_0_0_#E0301E]'
            : 'shadow-[4px_4px_0_0_#F5B700] hover:shadow-[2px_2px_0_0_#F5B700] hover:-translate-y-0.5'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={card.alt} className="block w-full h-auto" loading="lazy" />
      </a>
      <figcaption className="flex flex-col gap-1">
        <span className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#8f6600]">
          {assetName(card.file, fmt)}
        </span>
        <span className="font-sans font-bold text-[15px] leading-snug text-[#161616]">{card.headline}</span>
        <span className="text-[13px] text-[#161616]/70 leading-snug">{card.use}</span>
      </figcaption>
      {dead ? (
        <div className="border-2 border-[#E0301E] bg-[#E0301E]/8 p-3">
          <span className="block text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#E0301E]">
            Do not post
          </span>
          <span className="mt-1.5 block text-[12.5px] leading-snug text-[#161616]/80">{card.retired}</span>
        </div>
      ) : (
        <a href={src} download={assetName(card.file, fmt)} className={`${btn} text-center`}>
          Download PNG
        </a>
      )}
    </figure>
  );
}

function PostBlock({ post }: { post: SocialPost }) {
  let n = 0;
  return (
    <article className="bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616]">
      <header className="flex items-center gap-4 flex-wrap px-5 py-3.5 border-b-2 border-[#161616] bg-[#FBF6EA]">
        <span className="shrink-0 w-9 h-9 grid place-items-center bg-[#F5B700] border-2 border-[#161616] font-mono font-bold text-[15px]">
          {post.n}
        </span>
        <div className="flex-1 min-w-[180px]">
          <h3 className="font-display text-lg font-extrabold leading-tight">{post.title}</h3>
          <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#8f6600] mt-0.5">
            {post.graphic}.png
          </p>
        </div>
        <CopyButton text={postToText(post)} label="Copy post" />
      </header>
      <div className="px-5 py-5 flex flex-col gap-3.5">
        {post.body.map((block, i) =>
          Array.isArray(block) ? (
            <ol key={i} className="flex flex-col gap-1.5 pl-1">
              {block.map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-[#161616]/85">
                  <span className="font-mono font-bold text-[#8f6600] shrink-0">{++n}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p key={i} className="text-[15px] leading-relaxed text-[#161616]/85 max-w-[66ch]">
              {block}
            </p>
          ),
        )}
      </div>
      {post.followUp && (
        <div className="mx-5 mb-5 p-4 border-2 border-dashed border-[#161616]/25 bg-[#FBF6EA] flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#C4160B]">
              {post.followUp.label}
            </span>
            <CopyButton text={post.followUp.lines.join('\n\n')} label="Copy comment" />
          </div>
          {post.followUp.lines.map((l) => (
            <p key={l} className="text-[14px] leading-relaxed text-[#161616]/80 max-w-[62ch]">
              {l}
            </p>
          ))}
        </div>
      )}
    </article>
  );
}

const JUMPS: Array<[string, string]> = [
  ['cards', 'Cards'],
  ['rules', 'Before You Post'],
  ['posts', 'Posts'],
  ['replies', 'Replies'],
];

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function SetPanel({ set, fmt }: { set: SocialSet; fmt: Fmt }) {
  const [busy, setBusy] = useState(false);

  // A plain page can fire several anchor downloads in a row. Chrome asks once
  // whether to allow multiple files, then saves all six.
  function saveAll() {
    setBusy(true);
    // Retired cards are excluded: "download all" must never hand somebody a
    // graphic the page just told them not to post.
    const live = set.cards.filter((c) => !c.retired);
    live.forEach((card, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = assetPath(set.id, card.file, fmt);
        a.download = assetName(card.file, fmt);
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (i === live.length - 1) setBusy(false);
      }, i * 350);
    });
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#8f6600]">{set.eyebrow}</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold leading-none tracking-tight">{set.name}</h2>
          <button type="button" className={btnSolid} onClick={saveAll} disabled={busy}>
            {busy ? 'Saving…' : 'Download all six'}
          </button>
        </div>
        <p className="text-[15px] leading-relaxed text-[#161616]/75 max-w-[64ch]">{set.blurb}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <p
            className="text-[12px] font-mono font-bold uppercase tracking-[0.12em] px-3 py-1.5 border-2 border-[#161616]"
            style={{ background: set.accent, color: '#FBF6EA' }}
          >
            {set.cta}
          </p>
          <nav className="flex items-center gap-1.5 flex-wrap" aria-label="Jump to section">
            {JUMPS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="text-[10px] uppercase tracking-[0.14em] font-sans font-bold px-2.5 py-1.5 border-2 border-[#161616]/30 text-[#161616]/70 hover:border-[#161616] hover:text-[#161616] transition-colors"
                onClick={() => jumpTo(`${set.id}-${key}`)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div id={`${set.id}-cards`} className="scroll-mt-28 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {set.cards.map((c) => (
          <CardTile key={c.file} set={set} card={c} fmt={fmt} />
        ))}
      </div>

      <div id={`${set.id}-rules`} className="scroll-mt-28 bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] p-5">
        <h3 className="font-display text-xl font-extrabold mb-3">Before you post</h3>
        <ul className="flex flex-col gap-2.5">
          {set.rules.map((r) => (
            <li key={r} className="flex gap-3 text-[15px] leading-relaxed text-[#161616]/85 max-w-[76ch]">
              <span className="text-[#C4160B] font-bold shrink-0">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div id={`${set.id}-posts`} className="scroll-mt-28 flex flex-col gap-5">
        {set.posts.map((p) => (
          <PostBlock key={p.n} post={p} />
        ))}
      </div>

      <div id={`${set.id}-replies`} className="scroll-mt-28 bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616]">
        <h3 className="font-display text-xl font-extrabold px-5 py-3.5 border-b-2 border-[#161616] bg-[#FBF6EA]">
          Comment replies
        </h3>
        {set.replies.map((r) => (
          <div key={r.q} className="px-5 py-4 border-b-2 border-[#161616]/12 last:border-b-0 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <p className="font-display text-[17px] font-extrabold">&ldquo;{r.q}&rdquo;</p>
              <CopyButton text={r.a} label="Copy reply" />
            </div>
            <p className="text-[15px] leading-relaxed text-[#161616]/85 max-w-[70ch]">{r.a}</p>
            {r.warn && (
              <p className="text-[12.5px] font-mono leading-relaxed text-[#161616]/70 border-l-4 border-[#F5B700] pl-3 max-w-[68ch]">
                {r.warn}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function OverviewPanel({ fmt, onOpen }: { fmt: Fmt; onOpen: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-10">
      {SOCIAL_SETS.map((s) => (
        <section key={s.id} className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4 flex-wrap border-t-4 border-[#161616] pt-4">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#8f6600]">{s.eyebrow}</p>
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 border-2 border-[#161616] shrink-0"
                  style={{ background: s.accent }}
                  aria-hidden
                />
                <h2 className="font-display text-2xl font-extrabold leading-tight">{s.name}</h2>
              </div>
            </div>
            <button type="button" className={btn} onClick={() => onOpen(s.id)}>
              Open Set
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {s.cards.map((c) => (
              <button
                key={c.file}
                type="button"
                onClick={() => onOpen(s.id)}
                title={c.headline}
                className="block border-2 border-[#161616] bg-white shadow-[3px_3px_0_0_#F5B700] hover:-translate-y-0.5 hover:shadow-[1px_1px_0_0_#F5B700] transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetPath(s.id, c.file, fmt)} alt={c.alt} className="block w-full h-auto" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function SocialCardsLibrary() {
  const [fmt, setFmt] = useState<Fmt>('feed');
  const [activeId, setActiveId] = useState<string>('all');
  const totalCards = SOCIAL_SETS.reduce((n, s) => n + s.cards.length, 0);
  const totalPosts = SOCIAL_SETS.reduce((n, s) => n + s.posts.length, 0);
  const active = SOCIAL_SETS.find((s) => s.id === activeId);

  useEffect(() => {
    const fromHash = window.location.hash.replace('#', '');
    if (fromHash === 'all' || SOCIAL_SETS.some((s) => s.id === fromHash)) setActiveId(fromHash);
  }, []);

  function pick(id: string) {
    setActiveId(id);
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="social" title="Social Cards" />
      <main className="max-w-6xl mx-auto px-5 sm:px-8 pb-10 flex flex-col">
        <header className="flex flex-col gap-4 py-10">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-none tracking-tight">
            Social Cards
          </h1>
          <p className="text-[17px] leading-relaxed text-[#161616]/75 max-w-[62ch]">
            {totalCards} finished graphics and {totalPosts} group posts across {SOCIAL_SETS.length} sets, ready to
            download and paste. Every statistic on every card has a named publisher and a date printed on the art.
          </p>
          <p className="text-[13.5px] leading-relaxed text-[#161616]/65 max-w-[62ch]">
            Overview shows every card at a glance. Open a set for its posting rules, group posts, and comment
            replies. Feed (1080 × 1350) is native for Facebook, groups, Instagram, and LinkedIn. The square
            (1080 × 1080) is a re-typeset card for X, not a crop. The size switch changes every preview and
            download.
          </p>
        </header>

        <nav
          className="sticky top-0 z-30 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 bg-[#FBF6EA]/95 backdrop-blur border-y-2 border-[#161616] flex items-center gap-2 flex-wrap"
          aria-label="Card sets"
        >
          <button
            type="button"
            aria-pressed={activeId === 'all'}
            className={activeId === 'all' ? btnSolid : btn}
            onClick={() => pick('all')}
          >
            Overview
          </button>
          {SOCIAL_SETS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={activeId === s.id}
              className={`${activeId === s.id ? btnSolid : btn} inline-flex items-center gap-2`}
              onClick={() => pick(s.id)}
            >
              <span className="w-2.5 h-2.5 border border-[#161616] shrink-0" style={{ background: s.accent }} aria-hidden />
              {s.name}
            </button>
          ))}
          <span className="flex-1" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[#161616]/55">Size</span>
            <button
              type="button"
              aria-pressed={fmt === 'feed'}
              className={fmt === 'feed' ? btnSolid : btn}
              onClick={() => setFmt('feed')}
            >
              Feed
            </button>
            <button
              type="button"
              aria-pressed={fmt === 'square'}
              className={fmt === 'square' ? btnSolid : btn}
              onClick={() => setFmt('square')}
            >
              X
            </button>
          </div>
        </nav>

        <div className="pt-8">
          {active ? <SetPanel set={active} fmt={fmt} /> : <OverviewPanel fmt={fmt} onOpen={pick} />}
        </div>

        <footer className="border-t-2 border-[#161616]/20 pt-5 mt-12 text-[12px] font-mono uppercase tracking-[0.14em] text-[#161616]/55">
          Source files in social-drafts/&lt;set&gt;/ · re-render with node render.mjs, add --square for the X cut
        </footer>
      </main>
    </div>
  );
}
