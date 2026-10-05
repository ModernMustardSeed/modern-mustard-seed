import { notFound } from 'next/navigation';
import ContractorIntakeForm from '@/components/ContractorIntakeForm';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Welcome',
  description: 'The one form that tells us everything we need to build your website.',
  path: '/welcome',
  noindex: true,
});

/**
 * The welcome page a paying client lands on.
 *
 * Reached by a token, so the client never types the email address every record
 * keys on. The old brand intake asked for it, which is how one client ends up
 * filed under two addresses and a paid build nobody can find.
 *
 * An unknown token 404s rather than showing an empty form, because a form that
 * accepts answers it cannot file is worse than no form: they think they are done.
 */

const STEPS = [
  { n: '01', title: 'You fill this out', detail: 'About ten minutes. Skip anything you are not sure about.' },
  { n: '02', title: 'We build it', detail: 'Your site, written and designed around your answers and your photos.' },
  { n: '03', title: 'You review it', detail: 'Ask for anything you want changed. Changes are always included.' },
];

export default async function WelcomePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const supabase = getSupabase();
  if (!supabase) notFound();

  const { data: client } = await supabase
    .from('clients')
    .select('email, name, company, intake_key')
    .eq('intake_key', key)
    .maybeSingle();

  if (!client) notFound();

  const company = (client.company as string) || 'your business';
  const contact = (client.name as string) || '';
  // Greets the business, not the person: Sarah, 2026-10-05, "say Lawn Dogs, not Garrett".
  const named = (client.company as string) || '';

  return (
    <div className="relative min-h-screen bg-[#fbf5ea] pt-28 pb-28 text-[#0b3b44] md:pt-40">
      <div aria-hidden className="halftone-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 md:px-8">
        <header className="mb-12 text-center md:mb-16">
          <span className="mb-6 block font-mono text-[10px] font-bold tracking-[0.4em] text-[#0a7c78] uppercase">
            {company} · Modern Mustard Seed
          </span>
          <h1 className="font-display mb-6 text-4xl leading-[1.05] font-black tracking-tight md:text-6xl">
            Welcome aboard
            {named ? (
              <>
                , <em className="text-[#0a7c78] italic">{named}</em>
              </>
            ) : null}
            .
          </h1>
          <p className="font-body mx-auto max-w-xl text-lg leading-relaxed text-[#0b3b44]/80">
            Thank you for trusting us with your website. This form is how it becomes
            unmistakably yours: your photos, your services, your towns, your name.
          </p>
        </header>

        <ol className="mb-12 grid gap-4 sm:grid-cols-3 md:mb-16">
          {STEPS.map((s) => (
            <li key={s.n} className="pop-card-cream p-5">
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#0a7c78]">{s.n}</span>
              <p className="font-display mt-1 text-lg leading-tight font-black">{s.title}</p>
              <p className="font-body mt-1.5 text-[14px] leading-relaxed text-[#0b3b44]/65">{s.detail}</p>
            </li>
          ))}
        </ol>

        <ContractorIntakeForm intakeKey={key} company={company} contact={contact} />
      </div>
    </div>
  );
}
