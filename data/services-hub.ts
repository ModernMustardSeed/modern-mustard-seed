/**
 * The studio map that powers /services: every live department (a productized
 * door that opens with a free demo or tool) plus the goal router that sends a
 * visitor to the right one. Kept in one place so the grid and the PathFinder
 * never drift. Only LIVE, deployed department pages belong here.
 *
 * PARKED 2026-08-07 (Sarah): Mustard Press, Mustard Hatchery, and The Mustard
 * Tree are pulled from this map, so they leave the /services grid, the
 * PathFinder, and the studio lines the site chat quotes from. The pages still
 * answer at their URLs. Re-add the rows to bring the doors back.
 *
 * UNPARKED 2026-08-11 (Sarah): Celebrate is back, in waitlist form. It is the
 * one row here that is not open for business yet, so its tag carries the
 * opening date instead of a free demo.
 */

export type Dept = {
  key: string;
  name: string;
  tag: string;
  blurb: string;
  href: string;
  icon: string;
  /** Featured in the flagship trio at the top of the page. */
  flagship?: boolean;
};

export const DEPARTMENTS: Dept[] = [
  { key: 'websites', name: 'Websites', tag: 'Free website demo', blurb: 'A site that captures the lead and follows up on its own. Not a brochure, an engine.', href: '/websites', icon: '🌐', flagship: true },
  // Build parked 2026-08-12 (Sarah); this row points at /voice-agents now. See Navbar.tsx.
  { key: 'sidekick', name: 'Voice Agents', tag: 'Free voice agent demo', blurb: 'Answers your calls 24/7 in a natural voice, books the job, texts you the details.', href: '/voice-agents', icon: '🎙', flagship: true },
  { key: 'command-center', name: 'Command Center', tag: 'The AI back office', blurb: 'One board: calls transcribed, website traffic, customers, reviews, and money, wired together.', href: '/command-center', icon: '⚙', flagship: true },
  { key: 'chief', name: 'The Chief', tag: 'Your AI chief of staff', blurb: 'Mr. Mustard runs your day: calendar, email, calls, research, and sales coaching, in voice, text, and chat.', href: '/chief', icon: '🧑‍✈️' },
  { key: 'ads', name: 'Mustard Broadcast', tag: 'We run your ads', blurb: 'We make the cinematic commercial and run the Meta and Google ads in your own account.', href: '/ads', icon: '📺' },
  { key: 'pictures', name: 'Mustard Pictures', tag: 'Free screen test', blurb: 'Your business as a real cinematic commercial, directed by our AI. Preview yours free.', href: '/pictures', icon: '🎬' },
  { key: 'geo', name: 'GEO Desk', tag: 'Free findability grade', blurb: 'Get found and cited by ChatGPT, Perplexity, and Google AI. Graded, then fixed.', href: '/website-audit', icon: '🔎' },
  { key: 'launch', name: 'Mustard Launch', tag: 'Your AI launch coach', blurb: 'A free personalized launch plan for any new business, then a coach that ships it with you.', href: '/mustard-launch', icon: '🚀' },
  { key: 'switchboard', name: 'The Switchboard', tag: 'Franchise demo line', blurb: 'A 24/7 AI concierge line for multi-location and franchise operators. Call the live demo.', href: '/switchboard', icon: '☎️' },
  { key: 'mode', name: 'Mustard Mode', tag: 'Learn with a coach', blurb: 'Learn to run Claude like the studio does. A live AI coach, four tracks, first session free.', href: '/mustard-mode', icon: '🎓' },
  // Celebrate re-parked 2026-08-20 (Sarah): see the note in Navbar.tsx.
];

export const deptByKey = Object.fromEntries(DEPARTMENTS.map((d) => [d.key, d]));

export type Goal = { label: string; emoji: string; deptKeys: string[]; note: string };

/** The goal router. Each goal surfaces the right doors. */
export const GOALS: Goal[] = [
  { label: 'Get more customers', emoji: '📈', deptKeys: ['ads', 'websites', 'geo'], note: 'A site that converts, ads that run in your account, and findability on Google and AI search.' },
  { label: 'Stop missing calls', emoji: '📞', deptKeys: ['sidekick', 'switchboard'], note: 'A voice agent answering day or night, on the number you already have. Multi-location? The Switchboard.' },
  { label: 'Run the whole business', emoji: '🧭', deptKeys: ['command-center', 'sidekick', 'websites'], note: 'One command center wired to your calls, your site, and your customers.' },
  { label: 'Get my hours back', emoji: '⏳', deptKeys: ['chief', 'command-center'], note: 'An AI chief of staff who runs your calendar, email, and follow-up, with the back office behind it.' },
  { label: 'Look professional online', emoji: '✨', deptKeys: ['websites', 'pictures'], note: 'A real website and a cinematic commercial that match.' },
  { label: 'Get found by AI & Google', emoji: '🔎', deptKeys: ['geo', 'websites'], note: 'Grade your findability free, then install the signals that get you cited.' },
  { label: 'Launch something new', emoji: '🚀', deptKeys: ['launch', 'websites', 'sidekick'], note: 'A free launch plan, then the site and the phone line to open the doors.' },
  { label: 'Sell products online', emoji: '🛍', deptKeys: ['websites'], note: 'A custom storefront on the Full-Service Business Build. Start with a free demo.' },
  { label: 'Learn to build it myself', emoji: '🎓', deptKeys: ['mode', 'launch'], note: 'A coach that teaches you to run Claude and build the thing yourself.' },
  // 'Keep my people happy' goal re-parked with Celebrate 2026-08-20 (Sarah):
  // the row existed to sell Celebrate, and pointing it at The Chief alone
  // would put a gifting pitch on a chief-of-staff door.
];

/** Bespoke work beyond the productized doors. Routes to a discovery call. */
export const BESPOKE = [
  { icon: '📱', name: 'Custom apps & software', desc: 'Web and mobile apps built end to end. Frontend, backend, auth, billing, deploy. Real products that scale.' },
  { icon: '🛠', name: 'Specialty AI tools', desc: 'An industry tool that replaces an expensive workflow. The $3K service line item becomes the $99 subscription.' },
  { icon: '🏪', name: 'Online stores', desc: 'Headless commerce with custom design, an AI concierge, and funnels that convert from day one.' },
  { icon: '🤖', name: 'Agentic systems', desc: 'Multi-agent workflows and internal copilots that replace the human glue between your tools.' },
];
