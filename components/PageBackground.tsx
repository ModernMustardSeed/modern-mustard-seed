'use client';

import dynamic from 'next/dynamic';

const LuminousField = dynamic(() => import('./LuminousField'), { ssr: false });

export default function PageBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="pointer-events-auto absolute inset-0">
        <LuminousField />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_45%,rgba(14,8,36,0.78)_100%)] z-10" />
    </div>
  );
}
