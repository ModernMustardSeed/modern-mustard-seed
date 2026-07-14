'use client';

import { useEffect, useState } from 'react';

/**
 * TURN THE DEMO INTO THEIR REAL SITE.
 *
 * The forged demo is an immutable HTML blob: before this, the ONLY way to change one
 * was to re-forge the whole thing from scratch and hope the next roll was better. So
 * "customize it to your business" had no mechanism behind it at all.
 *
 * The real site is a copy of the demo that lives on the project and can be edited,
 * previewed, and published. This editor is deliberately literal: the document on the
 * left, the truth on the right. It is a single self-contained HTML file, so there is
 * nothing to build and nothing to break, and what you see rendered is exactly the
 * bytes that go live.
 */
export default function SiteEditor({
  projectId,
  projectName,
  initialHtml,
  assets,
  liveUrl,
}: {
  projectId: string;
  projectName: string;
  initialHtml: string;
  assets: Array<{ url: string; name: string; kind: string }>;
  liveUrl: string | null;
}) {
  const [html, setHtml] = useState(initialHtml);
  const [preview, setPreview] = useState(initialHtml);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const dirty = html !== initialHtml;

  // Re-render the preview a beat after typing stops. Rebuilding an iframe on every
  // keystroke of a 900KB document is how you make a browser cry.
  useEffect(() => {
    const t = setTimeout(() => setPreview(html), 600);
    return () => clearTimeout(t);
  }, [html]);

  const save = async () => {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/delivery/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-html', html }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) setErr(j?.error ?? 'Could not save.');
      else setMsg(`Saved. ${Math.round((j.bytes ?? 0) / 1024)}KB.`);
    } catch {
      setErr('Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] px-6 py-8">
      <div className="max-w-[1500px] mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <a href="/admin/delivery" className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#161616]/55 hover:text-[#161616]">
              &larr; Delivery
            </a>
            <h1 className="font-display text-3xl font-bold text-[#161616] mt-1">{projectName}</h1>
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="font-body text-[13px] text-[#1E50C8] underline">
                {liveUrl}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {msg && <span className="font-body text-[13px] text-emerald-700">{msg}</span>}
            {err && <span className="font-body text-[13px] text-[#E0301E]">{err}</span>}
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-40 hover:-translate-y-0.5 transition-transform"
            >
              {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
            </button>
          </div>
        </div>

        {assets.length > 0 && (
          <div className="mb-4 rounded-xl border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#161616] p-4">
            <p className="font-sans text-[11px] uppercase tracking-[0.18em] font-bold text-[#161616] mb-2">
              Their files. Click to copy the URL, then drop it into the HTML.
            </p>
            <div className="flex flex-wrap gap-2">
              {assets.map((a) => (
                <button
                  key={a.url}
                  type="button"
                  onClick={() => { navigator.clipboard?.writeText(a.url); setMsg(`Copied the URL for ${a.name}.`); }}
                  className="rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-1.5 font-body text-[12.5px] text-[#161616] hover:-translate-y-0.5 transition-transform"
                >
                  {a.kind}: {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 block mb-1.5">The document</span>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
              className="w-full h-[72vh] rounded-xl border-2 border-[#161616] bg-white px-3.5 py-3 font-mono text-[12px] leading-relaxed text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700] resize-none"
            />
          </div>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 block mb-1.5">
              Exactly what goes live
            </span>
            <iframe
              title="Preview"
              srcDoc={preview}
              sandbox="allow-scripts"
              className="w-full h-[72vh] rounded-xl border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#161616]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
