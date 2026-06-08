'use client';

/**
 * Loads GA4, Google Ads (gtag.js), and the Meta Pixel, each conditional on its
 * env var being set. Also sends SPA route-change page views (App Router does not
 * fire them automatically). Conversion events are fired explicitly from
 * lib/analytics.ts at the form/booking/purchase success points.
 */

import Script from 'next/script';
import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { GA4_ID, GOOGLE_ADS_ID, META_PIXEL_ID } from '@/lib/analytics';

function PageViews() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = search?.toString();
    const path = pathname + (qs ? `?${qs}` : '');
    if (GA4_ID && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_location: window.location.href,
      });
    }
    if (META_PIXEL_ID && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [pathname, search]);

  return null;
}

export default function AnalyticsScripts() {
  const hasGoogle = Boolean(GA4_ID || GOOGLE_ADS_ID);
  if (!hasGoogle && !META_PIXEL_ID) return null;

  return (
    <>
      {hasGoogle && (
        <>
          <Script
            id="gtag-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID || GOOGLE_ADS_ID}`}
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${
              GA4_ID ? `gtag('config','${GA4_ID}',{send_page_view:false});` : ''
            }${GOOGLE_ADS_ID ? `gtag('config','${GOOGLE_ADS_ID}');` : ''}`}
          </Script>
        </>
      )}

      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');`}
        </Script>
      )}

      <Suspense fallback={null}>
        <PageViews />
      </Suspense>

      {META_PIXEL_ID && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      )}
    </>
  );
}
