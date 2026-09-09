'use client';

import Link from 'next/link';
import { useSyncExternalStore, type ComponentProps } from 'react';
import { attributedHref, readAttribution } from '@/lib/ai-attribution';

/** Server HTML remains an ordinary link; consented campaigns survive conversion links. */
function subscribe(update: () => void) {
  window.addEventListener('mms-attribution-ready', update);
  return () => window.removeEventListener('mms-attribution-ready', update);
}

export default function AttributionLink(props: ComponentProps<typeof Link>) {
  const href = useSyncExternalStore(subscribe,
    () => typeof props.href === 'string' ? attributedHref(props.href, readAttribution()) : props.href,
    () => props.href);
  return <Link {...props} href={href} />;
}
