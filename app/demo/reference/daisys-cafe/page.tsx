import type { Metadata } from 'next';
import DaisyCafe from './DaisyCafe';

/**
 * The Lakehouse Editorial reference build, served whole so the template
 * gallery can embed it and Sarah can walk the entire site. Never indexed: it is
 * a studio reference, not a client.
 */
export const metadata: Metadata = {
  title: "Daisy's Cafe · Lakehouse Editorial reference",
  description: 'Reference build for the Lakehouse Editorial site template.',
  robots: { index: false, follow: false },
};

export default function DaisysCafeReferencePage() {
  return <DaisyCafe />;
}
