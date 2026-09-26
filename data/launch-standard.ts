import type { GoliveGroup, GoliveItem, GoliveWho } from '@/lib/golive';

/**
 * THE STANDARD LAUNCH, FOR A CLIENT WITH NO GOOGLE BUSINESS PROFILE.
 *
 * Most of the people we build for are the second-business operator's opposite
 * number: a working tradesman with a Facebook page, a phone number, and nothing
 * else. For them the website is not the growth lever on its own. The Google
 * Business Profile is, and it is the one thing WE CANNOT DO FOR THEM: Google
 * verifies the person who owns the business, on video, holding their own tools.
 *
 * So every launch splits in two and both halves live in one runbook:
 *
 *   who: 'You' / 'Claude'   Sarah and the studio. Keys, deploys, indexing.
 *   who: 'Client'           The owner. The profile, the verification, the
 *                           photos, the reviews. Nobody else can do these.
 *
 * The portal shows a client THEIR half and the overall progress. The admin
 * runbook shows both. Neither is a separate document that can drift from the
 * other, which is the entire point of putting them in one list.
 *
 * Nothing here invents a step. Every item is something that has actually blocked
 * or unblocked a launch.
 */

export type LaunchFacts = {
  /** "Kyler's Lawn & Snow" */
  business: string;
  /** "Kalispell" */
  city: string;
  /** "MT" */
  state: string;
  /** "(406) 261-5296" */
  phone: string;
  /** The live site, no trailing slash. */
  siteUrl: string;
  /** Where the back office lives, if they got one. */
  officeUrl?: string | null;
  /** Google's primary category, exact as it appears in the picker. */
  primaryCategory: string;
  /** Extra categories, exact. */
  extraCategories?: string[];
  /** Towns for the service area, in the order they should be entered. */
  serviceAreas?: string[];
  /** True when the business has no storefront customers visit. */
  serviceAreaBusiness?: boolean;
};

const item = (
  id: string,
  who: GoliveWho,
  what: string,
  how?: string,
  href?: string,
  label?: string,
): GoliveItem => ({ id, who, what, ...(how ? { how } : {}), ...(href ? { href } : {}), ...(label ? { label } : {}) });

/**
 * GOOGLE BUSINESS PROFILE, STEP BY STEP.
 *
 * Written to survive Google moving its own buttons: every step names what it is
 * trying to achieve, not which tab it was on last month. Where a step has a
 * common failure, the failure is stated, because the profile is the single point
 * where a launch most often stalls for weeks with nobody noticing.
 */
function gbpGroup(f: LaunchFacts): GoliveGroup {
  const areas = f.serviceAreas?.length ? f.serviceAreas.join(', ') : `${f.city} and the surrounding towns`;
  const cats = [f.primaryCategory, ...(f.extraCategories ?? [])];

  return {
    name: '2 · The Google Business Profile',
    note:
      'The highest-leverage hour of the whole launch, and the one nobody else can do for you. ' +
      'Google verifies the owner, so these steps belong to the owner. Most local searches never ' +
      'reach a website: they end on the profile, on the phone button.',
    items: [
      item(
        'gbp-account',
        'Client',
        'Sign in to Google with the account the business will keep forever',
        'Use a Google account you will still control in five years, and not a personal one shared with ' +
          'family. Whoever holds this account holds the business on Google. If a past web guy or a ' +
          'relative set one up, get it back before creating a second one.',
        'https://accounts.google.com/signup',
        'accounts.google.com',
      ),
      item(
        'gbp-claim',
        'Client',
        `Search Google for "${f.business} ${f.city}" and claim the listing if one already exists`,
        'Google often creates a listing on its own from phone directories and map data. Creating a ' +
          'second one is the most common and most damaging mistake at this step: duplicates split ' +
          'your reviews and neither ranks. Claim first, create only if there is genuinely nothing.',
        'https://business.google.com',
        'business.google.com',
      ),
      item(
        'gbp-name',
        'Client',
        `Enter the name exactly: ${f.business}`,
        'Exactly as it is on the truck, the invoices and the website. Do not add keywords like ' +
          '"best" or the town name if they are not part of the real name. Google suspends profiles ' +
          'for keyword stuffing and getting reinstated takes weeks.',
      ),
      item(
        'gbp-category',
        'Client',
        `Set the primary category to "${f.primaryCategory}"` +
          (f.extraCategories?.length ? `, then add ${f.extraCategories.map((c) => `"${c}"`).join(' and ')}` : ''),
        'The primary category does most of the ranking work, so it has to be the thing you most want ' +
          `to be called for. The full list you are entering is: ${cats.join(', ')}. Additional ` +
          'categories help, but a wrong primary is the difference between showing up and not.',
      ),
      item(
        'gbp-area',
        'Client',
        f.serviceAreaBusiness === false
          ? 'Enter the street address customers visit'
          : 'Choose "I deliver goods and services to my customers" and hide the address',
        f.serviceAreaBusiness === false
          ? 'A location customers actually come to. If they do not come to you, do not enter it.'
          : 'You work at their property, not yours, so this is a service-area business. Publishing a ' +
            'home address on a service-area profile puts your home on Google Maps and does not help ' +
            `ranking. Then set the service areas: ${areas}.`,
      ),
      item(
        'gbp-contact',
        'Client',
        `Phone ${f.phone} and website ${f.siteUrl}`,
        'The same number that is on the website and the truck. A different number here is the ' +
          'fastest way to look like two businesses to Google, and it breaks the call tracking on the ' +
          'profile.',
      ),
      item(
        'gbp-hours',
        'Client',
        'Set hours you will actually answer',
        'Honest hours beat impressive ones: "open 24 hours" on a profile nobody answers at 11pm ' +
          'earns a one star review that outlives the mistake by years. If the seasons differ, set the ' +
          'current season and change it when it turns.',
      ),
      item(
        'gbp-verify',
        'Client',
        'Complete verification, usually a video',
        'For a service-area business Google almost always asks for an unedited video in one take. ' +
          'Have ready before you start: the truck or trailer with the name on it, the equipment ' +
          'running, a tool in your hand, and something that proves the location like a street sign or ' +
          'the front of the building. Film it in daylight, walk slowly, do not stop recording. ' +
          'Verification is the step most launches stall on; the video usually clears in a few days.',
        'https://support.google.com/business/answer/13463475',
        'Google’s video verification guide',
      ),
      item(
        'gbp-photos',
        'Client',
        'Add at least ten real photographs, and the logo',
        'Real work, not stock and nothing from the website. Profiles with photos get materially more ' +
          'calls than profiles without, and the customer is deciding between you and the other name ' +
          'on the screen on exactly this. Best ten: finished work, the truck, the equipment, and you.',
      ),
      item(
        'gbp-description',
        'Client',
        'Write the description and list the services',
        'Say what you do, where, and what makes you different, in plain words. List each service ' +
          'separately rather than as one paragraph: each one is a thing Google can match a search to.',
      ),
      item(
        'gbp-link',
        'Client',
        'Point the profile at the website, and add the booking link',
        `Website: ${f.siteUrl}. If the profile offers an appointment or booking link, use ` +
          `${f.siteUrl}/contact.html so the profile and the site take a request the same way.`,
      ),
      item(
        'gbp-review-link',
        'You',
        'Grab the short review link off the profile and put it where they will use it',
        'Google generates a short link that opens the review box directly. It belongs in the ' +
          'client’s phone, in their text signature and on the invoice, because a review asked for ' +
          'from the driveway is worth ten asked for by email a week later.',
      ),
      item(
        'gbp-first-reviews',
        'Client',
        'Ask five customers you already have',
        'The first five are the hardest and they matter more than the next fifty. Ask people whose ' +
          'work you just finished, in person, and send the link while you are standing there. Never ' +
          'offer anything in exchange: Google removes incentivised reviews and can suspend the profile.',
      ),
    ],
  };
}

/** The whole standard runbook for a business launching without a profile. */
export function standardLaunchGroups(f: LaunchFacts): GoliveGroup[] {
  const host = f.siteUrl.replace(/^https?:\/\//, '');

  return [
    {
      name: '1 · Before Anything Goes Public',
      note: 'Ours. None of it is visible to a customer and all of it breaks loudly if skipped.',
      items: [
        item('pre-env', 'Claude', 'Every environment variable the code needs, set in production',
          'The env example file is the list. Missing keys fail silently far more often than loudly, ' +
          'and a back office with no database quietly loses every request it takes.'),
        item('pre-store', 'You', 'A database the client’s data actually lives in',
          'Without it the office runs on an in-memory store and every request, property and visit ' +
          'disappears on the next deploy. The office says so in a red banner, which is the tell.'),
        item('pre-auth', 'Claude', 'The back office is behind a login, and it fails closed',
          'Customer names, phone numbers, home addresses and gate codes. With no credentials set it ' +
          'must return 503, not the data.'),
        item('pre-build', 'Claude', 'Clean production build, zero type errors'),
        item('pre-links', 'Claude', 'Every internal link and anchor resolves',
          'Walk them, do not eyeball them. A nav pointing at pages that were never built is how a ' +
          'site ships with a 404 on every menu item.'),
        item('pre-convert', 'Claude', 'Submit the contact or booking form for real, end to end',
          'All the way into whatever is supposed to receive it. A page that cannot take a lead is a ' +
          'poster.'),
        item('pre-mobile', 'Claude', 'Walked on a phone at 375px: no horizontal scroll, nothing overlapping',
          'Measured with real numbers at 375, 768 and 1440, not eyeballed at one width.'),
      ],
    },

    gbpGroup(f),

    {
      name: '3 · Getting Found',
      note: 'Ours. A new site with no inbound links can sit unindexed for weeks unless it is pushed.',
      items: [
        item('idx-sitemap', 'Claude', 'sitemap.xml, robots.txt and llms.txt live and correct',
          'Robots opens everything public, including the AI crawlers, and closes the back office and ' +
          'its API. Canonicals point at the host the pages are actually served from.'),
        item('idx-og', 'Claude', 'Social card in place, 1200x630, on every page',
          'Without it every share of the site in a text message or Messenger is a grey box. On a ' +
          'business that grows by word of mouth this is the most-seen image the site has.'),
        item('idx-gsc', 'You', 'Google Search Console: verify the property and submit the sitemap',
          'The only reliable way to tell Google a new site exists. Verify by DNS record if the ' +
          'domain is ours to edit, HTML file otherwise, then submit the sitemap URL once.',
          'https://search.google.com/search-console', 'search.google.com/search-console'),
        item('idx-bing', 'You', 'Bing Webmaster Tools: verify, or import straight from Search Console',
          'Import takes about a minute once Search Console is verified and covers Bing, DuckDuckGo ' +
          'and Copilot in one step.',
          'https://www.bing.com/webmasters', 'bing.com/webmasters'),
        item('idx-indexnow', 'Claude', 'Submit every URL to IndexNow',
          'One POST covers Bing, Yandex, Seznam and Naver. The key file has to be live on the domain ' +
          'first: IndexNow answers 200 to a submission whose key it cannot verify and then ignores ' +
          'every URL in it.'),
        item('idx-gbp-site', 'Claude', `Confirm ${host} is what the profile links to`,
          'The profile and the site have to agree on one address, or the link equity splits.'),
        item('idx-analytics', 'You', 'Pick analytics',
          'Vercel Analytics is the one-line default. Shipping with zero measurement means the first ' +
          'question in the first review call has no answer.'),
      ],
    },

    {
      name: '4 · The First Week',
      note: 'The client’s. Habits, not tasks: this is the part that decides whether any of it works.',
      items: [
        item('week-office', 'Client', 'Open the office once a day, morning and evening',
          f.officeUrl
            ? `${f.officeUrl} on the phone, saved to the home screen. Requests do not go anywhere ` +
              'else, so this list is the only place a new customer is waiting.'
            : 'Requests do not go anywhere else, so that list is the only place a new customer is ' +
              'waiting.'),
        item('week-answer', 'Client', 'Answer every request the same day',
          'The single biggest advantage a one-person operation has over a company is speed. Somebody ' +
          'who filled in a form at 8am and got a call back at 9 has stopped shopping.'),
        item('week-route', 'Client', 'Put the standing customers into the office',
          'Everyone already on a weekly or fortnightly schedule, with the day, the price and the ' +
          'things that cost an hour if you find them on the driveway: gate codes, dogs, where the ' +
          'sprinkler heads sit.'),
        item('week-facebook', 'Client', 'Put the website link on the Facebook page',
          'Facebook is where the existing customers already are and it is the fastest source of ' +
          'first traffic. Post the link once, plainly, with a photo of recent work.'),
        item('week-signature', 'Client', 'Put the website in the text signature and on the invoices',
          'Every quote you send is a chance for somebody to look you up and find something that ' +
          'looks like a real business.'),
      ],
    },

    {
      name: '5 · Handover',
      note: 'Ours, then theirs. A client who cannot get into their own things does not own them.',
      items: [
        item('hand-office', 'You', 'Give the client the office address and their login, in writing',
          'In a text they can find again, not only on a call.'),
        item('hand-manual', 'You', 'Send the owner’s manual',
          'One PDF covering the office screen by screen and the Google profile step by step.'),
        item('hand-walk', 'You', 'Walk the office with them once, on their phone',
          'Fifteen minutes on a call while they hold the phone. Watching somebody use it is the only ' +
          'way to find the thing that is obvious to us and invisible to them.'),
        item('hand-domain', 'You', 'The domain is registered in the client’s name',
          'Stewardship over extraction. If the domain is in our account, they do not own the asset.'),
        item('hand-review', 'You', 'Book the thirty day review',
          'Requests taken, calls from the profile, what ranked and what did not. Put it in the ' +
          'calendar at handover, not later.'),
      ],
    },
  ];
}

/**
 * Every step the client owns, flattened, for the portal and for their PDF.
 * They never see the studio's half; it would read as a bill of things they did
 * not ask for.
 */
export function clientItems(groups: GoliveGroup[]): { group: string; note?: string; items: GoliveItem[] }[] {
  return groups
    .map((g) => ({ group: g.name, note: g.note, items: g.items.filter((i) => i.who === 'Client') }))
    .filter((g) => g.items.length > 0);
}

/** Every step the studio owns. */
export function adminItems(groups: GoliveGroup[]): { group: string; note?: string; items: GoliveItem[] }[] {
  return groups
    .map((g) => ({ group: g.name, note: g.note, items: g.items.filter((i) => i.who !== 'Client') }))
    .filter((g) => g.items.length > 0);
}
