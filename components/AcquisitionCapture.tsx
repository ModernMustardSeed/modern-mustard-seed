'use client';

import { useEffect } from 'react';
import { captureAttribution, clearAttribution, isPrivateAttributionPath } from '@/lib/ai-attribution';
import { getConsent } from '@/lib/consent';

export default function AcquisitionCapture() {
  useEffect(() => {
    if (isPrivateAttributionPath(window.location.pathname)) return;
    const landing = window.location.href;
    const referrer = document.referrer;
    const capture = () => {
      if (getConsent() === 'granted') captureAttribution(landing, referrer);
      else clearAttribution();
      window.dispatchEvent(new Event('mms-attribution-ready'));
    };
    capture();
    window.addEventListener('mms-consent-change', capture);
    return () => window.removeEventListener('mms-consent-change', capture);
  }, []);
  return null;
}
