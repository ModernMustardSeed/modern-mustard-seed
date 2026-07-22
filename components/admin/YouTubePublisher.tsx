'use client';

import { useCallback, useEffect, useState } from 'react';
import { PROMPTER_SCRIPTS } from '@/app/sarah/scripts';

/**
 * The agentic publish loop: Sarah's finished videos land here, Claude drafts the
 * title/description/tags, she tweaks, and one button posts to @modernmustardseed.
 * Fails closed: no channel connected, no publish button that lies.
 */

type YtStatus = { configured: boolean; connected: boolean; channelTitle: string | null; channelUrl: string | null };
type Final = { path: string; name: string; bytes: number; updatedAt: string | null; previewUrl: string | null };
type Draft = { scriptId: string; title: string; description: string; tags: string; privacy: 'private' | 'unlisted' | 'public'; drafting: boolean; publishing: boolean; result: string | null; error: string | null };

const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616]';
const BTN = 'inline-flex items-center justify-center gap-2 border-2 border-[#161616] rounded-xl px-4 py-2.5 font-sans font-bold uppercase tracking-[0.08em] text-sm transition-all disabled:opacity-40 disabled:pointer-events-none';
const fmtMB = (b: number) => (b > 0 ? Math.max(1, Math.round(b / (1024 * 1024))) + ' MB' : '');

export default function YouTubePublisher() {
  const [status, setStatus] = useState<YtStatus | null>(null);
  const [finals, setFinals] = useState<Final[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/youtube/list');
      const j = await r.json();
      setStatus(j.status ?? null);
      setFinals(j.finals ?? []);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const p = new URLSearchParams(window.location.search).get('connect');
    if (p === 'ok') setBanner('Channel connected. You can publish now.');
    else if (p === 'declined') setBanner('Connection was declined.');
    else if (p === 'unconfigured') setBanner('YouTube is not configured yet (needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).');
    else if (p === 'failed') setBanner('Connection failed. Try again.');
  }, [load]);

  const draftOf = (path: string): Draft =>
    drafts[path] ?? { scriptId: '', title: '', description: '', tags: '', privacy: 'private', drafting: false, publishing: false, result: null, error: null };
  const setDraft = (path: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [path]: { ...draftOf(path), ...patch } }));

  const draftMeta = async (f: Final) => {
    const d = draftOf(f.path);
    setDraft(f.path, { drafting: true, error: null });
    try {
      const r = await fetch('/api/admin/youtube/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d.scriptId ? { scriptId: d.scriptId } : { text: f.name.replace(/[-_]/g, ' ') }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'draft failed');
      setDraft(f.path, { title: j.title ?? '', description: j.description ?? '', tags: (j.tags ?? []).join(', '), drafting: false });
    } catch (e) {
      setDraft(f.path, { drafting: false, error: e instanceof Error ? e.message : 'Could not draft.' });
    }
  };

  const publish = async (f: Final) => {
    const d = draftOf(f.path);
    if (!d.title.trim()) { setDraft(f.path, { error: 'Add a title first.' }); return; }
    setDraft(f.path, { publishing: true, error: null, result: null });
    try {
      const r = await fetch('/api/admin/youtube/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: f.path,
          title: d.title,
          description: d.description,
          tags: d.tags.split(',').map((t) => t.trim()).filter(Boolean),
          privacyStatus: d.privacy,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'publish failed');
      setDraft(f.path, { publishing: false, result: j.url });
    } catch (e) {
      setDraft(f.path, { publishing: false, error: e instanceof Error ? e.message : 'Publish failed.' });
    }
  };

  const connected = status?.connected;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <div className="max-w-4xl mx-auto px-5 py-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#C4160B] font-bold">MMS Studio · Admin</span>
        <h1 className="font-display text-4xl sm:text-5xl font-bold mt-3">Publish to YouTube</h1>
        <p className="font-body text-[#161616]/70 mt-3 max-w-2xl">
          Finished videos land here. I draft the title, description, and tags in your voice. You tweak, pick who sees it,
          and press one button to post it to @modernmustardseed.
        </p>

        {banner && (
          <div className="mt-5 border-2 border-[#161616] bg-[#FFF7DB] rounded-xl px-4 py-3 font-body text-sm">{banner}</div>
        )}

        {/* connection status */}
        <section className={`${CARD} p-5 mt-6`}>
          {loading && !status ? (
            <p className="font-mono text-sm text-[#161616]/50">Checking the channel…</p>
          ) : !status?.configured ? (
            <div>
              <p className="font-sans font-bold">YouTube is not connected yet.</p>
              <p className="font-body text-sm text-[#161616]/70 mt-1">
                It needs Google OAuth credentials on the server first (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET), with the
                YouTube upload scope approved in the Google Cloud project. Once those are set, the connect button appears.
              </p>
            </div>
          ) : connected ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 font-sans font-bold text-[#2c7a4b]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2c7a4b]" /> Connected
              </span>
              <span className="font-body text-sm text-[#161616]/70">
                {status.channelTitle ? `to ${status.channelTitle}` : 'to your channel'}
              </span>
              {status.channelUrl && (
                <a href={status.channelUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline text-[#1E50C8]">
                  view channel →
                </a>
              )}
              <a href="/api/admin/youtube/oauth/start" className="ml-auto font-mono text-xs underline text-[#161616]/50">
                reconnect
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="font-sans font-bold">Connect the @modernmustardseed channel.</p>
                <p className="font-body text-sm text-[#161616]/70 mt-1">
                  One time. You sign in to the Google account that owns the channel and approve upload access. After that, publishing is one button.
                </p>
              </div>
              <a href="/api/admin/youtube/oauth/start" className={`${BTN} bg-[#F5B700] text-[#161616] shadow-[3px_3px_0_0_#161616] ml-auto`}>
                ▶ Connect channel
              </a>
            </div>
          )}
        </section>

        {/* the finals */}
        <h2 className="font-display text-2xl font-bold mt-10 mb-3">Ready to publish</h2>
        {loading ? (
          <p className="font-mono text-sm text-[#161616]/50">Loading…</p>
        ) : finals.length === 0 ? (
          <div className={`${CARD} p-6`}>
            <p className="font-body text-[#161616]/70">
              No finished videos yet. Once a take is edited (Mr. Mustard clips, the ident, graphics) and dropped into the
              <span className="font-mono"> booth/finals </span> folder, it shows up here ready to title and post.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {finals.map((f) => {
              const d = draftOf(f.path);
              return (
                <div key={f.path} className={`${CARD} p-5`}>
                  <div className="grid md:grid-cols-[220px_1fr] gap-5">
                    <div>
                      {f.previewUrl ? (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video src={f.previewUrl} controls preload="metadata" className="w-full rounded-lg border-2 border-[#161616] bg-black aspect-video" />
                      ) : (
                        <div className="w-full aspect-video rounded-lg border-2 border-[#161616] bg-[#161616]" />
                      )}
                      <p className="font-mono text-[11px] text-[#161616]/60 mt-2 truncate">{f.name}</p>
                      <p className="font-mono text-[10px] text-[#161616]/40">{fmtMB(f.bytes)}</p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <select
                          value={d.scriptId}
                          onChange={(e) => setDraft(f.path, { scriptId: e.target.value })}
                          className="border-2 border-[#161616]/25 rounded-lg px-2 py-2 font-body text-sm bg-white min-w-0 flex-1"
                        >
                          <option value="">Draft from the filename</option>
                          {PROMPTER_SCRIPTS.map((s) => (
                            <option key={s.id} value={s.id}>{s.episode} · {s.title}</option>
                          ))}
                        </select>
                        <button onClick={() => void draftMeta(f)} disabled={d.drafting} className={`${BTN} bg-white text-[#161616] shadow-[2px_2px_0_0_#161616]`}>
                          {d.drafting ? 'Drafting…' : '✦ Draft title + description'}
                        </button>
                      </div>

                      <input
                        value={d.title}
                        onChange={(e) => setDraft(f.path, { title: e.target.value })}
                        placeholder="Video title"
                        maxLength={100}
                        className="w-full border-2 border-[#161616]/25 focus:border-[#F5B700] rounded-lg px-3 py-2.5 font-sans font-bold text-[#161616] outline-none mb-2"
                      />
                      <textarea
                        value={d.description}
                        onChange={(e) => setDraft(f.path, { description: e.target.value })}
                        placeholder="Description"
                        rows={5}
                        className="w-full border-2 border-[#161616]/25 focus:border-[#F5B700] rounded-lg px-3 py-2.5 font-body text-sm text-[#161616] outline-none mb-2 resize-y"
                      />
                      <input
                        value={d.tags}
                        onChange={(e) => setDraft(f.path, { tags: e.target.value })}
                        placeholder="tags, comma separated"
                        className="w-full border-2 border-[#161616]/25 focus:border-[#F5B700] rounded-lg px-3 py-2 font-mono text-xs text-[#161616] outline-none mb-3"
                      />

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#161616]/60">Visibility</label>
                        <select
                          value={d.privacy}
                          onChange={(e) => setDraft(f.path, { privacy: e.target.value as Draft['privacy'] })}
                          className="border-2 border-[#161616]/25 rounded-lg px-2 py-1.5 font-body text-sm bg-white"
                        >
                          <option value="private">Private (only you)</option>
                          <option value="unlisted">Unlisted (link only)</option>
                          <option value="public">Public</option>
                        </select>
                        <button
                          onClick={() => void publish(f)}
                          disabled={!connected || d.publishing || !d.title.trim()}
                          title={!connected ? 'Connect the channel first' : ''}
                          className={`${BTN} bg-[#E0301E] text-[#FBF6EA] shadow-[3px_3px_0_0_#161616] ml-auto`}
                        >
                          {d.publishing ? 'Publishing…' : '▶ Publish to YouTube'}
                        </button>
                      </div>

                      {d.error && <p className="font-mono text-xs text-[#C4160B] mt-2">{d.error}</p>}
                      {d.result && (
                        <p className="font-body text-sm mt-2">
                          Published ✓{' '}
                          <a href={d.result} target="_blank" rel="noopener noreferrer" className="font-bold underline text-[#1E50C8]">
                            {d.result}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
