import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MagneticCursor from '@/components/MagneticCursor';
import MustardSeedChat from '@/components/MustardSeedChat';
import RefCapture from '@/components/RefCapture';
import AnalyticsScripts from '@/components/AnalyticsScripts';
import CookieConsent from '@/components/CookieConsent';
import Script from 'next/script';
import HideOnAppShell from '@/components/HideOnAppShell';
import { JsonLd, siteGraphJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = buildMetadata();

export const viewport: Viewport = {
  themeColor: '#C8964E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..500&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <JsonLd data={siteGraphJsonLd} />
        {/* Google Consent Mode v2: default everything non-essential to denied
            until the visitor accepts. Belt-and-suspenders with the hard gate. */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});`}
        </Script>
      </head>
      <body className="bg-[#080c16] text-white selection:bg-mustard-500/30 selection:text-white">
        <div className="relative z-30">
          <Navbar />
          <main>{children}</main>
          <HideOnAppShell>
            <Footer />
          </HideOnAppShell>
        </div>
        <MagneticCursor />
        <MustardSeedChat />
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
