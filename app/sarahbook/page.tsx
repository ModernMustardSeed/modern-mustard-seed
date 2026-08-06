import { buildMetadata } from '@/lib/seo';
import PrompterMount from './PrompterMount';

/**
 * Private, unlinked, noindex, like the other two booths, and exempt from the
 * nav-completeness rule for the same reason: it is a recording room, not a
 * customer-facing page.
 */
export const metadata = buildMetadata({
  title: 'The Sun Room',
  description: 'Eternal Optimist recording booth.',
  path: '/sarahbook',
  noindex: true,
});

export default function SarahBookPrompterPage() {
  return <PrompterMount />;
}
