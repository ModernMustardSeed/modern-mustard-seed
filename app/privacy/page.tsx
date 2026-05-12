import StaticBackground from '@/components/StaticBackground';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'How Modern Mustard Seed collects, uses, and protects your data.',
  path: '/privacy',
  noindex: false,
});

export default function PrivacyPage() {
  return (
    <>
      <StaticBackground />
      <div className="relative pt-36 md:pt-44 pb-28">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <h1 className="font-sans text-4xl md:text-5xl font-semibold text-white tracking-tight mb-2">
            Privacy <span className="text-gradient-mustard">Policy</span>
          </h1>
          <p className="text-white/40 text-sm font-mono mb-12">Last updated: 2026-05-07</p>

          <div className="mdx-prose space-y-5">
            <h2>Information we collect</h2>
            <p>
              We collect information you provide directly: name, email, and message content when you fill out the contact form, subscribe to our newsletter, or run an AI audit. We collect anonymous analytics via Vercel Analytics (no personally identifying information).
            </p>
            <h2>How we use it</h2>
            <p>
              To respond to your inquiry, send the newsletters you subscribed to, and improve the site. We do not sell your data, ever. We do not share your contact information with third parties except as needed to deliver our services (e.g. Resend for email delivery).
            </p>
            <h2>Cookies</h2>
            <p>
              We use first-party analytics cookies through Vercel. No third-party advertising trackers.
            </p>
            <h2>AI audit data</h2>
            <p>
              When you run an AI audit, the URL you submit is sent to Anthropic&rsquo;s Claude API for analysis. The audit result is returned to you and not stored on our servers.
            </p>
            <h2>Your rights</h2>
            <p>
              You can request access to, correction of, or deletion of your data at any time by emailing{' '}
              <a href="mailto:sarah@modernmustardseed.com">sarah@modernmustardseed.com</a>.
            </p>
            <h2>Contact</h2>
            <p>
              Questions about this policy: sarah@modernmustardseed.com.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
