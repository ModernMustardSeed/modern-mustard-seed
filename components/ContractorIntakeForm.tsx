'use client';

import { useState } from 'react';

/**
 * The contractor intake.
 *
 * Written for a builder standing next to a truck, not for somebody at a desk.
 * Every question is one he can answer without looking anything up except the
 * licence number, and nothing is required except the licence and one photo,
 * because a form that refuses to submit is a form that does not come back.
 *
 * Photographs are the ask that matters. The site ships with stand-in images and
 * they stay stand-ins until he sends his own, so the upload sits near the top
 * rather than buried under branding questions he does not care about.
 */

type Uploaded = { label: string; url: string; kind: string };

const FIELD =
  'w-full border-2 border-[#161616] bg-white px-4 py-3 font-body text-[16px] text-[#161616] outline-none focus:border-[#C4380C]';
const LABEL = 'block font-mono text-[11px] tracking-[0.14em] uppercase text-[#6e7c87] mb-2';

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
   * What his site already says he does.
   *
   * Sarah, 2026-08-28: "ask real specialties, and let him know what I have
   * already." Asking a builder to list his services in an empty box gets four
   * of them and a shrug. Showing him the fourteen already written and asking
   * what is wrong with the list gets corrections, which is the useful answer.
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
        /* One photo failing must not stop the rest. He sees the count. */
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const answers = Object.fromEntries(
      Array.from(fd.entries()).map(([k, v]) => [k, String(v).trim()]),
    );
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
      setErr('That did not send. Try again, or email sarah@modernmustardseed.com and she will take it down.');
    }
  }

  if (status === 'done') {
    return (
      <div className="border-2 border-[#161616] bg-[#F5B700] p-10 text-center" style={{ boxShadow: '8px 8px 0 #161616' }}>
        <h2 className="font-display text-3xl font-black text-[#161616] mb-3">
          Got it, {contact.split(' ')[0] || 'thanks'}
        </h2>
        <p className="font-body text-[#161616] text-[17px] leading-relaxed max-w-md mx-auto">
          Sarah has everything. She builds the real thing around your answers and emails you when
          it is live on your own domain. If she needs one more thing she will ring you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      {/* Photographs first. The stand-ins on the site stay stand-ins until
        * these arrive, so this is the ask that actually changes the product. */}
      <section>
        <h2 className="font-display text-2xl font-black text-[#161616] mb-2">Photos off your jobs</h2>
        <p className="font-body text-[15px] text-[#3a3733] mb-4 leading-relaxed">
          The most useful thing on this form. Finished work, work in progress, the crew, the
          trucks. Straight off your phone is perfect, they do not need to be good. Ten to twenty
          is plenty to start.
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => upload(e.target.files, 'photo', 'Job photo')}
          className={FIELD}
        />
        {files.filter((f) => f.kind === 'photo').length > 0 && (
          <p className="mt-2 font-mono text-[12px] text-[#C4380C]">
            {files.filter((f) => f.kind === 'photo').length} photo(s) uploaded
          </p>
        )}
        <label className={`${LABEL} mt-6`}>What are we looking at?</label>
        <textarea
          name="photoNotes"
          rows={3}
          placeholder="Which job is which, and anything you want named on the site. Harborside, the Kerr addition, that sort of thing."
          className={FIELD}
        />
      </section>

      {/* The licence. Its own section because it goes on the live site and
        * because a contractor without one visible loses commercial bids. */}
      <section>
        <h2 className="font-display text-2xl font-black text-[#161616] mb-2">Your licence</h2>
        <p className="font-body text-[15px] text-[#3a3733] mb-4 leading-relaxed">
          This goes on the site. People checking a contractor look for it, and commercial work
          asks for it before anything else.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Contractor licence number *</label>
            <input name="licenceNumber" required className={FIELD} placeholder="Montana registration or licence no." />
          </div>
          <div>
            <label className={LABEL}>Issued in</label>
            <input name="licenceState" defaultValue="Montana" className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Insurance carrier</label>
            <input name="insurer" className={FIELD} placeholder="Who carries your general liability" />
          </div>
          <div>
            <label className={LABEL}>Bonded?</label>
            <input name="bonded" className={FIELD} placeholder="Yes / no / amount" />
          </div>
        </div>
        <label className={`${LABEL} mt-5`}>Certificates, if you have them handy</label>
        <input
          type="file"
          multiple
          onChange={(e) => upload(e.target.files, 'doc', 'Certificate')}
          className={FIELD}
        />
      </section>

      <section>
        <h2 className="font-display text-2xl font-black text-[#161616] mb-2">How it should look</h2>
        <div className="space-y-5">
          <div>
            <label className={LABEL}>Your logo</label>
            <input type="file" accept="image/*" onChange={(e) => upload(e.target.files, 'logo', 'Logo')} className={FIELD} />
            <p className="mt-2 font-body text-[13px] text-[#6e7c87]">
              Any format. If you have not got one, say so below and we will set the type properly
              instead, which for a builder often looks better anyway.
            </p>
          </div>
          <div>
            <label className={LABEL}>Colours</label>
            <input name="colours" className={FIELD} placeholder="Off your trucks, your signs, or just say what you like" />
          </div>
          <div>
            <label className={LABEL}>Anything you have seen that you liked</label>
            <input name="likes" className={FIELD} placeholder="Another builder's site, a sign, a colour. Anything." />
          </div>
        </div>
      </section>

      {/* The domain.
        *
        * Sarah, 2026-08-28. The single question that blocks going live, and the
        * one a builder is least likely to volunteer, because half of them are
        * not sure whether they own one. So it is asked with the answer already
        * worked out: here is the name we would buy, here is what it costs, and
        * here is the one that is not worth what they want for it.
        *
        * The prices are stated because a builder who is told "we will sort the
        * domain" and later sees a $4,500 line has been ambushed. Fifteen
        * dollars is included in what he already paid; four and a half thousand
        * is somebody else's asking price and we have no say in it. */}
      <section>
        <h2 className="font-display text-2xl font-black text-[#161616] mb-2">Your address on the internet</h2>
        <p className="font-body text-[15px] text-[#3a3733] mb-4 leading-relaxed">
          This is the one thing that has to be settled before the site can go live.
          If you are not sure, say so and we will work it out on the phone.
        </p>

        <div className="border-2 border-[#161616] bg-[#faf7f2] p-5 mb-5">
          <label className="flex gap-3 items-start cursor-pointer mb-4">
            <input type="radio" name="domain" value="have-one" className="mt-1.5 w-5 h-5 accent-[#C4380C]" />
            <span>
              <span className="block font-body font-bold text-[16px] text-[#161616]">I already own one</span>
              <span className="block font-body text-[14px] text-[#3a3733] mt-0.5">
                Tell us the exact name and roughly where you bought it. We do the rest.
              </span>
            </span>
          </label>
          <input
            name="domainOwned"
            className={`${FIELD} mb-5`}
            placeholder="The name you own, and where from (GoDaddy, Namecheap, whoever)"
          />

          <label className="flex gap-3 items-start cursor-pointer mb-4">
            <input type="radio" name="domain" value="buy-mt" defaultChecked className="mt-1.5 w-5 h-5 accent-[#C4380C]" />
            <span>
              <span className="block font-body font-bold text-[16px] text-[#161616]">
                Buy me wildhorseconstructionmt.com
              </span>
              <span className="block font-body text-[14px] text-[#3a3733] mt-0.5">
                About $15 a year, and it is included in what you have already paid. This is
                the one we would pick. The MT reads as Montana and it helps you locally
                rather than hurting you.
              </span>
            </span>
          </label>

          <label className="flex gap-3 items-start cursor-pointer">
            <input type="radio" name="domain" value="buy-premium" className="mt-1.5 w-5 h-5 accent-[#C4380C]" />
            <span>
              <span className="block font-body font-bold text-[16px] text-[#161616]">
                I want wildhorseconstruction.com, at $4,500
              </span>
              <span className="block font-body text-[14px] text-[#3a3733] mt-0.5">
                It is available, but somebody is holding it and that is their asking price.
                We have zero control over it and we make nothing on it. It is not fifteen
                dollars better than the one above, and we would not spend it.
              </span>
            </span>
          </label>
        </div>

        <label className={LABEL}>Anything else about the domain</label>
        <input
          name="domainNotes"
          className={FIELD}
          placeholder="A name you would rather have, an old website that is still up somewhere, anything"
        />
      </section>

      <section>
        <h2 className="font-display text-2xl font-black text-[#161616] mb-2">The business</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Best email</label>
            <input name="email" type="email" className={FIELD} placeholder="Where everything should go" />
          </div>
          <div>
            <label className={LABEL}>Best number</label>
            <input name="phone" className={FIELD} placeholder="The one you actually answer" />
          </div>
          <div>
            <label className={LABEL}>Years doing this</label>
            <input name="years" className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>How many on the crew</label>
            <input name="crewSize" className={FIELD} />
          </div>
        </div>
        {services.length > 0 ? (
          <div className="mt-6 border-2 border-[#161616] bg-[#faf7f2] p-5">
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#6e7c87] mb-2">
              What your site already says you do
            </p>
            <p className="font-body text-[15px] leading-relaxed text-[#3a3733]">
              {services.join(', ')}.
            </p>
            <p className="font-body text-[14px] leading-relaxed text-[#6e7c87] mt-3">
              Each of those has its own page. Tell us below what is wrong with the list
              and we fix it: nothing here is set, and changes are always free.
            </p>
          </div>
        ) : null}
        <label className={`${LABEL} mt-5`}>What are you best at?</label>
        <input
          name="bestAt"
          className={FIELD}
          placeholder="The two or three you would want a stranger to judge you on"
        />
        <label className={`${LABEL} mt-5`}>Anything you do that is not on that list</label>
        <input
          name="alsoDo"
          className={FIELD}
          placeholder="Excavation for other builders, demolition, snow, septic, coring, winter work"
        />
        <label className={`${LABEL} mt-5`}>Anything on the list you do NOT do</label>
        <input
          name="doNotDo"
          className={FIELD}
          placeholder="Say so and it comes off before anybody reads it"
        />
        <label className={`${LABEL} mt-5`}>Towns you want work in</label>
        <input name="towns" className={FIELD} placeholder="Kalispell, Whitefish, Bigfork…" />
        <label className={`${LABEL} mt-5`}>Work you want more of</label>
        <input name="wantMore" className={FIELD} placeholder="Commercial? Custom homes? Whatever pays best." />
        <label className={`${LABEL} mt-5`}>Work you would rather not be sent</label>
        <input name="wantLess" className={FIELD} placeholder="Say so and we keep it off the site." />
      </section>

      <section>
        <h2 className="font-display text-2xl font-black text-[#161616] mb-2">Anything else</h2>
        <textarea
          name="anythingElse"
          rows={4}
          placeholder="A domain you already own, an award, an association, something you want said, something you want kept off. Anything at all."
          className={FIELD}
        />
      </section>

      {status === 'error' && (
        <p className="border-l-4 border-[#C4380C] pl-4 font-body text-[15px] text-[#161616]">{err}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending' || uploading > 0}
        className="w-full border-2 border-[#161616] bg-[#C4380C] px-6 py-5 font-display text-[19px] font-black text-white disabled:opacity-60"
        style={{ boxShadow: '6px 6px 0 #161616' }}
      >
        {uploading > 0
          ? `Finishing ${uploading} upload${uploading === 1 ? '' : 's'}…`
          : status === 'sending'
            ? 'Sending…'
            : 'Send it in'}
      </button>
      <p className="text-center font-body text-[13px] text-[#6e7c87]">
        {company} · you will hear from Sarah, usually the same day.
      </p>
    </form>
  );
}
