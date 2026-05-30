import { getProgramBySlug } from '@/data/programs';
import ProgramSalesPage from '@/components/programs/ProgramSalesPage';
import { buildMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';

const program = getProgramBySlug('idea-to-spec')!;

export const metadata = buildMetadata({
  title: program.metaTitle,
  description: program.metaDescription,
  path: '/idea-to-spec',
});

export default function IdeaToSpecPage() {
  if (!program) return notFound();
  return <ProgramSalesPage program={program} />;
}
