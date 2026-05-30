import { getProgramBySlug } from '@/data/programs';
import ProgramSalesPage from '@/components/programs/ProgramSalesPage';
import { buildMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';

const program = getProgramBySlug('the-terminal')!;

export const metadata = buildMetadata({
  title: program.metaTitle,
  description: program.metaDescription,
  path: '/the-terminal',
});

export default function TheTerminalPage() {
  if (!program) return notFound();
  return <ProgramSalesPage program={program} />;
}
