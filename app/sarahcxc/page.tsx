import { buildMetadata } from '@/lib/seo';
import PrompterMount from './PrompterMount';

/**
 * Private, unlinked, noindex, exactly like /sarah. Exempt from the
 * nav-completeness rule for the same reason: it is a recording booth, not a
 * customer-facing page.
 */
export const metadata = buildMetadata({
  title: 'The Witness Stand',
  description: 'Cross + Covenant recording booth.',
  path: '/sarahcxc',
  noindex: true,
});

export default function SarahCxcPrompterPage() {
  return <PrompterMount />;
}
