'use client';

import { useState } from 'react';

/**
 * The paid-client intake, for any trade.
 *
 * Written for an owner standing next to a truck, not for somebody at a desk.
 * Every question can be answered from memory and nothing is required, because
 * a form that refuses to submit is a form that does not come back. It started
 * as a builder's form and asked for a contractor license before it would send;
 * a sprinkler or landscape crew may have none, so the license is now optional.
 *
 * Photos are the ask that matters most, so the upload sits first rather than
 * buried under branding questions the owner does not care about.
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

export default function ContractorIntakeForm({
  intakeKey,
  company,
  contact,
  services = [],
}: {
  intakeKey: string;
  company: string;
  contact: string;
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
  const first = contact.split(/\s+/)[0] || '';

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

  const count = (kind: string) => files.filter((f) => f.kind === kind).length;

  if (status === 'done') {
    return (
      <div className="pop-card-yellow p-10 text-center md:p-14">
        <p className="mb-4 font-mono text-[10px] font-bold tracking-[0.3em] text-[#0b3b44]/60 uppercase">
          Received
        </p>
        <h2 className="font-display mb-4 text-3xl font-black tracking-tight text-[#0b3b44] md:text-5xl">
          Thank you{first ? `, ${first}` : ''}.
        </h2>
        <p className="font-body mx-auto max-w-lg text-[17px] leading-relaxed text-[#0b3b44]/80">
          I have everything I need to start building {company}. I will email you the moment it is ready
          to look at, and if one more thing comes up I will call or text.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <Section
        n={1}
        title="Photos of your work"
        blurb="The single most useful thing on this form. Finished jobs, work in progress, the crew, the trucks, the equipment. Straight off your phone is perfect. Ten to twenty is a great start, and more is better."
      >
        <div>
          <Drop
            title="Add photos"
            detail="Tap to choose from your phone or computer. Pick as many as you like."
            accept="image/*"
            multiple
            onFiles={(l) => upload(l, 'photo', 'Job photo')}
            done={count('photo') > 0 ? `${count('photo')} photo${count('photo') === 1 ? '' : 's'} added` : undefined}
          />
          {count('photo') > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {files
                .filter((f) => f.kind === 'photo')
                .map((f) => (
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
        <div>
          <label className={LABEL}>Tell us about them (optional)</label>
          <textarea
            name="photoNotes"
            rows={3}
            placeholder="Which job is which, the town, anything you want called out on the site."
            className={FIELD}
          />
        </div>
      </Section>

      <Section
        n={2}
        title="Your business"
        blurb="The basics that go on every page, so customers can reach you the first time they try."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Best email</label>
            <input name="email" type="email" className={FIELD} placeholder="Where customer inquiries should go" />
          </div>
          <div>
            <label className={LABEL}>Best phone number</label>
            <input name="phone" type="tel" className={FIELD} placeholder="The one you actually answer" />
          </div>
          <div>
            <label className={LABEL}>Years in business</label>
            <input name="years" className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Crew size</label>
            <input name="crewSize" className={FIELD} />
          </div>
        </div>
        <div>
          <label className={LABEL}>Towns and areas you serve</label>
          <input name="towns" className={FIELD} placeholder="Every town you will drive to. List them all." />
        </div>
        <div>
          <label className={LABEL}>Hours and seasons</label>
          <input
            name="hours"
            className={FIELD}
            placeholder="When you work, and what changes in the off season"
          />
        </div>
      </Section>

      <Section
        n={3}
        title="What you do"
        blurb="Every service you list can become its own spot on the site, which is how people searching for that exact job find you."
      >
        {services.length > 0 ? (
          <div className="rounded-lg border-2 border-[#0b3b44]/15 bg-[#fbf5ea] p-5">
            <p className={LABEL}>What your site already lists</p>
            <p className="font-body text-[15px] leading-relaxed text-[#0b3b44]/80">{services.join(', ')}.</p>
            <p className={HINT}>Tell us below what to add or take off. Nothing is set, and changes are always included.</p>
          </div>
        ) : null}
        <div>
          <label className={LABEL}>Every service you offer</label>
          <textarea
            name="services"
            rows={4}
            className={FIELD}
            placeholder="List them all, big and small. Installs, repairs, seasonal work, maintenance plans, anything you get paid for."
          />
        </div>
        <div>
          <label className={LABEL}>What you are best at</label>
          <input
            name="bestAt"
            className={FIELD}
            placeholder="The two or three jobs you would want a new customer to judge you on"
          />
        </div>
        <div>
          <label className={LABEL}>Work you want more of</label>
          <input name="wantMore" className={FIELD} placeholder="The jobs that pay best or that you enjoy most" />
        </div>
        <div>
          <label className={LABEL}>Work you do not want</label>
          <input name="wantLess" className={FIELD} placeholder="Say so and we keep it off the site" />
        </div>
      </Section>

      <Section
        n={4}
        title="Your look"
        blurb="No logo? No problem. Say so and we will set your name in strong, clean type, which often looks better anyway."
      >
        <div>
          <Drop
            title="Add your logo"
            detail="Any file you have: a photo of a sign or truck door works too."
            accept="image/*,.pdf,.svg"
            onFiles={(l) => upload(l, 'logo', 'Logo')}
            done={count('logo') > 0 ? 'Logo added' : undefined}
          />
        </div>
        <div>
          <label className={LABEL}>Colors</label>
          <input name="colors" className={FIELD} placeholder="Off your trucks, your shirts, your signs, or what you like" />
        </div>
        <div>
          <label className={LABEL}>Websites or brands you like</label>
          <input name="likes" className={FIELD} placeholder="Anything that caught your eye. A link or a name is plenty." />
        </div>
      </Section>

      {/* The domain. The single question that blocks going live, and the one an
        * owner is least likely to volunteer, because half of them are not sure
        * whether they own one. So "not sure" is a real answer here. */}
      <Section
        n={5}
        title="Your web address"
        blurb="This is the one thing we need settled before the site goes live. If you are not sure, pick that and we will sort it out together."
      >
        <div className="space-y-3">
          <Choice
            name="domain"
            value="have-one"
            title="I already own one"
            detail="Type it below, and where you bought it if you remember. We handle the setup."
          />
          <Choice
            name="domain"
            value="get-me-one"
            defaultChecked
            title="Get me one"
            detail="We find a strong, easy-to-say name for your business and register it for you."
          />
          <Choice
            name="domain"
            value="not-sure"
            title="Not sure"
            detail="We will look it up and walk you through it."
          />
        </div>
        <div>
          <label className={LABEL}>Domain notes</label>
          <input
            name="domainNotes"
            className={FIELD}
            placeholder="The name you own, a name you would love to have, or an old website still up somewhere"
          />
        </div>
      </Section>

      <Section
        n={6}
        title="Licensing and insurance"
        blurb="Optional. If you carry them, they go on the site, because customers comparing companies look for them."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL}>License or registration number</label>
            <input name="licenseNumber" className={FIELD} placeholder="Skip if it does not apply" />
          </div>
          <div>
            <label className={LABEL}>Issued in</label>
            <input name="licenseState" defaultValue="Montana" className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Insured?</label>
            <input name="insurer" className={FIELD} placeholder="Yes, and the carrier if you like" />
          </div>
          <div>
            <label className={LABEL}>Bonded?</label>
            <input name="bonded" className={FIELD} placeholder="Yes or no" />
          </div>
        </div>
        <Drop
          title="Add certificates"
          detail="Optional. Licenses, insurance certificates, manufacturer or industry certifications."
          multiple
          onFiles={(l) => upload(l, 'doc', 'Certificate')}
          done={count('doc') > 0 ? `${count('doc')} file${count('doc') === 1 ? '' : 's'} added` : undefined}
        />
      </Section>

      <Section n={7} title="Anything else">
        <textarea
          name="anythingElse"
          rows={4}
          placeholder="Reviews you are proud of, awards, associations, warranties, how you got started, or anything you want said or kept off."
          className={FIELD}
        />
      </Section>

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
