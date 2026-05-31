/**
 * Flagship $497 programs. These are the two front doors of Modern Mustard Seed:
 * Idea to Spec (spec it) and The Terminal (build it). They are siblings, sold
 * the same way, and pair into the Zero to One bundle.
 *
 * Unlike the $47 to $67 store playbooks (data/products.ts), each program also
 * ships a live on-site tool (Spec Studio / Ops Center) and a watermarked PDF
 * behind a gated HQ. This file holds the sales-page content and SEO. Stripe
 * price ids come from env so they are never committed:
 *   STRIPE_PRICE_THE_TERMINAL, STRIPE_PRICE_IDEA_TO_SPEC, STRIPE_PRICE_ZERO_TO_ONE
 *
 * Copy here is on-brand and production-ready. Sarah can drop in the verbatim
 * sales-kit copy to replace any block.
 */

export type Program = {
  slug: 'the-terminal' | 'idea-to-spec';
  name: string;
  /** The framing line, the spine of the hero. */
  tagline: string;
  /** One-sentence promise under the tagline. */
  promise: string;
  priceUsd: number;
  /** Name of the env var holding this program's Stripe price id. */
  stripePriceEnv: string;
  pages: number;
  playbookName: string;
  toolName: string;
  toolBlurb: string;
  accent: string;
  metaTitle: string;
  metaDescription: string;
  whoFor: { title: string; detail: string }[];
  valueStack: { title: string; detail: string }[];
  method: { label: string; detail: string }[];
  guarantee: string;
  priceFraming: string;
  faq: { q: string; a: string }[];
  /** The companion cross-sell line pointing at the sibling program. */
  companion: { line: string; href: string; label: string };
};

export const programs: Program[] = [
  {
    slug: 'idea-to-spec',
    name: 'Idea to Spec',
    tagline: 'Turn any idea into a spec a builder can ship',
    promise: 'The exact method for taking a raw idea and turning it into a validated, production-ready spec, the kind that gets built right the first time.',
    priceUsd: 497,
    stripePriceEnv: 'STRIPE_PRICE_IDEA_TO_SPEC',
    pages: 38,
    playbookName: 'the 38-page Idea to Spec playbook',
    toolName: 'The Spec Studio',
    toolBlurb: 'A live, on-site tool with a Spec Builder, a 14-day validation sprint tracker, a prompt library, and an idea pipeline. It saves your progress in the browser and stays current as it grows.',
    accent: '#1F4280',
    metaTitle: 'Idea to Spec. Turn Any Idea Into a Production-Ready Spec',
    metaDescription: 'A $497 program that teaches you to turn any idea into a validated, production-ready spec. The 38-page playbook plus the live Spec Studio. From Modern Mustard Seed.',
    whoFor: [
      { title: 'The founder with too many ideas', detail: 'You have a notebook full of them. This is how you find the one worth building and prove it before you spend a dollar.' },
      { title: 'The operator who keeps getting burned by builds', detail: 'Vague briefs make expensive mistakes. A real spec is the cheapest insurance you will ever buy.' },
      { title: 'The person about to hire a developer', detail: 'Walk in with a spec, not a wish. You will get a better build, a fairer price, and far fewer surprises.' },
      { title: 'The builder who wants to start right', detail: 'Pair it with The Terminal and you spec it, then build it, all in one motion.' },
    ],
    valueStack: [
      { title: 'The 38-page playbook', detail: 'The full path from raw idea to a spec that is ready to build, watermarked to you and yours to keep.' },
      { title: 'The live Spec Studio', detail: 'A Spec Builder, a 14-day validation sprint tracker, a prompt library, and an idea pipeline. It lives on the site and stays current.' },
      { title: 'The Spec Template', detail: 'The exact document a builder needs, downloadable and reusable for every idea after this one.' },
      { title: 'Lifetime updates', detail: 'The Studio grows over time and every update is yours, free, forever.' },
    ],
    method: [
      { label: 'Capture', detail: 'Get the idea out of your head and into a shape you can examine.' },
      { label: 'Validate', detail: 'Run the 14-day sprint that proves there is something real here before you build.' },
      { label: 'Scope', detail: 'Define exactly what it does, who it serves, and what it replaces.' },
      { label: 'Spec', detail: 'Produce the production-ready document a builder (or The Terminal) can ship from.' },
    ],
    guarantee: 'Work the method for 14 days. If you do the work and you do not walk away with a spec you are confident to build, your money back. The method earns it.',
    priceFraming: 'Set it against one wasted build. A vague brief can burn five or ten thousand dollars and three months. The spec that prevents it is 497 dollars, once.',
    faq: [
      { q: 'Do I need to be technical?', a: 'No. Idea to Spec is about clarity, not code. It teaches you to think and document like a builder so the build goes right.' },
      { q: 'What do I actually get?', a: 'The 38-page playbook (watermarked to you), the live Spec Studio on the site, the Spec Template download, and lifetime updates.' },
      { q: 'How long does it take?', a: 'The validation sprint is 14 days. You can produce a first real spec in a weekend and refine it from there.' },
      { q: 'How is this different from The Terminal?', a: 'Idea to Spec is the front half of zero to one (decide what to build and prove it). The Terminal is the back half (build and ship it). They pair.' },
      { q: 'Refunds?', a: 'Yes. Do the work for 14 days and if you do not have a spec you trust, email Sarah for a full refund. Handled by hand.' },
    ],
    companion: { line: 'Once your spec is ready, build it.', href: '/the-terminal', label: 'Meet The Terminal' },
  },
  {
    slug: 'the-terminal',
    name: 'The Terminal',
    tagline: 'Become a fullstack engineer from your terminal',
    promise: 'The exact blueprint and ops I wish I had when I was learning to build. Become a zero to one builder using Claude Code, the command line, and MCP.',
    priceUsd: 497,
    stripePriceEnv: 'STRIPE_PRICE_THE_TERMINAL',
    pages: 47,
    playbookName: 'the 47-page fullstack playbook',
    toolName: 'The Ops Center',
    toolBlurb: 'A live, on-site dashboard with a curriculum tracker, a setup checklist, a prompt library, and a project tracker. It saves your progress in the browser and stays current as it grows.',
    accent: '#163259',
    metaTitle: 'The Terminal. Become a Fullstack Engineer with Claude Code',
    metaDescription: 'A $497 program that teaches you to become a fullstack, zero-to-one builder using Claude Code, the command line, and MCP. The 47-page playbook plus the live Ops Center.',
    whoFor: [
      { title: 'The non-technical founder', detail: 'You have ideas and taste. This gives you the hands to build them yourself, no dev queue required.' },
      { title: 'The operator tired of waiting', detail: 'Stop waiting on a developer for every small thing. Ship it yourself, today, from your terminal.' },
      { title: 'The creative who wants their own tools', detail: 'Build the exact thing you have been wishing existed, on your terms.' },
      { title: 'The curious person who suspects they could learn this', detail: 'You are right. This is the path, taught by someone who walked it self-taught.' },
    ],
    valueStack: [
      { title: 'The 47-page playbook', detail: 'The full path from idea to shipped product, watermarked to you and yours to keep.' },
      { title: 'The live Ops Center', detail: 'A curriculum tracker, setup checklist, prompt library, and project tracker. It lives on the site and stays current.' },
      { title: 'The Starter Repo', detail: 'A clean Next.js, Supabase, and Stripe template so you skip setup and start building on day one.' },
      { title: 'Lifetime updates', detail: 'As the tools evolve, the path evolves with them, and every update is yours, free.' },
    ],
    method: [
      { label: 'One person, fullstack', detail: 'The premise: you, plus AI, can build what used to take a team.' },
      { label: 'Your taste is the gold', detail: 'The new division of labor. Your ideas and judgment lead, the machine does the typing.' },
      { label: 'Run the loop', detail: 'Describe, build, run, refine. The build loop you will run on every project.' },
      { label: 'Ship', detail: 'Get a real thing live, then do it again. Shipping is the only teacher that counts.' },
    ],
    guarantee: 'Work the 90-day path and ship your first real project. If you do the work and it does not happen, your money back. The method earns it.',
    priceFraming: 'Set it against a bootcamp at many thousands, or a developer hire, or the months lost waiting to build. It is a price, not an investment, and it is 497 dollars, once.',
    faq: [
      { q: 'Do I need to know how to code?', a: 'No. The Terminal teaches the stack as you build. You bring willingness, the playbook brings the path.' },
      { q: 'What do I need?', a: 'A terminal, a Claude subscription, and the willingness to build. The Ops Center checklist gets you set up.' },
      { q: 'How long until I ship?', a: 'The path is built around shipping your first real project in 90 days. Many ship something small far sooner.' },
      { q: 'Is the stack hard?', a: 'The playbook teaches it as you build, in the order you actually need it. You learn by shipping, not by studying.' },
      { q: 'Refunds?', a: 'Yes. Work the 90-day path, and if you do the work and do not ship, email Sarah for a full refund. Handled by hand.' },
    ],
    companion: { line: 'Not sure what to build yet? Spec it first.', href: '/idea-to-spec', label: 'Meet Idea to Spec' },
  },
];

export type ProgramBundle = {
  slug: 'zero-to-one';
  name: string;
  pitch: string;
  priceUsd: number;
  savings: number;
  stripePriceEnv: string;
  programSlugs: Program['slug'][];
};

export const programBundle: ProgramBundle = {
  slug: 'zero-to-one',
  name: 'The Zero to One Bundle',
  pitch: 'Spec it with Idea to Spec, build it with The Terminal. The front half and the back half of taking something from nothing to shipped, together at one price. $797 for both, a $197 saving.',
  priceUsd: 797,
  savings: 197,
  stripePriceEnv: 'STRIPE_PRICE_ZERO_TO_ONE',
  programSlugs: ['idea-to-spec', 'the-terminal'],
};

export function getProgramBySlug(slug: string): Program | undefined {
  return programs.find((p) => p.slug === slug);
}
