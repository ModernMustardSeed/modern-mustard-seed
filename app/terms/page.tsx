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
          <h1 className="font-sans text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2">
            Terms of <span className="text-gradient-mustard">Service</span>
          </h1>
          <p className="text-white/40 text-sm font-mono mb-12">Last updated: 2026-05-07</p>

          <div className="mdx-prose space-y-5">
            <h2>Acceptance of terms</h2>
            <p>
              By using modernmustardseed.com or engaging Modern Mustard Seed for services, you agree to these terms.
            </p>
            <h2>Services</h2>
            <p>
              We provide AI products, voice agents, full-stack development, business automation, brand strategy, and creative technology services. Each engagement is governed by a separate written scope and fee agreement.
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
