import StaticBackground from '@/components/StaticBackground';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Terms of Service',
  description: 'Terms governing use of Modern Mustard Seed and our services.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <>
      <StaticBackground />
      <div className="relative pt-36 md:pt-44 pb-28">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <h1 className="font-sans text-4xl md:text-5xl font-semibold text-white tracking-tight mb-2">
            Terms of <span className="text-gradient-mustard">Service</span>
          </h1>
          <p className="text-white/40 text-sm font-mono mb-12">Last updated: 2026-07-20</p>

          <div className="mdx-prose space-y-5">
            <h2>Acceptance of terms</h2>
            <p>
              By using modernmustardseed.com or engaging Modern Mustard Seed for services, you agree to these terms.
            </p>
            <h2>Services</h2>
            <p>
              We provide AI products, voice agents, full-stack development, business automation, brand strategy, and creative technology services. Each engagement is governed by a separate written scope and fee agreement.
            </p>
            <h2>Text messaging (SMS) terms</h2>
            <p>
              <strong>Program description.</strong> Modern Mustard Seed sends text messages to people who give us their mobile number and ask to hear from us, for example by entering it in the &ldquo;Text me back&rdquo; form on this site. Messages are one to one conversations about the AI receptionist, website, automation, and related services you asked about, and may include a link to the demo, audit, or proposal you requested.
            </p>
            <p>
              <strong>How you opt in.</strong> You opt in by submitting your own mobile number through a form on modernmustardseed.com, or by giving it to us directly and asking us to text you. Consent to receive text messages is not a condition of any purchase. We do not buy, rent, or sell phone numbers, and we do not text numbers that did not ask to hear from us.
            </p>
            <p>
              <strong>Message frequency.</strong> Message frequency varies and depends on the conversation you are having with us. In most cases this is a handful of messages, not a recurring blast.
            </p>
            <p>
              <strong>Cost.</strong> Message and data rates may apply. Modern Mustard Seed does not charge you for the messages, but your mobile carrier may.
            </p>
            <p>
              <strong>How to stop.</strong> Reply <strong>STOP</strong> to any message to opt out. You will get one confirmation that you have been unsubscribed, and we will not text that number again. Reply <strong>HELP</strong> for help, or contact us at{' '}
              <a href="mailto:sarah@modernmustardseed.com">sarah@modernmustardseed.com</a> or (406) 312-1223.
            </p>
            <p>
              <strong>Carriers.</strong> Mobile carriers are not liable for delayed or undelivered messages. Delivery is best effort and depends on your carrier and device.
            </p>
            <p>
              <strong>Privacy.</strong> No mobile information is shared with third parties or affiliates for marketing or promotional purposes. See our{' '}
              <a href="/privacy">Privacy Policy</a> for how we handle your data.
            </p>
            <h2>Intellectual property</h2>
            <p>
              On final payment, all custom-built code and assets are transferred to the client. We retain rights to our internal frameworks, libraries, and methodologies.
            </p>
            <h2>Payment</h2>
            <p>
              Fees and timelines are defined per engagement. Audit and Voice Agent packages are typically paid in full up front. Custom Builds may be split into milestones. Late payments past 30 days suspend active work.
            </p>
            <h2>Refunds</h2>
            <p>
              Audit deliverables include a 7-day satisfaction guarantee. Build packages refund any unworked milestone if we part ways early. No refunds on completed and delivered work.
            </p>
            <h2>Limitation of liability</h2>
            <p>
              Services are provided as-is. Our liability is limited to the fees paid for the specific engagement.
            </p>
            <h2>Governing law</h2>
            <p>
              Montana law, US.
            </p>
            <h2>Contact</h2>
            <p>
              Questions: sarah@modernmustardseed.com.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
