import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Command Center',
  robots: { index: false, follow: false },
};

/**
 * The Command Center is its own product and its own surface. The site's body
 * is white type on near black; this wrapper sets the app's own ink and ground
 * so nothing inherits an invisible colour.
 */
export default function CcLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#F6F7F9] text-[#12151b] min-h-screen">{children}</div>;
}
