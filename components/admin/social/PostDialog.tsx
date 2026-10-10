'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CELL_META,
  PLATFORM_META,
  STATUSES,
  STATUS_META,
  isUrl,
  rowState,
  type SocialPost,
  type Status,
} from '@/lib/social-calendar';
import { Cover, FOCUS, MONO, Pill, PlatformPill, SANS, StatePill, shortDate } from './ui';

export type DialogTarget = { posts: SocialPost[]; index: number; heading?: string };

type CaptionState = { status: 'loading' } | { status: 'ready'; caption: string | null } | { status: 'error'; message: string };

/**
 * One post in full: cover, title, series, time, account, live link, note,
 * the caption (fetched on open, then cached), and the status and ref form.
 * When the target holds several posts (a grid cell with two, or one lesson
 * cut for eight platforms) a chip row switches between them, each chip
 * colored by its own state.
 *
 * A native dialog opened with showModal on mount (the desk mounts it per
 * open): Escape closes it, focus stays inside, and the card is a
 * height-capped flex column so its top never clips on a short screen.
 */
/** Captions fetched this session, by row id. Lives outside React so a reopened post never refetches. */
const CAPTIONS = new Map<string, CaptionState>();

export default function PostDialog({
  target,
  onClose,
  onSaved,
}: {
  target: DialogTarget;
  onClose: () => void;
  onSaved: (row: SocialPost) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(() => Math.min(Math.max(target.index, 0), target.posts.length - 1));
  const [, setVersion] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const post = target.posts[index];
  const postId = post?.id;

  useEffect(() => {
    if (!postId) return;
    const hit = CAPTIONS.get(postId);
    if (hit && hit.status !== 'error') return;
    let alive = true;
    fetch(`/api/admin/social/${encodeURIComponent(postId)}`, { cache: 'no-store' })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as { row?: SocialPost; error?: string };
        if (!res.ok || !j.row) throw new Error(j.error ?? `Could not load the caption (${res.status}).`);
        CAPTIONS.set(postId, { status: 'ready', caption: j.row.caption });
      })
      .catch((err: unknown) => {
        CAPTIONS.set(postId, { status: 'error', message: err instanceof Error ? err.message : 'Could not load the caption.' });
      })
      .finally(() => {
        if (alive) setVersion((n) => n + 1);
      });
    return () => {
      alive = false;
    };
  }, [postId]);

  const caption: CaptionState = (postId && CAPTIONS.get(postId)) || { status: 'loading' };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      aria-labelledby="post-dialog-title"
      className="m-auto w-[min(42rem,calc(100vw-1.5rem))] max-h-[90vh] overflow-hidden rounded-[3px] border border-[#141210] bg-[#fcfaf3] p-0 text-[#141210] shadow-[8px_8px_0_0_#141210] backdrop:bg-[#141210]/60"
      style={SANS}
    >
      {post && (
        <div className="flex max-h-[90vh] flex-col">
          <header className="shrink-0 border-b border-[#141210] bg-white px-4 py-3 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`${MONO} text-[10px] text-[#0f4c47]`}>
                  {post.date ? shortDate(post.date) : 'No date'} · {post.time_mt || 'Any time'} MT
                  {target.heading ? ` · ${target.heading}` : ''}
                </p>
                <h2 id="post-dialog-title" className="mt-1 text-xl font-bold leading-tight tracking-[-0.035em] text-[#141210] break-words sm:text-2xl">
                  {post.title || post.id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                className={`${MONO} shrink-0 rounded-[3px] border border-[#141210] bg-[#fcfaf3] px-2.5 py-1.5 text-[10px] text-[#141210] hover:bg-[#141210] hover:text-[#fcfaf3] ${FOCUS}`}
              >
                Close
              </button>
            </div>
            {target.posts.length > 1 && (
              <div role="tablist" aria-label="Platforms for this post" className="mt-3 flex flex-wrap gap-1.5">
                {target.posts.map((p, i) => {
                  const st = CELL_META[rowState(p)];
                  const selected = i === index;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setIndex(i)}
                      className={`rounded-[3px] border-2 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${FOCUS}`}
                      style={{
                        background: st.bg,
                        color: st.fg,
                        borderColor: selected ? '#141210' : st.ring,
                        boxShadow: selected ? '2px 2px 0 0 #141210' : undefined,
                      }}
                    >
                      {PLATFORM_META[p.platform].label}
                      {p.time_mt && target.posts.some((q) => q.time_mt !== p.time_mt) ? ` ${p.time_mt}` : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </header>

          <div className="overflow-y-auto px-4 py-4 sm:px-5">
            <PostBody key={post.id} post={post} caption={caption} onSaved={onSaved} />
          </div>
        </div>
      )}
    </dialog>
  );
}

function PostBody({ post, caption, onSaved }: { post: SocialPost; caption: CaptionState; onSaved: (row: SocialPost) => void }) {
  const live = isUrl(post.ref);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>(post.status);
  const [refText, setRefText] = useState(post.ref ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const text = caption?.status === 'ready' ? caption.caption : null;
  const st = STATUS_META[post.status];

  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMsg({ ok: false, text: 'Copy failed. Select the caption and copy it by hand.' });
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/social/${encodeURIComponent(post.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, ref: refText }),
      });
      const j = (await res.json().catch(() => ({}))) as { row?: SocialPost; error?: string };
      if (!res.ok || !j.row) throw new Error(j.error ?? `Save failed (${res.status}).`);
      onSaved({ ...j.row, caption: null });
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Save failed.' });
    }
    setSaving(false);
  };

  const dirty = status !== post.status || refText.trim() !== (post.ref ?? '');

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {post.cover_url ? (
          <a
            href={post.cover_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`shrink-0 ${FOCUS}`}
            aria-label="Open the cover full size"
          >
            <Cover src={post.cover_url} width={90} height={160} eager className="h-40 w-[90px] rounded-[3px] border border-[#141210]" />
          </a>
        ) : (
          <div aria-hidden="true" className="h-40 w-[90px] shrink-0 rounded-[3px] border border-dashed border-[#141210]/40 bg-[#e8ecd0]" />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <PlatformPill platform={post.platform} />
            <StatePill state={rowState(post)} />
            <Pill bg={st.bg} fg={st.fg}>
              {st.label}
            </Pill>
            {post.verified && (
              <span className="inline-flex items-center gap-1 rounded-[3px] border border-[#0f4c47] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#0f4c47]">
                <span aria-hidden="true">✓</span> Verified
              </span>
            )}
          </div>
          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[13px]">
            <dt className={`${MONO} pt-0.5 text-[10px] text-[#4a4339]`}>Series</dt>
            <dd className="text-[#141210] break-words">
              {post.series || 'None'}
              {post.kind ? <span className="text-[#4a4339]"> · {post.kind}</span> : null}
            </dd>
            <dt className={`${MONO} pt-0.5 text-[10px] text-[#4a4339]`}>When</dt>
            <dd className="text-[#141210]">
              {post.date ? shortDate(post.date) : 'No date'}, {post.time_mt || 'any time'} MT
            </dd>
            {post.account && (
              <>
                <dt className={`${MONO} pt-0.5 text-[10px] text-[#4a4339]`}>Account</dt>
                <dd className="text-[#141210] break-words">{post.account}</dd>
              </>
            )}
            <dt className={`${MONO} pt-0.5 text-[10px] text-[#4a4339]`}>Ref</dt>
            <dd className="break-all text-[#141210]">
              {live ? (
                <a
                  href={post.ref!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#0f4c47] underline decoration-[#f5b700] decoration-2 underline-offset-2 hover:text-[#141210]"
                >
                  Open on {PLATFORM_META[post.platform].label} ↗
                </a>
              ) : post.ref ? (
                <span className="font-mono text-[12px]">{post.ref}</span>
              ) : (
                <span className="text-[#4a4339]">None yet</span>
              )}
            </dd>
          </dl>
        </div>
      </div>

      {post.note && (
        <p className="border-l-2 border-[#f5b700] pl-2 text-[13px] leading-snug text-[#141210] break-words">
          <span className={`${MONO} mr-1.5 text-[10px] text-[#4a4339]`}>Note</span>
          {post.note}
        </p>
      )}

      <section aria-label="Caption" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className={`${MONO} text-[10px] text-[#4a4339]`}>
            Caption for {PLATFORM_META[post.platform].label}
            {text ? ` · ${text.length} characters` : ''}
          </span>
          <button
            type="button"
            onClick={copy}
            disabled={!text}
            className={`${MONO} rounded-[3px] border border-[#141210] bg-[#f5b700] px-3 py-1.5 text-[10px] text-[#141210] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#141210] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none motion-reduce:transition-none ${FOCUS}`}
          >
            {copied ? 'Copied' : 'Copy caption'}
          </button>
        </div>
        {caption.status === 'loading' ? (
          <div aria-busy="true" className="h-28 animate-pulse rounded-[3px] border border-[#141210]/25 bg-[#141210]/[0.05] motion-reduce:animate-none">
            <span className="sr-only">Loading the caption</span>
          </div>
        ) : caption.status === 'error' ? (
          <p role="alert" className="rounded-[3px] border border-[#b42318] bg-[#fde7e4] px-3 py-2 text-sm text-[#141210]">
            {caption.message}
          </p>
        ) : text ? (
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-[3px] border border-[#141210]/25 bg-white p-3 text-[13px] leading-relaxed text-[#141210]" style={SANS}>
            {text}
          </pre>
        ) : (
          <p className="text-sm text-[#4a4339]">No caption on this row.</p>
        )}
      </section>

      <section aria-label="Mark this post" className="space-y-2 border-t border-[#141210]/20 pt-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className={`${MONO} text-[10px] text-[#4a4339]`}>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className={`rounded-[3px] border border-[#141210] bg-white px-2.5 py-2 text-sm text-[#141210] ${FOCUS}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
            <span className={`${MONO} text-[10px] text-[#4a4339]`}>Live link or post id</span>
            <input
              type="text"
              inputMode="url"
              value={refText}
              onChange={(e) => setRefText(e.target.value)}
              placeholder="https://"
              className={`rounded-[3px] border border-[#141210] bg-white px-2.5 py-2 text-sm text-[#141210] ${FOCUS}`}
            />
          </label>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className={`${MONO} rounded-[3px] border border-[#141210] bg-[#141210] px-4 py-2.5 text-[10px] text-[#fcfaf3] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5b700]`}
          >
            {saving ? 'Saving' : 'Save'}
          </button>
        </div>
        {msg && (
          <p role="status" className={`text-sm ${msg.ok ? 'text-[#0f4c47]' : 'text-[#b42318]'}`}>
            {msg.text}
          </p>
        )}
        <p className="font-mono text-[10px] text-[#4a4339] break-all">id {post.id}</p>
      </section>
    </div>
  );
}
