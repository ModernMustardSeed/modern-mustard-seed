'use client';

import { useEffect, useState } from 'react';
import SiteTour from '@/components/demo/SiteTour';

/**
 * AVA ON THE JOURNEY. Same hostess machinery as HomeTour, pointed at the
 * Flathead Journey narration. She drives the car: each beat scrolls the page
 * to its chapter and reads the road out loud. One voice everywhere.
 *
 * ⛔ She yields the moment Mr. Mustard connects (`mms:voice`), and does not
 * resume. Two voices at once reads as broken, not rich.
 */
export default function JourneyTour() {
  const [voiceBusy, setVoiceBusy] = useState(false);

  useEffect(() => {
    const onVoice = (e: Event) => setVoiceBusy(Boolean((e as CustomEvent).detail?.busy));
    window.addEventListener('mms:voice', onVoice);
    return () => window.removeEventListener('mms:voice', onVoice);
  }, []);

  return (
    <SiteTour
      manifestUrl="/tour/journey/manifest.json"
      voiceBusy={voiceBusy}
      invite={{
        eyebrow: 'The Flathead Journey',
        line: 'Want me to drive? Turn your sound on and I will narrate the whole lake.',
      }}
    />
  );
}
