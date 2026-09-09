import type { Metadata, Viewport } from 'next';
import { DM_Sans, Playfair_Display, Cormorant_Garamond, JetBrains_Mono, Oswald } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DeferredChat from '@/components/DeferredChat';
import RefCapture from '@/components/RefCapture';
import AcquisitionCapture from '@/components/AcquisitionCapture';
import AnalyticsScripts from '@/components/AnalyticsScripts';
import CookieConsent from '@/components/CookieConsent';
import Script from 'next/script';
import HideOnAppShell from '@/components/HideOnAppShell';
import HydrationGate from '@/components/HydrationGate';
import AppNavDock from '@/components/AppNavDock';
import { JsonLd, siteGraphJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import './globals.css';

const bodyFont = DM_Sans({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', variable: '--font-body' });
const displayFont = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', variable: '--font-display' });
const serifFont = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500', '600'], style: ['normal', 'italic'], display: 'swap', preload: false, variable: '--font-serif' });
const monoFont = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap', preload: false, variable: '--font-mono' });
const condensedFont = Oswald({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', preload: false, variable: '--font-oswald' });

export const metadata: Metadata = buildMetadata();

export const viewport: Viewport = {
  themeColor: '#F5B700',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} ${serifFont.variable} ${monoFont.variable} ${condensedFont.variable}`}>
      <head>
        <link rel="manifest" href="/site.webmanifest" />
        <JsonLd data={siteGraphJsonLd} />
        {/* Entrance animations across the site start hidden and are revealed by
            JS. If JS never runs (a dead bundle, a blocked script, a browser under
            our build target) that leaves a page of invisible content. So arm the
            hidden states only once JS is proven to run, and disarm them again if
            React never marks the document live: immediately if a script fails
            to load or parse, and after 6s as a backstop. */}
        {/* Deliberately a raw <script>, NOT next/script. `beforeInteractive`
            only queues code into self.__next_s for the Next runtime to drain,
            so it would run after the bundle loads: too late to stop a flash of
            visible content, and never at all on the browsers this exists for. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var d=document.documentElement,done=0;d.className+=' mm-js';function live(){return d.getAttribute('data-mm-live')}function off(){if(done||live())return;done=1;d.className=d.className.replace(' mm-js','')}addEventListener('error',function(e){var t=e&&e.target;if(!t||t===window||t.nodeName==='SCRIPT')off()},true);setTimeout(off,6000)})();",
          }}
        />
        {/* Google Consent Mode v2: default everything non-essential to denied
            until the visitor accepts. Belt-and-suspenders with the hard gate. */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});`}
        </Script>
      </head>
      <body className="bg-[#080c16] text-white selection:bg-mustard-500/30 selection:text-white">
        <div className="relative z-30">
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-[#F5B700] focus:text-[#161616] focus:px-5 focus:py-3">Skip to content</a>
          <Navbar />
          <main id="main-content" tabIndex={-1}>{children}</main>
          <HideOnAppShell>
            <Footer />
          </HideOnAppShell>
        </div>
        <AppNavDock />
        {/*
          The chat launcher stays off /mustard even though the nav and footer
          now show there: it is literally a second Mr. Mustard button offering a
          different conversation that skips the consent flow and spends
          ElevenLabs quota doing it.
        */}
        <HideOnAppShell alsoOn={['/mustard']}>
          <DeferredChat />
        </HideOnAppShell>
        <HydrationGate />
        <AcquisitionCapture />
        <RefCapture />
        <AnalyticsScripts />
        <CookieConsent />
        <Analytics />
        <SpeedInsights />
        <noscript>
          <p style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
            {SITE.name}. {SITE.description} Visit{' '}
            <a href={SITE.url} style={{ color: '#C8964E' }}>
              {SITE.url}
            </a>{' '}
            for more.
          </p>
        </noscript>
      </body>
    </html>
  );
}
