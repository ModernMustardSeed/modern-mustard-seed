import { buildMetadata } from '@/lib/seo';
import PrompterMount from './PrompterMount';

export const metadata = buildMetadata({
  title: 'The Prompter',
  description: 'MMS recording booth.',
  path: '/sarah',
  noindex: true,
});

export default function SarahPrompterPage() {
  return <PrompterMount />;
}
