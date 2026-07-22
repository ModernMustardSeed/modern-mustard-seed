/**
 * The studio map that powers /services: every live department (a productized
 * door that opens with a free demo or tool) plus the goal router that sends a
 * visitor to the right one. Kept in one place so the grid and the PathFinder
 * never drift. Only LIVE, deployed department pages belong here.
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
  { key: 'websites', name: 'Websites', tag: 'Free website demo', blurb: 'A site that answers the phone, captures the lead, and follows up. Not a brochure, an engine.', href: '/websites', icon: '🌐', flagship: true },
  { key: 'sidekick', name: 'AI Receptionist', tag: 'Free receptionist demo', blurb: 'Answers your real number 24/7 in a natural voice, books the job, texts you the details.', href: '/sidekick', icon: '🎙', flagship: true },
  { key: 'command-center', name: 'Command Center', tag: 'The AI back office', blurb: 'One board: calls transcribed, website traffic, customers, reviews, and money, wired together.', href: '/command-center', icon: '⚙', flagship: true },
  { key: 'ads', name: 'Mustard Broadcast', tag: 'We run your ads', blurb: 'We make the cinematic commercial and run the Meta and Google ads in your own account.', href: '/ads', icon: '📺' },
  { key: 'pictures', name: 'Mustard Pictures', tag: 'Free screen test', blurb: 'Your business as a real cinematic commercial, directed by our AI. Preview yours free.', href: '/pictures', icon: '🎬' },
  { key: 'press', name: 'Mustard Press', tag: 'Free typeset proof', blurb: 'Your menu, price list, or rate sheet typeset print-ready while you watch. Cards and flyers too.', href: '/press', icon: '🖨' },
  { key: 'geo', name: 'GEO Desk', tag: 'Free findability grade', blurb: 'Get found and cited by ChatGPT, Perplexity, and Google AI. Graded, then fixed.', href: '/website-audit', icon: '🔎' },
  { key: 'launch', name: 'Mustard Launch', tag: 'Your AI launch coach', blurb: 'A free personalized launch plan for any new business, then a coach that ships it with you.', href: '/mustard-launch', icon: '🚀' },
  { key: 'switchboard', name: 'The Switchboard', tag: 'Franchise demo line', blurb: 'A 24/7 AI concierge line for multi-location and franchise operators. Call the live demo.', href: '/switchboard', icon: '☎️' },
  { key: 'hatchery', name: 'Mustard Hatchery', tag: 'Free first glimpse', blurb: 'Your own branded AI mascot, born and given a voice. Meet the first glimpse free.', href: '/hatchery', icon: '🥚' },
  { key: 'mode', name: 'Mustard Mode', tag: 'Learn with a coach', blurb: 'Learn to run Claude like the studio does. A live AI coach, four tracks, first session free.', href: '/mustard-mode', icon: '🎓' },
  { key: 'celebrate', name: 'Celebrate', tag: 'Gifting on autopilot', blurb: 'Client and team gifting that runs itself, so the right people feel remembered on time.', href: '/celebrate', icon: '🎉' },
];

export const deptByKey = Object.fromEntries(DEPARTMENTS.map((d) => [d.key, d]));

export type Goal = { label: string; emoji: string; deptKeys: string[]; note: string };

/** The goal router. Each goal surfaces the right doors. */
export const GOALS: Goal[] = [
  { label: 'Get more customers', emoji: '📈', deptKeys: ['ads', 'websites', 'geo'], note: 'A site that converts, ads that run in your account, and findability on Google and AI search.' },
  { label: 'Stop missing calls', emoji: '📞', deptKeys: ['sidekick', 'switchboard'], note: 'An AI receptionist on your real number, day or night. Multi-location? The Switchboard.' },
  { label: 'Run the whole business', emoji: '🧭', deptKeys: ['command-center', 'sidekick', 'websites'], note: 'One command center wired to your calls, your site, and your customers.' },
  { label: 'Look professional online', emoji: '✨', deptKeys: ['websites', 'pictures', 'press'], note: 'A real website, a cinematic commercial, and print-ready collateral that match.' },
  { label: 'Get found by AI & Google', emoji: '🔎', deptKeys: ['geo', 'websites'], note: 'Grade your findability free, then install the signals that get you cited.' },
  { label: 'Launch something new', emoji: '🚀', deptKeys: ['launch', 'websites', 'sidekick'], note: 'A free launch plan, then the site and the phone line to open the doors.' },
  { label: 'Sell products online', emoji: '🛍', deptKeys: ['websites'], note: 'A custom storefront on the Full-Service Business Build. Start with a free demo.' },
  { label: 'Learn to build it myself', emoji: '🎓', deptKeys: ['mode', 'launch'], note: 'A coach that teaches you to run Claude and build the thing yourself.' },
];

/** Bespoke work beyond the productized doors. Routes to a discovery call. */
export const BESPOKE = [
  { icon: '📱', name: 'Custom apps & software', desc: 'Web and mobile apps built end to end. Frontend, backend, auth, billing, deploy. Real products that scale.' },
  { icon: '🛠', name: 'Specialty AI tools', desc: 'An industry tool that replaces an expensive workflow. The $3K service line item becomes the $99 subscription.' },
  { icon: '🏪', name: 'Online stores', desc: 'Headless commerce with custom design, an AI concierge, and funnels that convert from day one.' },
  { icon: '🤖', name: 'Agentic systems', desc: 'Multi-agent workflows and internal copilots that replace the human glue between your tools.' },
];
