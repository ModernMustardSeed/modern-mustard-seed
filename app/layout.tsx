import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { JsonLd, orgJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = buildMetadata();

export const viewport: Viewport = {
  themeColor: '#C8A415',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300..600;1,9..40,300..500&family=JetBrains+Mono:wght@400;500;700&family=Manrope:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <JsonLd data={orgJsonLd} />
      </head>
      <body className="bg-[#0a0804] text-white selection:bg-mustard-500/30 selection:text-white">
        <div className="relative z-30">
          <Navbar />
          <main>{children}</main>
          <Footer />
        </div>
        <Analytics />
        <noscript>
          <p style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
            {SITE.name}. {SITE.description} Visit{' '}
            <a href={SITE.url} style={{ color: '#C8A415' }}>
              {SITE.url}
            </a>{' '}
            for more.
          </p>
        </noscript>
      </body>
    </html>
  );
}
