import type { Metadata } from 'next';
import EastonKinetic from './EastonKinetic';

/**
 * The Easton Kinetic reference build, served whole so the template gallery can
 * embed it and Sarah can walk the entire site. Never indexed: a studio
 * reference, not a client.
 */
export const metadata: Metadata = {
  title: 'Easton Events · Easton Kinetic reference',
  description: 'Reference build for the Easton Kinetic Event Studio site template.',
  robots: { index: false, follow: false },
};

export default function EastonKineticReferencePage() {
  return <EastonKinetic />;
}
