import StaticBackground from '@/components/StaticBackground';
import { buildMetadata } from '@/lib/seo';

/**
 * /super-nomad/terms. The terms the App Store listing links to. Source of
 * truth is docs/terms.md in the super-nomad repo; keep them in step.
 */

export const metadata = buildMetadata({
  title: 'Super Nomad Terms of Use',
  description: 'Terms for the Super Nomad app: what it is, what it is not, the Everywhere subscription, and your data.',
  path: '/super-nomad/terms',
});

export default function SuperNomadTermsPage() {
  return (
    <>
      <StaticBackground />
      <div className="relative pt-36 md:pt-44 pb-28">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <p className="text-mustard text-xs font-mono uppercase tracking-[0.2em] mb-4">Super Nomad</p>
          <h1 className="font-sans text-4xl md:text-5xl font-semibold text-white tracking-tight mb-2">
            Terms of <span className="text-gradient-mustard">Use</span>
          </h1>
          <p className="text-white/40 text-sm font-mono mb-12">Effective 2026-09-04</p>

          <div className="mdx-prose space-y-5">
            <h2>What the app is</h2>
            <p>
              Super Nomad is a decision tool. It ranks places against the preferences you enter, using measured climate, live weather, published stay rules and editorial estimates. It is made by Modern Mustard Seed, Whitefish, Montana.
            </p>

            <h2>What the app is not</h2>
            <p>
              It is not legal, immigration, medical, financial or safety advice. Stay rules are reference data with the government source linked on every card; the source is the authority and rules change. Costs are estimates for one person living mid-range, dated on the screen. Signals such as safety and internet are editorial. Nothing in the app books, reserves or purchases travel, and no fare is ever estimated. Check every fact that matters with the authority that owns it before you commit money or cross a border.
            </p>

            <h2>Your data</h2>
            <p>
              Your data lives on your phone and is yours. Export hands you a file you own. The <a href="/super-nomad/privacy">privacy policy</a> describes the few things that leave the device and why.
            </p>

            <h2>Everywhere subscription</h2>
            <p>
              Everywhere is an auto-renewing subscription billed through your Apple ID, monthly or yearly, with prices shown in the app before purchase. The yearly plan includes a seven day free trial that converts to a paid subscription unless cancelled at least 24 hours before it ends. Manage or cancel in your Apple ID settings. Refunds are handled by Apple under Apple&rsquo;s policies.
            </p>

            <h2>Acceptable use</h2>
            <p>
              Do not reverse engineer, resell, or scrape the app or its data. Do not use window codes to share another person&rsquo;s location without their consent.
            </p>

            <h2>Warranty and liability</h2>
            <p>
              The app is provided as is. To the extent the law allows, Modern Mustard Seed is not liable for decisions made using it, including decisions about where to live, travel, work, or spend.
            </p>

            <h2>Changes</h2>
            <p>
              If these terms change, the date at the top changes and the app&rsquo;s Settings screen links to the current version.
            </p>

            <h2>Contact</h2>
            <p>
              Modern Mustard Seed, <a href="mailto:sarah@modernmustardseed.com">sarah@modernmustardseed.com</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
