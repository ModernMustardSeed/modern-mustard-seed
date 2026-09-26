import { buildMetadata } from '@/lib/seo';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

/**
 * /super-nomad/privacy. The privacy policy the App Store listing links to.
 * The source of truth is docs/privacy-policy.md in the super-nomad repo; keep
 * the two in step and bump the date in both when either changes.
 */

export const metadata = buildMetadata({
  title: 'Super Nomad Privacy Policy',
  description: 'What the Super Nomad app does and does not do with your data. It runs on your phone, with no accounts, analytics, or tracking.',
  path: '/super-nomad/privacy',
});

export default function SuperNomadPrivacyPage() {
  return (
    <>
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] overflow-x-clip">
        <PopPageHero
          eyebrow={
            <div className="flex flex-wrap gap-3">
              <span className={pop.pill}>Super Nomad</span>
              <span className={pop.pill}>Effective 2026-09-04</span>
            </div>
          }
          title={<>Privacy <em>Policy</em></>}
          art={{
            src: '/art/pages/legal',
            alt: 'Pop-art screenprint: an open ledger, a brass padlock and key, a document sealed with red wax and a fountain pen on a desk',
          }}
          mascot
        />
      <div className="relative pt-14 md:pt-20 pb-28">
        <div className="relative max-w-3xl mx-auto px-6 md:px-8">

          <div className="mdx-prose mdx-prose-pop pop-card-cream p-6 md:p-10 space-y-5 [&>h2:first-child]:mt-0">
            <h2>The short version</h2>
            <p>
              Super Nomad runs on your phone. It does not have accounts, analytics, advertising, or tracking. The app does not know who you are and does not want to.
            </p>

            <h2>What leaves your phone</h2>
            <p>
              <strong>Weather requests.</strong> To show live weather, the app sends the latitude and longitude of your home base and of the places you save to Open-Meteo (open-meteo.com), a weather data provider in Germany. No name, no email, no device identifier travels with the coordinates. Open-Meteo&rsquo;s privacy policy governs what they log.
            </p>
            <p>
              <strong>Space weather.</strong> The app fetches a public forecast file from the United States National Oceanic and Atmospheric Administration. Nothing about you is sent with that request.
            </p>
            <p>
              <strong>Geocoding.</strong> When you type a home town during setup, the name you type is sent to Open-Meteo&rsquo;s geocoding service to find its coordinates.
            </p>
            <p>
              <strong>Optional backup.</strong> If you choose to sign in on the Settings screen, the app stores a single copy of your Nomad DNA, saved places, stays, windows and paths with Supabase, tied to the email address you verify with a six digit code. You can pull that copy to a new phone, push a new one, or delete it by signing out and erasing. Nobody at Modern Mustard Seed reads it. Backup is off unless you turn it on.
            </p>
            <p>
              <strong>Purchases.</strong> The Everywhere subscription is handled by Apple and by RevenueCat, which confirms the subscription is active. RevenueCat receives an anonymous app user id, never your email, unless you have also signed in for backup, in which case the same anonymous id is used so a restore works across devices.
            </p>
            <p>
              <strong>Window codes.</strong> A window code you make contains a place, two dates, your chosen precision, and optionally a first name. It goes only where you send it.
            </p>

            <h2>What never leaves your phone</h2>
            <p>
              Your Nomad DNA, your saved places, your stays and ratings, your missions, your memory statements, your scout history, and every score the app computes. If you never sign in for backup, none of it is stored anywhere but your device.
            </p>

            <h2>Location</h2>
            <p>
              The app does not use your phone&rsquo;s location services. Your home base is whatever you type. If a future version asks for location, it will ask once, explain why, and work fully if you say no.
            </p>

            <h2>Children</h2>
            <p>Super Nomad is rated 4+ and collects no personal data from anyone.</p>

            <h2>Changes</h2>
            <p>
              If this policy changes, the date at the top changes and the app&rsquo;s Settings screen links to the current version.
            </p>

            <h2>Contact</h2>
            <p>
              Modern Mustard Seed, <a href="mailto:sarah@modernmustardseed.com">sarah@modernmustardseed.com</a>.
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
