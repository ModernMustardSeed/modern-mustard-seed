'use client';

import { useRef, useState } from 'react';

/* ──────────────────────────────────────────────────────────────────────────
   Client brand-intake form. Reusable for any client; prefilled per-link.
   Images are compressed in-browser, then uploaded one at a time so the team
   gets real, reusable assets without bumping into request-size limits.
   ────────────────────────────────────────────────────────────────────────── */

type Props = {
  brandName?: string;
  ownerName?: string;
  email?: string;
};

type Uploaded = { id: string; name: string; url: string | null; uploading: boolean; error?: string; preview?: string };

const VIBE_OPTIONS = [
  'Sweet & soft',
  'Classic & heirloom',
  'Boho',
  'Modern & minimal',
  'Playful & bright',
  'Vintage',
  'Scripture-inspired',
  'Luxe & elevated',
];

const PRODUCT_OPTIONS = [
  'Baby clothes',
  'Toddler & kids',
  'Bows & accessories',
  'Mommy-and-me sets',
  'Newborn / coming-home',
  'Custom / personalized',
  'Blankets & swaddles',
  'Other',
];

const SELLS_OPTIONS = [
  'Instagram',
  'Facebook',
  'Etsy',
  'Shopify',
  'In person / markets',
  'Word of mouth',
  'Not selling online yet',
];

/* Compress an image client-side: cap longest edge, re-encode. Preserves PNG
   transparency (logos). Non-images and SVGs pass through untouched. */
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  try {
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const isPng = file.type === 'image/png';
    const type = isPng ? 'image/png' : 'image/jpeg';
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, type, quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, isPng ? '.png' : '.jpg');
    return new File([blob], name, { type });
  } catch {
    return file;
  }
}

async function uploadOne(file: File, prefix: string): Promise<string | null> {
  const compressed = await compressImage(file);
  const fd = new FormData();
  fd.append('file', compressed);
  fd.append('prefix', prefix);
  const r = await fetch('/api/intake/upload', { method: 'POST', body: fd });
  if (!r.ok) return null;
  const j = await r.json();
  return j.url ?? null;
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ── Reusable bits ── */

const inputCls =
  'w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/35 focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow';
const labelCls =
  'text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-2';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-[#161616]/45 font-body italic">{hint}</p>}
    </div>
  );
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`px-3.5 py-2 rounded-full border-2 border-[#161616] text-xs font-body font-bold transition-all ${
              on
                ? 'bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616]'
                : 'bg-white text-[#161616]/70 hover:-translate-y-0.5'
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function SectionCard({
  n,
  title,
  blurb,
  children,
}: {
  n: string;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pop-card p-7 md:p-9 space-y-6">
      <div className="flex items-start gap-4">
        <span className="shrink-0 w-9 h-9 rounded-full bg-[#161616] text-[#F5B700] font-display font-black text-base flex items-center justify-center">
          {n}
        </span>
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight leading-tight">
            {title}
          </h2>
          <p className="text-[#161616]/55 text-sm font-body mt-1">{blurb}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export default function ClientIntakeForm({ brandName = '', ownerName = '', email = '' }: Props) {
  const [form, setForm] = useState({
    businessName: brandName,
    ownerName,
    email,
    phone: '',
    location: '',
    story: '',
    brandColors: '',
    vibeWords: [] as string[],
    voice: '',
    inspiration: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    etsy: '',
    website: '',
    productTypes: [] as string[],
    sizeRange: '',
    fulfillment: '',
    catalogSize: '',
    materials: '',
    personalization: '',
    bestsellers: '',
    priceNotes: '',
    sellsWhere: [] as string[],
    hasShopify: '',
    shopifyUrl: '',
    shipping: '',
    returns: '',
    goals: '',
    dreamCustomer: '',
    domainStatus: '',
    desiredDomain: '',
    launchTimeline: '',
    notes: '',
  });

  const [logo, setLogo] = useState<Uploaded | null>(null);
  const [priceList, setPriceList] = useState<Uploaded | null>(null);
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const logoInput = useRef<HTMLInputElement>(null);
  const priceInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggle = (k: 'vibeWords' | 'productTypes' | 'sellsWhere', v: string) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v],
    }));

  async function handleSingle(
    file: File | undefined,
    prefix: string,
    setter: (u: Uploaded | null) => void
  ) {
    if (!file) return;
    const id = rid();
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setter({ id, name: file.name, url: null, uploading: true, preview });
    const url = await uploadOne(file, prefix);
    setter({ id, name: file.name, url, uploading: false, preview, error: url ? undefined : 'Upload failed' });
  }

  async function handlePhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files).slice(0, 10);
    const stubs: Uploaded[] = incoming.map((f) => ({
      id: rid(),
      name: f.name,
      url: null,
      uploading: true,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }));
    setPhotos((p) => [...p, ...stubs]);
    await Promise.all(
      incoming.map(async (f, i) => {
        const url = await uploadOne(f, 'photos');
        setPhotos((p) =>
          p.map((x) =>
            x.id === stubs[i].id ? { ...x, url, uploading: false, error: url ? undefined : 'Upload failed' } : x
          )
        );
      })
    );
  }

  const anyUploading = logo?.uploading || priceList?.uploading || photos.some((p) => p.uploading);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.businessName.trim() || !form.ownerName.trim() || !form.email.trim()) {
      setStatus('error');
      setErrorMsg('Please fill in your business name, your name, and your email.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStatus('sending');
    setErrorMsg('');
    try {
      const payload = {
        ...form,
        assets: {
          logoUrl: logo?.url ?? undefined,
          priceListUrl: priceList?.url ?? undefined,
          photoUrls: photos.map((p) => p.url).filter(Boolean) as string[],
        },
      };
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setStatus('error');
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again, or email Polly at thompsonpolly71@gmail.com directly.');
    }
  }

  if (status === 'success') {
    return (
      <div className="pop-card-yellow p-10 md:p-14 text-center">
        <div className="text-5xl mb-6">🤍</div>
        <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight mb-4">
          Thank you, {form.ownerName.split(' ')[0] || 'friend'}
        </h2>
        <p className="text-[#161616]/80 text-base md:text-lg font-body font-medium max-w-lg mx-auto leading-relaxed mb-2">
          Everything is in. I am going to design three directions for your store, then send you a
          moodboard to choose from before a single page is built.
        </p>
        <p className="text-[#161616]/60 text-sm font-body max-w-md mx-auto leading-relaxed">
          Check your inbox for a note from me. Remembered something or found more photos? Just reply
          and send them over.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* 1 — About you */}
      <SectionCard n="1" title="About you" blurb="The basics, and the heart behind it.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Business name">
            <input className={inputCls} value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="P & E Clothing" required />
          </Field>
          <Field label="Your name">
            <input className={inputCls} value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder="Your name" required />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" required />
          </Field>
          <Field label="Phone (optional)">
            <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(555) 555-5555" />
          </Field>
          <Field label="Where are you based?" hint="Helps people nearby find you in search.">
            <input className={inputCls} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="City, State" />
          </Field>
        </div>
        <Field label="The story behind the name" hint="What does P & E mean to you? Why did you start making these?">
          <textarea rows={3} className={`${inputCls} resize-none`} value={form.story} onChange={(e) => set('story', e.target.value)} placeholder="The little story most customers never get to hear." />
        </Field>
      </SectionCard>

      {/* 2 — Your look */}
      <SectionCard n="2" title="Your look" blurb="Your logo, colors, and the feeling you want.">
        <Field label="Your logo" hint="PNG, JPG, or SVG. No logo yet? Skip this and I will design one.">
          <UploadButton
            inputRef={logoInput}
            accept="image/*"
            onPick={(f) => handleSingle(f[0], 'logo', setLogo)}
            label="Upload logo"
          />
          {logo && <Thumb item={logo} onRemove={() => setLogo(null)} />}
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Brand colors" hint="Names or hex codes both work.">
            <input className={inputCls} value={form.brandColors} onChange={(e) => set('brandColors', e.target.value)} placeholder="Blush, sage, cream" />
          </Field>
          <Field label="Brands or shops you love" hint="Links are perfect.">
            <input className={inputCls} value={form.inspiration} onChange={(e) => set('inspiration', e.target.value)} placeholder="What catches your eye?" />
          </Field>
        </div>
        <Field label="The vibe you want" hint="Pick all that feel like you.">
          <Chips options={VIBE_OPTIONS} selected={form.vibeWords} onToggle={(v) => toggle('vibeWords', v)} />
        </Field>
        <Field label="How do you talk to your customers?" hint="Sweet and gentle? Fun and playful? Faith-filled? A line or two is plenty.">
          <textarea rows={2} className={`${inputCls} resize-none`} value={form.voice} onChange={(e) => set('voice', e.target.value)} placeholder="The way your captions and thank-you notes sound." />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Instagram"><input className={inputCls} value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@yourhandle" /></Field>
          <Field label="Facebook"><input className={inputCls} value={form.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="facebook.com/..." /></Field>
          <Field label="Etsy (if any)"><input className={inputCls} value={form.etsy} onChange={(e) => set('etsy', e.target.value)} placeholder="etsy.com/shop/..." /></Field>
          <Field label="Current website (if any)"><input className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="yoursite.com" /></Field>
        </div>
      </SectionCard>

      {/* 3 — What you make */}
      <SectionCard n="3" title="What you make" blurb="So your shop is built around your real products.">
        <Field label="What do you make?" hint="Pick all that apply.">
          <Chips options={PRODUCT_OPTIONS} selected={form.productTypes} onToggle={(v) => toggle('productTypes', v)} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Size range" hint="e.g. Newborn to 5T">
            <input className={inputCls} value={form.sizeRange} onChange={(e) => set('sizeRange', e.target.value)} placeholder="Newborn to 5T" />
          </Field>
          <Field label="Made to order or ready to ship?">
            <select className={inputCls} value={form.fulfillment} onChange={(e) => set('fulfillment', e.target.value)}>
              <option value="">Choose one</option>
              <option>Made to order</option>
              <option>Ready to ship / in stock</option>
              <option>A mix of both</option>
            </select>
          </Field>
          <Field label="About how many styles right now?">
            <select className={inputCls} value={form.catalogSize} onChange={(e) => set('catalogSize', e.target.value)}>
              <option value="">Choose one</option>
              <option>Just a few (1 to 10)</option>
              <option>A growing line (10 to 30)</option>
              <option>A full collection (30 to 75)</option>
              <option>A big catalog (75+)</option>
            </select>
          </Field>
          <Field label="Fabrics & materials">
            <input className={inputCls} value={form.materials} onChange={(e) => set('materials', e.target.value)} placeholder="Cotton, bamboo, linen..." />
          </Field>
        </div>
        <Field label="Do you offer personalization?" hint="Names, monograms, custom colors?">
          <input className={inputCls} value={form.personalization} onChange={(e) => set('personalization', e.target.value)} placeholder="Tell me what can be customized." />
        </Field>
        <Field label="Your bestsellers / signature pieces">
          <textarea rows={2} className={`${inputCls} resize-none`} value={form.bestsellers} onChange={(e) => set('bestsellers', e.target.value)} placeholder="The items people love most." />
        </Field>
      </SectionCard>

      {/* 4 — Selling & pricing */}
      <SectionCard n="4" title="Selling & pricing" blurb="How people buy from you today.">
        <Field label="Where do you sell now?" hint="Pick all that apply.">
          <Chips options={SELLS_OPTIONS} selected={form.sellsWhere} onToggle={(v) => toggle('sellsWhere', v)} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Do you already have a Shopify?">
            <select className={inputCls} value={form.hasShopify} onChange={(e) => set('hasShopify', e.target.value)}>
              <option value="">Choose one</option>
              <option>Yes</option>
              <option>No</option>
              <option>Not sure</option>
            </select>
          </Field>
          <Field label="If yes, the link">
            <input className={inputCls} value={form.shopifyUrl} onChange={(e) => set('shopifyUrl', e.target.value)} placeholder="yourshop.myshopify.com" />
          </Field>
        </div>
        <Field label="Typical pricing" hint="A few example items with prices is perfect. Or upload a price list below.">
          <textarea rows={3} className={`${inputCls} resize-none`} value={form.priceNotes} onChange={(e) => set('priceNotes', e.target.value)} placeholder="e.g. Bows $12, rompers $32, mommy-and-me sets $68" />
        </Field>
        <Field label="Price list (optional)" hint="A spreadsheet, PDF, or photo all work.">
          <UploadButton
            inputRef={priceInput}
            accept="image/*,application/pdf"
            onPick={(f) => handleSingle(f[0], 'pricelist', setPriceList)}
            label="Upload price list"
          />
          {priceList && <Thumb item={priceList} onRemove={() => setPriceList(null)} />}
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Shipping" hint="Do you ship? Flat rate? Local pickup?">
            <textarea rows={2} className={`${inputCls} resize-none`} value={form.shipping} onChange={(e) => set('shipping', e.target.value)} placeholder="How you get orders to people." />
          </Field>
          <Field label="Returns / exchanges">
            <textarea rows={2} className={`${inputCls} resize-none`} value={form.returns} onChange={(e) => set('returns', e.target.value)} placeholder="Your policy, if you have one." />
          </Field>
        </div>
      </SectionCard>

      {/* 5 — Goals */}
      <SectionCard n="5" title="Your goals" blurb="What you want this store to do for you.">
        <Field label="What would make this a win?">
          <textarea rows={3} className={`${inputCls} resize-none`} value={form.goals} onChange={(e) => set('goals', e.target.value)} placeholder="Sell online without DMs? Look legit? Grow beyond local? Wholesale?" />
        </Field>
        <Field label="Who is your dream customer?">
          <textarea rows={2} className={`${inputCls} resize-none`} value={form.dreamCustomer} onChange={(e) => set('dreamCustomer', e.target.value)} placeholder="The mama you most love making for." />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Do you have a website name picked?">
            <select className={inputCls} value={form.domainStatus} onChange={(e) => set('domainStatus', e.target.value)}>
              <option value="">Choose one</option>
              <option>I already own a domain</option>
              <option>I want one, need help picking</option>
              <option>Not sure yet</option>
            </select>
          </Field>
          <Field label="Domain you own or want">
            <input className={inputCls} value={form.desiredDomain} onChange={(e) => set('desiredDomain', e.target.value)} placeholder="peclothing.com" />
          </Field>
        </div>
        <Field label="How soon would you love to launch?">
          <select className={inputCls} value={form.launchTimeline} onChange={(e) => set('launchTimeline', e.target.value)}>
            <option value="">Choose one</option>
            <option>As soon as possible</option>
            <option>Within a month</option>
            <option>One to two months</option>
            <option>No rush, do it right</option>
          </select>
        </Field>
        <Field label="Anything else you want me to know?">
          <textarea rows={2} className={`${inputCls} resize-none`} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Dreams, worries, must-haves. All of it helps." />
        </Field>
      </SectionCard>

      {/* 6 — Photos */}
      <SectionCard n="6" title="Show me your products" blurb="The single biggest thing for a beautiful store. Add as many as you can.">
        <Field label="Product photos" hint="Phone photos are totally fine. Up to 10 at a time, add more in batches.">
          <UploadButton
            inputRef={photoInput}
            accept="image/*"
            multiple
            onPick={(f) => handlePhotos(f as unknown as FileList)}
            label="Upload product photos"
          />
        </Field>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {photos.map((ph) => (
              <PhotoTile key={ph.id} item={ph} onRemove={() => setPhotos((p) => p.filter((x) => x.id !== ph.id))} />
            ))}
          </div>
        )}
      </SectionCard>

      {errorMsg && (
        <p className="text-[#E0301E] text-sm font-body font-bold text-center pop-card-cream p-4">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending' || anyUploading}
        className="w-full py-5 text-xs uppercase tracking-[0.25em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-xl border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
      >
        {status === 'sending' ? 'Sending...' : anyUploading ? 'Finishing uploads...' : 'Send it to Polly'}
      </button>
      <p className="text-center text-[#161616]/45 text-xs font-body italic">
        No cost, no catch. This build is on the house. You will hear from Polly personally.
      </p>
    </form>
  );
}

/* ── Upload UI helpers ── */

function UploadButton({
  inputRef,
  accept,
  multiple,
  onPick,
  label,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  multiple?: boolean;
  onPick: (files: File[] | FileList) => void;
  label: string;
}) {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files) onPick(multiple ? files : Array.from(files));
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border-2 border-dashed border-[#161616]/40 bg-white text-[#161616]/70 text-sm font-body font-bold hover:border-[#161616] hover:text-[#161616] transition-colors"
      >
        <span className="text-lg leading-none">+</span> {label}
      </button>
    </>
  );
}

function Thumb({ item, onRemove }: { item: Uploaded; onRemove: () => void }) {
  return (
    <div className="mt-3 flex items-center gap-3 pop-card-cream p-3">
      {item.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.preview} alt="" className="w-12 h-12 object-contain rounded bg-white border border-[#161616]/20" />
      ) : (
        <span className="w-12 h-12 rounded bg-white border border-[#161616]/20 flex items-center justify-center text-lg">📄</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-body font-bold text-[#161616] truncate">{item.name}</p>
        <p className="text-[11px] font-mono">
          {item.uploading ? (
            <span className="text-[#1E50C8]">Uploading...</span>
          ) : item.error ? (
            <span className="text-[#E0301E]">{item.error}</span>
          ) : (
            <span className="text-[#2e7d32]">✓ Uploaded</span>
          )}
        </p>
      </div>
      <button type="button" onClick={onRemove} className="text-[#161616]/40 hover:text-[#E0301E] text-lg leading-none px-1">
        ×
      </button>
    </div>
  );
}

function PhotoTile({ item, onRemove }: { item: Uploaded; onRemove: () => void }) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-[#161616] bg-white">
      {item.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.preview} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
      )}
      {item.uploading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-[10px] font-mono font-bold text-[#1E50C8]">
          Uploading...
        </div>
      )}
      {item.error && (
        <div className="absolute inset-0 bg-[#E0301E]/85 flex items-center justify-center text-[10px] font-mono font-bold text-white px-1 text-center">
          Failed
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#161616] text-white text-sm leading-none flex items-center justify-center hover:bg-[#E0301E]"
      >
        ×
      </button>
    </div>
  );
}
