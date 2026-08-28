import { notFound } from 'next/navigation';
import ContractorIntakeForm from '@/components/ContractorIntakeForm';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Welcome',
  description: 'The one form that tells us everything we need to build it.',
  path: '/welcome',
  noindex: true,
});

/**
 * The welcome page a paying client lands on.
 *
 * Reached by a token, so he never types the email address every record keys on.
 * The old brand intake asked for it, which is how one client ends up filed
 * under two addresses and a paid build nobody can find.
 *
 * An unknown token 404s rather than showing an empty form, because a form that
 * accepts answers it cannot file is worse than no form: he thinks he is done.
 */
export default async function WelcomePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
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
  const first = contact.split(/\s+/)[0] || '';

  return (
    <div className="relative min-h-screen bg-[#FBF6EA] pt-28 pb-24 text-[#161616] md:pt-36">
      <div aria-hidden className="halftone-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-3xl px-6 md:px-8">
        <header className="mb-12">
          <span className="mb-5 block font-mono text-[10px] font-bold tracking-[0.4em] text-[#E0301E] uppercase">
            {company} · Modern Mustard Seed
          </span>
          <h1 className="font-display mb-5 text-4xl leading-[1.05] font-black tracking-tight md:text-6xl">
            {first ? (
              <>
                Right then,{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                  {first}
                </span>
              </>
            ) : (
              <>
                Let&rsquo;s build{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                  the real one
                </span>
              </>
            )}
          </h1>
          <p className="font-body max-w-xl text-lg leading-relaxed text-[#3a3733]">
            You have seen it. This is the one form that turns it into yours: your photos, your
            licence, your colours. Ten minutes, and you can skip anything you are not sure about.
          </p>
          <p className="font-body mt-3 max-w-xl text-sm leading-relaxed text-[#161616]/55">
            The only thing we really need is the licence number and a few photographs off your
            jobs. Everything else we can work out on the phone.
          </p>
        </header>

        <ContractorIntakeForm intakeKey={key} company={company} contact={contact} />
      </div>
    </div>
  );
}
