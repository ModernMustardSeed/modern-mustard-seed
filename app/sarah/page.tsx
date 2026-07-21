import { buildMetadata } from '@/lib/seo';
import Teleprompter from './Teleprompter';

export const metadata = buildMetadata({
  title: 'The Prompter',
  description: 'MMS recording booth.',
  path: '/sarah',
  noindex: true,
});

export default function SarahPrompterPage() {
  return <Teleprompter />;
}
