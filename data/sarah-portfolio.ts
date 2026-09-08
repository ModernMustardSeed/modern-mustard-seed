/**
 * Sarah's portfolio, as hung at sarahscarano.com. One source: that site's
 * data/projects.json, mirrored here on 2026-09-08 so /sarahscarano renders the
 * same twenty-five works inside the studio's own grammar. Images are served
 * from sarahscarano.com (images/web/project-<k>-960.jpg); the gallery repo is
 * the record. When a work is added or comes down over there, mirror it here.
 */

export type PortfolioWork = {
  /** Short key. Also the image slug on sarahscarano.com. */
  k: string;
  wing: string;
  /** A wing-level note the gallery prints after the wing name (featured, forthcoming). */
  tag: string | null;
  title: string;
  year: string;
  medium: string;
  blurb: string;
  /** Where the work lives. Null for a piece with no web home (a print). */
  url: string | null;
  cta: string;
  /** A film: the card plays it inline with the project image as its poster. */
  video: string | null;
  /** Width over height of the project image. */
  ratio: number;
};

export const PORTFOLIO_IMAGE_BASE = 'https://sarahscarano.com/images/web';

export function workImage(k: string): string {
  return `${PORTFOLIO_IMAGE_BASE}/project-${k}-960.jpg`;
}

/** Wings in the order the gallery hangs them. */
export const PORTFOLIO_WINGS: string[] = ["The Studio","The Flathead Wing","The Bindery","The System","The Voice Wing","Design & Commerce","Media & Campaigns","Commissions","The Store Room","Light & Wonder","New Works","Works on Paper"];

export const PORTFOLIO_WORKS: PortfolioWork[] = [
  {k: "mms", wing: "The Studio", tag: null, title: "Modern Mustard Seed", year: "2025 to 2026", medium: "Next.js, Supabase, Claude, Vapi · one artist, seventeen agents", blurb: "An AI product studio for operators, built alone and run by agents. The studio is its own first client: 9,730 leads found, 150 demo sites built, nine paying clients, zero ad dollars.", url: "https://modernmustardseed.com", cta: "View the work", video: null, ratio: 1.28},
  {k: "sky", wing: "The Flathead Wing", tag: "featured", title: "Window Seat", year: "2026", medium: "a live sunset, every day", blurb: "There is always a window open somewhere. The light after the sun is already gone: live cameras around the earth, a camera registry, and a computed print side.", url: "https://alpenglow-opal.vercel.app/", cta: "Take a seat", video: null, ratio: 1.28},
  {k: "eo", wing: "The Bindery", tag: "forthcoming", title: "Eternal Optimist", year: "2026", medium: "a book: walking on sunshine", blurb: "Ten percent of a life is what happens to you. The other ninety is what you do in the hours after. Sixteen chapters, an audiobook, and eight picture books built on one sentence: the hard part takes a second. Hardcover, November 22, 2026.", url: "https://sarahscarano.com/eternal-optimist", cta: "Preorder the book", video: null, ratio: 1.28},
  {k: "cove", wing: "The System", tag: null, title: "The Cove", year: "2026", medium: "a seventeen-agent back office · the demo floor", blurb: "The Cove, shown as Seedside in the public demo, is a seventeen-agent workspace for research, writing, files, and business operations. The demo uses sample data and lets visitors explore the office and agent views.", url: "https://seedside.modernmustardseed.com/demo", cta: "Walk the office", video: null, ratio: 1.28},
  {k: "voice", wing: "The Voice Wing", tag: null, title: "Mr. Mustard", year: "2026", medium: "voice on Vapi and ElevenLabs · participatory", blurb: "Mr. Mustard connects spoken requests to actions: initiating website and software build workflows, taking restaurant orders, sending information, booking visits, and transferring callers. We build voice agents around the workflows of small businesses.", url: "tel:+14063121223", cta: "Lift the receiver · (406) 312-1223", video: null, ratio: 1},
  {k: "system", wing: "The System", tag: null, title: "The System", year: "2026", medium: "the whole ecosystem, one running loop", blurb: "Lead finder, governor, drips, voice follow-up, the Build, delivery. 2,503 emails sent, every one through a gate that halts the day after two bounces in twenty-five.", url: "https://modernmustardseed.com/the-system", cta: "View the work", video: null, ratio: 1.28},
  {k: "cxc", wing: "Design & Commerce", tag: null, title: "Cross + Covenant", year: "2025 to 2026", medium: "headless Shopify on Next.js", blurb: "A faith apparel brand with its own software: whole collections go from idea to live in a morning through an art-to-print pipeline, and campaigns, drops and a free daily devotional ship from the brand’s own studio.", url: "https://crossandcovenant.co", cta: "View the work", video: null, ratio: 1.28},
  {k: "bare", wing: "The Flathead Wing", tag: null, title: "Bare Earth", year: "2026", medium: "grounds worthy of the valley", blurb: "Landscape, design and construction for the Flathead Valley’s finest properties.", url: "https://bare-earth.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "ss", wing: "Design & Commerce", tag: null, title: "UGC Studio Secret", year: "2026", medium: "an AI UGC studio", blurb: "Content that sells, manufactured: scripts, takes and cuts from one brief.", url: "https://studio-secret.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "commercial", wing: "Media & Campaigns", tag: null, title: "After Hours", year: "2026", medium: "thirty-second broadcast spot · written, voiced and cut in-house", blurb: "One from the ad bank: twenty broadcast-ready commercials in three aspect ratios, scripted, voiced, scored and edited by the studio’s own pipeline.", url: "https://modernmustardseed.com/ads/after-hours-16x9.mp4", cta: "Watch the cut", video: "https://modernmustardseed.com/ads/after-hours-16x9.mp4", ratio: 1.28},
  {k: "week", wing: "Media & Campaigns", tag: null, title: "One Desk, One Week", year: "2026", medium: "a week at the desk, two copilots", blurb: "What the work actually looks like: Claude and Codex on either side of one desk in Montana, from the plan in the morning to the thing shipped before the light goes. This is how twenty-odd products got built without a team.", url: "https://sarahscarano.com/media/a-week-16x9.mp4", cta: "Watch the week", video: "https://sarahscarano.com/media/a-week-16x9.mp4", ratio: 1.28},
  {k: "prompter", wing: "Media & Campaigns", tag: null, title: "The Prompter", year: "2026", medium: "the studio floor, live at /sarah", blurb: "The whole studio in one room: twenty-six episodes, thirty shorts, nineteen commercials and a sales desk, written in-house, read off a teleprompter I built as a web app, every take sent to Claude for the edit.", url: "https://modernmustardseed.com/sarah", cta: "Step into the booth", video: null, ratio: 1.28},
  {k: "adforge", wing: "Media & Campaigns", tag: null, title: "AdForge Studio", year: "2026", medium: "AI commercial production", blurb: "From a single URL to a broadcast-ready script, storyboard and creative strategy. The commercial factory.", url: "https://adforge-studio.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "ytstudio", wing: "Media & Campaigns", tag: null, title: "The Velvet Ledger", year: "2026", medium: "the YouTube studio · members only", blurb: "The publish loop lives behind a knock: record, edit, thumbnail, metadata, publish, on schedule.", url: "https://mms-youtube-studio.vercel.app", cta: "Knock", video: null, ratio: 1.28},
  {k: "dd", wing: "Commissions", tag: null, title: "D&D Landscaping", year: "2026", medium: "client commission", blurb: "A commissioned site, live on the client’s own domain.", url: "https://ddlandscaping.pro", cta: "View the work", video: null, ratio: 1.28},
  {k: "wh", wing: "Commissions", tag: null, title: "Wild Horse Construction", year: "2026", medium: "client commission · 22 pages and a voice agent", blurb: "Twenty-two pages with a front-desk voice agent answering the phone.", url: "https://wild-horse-construction.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "huck", wing: "The Store Room", tag: null, title: "Huckwild", year: "2026", medium: "huckleberry goods", blurb: "A storefront conjured whole by the Build pipeline: brand, pages, checkout.", url: "https://huckwild.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "wildmere", wing: "The Store Room", tag: null, title: "Wildmere Honey Co.", year: "2026", medium: "raw Montana honey", blurb: "A storefront conjured whole by the Build pipeline: brand, pages, checkout.", url: "https://wildmere.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "prayer", wing: "The Store Room", tag: null, title: "Prayerhouse Coffee", year: "2026", medium: "saving old churches with coffee", blurb: "A storefront conjured whole by the Build pipeline: brand, pages, checkout.", url: "https://prayerhouse-coffee.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "hall", wing: "The Store Room", tag: null, title: "Hallelujah House", year: "2026", medium: "prayer and all-day breakfast, Bigfork", blurb: "A storefront conjured whole by the Build pipeline: brand, pages, checkout.", url: "https://hallelujah-house.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "lux", wing: "Light & Wonder", tag: null, title: "Fiat Lux Design", year: "2026", medium: "let there be light · one of 150 from the Build", blurb: "A finished multi-page site produced by the studio’s own machine.", url: "https://fiatluxdesign.co", cta: "View the work", video: null, ratio: 1.28},
  {k: "lumen", wing: "Light & Wonder", tag: null, title: "LUMEN", year: "2026", medium: "an atlas of the living interior", blurb: "The body, drawn as a place you can visit.", url: "https://lumen-gamma-liart.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "mir", wing: "Light & Wonder", tag: null, title: "Miracle Witness Network", year: "2026", medium: "good news, gathered every hour", blurb: "The world’s good news, gathered every hour by an AI news bureau.", url: "https://miracle-witness-network.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "irl", wing: "New Works", tag: null, title: "IRL", year: "2026", medium: "stop scrolling, start showing up", blurb: "A push away from the feed and back into the world: plans, people, presence.", url: "https://irl-delta.vercel.app", cta: "View the work", video: null, ratio: 1.28},
  {k: "lake", wing: "Works on Paper", tag: null, title: "Flathead, Morning", year: "2026", medium: "two-ink risograph", blurb: "Cold water first. Then the build.", url: null, cta: "View the work", video: null, ratio: 1.6},
];
