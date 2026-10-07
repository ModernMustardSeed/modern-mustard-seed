'use client';

import { useState } from 'react';
import type { IntakeInput, IntakeProfile, IntakeSection } from '@/lib/intake-profiles';

/**
 * The paid-client intake, drawn from the profile for this business.
 *
 * Written for an owner between jobs, patients or services, not for somebody at
 * a desk. Every question can be answered from memory and nothing is required,
 * because a form that refuses to submit is a form that does not come back.
 *
 * What it asks comes from lib/intake-profiles.ts: a physical therapist is asked
 * about conditions, insurance and referrals, a builder about crews and towns.
 * Photos sit first, because they are the ask that matters most.
 */

type Uploaded = { label: string; url: string; kind: string };

const FIELD =
  'w-full bg-white border-2 border-[#0b3b44] rounded-lg px-4 py-3 font-body text-[16px] text-[#0b3b44] placeholder-[#0b3b44]/35 focus:outline-none focus:shadow-[3px_3px_0_0_#0b3b44] transition-shadow';
const LABEL = 'block font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#0b3b44]/55 mb-2';
const HINT = 'mt-2 font-body text-[13px] leading-relaxed text-[#0b3b44]/55';

function Section({
  n,
  title,
  blurb,
  children,
}: {
  n: number;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pop-card p-6 md:p-9">
      <div className="mb-6 flex items-start gap-4">
        <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b3b44] text-base font-black text-[#f5b700]">
          {n}
        </span>
        <div>
          <h2 className="font-display text-2xl leading-tight font-black tracking-tight text-[#0b3b44] md:text-3xl">
            {title}
          </h2>
          {blurb ? <p className="font-body mt-1.5 text-[15px] leading-relaxed text-[#0b3b44]/65">{blurb}</p> : null}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** A tap target that reads as a place to drop things, not a browser default. */
function Drop({
  title,
  detail,
  accept,
  multiple,
  onFiles,
  done,
}: {
  title: string;
  detail: string;
  accept?: string;
  multiple?: boolean;
  onFiles: (list: FileList | null) => void;
  done?: string;
}) {
  return (
    <label className="block cursor-pointer rounded-lg border-2 border-dashed border-[#0b3b44]/40 bg-white px-5 py-8 text-center transition-colors hover:border-[#0b3b44] hover:bg-[#fff6d6] focus-within:border-[#0b3b44]">
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
        className="sr-only"
      />
      <span className="font-display block text-xl font-black text-[#0b3b44]">{title}</span>
      <span className="font-body mt-1 block text-[14px] text-[#0b3b44]/60">{detail}</span>
      {done ? (
        <span className="mt-3 inline-block rounded-full bg-[#0a7c78] px-3 py-1 font-mono text-[11px] font-bold tracking-[0.12em] text-white uppercase">
          {done}
        </span>
      ) : null}
    </label>
  );
}

function Choice({
  name,
  value,
  title,
  detail,
  defaultChecked,
}: {
  name: string;
  value: string;
  title: string;
  detail: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-[#0b3b44]/15 bg-white p-4 transition-colors has-[:checked]:border-[#0b3b44] has-[:checked]:bg-[#fff6d6]">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 h-5 w-5 shrink-0 accent-[#0a7c78]"
      />
      <span>
        <span className="font-body block text-[16px] font-bold text-[#0b3b44]">{title}</span>
        <span className="font-body mt-0.5 block text-[14px] leading-relaxed text-[#0b3b44]/65">{detail}</span>
      </span>
    </label>
  );
}

export default function IntakeForm({
  intakeKey,
  company,
  profile,
  services = [],
}: {
  intakeKey: string;
  company: string;
  profile: IntakeProfile;
  /**
   * What the site already says the business does.
   *
   * Sarah, 2026-08-28: "ask real specialties, and let him know what I have
   * already." Asking an owner to list services in an empty box gets four of
   * them and a shrug. Showing the list already written and asking what is wrong
   * with it gets corrections, which is the useful answer.
   */
  services?: string[];
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState('');

  async function upload(list: FileList | null, kind: string, label: string) {
    if (!list?.length) return;
    setUploading((n) => n + list.length);
    for (const file of Array.from(list).slice(0, 40)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/intake/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (r.ok && d.url) {
          setFiles((f) => [...f, { label: `${label}: ${file.name}`, url: d.url, kind }]);
        }
      } catch {
        /* One photo failing must not stop the rest. The count shows what landed. */
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const answers = Object.fromEntries(Array.from(fd.entries()).map(([k, v]) => [k, String(v).trim()]));
    setStatus('sending');
    try {
      const r = await fetch('/api/intake/contractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: intakeKey, answers, files }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setStatus('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setStatus('error');
      setErr('That did not go through. Try once more, or email sarah@modernmustardseed.com and I will take it from there.');
    }
  }

  /* Uploads are counted by their card label, so a headshot and clinic photos
   * in the same section each show their own count. */
  const landed = (label: string) => files.filter((f) => f.label.startsWith(`${label}: `));

  if (status === 'done') {
    return (
      <div className="pop-card-yellow p-10 text-center md:p-14">
        <p className="mb-4 font-mono text-[10px] font-bold tracking-[0.3em] text-[#0b3b44]/60 uppercase">
          Received
        </p>
        <h2 className="font-display mb-4 text-3xl font-black tracking-tight text-[#0b3b44] md:text-5xl">
          Thank you{company && company !== 'your business' ? `, ${company}` : ''}.
        </h2>
        <p className="font-body mx-auto max-w-lg text-[17px] leading-relaxed text-[#0b3b44]/80">
          I have everything I need to start building {company}. I will email you the moment it is ready
          to look at, and if one more thing comes up I will call or text.
        </p>
      </div>
    );
  }

  function renderInput(f: IntakeInput) {
    /* A hint longer than a phone-width box is a hint nobody reads, so a field
     * with one gets two lines instead of a cut-off sentence. */
    const rows = f.long ? 4 : (f.placeholder?.length ?? 0) > 44 && f.type !== 'email' && f.type !== 'tel' ? 2 : 0;
    return (
      <div key={f.name}>
        <label className={LABEL} htmlFor={`f-${f.name}`}>
          {f.label}
        </label>
        {rows ? (
          <textarea
            id={`f-${f.name}`}
            name={f.name}
            rows={rows}
            defaultValue={f.defaultValue}
            placeholder={f.placeholder}
            className={FIELD}
          />
        ) : (
          <input
            id={`f-${f.name}`}
            name={f.name}
            type={f.type ?? 'text'}
            defaultValue={f.defaultValue}
            placeholder={f.placeholder}
            className={FIELD}
          />
        )}
      </div>
    );
  }

  /* Half-width fields pair up into a two-column grid; full-width ones stand alone. */
  function renderFields(fields: IntakeInput[]) {
    const out: React.ReactNode[] = [];
    let run: IntakeInput[] = [];
    const flush = () => {
      if (!run.length) return;
      out.push(
        <div key={`grid-${run[0].name}`} className="grid gap-5 sm:grid-cols-2">
          {run.map(renderInput)}
        </div>,
      );
      run = [];
    };
    for (const f of fields) {
      if (f.half) run.push(f);
      else {
        flush();
        out.push(renderInput(f));
      }
    }
    flush();
    return out;
  }

  function renderSection(s: IntakeSection, i: number) {
    return (
      <Section key={s.title} n={i + 1} title={s.title} blurb={s.blurb}>
        {s.knownServices && services.length > 0 ? (
          <div className="rounded-lg border-2 border-[#0b3b44]/15 bg-[#fbf5ea] p-5">
            <p className={LABEL}>What your site already lists</p>
            <p className="font-body text-[15px] leading-relaxed text-[#0b3b44]/80">{services.join(', ')}.</p>
            <p className={HINT}>Tell us below what to add or take off. Nothing is set, and changes are always included.</p>
          </div>
        ) : null}

        {(s.uploads ?? []).map((u) => {
          const got = landed(u.label);
          const noun = u.kind === 'doc' ? 'file' : 'photo';
          return (
            <div key={u.label}>
              <Drop
                title={u.title}
                detail={u.detail}
                accept={u.accept}
                multiple={u.multiple}
                onFiles={(l) => upload(l, u.kind, u.label)}
                done={
                  got.length === 0
                    ? undefined
                    : u.kind === 'logo'
                      ? 'Logo added'
                      : `${got.length} ${noun}${got.length === 1 ? '' : 's'} added`
                }
              />
              {u.preview && got.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {got.map((f) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={f.url}
                      src={f.url}
                      alt=""
                      className="aspect-square w-full rounded-md border border-[#0b3b44]/20 object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* The domain. The single question that blocks going live, and the one
          * an owner is least likely to volunteer, because half of them are not
          * sure whether they own one. So "not sure" is a real answer here. */}
        {s.domain ? (
          <div className="space-y-3">
            <Choice
              name="domain"
              value="have-one"
              defaultChecked={s.domain.defaultChoice === 'have-one'}
              title="I already own one"
              detail="Type it below, and where you bought it if you remember. We handle the setup."
            />
            <Choice
              name="domain"
              value="get-me-one"
              defaultChecked={s.domain.defaultChoice === 'get-me-one'}
              title="Get me one"
              detail="We find a strong, easy-to-say name for your business and register it for you."
            />
            <Choice
              name="domain"
              value="not-sure"
              defaultChecked={s.domain.defaultChoice === 'not-sure'}
              title="Not sure"
              detail="We will look it up and walk you through it."
            />
          </div>
        ) : null}

        {renderFields(s.fields)}
      </Section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <input type="hidden" name="kind" value={profile.kind} />
      {profile.sections.map(renderSection)}

      {status === 'error' && (
        <p className="pop-card-cream font-body p-4 text-center text-[15px] font-bold text-[#b3261e]">{err}</p>
      )}

      <div>
        <button
          type="submit"
          disabled={status === 'sending' || uploading > 0}
          className="w-full rounded-xl border-2 border-[#0b3b44] bg-[#f5b700] py-5 font-sans text-sm font-extrabold tracking-[0.2em] text-[#0b3b44] uppercase shadow-[5px_5px_0_0_#0b3b44] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
        >
          {uploading > 0
            ? `Finishing ${uploading} upload${uploading === 1 ? '' : 's'}...`
            : status === 'sending'
              ? 'Sending...'
              : 'Send it in'}
        </button>
        <p className="font-body mt-4 text-center text-[13px] text-[#0b3b44]/55">
          Everything is optional. Send what you have now and add the rest anytime by replying to my email.
        </p>
      </div>
    </form>
  );
}
