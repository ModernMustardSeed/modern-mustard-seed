'use client';

/**
 * THE APP DOCK. Renders ONLY when the site runs as an installed app
 * (display-mode: standalone / iOS navigator.standalone), where the browser's
 * back and forward chrome does not exist. Sarah hit this using MMS as an
 * app: any deep navigation was a one-way door and she had to relaunch to
 * get back. Three moves, bottom-left (the chat launcher owns bottom-right):
 * back, a smart home seed (nearest shell root: /admin, /portal, /partners/hq,
 * or /), and forward.
 */

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function shellHome(pathname: string): string {
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/portal')) return '/portal';
  if (pathname.startsWith('/partners/hq')) return '/partners/hq';
  return '/';
}

export default function AppNavDock() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const iosStandalone = 'standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true;
    const update = () => setStandalone(mq.matches || iosStandalone);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (!standalone) return null;

  const btn =
    'grid h-10 w-10 place-items-center rounded-full border-2 border-[#161616] bg-white text-[#161616] text-base font-bold transition-transform active:scale-90 hover:-translate-y-0.5';

  return (
    <nav
      aria-label="App navigation"
      className="fixed bottom-4 left-4 z-[70] flex items-center gap-1.5 rounded-full border-2 border-[#161616] bg-[#FBF6EA]/95 backdrop-blur-sm p-1.5 shadow-[4px_4px_0_0_#161616]"
    >
      <button type="button" aria-label="Go back" onClick={() => router.back()} className={btn}>
        <span aria-hidden>←</span>
      </button>
      <button
        type="button"
        aria-label="Go to home screen"
        onClick={() => router.push(shellHome(pathname))}
        className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#161616] bg-[#F5B700] transition-transform active:scale-90 hover:-translate-y-0.5"
      >
        <span className="relative h-6 w-6">
          <Image src="/brand/mascot.png" alt="" fill sizes="24px" className="object-contain" />
        </span>
      </button>
      <button type="button" aria-label="Go forward" onClick={() => router.forward()} className={btn}>
        <span aria-hidden>→</span>
      </button>
    </nav>
  );
}
