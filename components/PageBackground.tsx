'use client';

import dynamic from 'next/dynamic';

const MustardTree = dynamic(() => import('./MustardTree'), { ssr: false });

export default function PageBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="pointer-events-auto absolute inset-0">
        <MustardTree />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_30%,rgba(10,8,4,0.6)_100%)] z-10" />
      <div
        className="absolute inset-0 opacity-60 z-20"
        style={{
          background: `
            radial-gradient(ellipse 50% 30% at 50% 55%, rgba(200, 164, 21, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 30% 40%, rgba(180, 140, 20, 0.02) 0%, transparent 50%)
          `,
        }}
      />
    </div>
  );
}
