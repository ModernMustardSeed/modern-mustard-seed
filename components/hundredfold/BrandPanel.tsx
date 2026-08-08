'use client';

import { useEffect, useState } from 'react';

/**
 * THE MEMBER'S BRAND KIT, on screen and editable.
 *
 * Sarah, 2026-08-08: everything built has to "match the colors and aesthetic"
 * and be changeable "from client or admin side". This is the client side of
 * that, and it is deliberately the first thing in the arsenal rather than a
 * settings page nobody opens: what is on this panel decides what every asset
 * looks like, so it belongs next to the assets.
 *
 * The onboarding move it exists for: an owner should never be handed an empty
 * form asking for hex codes. They press one button, we read their real website,
 * and they correct what is wrong. Correcting takes a minute. Authoring takes
 * never.
 */

export type Brand = {
  ink: string;
  paper: string;
  accent: string;
  accent_soft: string;
  line: string;
  display_font: string;
  body_font: string;
  logo_url: string | null;
  photo_direction: string | null;
  voice: string | null;
  avoid: string | null;
  contact: { phone?: string; email?: string; address?: string; booking_url?: string; hours?: string };
  legal: string | null;
  source: string;
  extracted_from: string | null;
};

const SWATCHES: [keyof Brand, string][] = [
  ['accent', 'Accent'],
  ['ink', 'Ink'],
  ['paper', 'Paper'],
  ['accent_soft', 'Tint'],
  ['line', 'Line'],
];

const label = 'block text-[9px] uppercase tracking-[0.24em] font-mono font-bold text-[#161616]/55 mb-1.5';
const input =
  'w-full px-3 py-2 rounded-lg border-2 border-[#161616]/15 bg-white font-body text-sm focus:border-[#161616] focus:outline-none';

export default function BrandPanel({ onChanged }: { onChanged?: () => void }) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [site, setSite] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [says, setSays] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/portal/hundredfold/brand');
      const data = await res.json();
      if (data.ok && data.brand) {
        setBrand(data.brand);
        setSite(data.site ?? '');
      }
    } catch {
      /* the arsenal still works without the panel */
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const readFromSite = async () => {
    setBusy('read');
    setSays('Reading your website.');
    try {
      const res = await fetch('/api/portal/hundredfold/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', url: site }),
      });
      const data = await res.json();
      if (data.ok) {
        setBrand(data.brand);
        setSays(`Read off ${data.from}. Change anything that is not right.`);
        setOpen(true);
        onChanged?.();
      } else {
        setSays(data.reason ?? 'That did not work. Set it by hand below.');
        setOpen(true);
      }
    } finally {
      setBusy(null);
    }
  };

  const save = async (patch: Partial<Brand>) => {
    if (!brand) return;
    const next = { ...brand, ...patch };
    setBrand(next);
    setBusy('save');
    try {
      const res = await fetch('/api/portal/hundredfold/brand', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.ok) {
        setBrand(data.brand);
        setSays('Saved. Everything built from now on uses this.');
        onChanged?.();
      }
    } finally {
      setBusy(null);
    }
  };

  if (!brand) return null;
  const unset = brand.source === 'default';

  return (
    <div className="mb-6 border-2 border-[#161616] rounded-xl bg-white overflow-hidden">
      <div className="p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#C4160B] mb-1">
              Your brand
            </span>
            <p className="font-body text-sm text-[#161616]/70 leading-relaxed max-w-xl">
              {unset ? (
                <>
                  Everything we build gets painted with this. Right now it is a neutral placeholder, so let me read
                  your real one off your website.
                </>
              ) : (
                <>
                  Every page, tool, document, and photograph we build uses these.{' '}
                  {brand.extracted_from ? `Read off ${brand.extracted_from.replace(/^https?:\/\//, '')}.` : 'Set by you.'}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {SWATCHES.map(([k, name]) => (
              <div key={k} className="text-center">
                <div
                  className="w-9 h-9 rounded-lg border-2 border-[#161616]/25"
                  style={{ background: String(brand[k] ?? '#fff') }}
                  title={`${name} ${String(brand[k])}`}
                />
                <span className="block mt-1 text-[8px] uppercase tracking-[0.14em] font-mono text-[#161616]/45">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex-1 min-w-[220px]">
            <input
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="yourbusiness.com"
              className={input}
              aria-label="Your website address"
            />
          </div>
          <button
            type="button"
            onClick={() => void readFromSite()}
            disabled={busy !== null || !site.trim()}
            className="px-4 py-2 rounded-lg border-2 border-[#161616] bg-[#F5B700] text-[10px] uppercase tracking-[0.18em] font-mono font-bold disabled:opacity-50"
          >
            {busy === 'read' ? 'Reading…' : 'Read my brand off my site'}
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="px-4 py-2 rounded-lg border-2 border-[#161616]/25 bg-white text-[10px] uppercase tracking-[0.18em] font-mono font-bold hover:border-[#161616]"
          >
            {open ? 'Done' : 'Change it by hand'}
          </button>
        </div>

        {says && <p className="font-body text-[13px] text-[#161616]/70 mt-2">{says}</p>}
      </div>

      {open && (
        <div className="border-t-2 border-[#161616]/10 bg-[#FFFDF6] p-4 md:p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SWATCHES.map(([k, name]) => (
              <div key={k}>
                <label className={label} htmlFor={`brand-${k}`}>
                  {name}
                </label>
                <div className="flex gap-1.5">
                  <input
                    id={`brand-${k}`}
                    type="color"
                    value={String(brand[k] ?? '#000000')}
                    onChange={(e) => setBrand({ ...brand, [k]: e.target.value.toUpperCase() })}
                    onBlur={(e) => void save({ [k]: e.target.value.toUpperCase() } as Partial<Brand>)}
                    className="w-10 h-9 rounded border-2 border-[#161616]/20 bg-white p-0.5"
                  />
                  <input
                    value={String(brand[k] ?? '')}
                    onChange={(e) => setBrand({ ...brand, [k]: e.target.value })}
                    onBlur={(e) => void save({ [k]: e.target.value.toUpperCase() } as Partial<Brand>)}
                    className="flex-1 min-w-0 px-2 py-2 rounded border-2 border-[#161616]/15 bg-white font-mono text-[11px]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="brand-display">
                Headline font
              </label>
              <input
                id="brand-display"
                defaultValue={brand.display_font}
                onBlur={(e) => void save({ display_font: e.target.value })}
                className={input}
              />
            </div>
            <div>
              <label className={label} htmlFor="brand-body">
                Body font
              </label>
              <input
                id="brand-body"
                defaultValue={brand.body_font}
                onBlur={(e) => void save({ body_font: e.target.value })}
                className={input}
              />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="brand-photo">
              How your photographs should look
            </label>
            <textarea
              id="brand-photo"
              defaultValue={brand.photo_direction ?? ''}
              onBlur={(e) => void save({ photo_direction: e.target.value })}
              rows={2}
              className={input}
              placeholder="Natural light, real people, no stock poses."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="brand-voice">
                How you talk
              </label>
              <textarea
                id="brand-voice"
                defaultValue={brand.voice ?? ''}
                onBlur={(e) => void save({ voice: e.target.value })}
                rows={2}
                className={input}
                placeholder="Plainspoken, never clinical."
              />
            </div>
            <div>
              <label className={label} htmlFor="brand-avoid">
                Never say or show
              </label>
              <textarea
                id="brand-avoid"
                defaultValue={brand.avoid ?? ''}
                onBlur={(e) => void save({ avoid: e.target.value })}
                rows={2}
                className={input}
                placeholder="The word affordable. Before and after photos."
              />
            </div>
          </div>

          {/* Real details, so no generator ever has to invent one. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['phone', 'email', 'address', 'booking_url'] as const).map((f) => (
              <div key={f}>
                <label className={label} htmlFor={`brand-${f}`}>
                  {f === 'booking_url' ? 'Booking link' : f}
                </label>
                <input
                  id={`brand-${f}`}
                  defaultValue={brand.contact?.[f] ?? ''}
                  onBlur={(e) => void save({ contact: { ...brand.contact, [f]: e.target.value } })}
                  className={input}
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] font-body text-[#161616]/45">
            Anything left blank shows up as an obvious [FILL IN] rather than something we made up.
          </p>
        </div>
      )}
    </div>
  );
}
