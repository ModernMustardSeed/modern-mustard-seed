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
          <p className="text-white/40 text-sm font-mono mb-12">Last updated: 2026-07-20</p>

          <div className="mdx-prose space-y-5">
            <h2>Information we collect</h2>
            <p>
              We collect information you provide directly: name, email, and message content when you fill out the contact form, subscribe to our newsletter, or run an AI audit. We collect anonymous analytics via Vercel Analytics (no personally identifying information).
            </p>
            <h2>How we use it</h2>
            <p>
              To respond to your inquiry, send the newsletters you subscribed to, and improve the site. We do not sell your data, ever. We do not share your contact information with third parties except as needed to deliver our services (e.g. Resend for email delivery).
            </p>
            <h2>Text messaging (SMS) and your mobile information</h2>
            <p>
              If you give us your mobile number, on our website, on a form, in person, or in the course of working together, you are agreeing to let us text you at that number about the service you asked about. Consent to receive texts is never a condition of any purchase. We never buy, rent, or sell phone numbers.
            </p>
            <p>
              <strong>No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.</strong> Sharing with subcontractors who provide support services, such as our messaging provider Twilio, is permitted solely so the message can be delivered. All other categories exclude text messaging originator opt-in data and consent, and this information will not be shared with any third parties.
            </p>
            <p>
              You can stop the messages at any time by replying STOP to any text from us, and you can reply HELP for help. We keep a record of numbers that have opted out so we do not text them again. Message and data rates may apply, and message frequency varies. Full messaging terms are in our{' '}
              <a href="/terms">Terms of Service</a>.
            </p>
            <h2>Cookies and tracking</h2>
            <p>
              <strong>Essential cookies</strong> keep the site working: a session cookie when you sign in to a portal, and a first-party referral cookie if you arrive through a partner link. These are always on because the site cannot function without them.
            </p>
            <p>
              <strong>Analytics and advertising cookies stay off until you accept them.</strong> We use Vercel Analytics, which is cookieless and anonymous. If you choose Accept all, we may also use Google Analytics, Google Ads, and the Meta Pixel to measure what works and improve our advertising. You can change your mind anytime through the &ldquo;Cookie preferences&rdquo; link in the footer.
            </p>
            <h2>Your choices, including Do Not Sell or Share</h2>
            <p>
              You can accept or decline non-essential cookies at any time. Declining keeps all analytics and advertising trackers off. If you are covered by privacy laws such as the EU/UK GDPR or the California CPRA, choosing &ldquo;Essential only&rdquo; in the cookie banner is also how you opt out of any sale or sharing of personal information for targeted advertising. You can also email us to make the request directly.
            </p>
            <h2>Bottleneck Breaker (AI audit) data</h2>
            <p>
              When you run the Bottleneck Breaker, the URL you submit is sent to Anthropic&rsquo;s Claude API for analysis and the result is returned to you. The URL and the details you provide may be logged so Sarah can follow up with you about it. You can ask us to delete this at any time.
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
