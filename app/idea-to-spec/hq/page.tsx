import ProgramHQ from '@/components/programs/ProgramHQ';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Idea to Spec HQ', path: '/idea-to-spec/hq', noindex: true });

export const dynamic = 'force-dynamic';

export default function IdeaToSpecHQ() {
  return <ProgramHQ slug="idea-to-spec" />;
}
