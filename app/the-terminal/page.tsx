import { getProgramBySlug } from '@/data/programs';
import ProgramSalesPage from '@/components/programs/ProgramSalesPage';
import BuyButton from '@/components/programs/BuyButton';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';
import { buildMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';
import s from './page.module.css';

const program = getProgramBySlug('the-terminal')!;

export const metadata = buildMetadata({
  title: program.metaTitle,
  description: program.metaDescription,
  path: '/the-terminal',
});

export default function TheTerminalPage() {
  if (!program) return notFound();
  return (
    <>
      <PopPageHero
        eyebrow={<span>Modern Mustard Seed</span>}
        title={program.tagline}
        issue={{ no: 'No.1', lines: ['The Terminal', 'Zero to one builder'] }}
        sticker="Ship it!"
        mascot={{ bubble: 'Open a terminal!' }}
      >
        <p>{program.promise}</p>
        <div className={pop.actions}>
          <BuyButton slug={program.slug} name={program.name} label={`Ask Sarah about ${program.name}`} className={pop.cta} />
        </div>
        <p className={s.fine}>One time . Lifetime access . 14 day guarantee</p>
      </PopPageHero>
      <div className={s.sales}>
        <ProgramSalesPage program={program} />
      </div>
    </>
  );
}
