'use client';

import { useEffect } from 'react';

/**
 * Proof that React actually came up, for the blank-page safety in <head>.
 *
 * The `mm-js-gate` script arms every entrance animation by putting `mm-js` on
 * <html>, then tears it back off after 2.5s unless this component has marked
 * the document live. That timer is the difference between "the bundle died and
 * you see the page unanimated" and "the bundle died and you see nothing",
 * which is what a browser below our build target used to get.
 *
 * Same shape as the `sb-js` gate in components/switchboard/SwitchboardMotion.tsx.
 */
export default function HydrationGate() {
  useEffect(() => {
    document.documentElement.setAttribute('data-mm-live', '1');
  }, []);

  return null;
}
