'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import CONTENT from '@/data/my-content.json';

/**
 * Sarah's own content, ready to post by hand: the @sarahscaranobuilds profile
 * kit (three profile photos, name field, bio, highlights), both reels, every
 * Trade Secrets post with its two slides and caption, and the MMS Facebook
 * Page cover and photo.
 *
 * Files live in public/admin/my-content/, behind the admin middleware, and the
 * copy lives in data/my-content.json. Both are written by export-admin.mjs in
 * dev/mms/marketing/sarah-secrets-2026-09-30; re-run it after new posts render.
 *
 * Status comes from the posting schedule at export time: "Posted" links to the
 * live post, "Scheduled" shows when Claude posts it, so nothing goes up twice.
 */

type Post = (typeof CONTENT.posts)[number];
type Filter = 'all' | 'scheduled' | 'posted';

const BASE = '/admin/my-content';
const FILTER_KEY = 'mms-my-content-filter';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Not posted yet' },
  { key: 'posted', label: 'Posted' },
];

const btn =
  'inline-flex items-center text-[11px] uppercase tracking-[0.14em] font-sans font-bold px-3.5 py-2 border-2 border-[#161616] bg-white text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 active:translate-y-0 transition-transform';
const btnSolid =
  'inline-flex items-center text-[11px] uppercase tracking-[0.14em] font-sans font-bold px-3.5 py-2 border-2 border-[#161616] bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 active:translate-y-0 transition-transform';
const eyebrow = 'text-[11px] font-mono font-bold uppercase tracking-[0.18em]';
const card = 'bg-white border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] p-5 sm:p-7';

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

function CopyField({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-2 border-[#161616] bg-[#FFFDF6] p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`${eyebrow} text-[#E0301E]`}>{label}</span>
        <CopyButton text={text} />
      </div>
      <p className="text-[14.5px] leading-relaxed text-[#161616]/85 whitespace-pre-line break-words">{text}</p>
    </div>
  );
}

function when(s: string | null) {
  if (!s) return '';
  const [d, t] = s.split(' ');
  const date = new Date(`${d}T12:00:00`);
  const [h, m] = t.split(':').map(Number);
  const time = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
}

function Status({ post }: { post: Post }) {
  if (post.status === 'posted') {
    return post.link ? (
      <a
        href={post.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] px-2.5 py-1 bg-[#0FA3A3] text-white border-2 border-[#161616] hover:underline"
      >
        Posted · open
      </a>
    ) : (
      <span className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] px-2.5 py-1 bg-[#0FA3A3] text-white border-2 border-[#161616]">
        Posted
      </span>
    );
  }
  return (
    <span className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] px-2.5 py-1 bg-[#FBF6EA] text-[#161616] border-2 border-[#161616]">
      Scheduled · {when(post.when)}
    </span>
  );
}

function PostCard({ post }: { post: Post }) {
  const [slide, setSlide] = useState<1 | 2>(1);
  const file = (k: 1 | 2, sm = false) => `${BASE}/posts/${post.slug}-${k}${sm ? '-sm' : ''}.jpg`;
  return (
    <article id={post.slug} className={`${card} scroll-mt-40 flex flex-col gap-5`}>
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <span className={`${eyebrow} text-[#8f6600]`}>
            {post.pill} · Post {post.n} in your queue
          </span>
          <h2 className="font-display text-2xl sm:text-[28px] font-extrabold leading-tight text-[#161616]">
            {post.title}
          </h2>
        </div>
        <Status post={post} />
      </header>
      <div className="grid gap-6 items-start md:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
        <div className="flex flex-col gap-3 min-w-0">
          <a
            href={file(slide)}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#F5B700] hover:shadow-[2px_2px_0_0_#F5B700] hover:-translate-y-0.5 transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file(slide, true)}
              alt={`${post.title}, slide ${slide}: ${slide === 1 ? post.hook : 'the playbook'}`}
              width={540}
              height={675}
              loading="lazy"
              className="block w-full h-auto"
            />
          </a>
          <div className="flex items-center gap-2 flex-wrap">
            {([1, 2] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={slide === k}
                className={slide === k ? btnSolid : btn}
                onClick={() => setSlide(k)}
              >
                {k === 1 ? 'Cover' : 'Playbook'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a href={file(1)} download={`sarahscaranobuilds-${post.slug}-1.jpg`} className={btn}>
              Save slide 1
            </a>
            <a href={file(2)} download={`sarahscaranobuilds-${post.slug}-2.jpg`} className={btn}>
              Save slide 2
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          <CopyField label="Caption" text={post.caption} />
          <p className="text-[12.5px] leading-relaxed text-[#161616]/65">
            Two slides, 1080 × 1350 (4:5). Post the cover first, then the playbook. Turn on the AI label: the photo
            of you was made with AI.
          </p>
        </div>
      </div>
    </article>
  );
}

export default function MyContent() {
  const [filter, setFilter] = useState<Filter>('all');
  const ig = CONTENT.instagram;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FILTER_KEY);
      if (saved === 'all' || saved === 'scheduled' || saved === 'posted') setFilter(saved);
    } catch {
      /* storage blocked: stay on All */
    }
  }, []);

  function pick(f: Filter) {
    setFilter(f);
    try {
      window.localStorage.setItem(FILTER_KEY, f);
    } catch {
      /* storage blocked: the filter still works for this visit */
    }
  }

  const posted = CONTENT.posts.filter((p) => p.status === 'posted').length;
  const shown = CONTENT.posts.filter((p) => filter === 'all' || p.status === filter);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="my-content" title="My Content" />
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pb-12 flex flex-col">
        <header className="flex flex-col gap-4 py-10">
          <span className={`${eyebrow} text-[#E0301E]`}>Your own channels · @{ig.handle}</span>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-none tracking-tight text-[#161616]">
            My Content
          </h1>
          <p className="text-[17px] leading-relaxed text-[#161616]/75 max-w-[64ch]">
            Everything made for you, ready to post yourself: your profile photos and bio, two reels,{' '}
            {CONTENT.posts.length} Trade Secrets posts with their captions, and the Modern Mustard Seed Page cover.
            Save the files, copy the words, post whenever you like.
          </p>
          <p className="text-[13.5px] leading-relaxed text-[#161616]/65 max-w-[64ch]">
            {posted} posted so far. Posts marked Scheduled are set for Claude to post at that time. If you post one yourself
            first, tell Claude and it comes off the schedule so it never goes up twice.
          </p>
          <nav className="flex gap-2 flex-wrap pt-1" aria-label="Sections">
            <a href="#profile" className={btn}>Profile</a>
            <a href="#reels" className={btn}>Reels</a>
            <a href="#posts" className={btn}>Posts</a>
            <a href="#page" className={btn}>MMS Page</a>
          </nav>
        </header>

        <section id="profile" className={`${card} scroll-mt-40 flex flex-col gap-6`}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight">Instagram profile</h2>
            <a href={ig.url} target="_blank" rel="noopener noreferrer" className={btn}>
              Open @{ig.handle}
            </a>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {CONTENT.profiles.map((p) => (
              <figure key={p.key} className="flex flex-col gap-2 items-center min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BASE}/profile/profile-${p.key}.jpg`}
                  alt={`Profile photo: ${p.label}`}
                  width={320}
                  height={320}
                  loading="lazy"
                  className={`block w-full max-w-[220px] aspect-square object-cover rounded-full border-4 ${
                    p.current ? 'border-[#F5B700]' : 'border-[#161616]/15'
                  }`}
                />
                <figcaption className="text-center flex flex-col gap-2 items-center">
                  <span className="text-[13px] font-semibold leading-snug">
                    {p.label}
                    {p.current && <span className="block text-[11px] font-mono uppercase tracking-[0.14em] text-[#8f6600]">In use</span>}
                  </span>
                  <a href={`${BASE}/profile/profile-${p.key}.jpg`} download={`sarah-profile-${p.key}.jpg`} className={btn}>
                    Save
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CopyField label="Name field" text={ig.name} />
            <CopyField label="Bio" text={ig.bio} />
            <CopyField label="Link" text={ig.link} />
            <CopyField label="Highlights" text={ig.highlights.join(' · ')} />
          </div>
          <p className="text-[13px] leading-relaxed text-[#161616]/65">
            Category: {ig.category}. {ig.pins} Add the Modern Mustard Seed Instagram as a Collaborator on every post.
          </p>
        </section>

        <section id="reels" className="scroll-mt-40 pt-10 flex flex-col gap-6">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight">Reels</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {CONTENT.reels.map((r) => (
              <article key={r.key} className={`${card} flex flex-col gap-4 min-w-0`}>
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <h3 className="font-display text-xl font-extrabold">{r.label}</h3>
                  <span className="text-[12px] font-mono uppercase tracking-[0.12em] text-[#161616]/60">12 s · 9:16</span>
                </div>
                <video
                  src={`${BASE}/reels/${r.key}.mp4`}
                  poster={`${BASE}/reels/${r.key}-cover.jpg`}
                  controls
                  playsInline
                  preload="none"
                  className="block w-full max-w-[300px] aspect-[9/16] bg-black border-2 border-[#161616] mx-auto"
                />
                <p className="text-[13.5px] leading-relaxed text-[#161616]/75">
                  {r.note} It is silent on purpose: add a trending song in Instagram.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <a href={`${BASE}/reels/${r.key}.mp4`} download={`sarahscaranobuilds-${r.key}.mp4`} className={btnSolid}>
                    Save video
                  </a>
                  <a href={`${BASE}/reels/${r.key}-cover.jpg`} download={`sarahscaranobuilds-${r.key}-cover.jpg`} className={btn}>
                    Save cover
                  </a>
                </div>
                <CopyField label="Caption" text={r.caption} />
              </article>
            ))}
          </div>
        </section>

        <section id="posts" className="scroll-mt-40 pt-10 flex flex-col gap-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight">Trade Secrets posts</h2>
            <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter posts">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={filter === f.key}
                  className={filter === f.key ? btnSolid : btn}
                  onClick={() => pick(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-8">
            {shown.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>

        <section id="page" className={`${card} scroll-mt-40 mt-10 flex flex-col gap-5`}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight">Modern Mustard Seed Facebook Page</h2>
            <a href={CONTENT.page.url} target="_blank" rel="noopener noreferrer" className={btn}>
              Open the Page
            </a>
          </div>
          <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] items-start">
            <figure className="flex flex-col gap-2 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BASE}/page/${CONTENT.page.cover}`}
                alt="Facebook cover: the Riviera hero art"
                width={1640}
                height={924}
                loading="lazy"
                className="block w-full h-auto border-2 border-[#161616]"
              />
              <figcaption className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[12px] font-mono uppercase tracking-[0.12em] text-[#161616]/60">Cover · 1640 × 924</span>
                <a href={`${BASE}/page/${CONTENT.page.cover}`} download="mms-facebook-cover.jpg" className={btn}>
                  Save
                </a>
              </figcaption>
            </figure>
            <figure className="flex flex-col gap-2 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BASE}/page/${CONTENT.page.profile}`}
                alt="Facebook profile photo: Mr. Mustard on the lounger"
                width={320}
                height={320}
                loading="lazy"
                className="block w-full max-w-[200px] aspect-square object-cover rounded-full border-4 border-[#F5B700]"
              />
              <a href={`${BASE}/page/${CONTENT.page.profile}`} download="mms-facebook-profile.jpg" className={btn}>
                Save
              </a>
            </figure>
          </div>
          <CopyField label="Page intro" text={CONTENT.page.about} />
        </section>

        <footer className="border-t-2 border-[#161616]/20 pt-5 mt-12 text-[12px] font-mono uppercase tracking-[0.14em] text-[#161616]/60">
          Exported {CONTENT.exported} · files in public/admin/my-content · copy in data/my-content.json
        </footer>
      </main>
    </div>
  );
}
