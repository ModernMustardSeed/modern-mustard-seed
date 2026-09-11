/**
 * The studio map that powers /services: every live department (a productized
 * department of the studio) plus the goal router that sends a
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
 * opening date instead of a build.
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
  { key: 'websites', name: 'Websites', tag: 'Design-led, built to be found', blurb: 'A site that captures the lead and follows up on its own. Not a brochure, an engine.', href: '/websites', icon: '🌐', flagship: true },
  // Build parked 2026-08-12 (Sarah); this row points at /voice-agents now. See Navbar.tsx.
  { key: 'demo-agent', name: 'Voice Agents', tag: 'It answers, it books, it texts you', blurb: 'Answers your calls 24/7 in a natural voice, books the job, texts you the details.', href: '/voice-agents', icon: '🎙', flagship: true },
  { key: 'command-center', name: 'Command Center', tag: 'The AI back office', blurb: 'One board: calls transcribed, website traffic, customers, reviews, and money, wired together.', href: '/command-center', icon: '⚙', flagship: true },
  { key: 'brand', name: 'Brand / Rebrand', tag: 'A new mark on every surface', blurb: 'Logo, look, mascot, site, voice agent, and the plan behind it. Designed once, live on every surface in three weeks.', href: '/brand', icon: '🎨' },
  { key: 'chief', name: 'The Chief', tag: 'Your AI chief of staff', blurb: 'Mr. Mustard runs your day: calendar, email, calls, research, and sales coaching, in voice, text, and chat.', href: '/chief', icon: '🧑‍✈️' },
  { key: 'ads', name: 'Mustard Broadcast', tag: 'We run your ads', blurb: 'We make the cinematic commercial and run the Meta and Google ads in your own account.', href: '/ads', icon: '📺' },
  { key: 'pictures', name: 'Mustard Pictures', tag: 'Commercials and brand films', blurb: 'Your business as a real cinematic commercial, directed in house.', href: '/pictures', icon: '🎬' },
  { key: 'launch-film', name: 'The Launch Film', tag: 'Cut from your real product', blurb: 'A launch film for your app or product, built from the real screens, scored from scratch, finished in three formats.', href: '/launch-film', icon: '🎞' },
  { key: 'ai-native', name: 'AI Native', tag: 'Your company on AI', blurb: 'Every workflow mapped, the first five moved onto AI in accounts you own, and your team coached to run it. Eight weeks.', href: '/ai-native', icon: '🧭' },
  { key: 'geo', name: 'GEO Desk', tag: 'Found and cited by AI search', blurb: 'Get found and cited by ChatGPT, Perplexity, and Google AI. Graded, then fixed.', href: '/website-audit', icon: '🔎' },
  { key: 'launch', name: 'Mustard Launch', tag: 'Your AI launch coach', blurb: 'A personalized launch plan for a new business, then a coach that ships it with you.', href: '/mustard-launch', icon: '🚀' },
  { key: 'switchboard', name: 'The Switchboard', tag: 'Multi-location concierge', blurb: 'An always-on AI concierge line for multi-location and franchise operators.', href: '/switchboard', icon: '☎️' },
  { key: 'mode', name: 'Mustard Mode', tag: 'Learn with a coach', blurb: 'Learn to run Claude like the studio does. A live AI coach across four tracks.', href: '/mustard-mode', icon: '🎓' },
  // Celebrate re-parked 2026-08-20 (Sarah): see the note in Navbar.tsx.
];

export const deptByKey = Object.fromEntries(DEPARTMENTS.map((d) => [d.key, d]));

export type Goal = { label: string; emoji: string; deptKeys: string[]; note: string };

/** The goal router. Each goal surfaces the right doors. */
export const GOALS: Goal[] = [
  { label: 'Get more customers', emoji: '📈', deptKeys: ['ads', 'websites', 'geo'], note: 'A site that converts, ads that run in your account, and findability on Google and AI search.' },
  { label: 'Stop missing calls', emoji: '📞', deptKeys: ['demo-agent', 'switchboard'], note: 'A voice agent answering day or night, on the number you already have. Multi-location? The Switchboard.' },
  { label: 'Run the whole business', emoji: '🧭', deptKeys: ['command-center', 'demo-agent', 'websites'], note: 'One command center wired to your calls, your site, and your customers.' },
  { label: 'Get my hours back', emoji: '⏳', deptKeys: ['chief', 'command-center'], note: 'An AI chief of staff who runs your calendar, email, and follow-up, with the back office behind it.' },
  { label: 'Look professional online', emoji: '✨', deptKeys: ['brand', 'websites', 'pictures'], note: 'A brand designed once, then a website and a commercial that wear it.' },
  { label: 'Get found by AI & Google', emoji: '🔎', deptKeys: ['geo', 'websites'], note: 'Your findability graded honestly, then the signals installed that get you cited.' },
  { label: 'Launch something new', emoji: '🚀', deptKeys: ['launch', 'brand', 'websites', 'demo-agent'], note: 'A launch plan, then the site and the phone line to open the doors.' },
  { label: 'Sell products online', emoji: '🛍', deptKeys: ['websites'], note: 'A custom storefront designed around your catalog, scoped as its own engagement.' },
  { label: 'Learn to build it myself', emoji: '🎓', deptKeys: ['mode', 'launch'], note: 'A coach that teaches you to run Claude and build the thing yourself.' },
  { label: 'Put AI in my whole company', emoji: '🧭', deptKeys: ['ai-native', 'chief', 'demo-agent'], note: 'The workflows mapped and moved onto AI, your team coached to run it, and the front desk answered while they learn.' },
  // 'Keep my people happy' goal re-parked with Celebrate 2026-08-20 (Sarah):
  // the row existed to sell Celebrate, and pointing it at The Chief alone
  // would put a gifting pitch on a chief-of-staff door.
];

/** Bespoke work beyond the productized doors. Routes to a discovery call. */
export const BESPOKE = [
  { icon: '📱', name: 'Custom apps & software', desc: 'Web and mobile apps built end to end. Frontend, backend, auth, billing, deploy. Real products that scale.' },
  { icon: '🛠', name: 'Specialty AI tools', desc: 'An industry tool that replaces an expensive recurring workflow. The costliest repeated task in a trade becomes software the operator owns.' },
  { icon: '🏪', name: 'Online stores', desc: 'Headless commerce with custom design, an AI concierge, and funnels that convert from day one.' },
  { icon: '🤖', name: 'Agentic systems', desc: 'Multi-agent workflows and internal copilots that replace the human glue between your tools.' },
];
