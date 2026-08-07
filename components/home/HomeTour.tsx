'use client';

import { useEffect, useState } from 'react';
import SiteTour from '@/components/demo/SiteTour';

/**
 * THE HOSTESS ON OUR OWN FRONT DOOR.
 *
 * Sarah 2026-08-07: *"i want you to make the same thing for modern mustard
 * seed. i want the girl voice for the tour still, i like the handoff."*
 *
 * Same component as a client site's guide, pointed at our static manifest and
 * scrolling the real window instead of an iframe. The tour ends by handing the
 * visitor to Mr. Mustard in the opposite corner, who is live and can book them.
 *
 * ⛔ SHE YIELDS THE MOMENT HE CONNECTS. `MustardSeedChat` broadcasts `mms:voice`
 * when his call state changes, and the hostess stops mid-word and does not
 * resume. Nobody should ever hear both of them at once.
 */
export default function HomeTour() {
  const [voiceBusy, setVoiceBusy] = useState(false);

  useEffect(() => {
    const onVoice = (e: Event) => setVoiceBusy(Boolean((e as CustomEvent).detail?.busy));
    window.addEventListener('mms:voice', onVoice);
    return () => window.removeEventListener('mms:voice', onVoice);
  }, []);

  return (
    <SiteTour
      manifestUrl="/tour/mms/manifest.json"
      voiceBusy={voiceBusy}
      invite={{
        eyebrow: 'Modern Mustard Seed',
        line: 'Want the quick tour? I will walk you through it.',
      }}
    />
  );
}
