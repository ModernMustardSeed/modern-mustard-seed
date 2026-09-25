'use client';

import { useSyncExternalStore } from 'react';
import { ART_STORAGE_KEY, DEFAULT_ART, type ArtStyleId } from '@/lib/art-styles';

/* The chosen style lives on <html data-art>. The head script in app/layout.tsx
   sets it before first paint from the visitor's last choice, so there is no
   flash; this hook just watches the attribute. */

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-art'] });
  return () => mo.disconnect();
}

const read = () => (document.documentElement.getAttribute('data-art') as ArtStyleId) || DEFAULT_ART;

export function useArtStyle(): ArtStyleId {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_ART);
}

/** Switch styles with a view transition that blooms out from (x, y). */
export function setArtStyle(id: ArtStyleId, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  if (root.getAttribute('data-art') === id) return;
  const apply = () => {
    if (id === DEFAULT_ART) root.removeAttribute('data-art');
    else root.setAttribute('data-art', id);
    try { localStorage.setItem(ART_STORAGE_KEY, id); } catch { /* private mode: the choice lasts this visit */ }
  };
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (still || !doc.startViewTransition) { apply(); return; }
  root.style.setProperty('--bloom-x', (origin?.x ?? window.innerWidth / 2) + 'px');
  root.style.setProperty('--bloom-y', (origin?.y ?? window.innerHeight / 2) + 'px');
  doc.startViewTransition(apply);
}
