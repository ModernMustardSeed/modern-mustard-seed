import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { DM_Sans, Playfair_Display, Cormorant_Garamond, JetBrains_Mono, Oswald, Unbounded, Figtree } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DeferredChat from '@/components/DeferredChat';
import RefCapture from '@/components/RefCapture';
import AcquisitionCapture from '@/components/AcquisitionCapture';
import HouseBeacon from '@/components/HouseBeacon';
import AnalyticsScripts from '@/components/AnalyticsScripts';
import CookieConsent from '@/components/CookieConsent';
import InquiryPopup from '@/components/InquiryPopup';
import Script from 'next/script';
import HideOnAppShell from '@/components/HideOnAppShell';
import HydrationGate from '@/components/HydrationGate';
import AppNavDock from '@/components/AppNavDock';
import { JsonLd, siteGraphJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import './globals.css';
import './studio-chrome.css';
import './riviera-type.css';
import './flathead-home.css';
import './flathead-theme.css';
import RivieraScope from '@/components/pop/RivieraScope';
import { rivieraHeadScript } from '@/lib/riviera-scope';

// DM Sans and Playfair now set only the admin and portal (public pages wear
// Unbounded and Figtree), so they no longer preload and compete with the hero.
const bodyFont = DM_Sans({ subsets: ['latin'], style: ['normal'], display: 'optional', preload: false, variable: '--font-body' });
const displayFont = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], display: 'optional', preload: false, variable: '--font-display' });
const serifFont = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500', '600'], style: ['normal', 'italic'], display: 'swap', preload: false, variable: '--font-serif' });
const monoFont = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap', preload: false, variable: '--font-mono' });
const condensedFont = Oswald({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', preload: false, variable: '--font-oswald' });
// The Riviera (2026-09-27): display type is Unbounded, wide, round and
// confident, the face that says software at a glance and still feels like
// the beach; the accent word is Unbounded in a lighter weight. Figtree sets
// labels, reading type and the italics. Sarah picked the pairing ("c").
const rivieraFont = Unbounded({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-riviera' });
const capsFont = Figtree({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', preload: false, variable: '--font-caps' });

const flatheadDisplay = localFont({src:[{path:'../public/flathead/instrument-serif.woff2',weight:'400',style:'normal'},{path:'../public/flathead/instrument-serif-italic.woff2',weight:'400',style:'italic'}],display:'swap',variable:'--font-flathead-display'});
const flatheadBody = localFont({src:[{path:'../public/flathead/manrope.woff2',weight:'400',style:'normal'},{path:'../public/flathead/manrope-semibold.woff2',weight:'600',style:'normal'},{path:'../public/flathead/manrope-bold.woff2',weight:'700',style:'normal'}],display:'swap',variable:'--font-flathead-body'});

export const metadata: Metadata = buildMetadata();

export const viewport: Viewport = {
  themeColor: '#fcf8eb',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${bodyFont.variable} ${displayFont.variable} ${serifFont.variable} ${monoFont.variable} ${condensedFont.variable} ${rivieraFont.variable} ${capsFont.variable} ${flatheadDisplay.variable} ${flatheadBody.variable}`}>
      <head>
        {/* Sets html.riv before the first paint, so the Riviera type never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: rivieraHeadScript() }} />
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
      {/* Ground and ink come from the base rule in globals.css, not utilities here:
          a utility would out-rank the admin and portal rule that keeps their
          old ink ground and white type. */}
      <body className="selection:bg-[#f5b700] selection:text-[#0b3b44]">
        <RivieraScope />
        <div className="relative z-30">
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-[#f5b700] focus:text-[#0b3b44] focus:px-5 focus:py-3">Skip to content</a>
          <HideOnAppShell alsoOn={['/']}><Navbar /></HideOnAppShell>
          <main id="main-content" tabIndex={-1}>{children}</main>
          <HideOnAppShell alsoOn={['/']}>
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
        <HouseBeacon />
        <RefCapture />
        <AnalyticsScripts />
        <CookieConsent />
        <HideOnAppShell>
          <InquiryPopup />
        </HideOnAppShell>
        <Analytics />
        <SpeedInsights />
        <noscript>
          <p style={{ padding: '2rem', textAlign: 'center', color: '#0b3b44' }}>
            {SITE.name}. {SITE.description} Visit{' '}
            <a href={SITE.url} style={{ color: '#0a7c78' }}>
              {SITE.url}
            </a>{' '}
            for more.
          </p>
        </noscript>
      </body>
    </html>
  );
}
