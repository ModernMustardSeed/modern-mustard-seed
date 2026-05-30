import ProgramHQ from '@/components/programs/ProgramHQ';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'The Terminal HQ', path: '/the-terminal/hq', noindex: true });

export const dynamic = 'force-dynamic';

export default function TheTerminalHQ() {
  return <ProgramHQ slug="the-terminal" />;
}
