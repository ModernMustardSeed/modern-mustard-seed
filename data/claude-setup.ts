/**
 * CLAUDE, SET UP TO RUN YOUR BUSINESS. The /claude page reads this file.
 *
 * Three set packages, priced by the studio on 2026-09-30 to sit under
 * AGENTIC NATIVE ($12,000): a person, a team, then a crew that runs recurring
 * work. Changes to what we set up are included; a new deliverable is the next
 * package. "Claude" is Anthropic's product: we describe setting it up, and
 * never imply Anthropic endorses or partners with the studio.
 *
 * The proof numbers are counted from the studio's own setup, not estimated:
 * custom skills, safety hooks and memory notes in use on 2026-09-30.
 */

export const CLAUDE_SETUP = {
  metaTitle: 'Claude Setup for Your Business: Claude Code, Custom Skills and AI Agents',
  metaDescription:
    'We set up Claude for businesses across the United States: Claude Code and Claude desktop, custom Claude skills for your own workflows, rules, memory, safety hooks and your tools connected. Three set packages from $1,500. Based in Kalispell, MT.',
  promise:
    'Claude Code and Claude desktop, set up around how your business actually works: custom skills for the jobs you repeat, rules it follows, memory it keeps, guardrails it cannot cross, and your email, calendar and tools connected. Then we teach you to run it.',
};

export const CLAUDE_PROOF = [
  { n: '17', label: 'custom Claude skills in daily use' },
  { n: '10', label: 'safety hooks it cannot get past' },
  { n: '282', label: 'memory notes it reads before it works' },
  { n: '17', label: 'agents in the back office' },
  { n: '1', label: 'person at the desk' },
] as const;

export type ClaudeTier = {
  slug: 'setup' | 'team' | 'operator';
  name: string;
  chip: string;
  price: number;
  pitch: string;
  includes: string[];
  cta: string;
  featured?: boolean;
};

export const claudeTiers: ClaudeTier[] = [
  {
    slug: 'setup',
    name: 'Claude Setup',
    chip: 'One person · one week',
    price: 1500,
    pitch: 'Claude set up for you, on your machine, doing your real work by Friday.',
    includes: [
      'Claude Code and Claude desktop installed and configured on your computer',
      'Your rules file: how you work, what you sell, the words you use and never use',
      'Five custom Claude skills built for the jobs you repeat every week',
      'Email, calendar and your documents connected',
      'Memory set up, so it remembers your business between conversations',
      'Two live sessions: one to set it up with you, one a week later on real work',
    ],
    cta: 'Book the setup',
  },
  {
    slug: 'team',
    name: 'Claude for the Team',
    chip: 'Up to ten people · three weeks',
    price: 5000,
    pitch: 'One shared Claude setup the whole team runs from, with the same rules, skills and guardrails.',
    includes: [
      'Everything in Claude Setup, for up to ten people',
      'A shared skill library: fifteen skills built around your team’s workflows',
      'Shared project rules and memory, so everyone’s Claude knows the business the same way',
      'Safety hooks: the things it must never do, enforced, not requested',
      'Your tools connected: CRM, shared drive, project board, the systems you already pay for',
      'Three team sessions on the work they do that week, and a written playbook',
    ],
    cta: 'Set up the team',
    featured: true,
  },
  {
    slug: 'operator',
    name: 'Claude Operator',
    chip: 'A crew that runs the work · five weeks',
    price: 9500,
    pitch: 'Claude agents that run your recurring work on a schedule, and hand you the decisions.',
    includes: [
      'Everything in Claude for the Team',
      'A crew of Claude agents, each with one job and a charter it cannot break',
      'Recurring work running on a schedule: follow-ups, reports, quotes, intake, research',
      'A morning briefing and one place to say yes to what they drafted',
      'Guardrails on money, messages and anything that leaves the building',
      'Every account, key and setting in your name, and the operating manual to run it without us',
    ],
    cta: 'Build the crew',
  },
];

export const claudeWhatWeSetUp = [
  { title: 'Claude Code', body: 'The version of Claude that works on your computer: it reads your files, runs the steps and builds things. Set up with your rules so it works the way you do.' },
  { title: 'Custom skills', body: 'A skill is a written playbook Claude follows every time: how you quote a job, how you answer a review, how you write the Monday report. Built once, used forever.' },
  { title: 'Rules and memory', body: 'A rules file that tells Claude who you are and how you work, and a memory it keeps between conversations, so you never explain your business twice.' },
  { title: 'Safety hooks', body: 'Hard stops it cannot talk its way past: never send an email without you, never touch the bank, never delete a file. Enforced by the setup, not by asking nicely.' },
  { title: 'Your tools, connected', body: 'Email, calendar, documents, your CRM and the other systems you already use, connected so Claude can read them and draft the work inside them.' },
  { title: 'Agents on a schedule', body: 'For the Operator package: Claude agents that run the recurring work overnight and leave the decisions waiting for your yes in the morning.' },
];

export const claudeFaq = [
  {
    q: 'How do I set up Claude for my business?',
    a: 'Start with one person and five jobs you repeat every week. Install Claude Code or Claude desktop, write a rules file that says how your business works, turn each repeated job into a skill, connect your email and calendar, and turn on memory. Our Claude Setup package does all of it with you in one week for $1,500.',
  },
  {
    q: 'What are Claude skills?',
    a: 'A Claude skill is a written playbook Claude loads when a task calls for it: the steps, the rules, the examples and the tone for one kind of job, like writing a quote or answering a review. Skills make Claude do the job your way every time instead of guessing.',
  },
  {
    q: 'Can Claude run my business operations?',
    a: 'Claude can run the recurring work: follow-ups, quotes, intake, reports, research and drafts. The decisions stay with you. We run Modern Mustard Seed this way ourselves, with seventeen custom skills, ten safety hooks and a crew of agents, and a person saying yes to what leaves the building.',
  },
  {
    q: 'Claude or ChatGPT for a small business?',
    a: 'Use the one your team will actually set up well. We build on Claude because Claude Code, skills, project rules and hooks let us shape it around a business and put hard guardrails on it. The setup matters more than the brand of the assistant.',
  },
  {
    q: 'Do we need to be technical?',
    a: 'No. We install it, write the rules and skills with you, and teach you to use it on your real work. Every package ends with a written playbook your team can follow.',
  },
  {
    q: 'What does it cost?',
    a: 'Three set packages: Claude Setup for one person is $1,500, Claude for the Team (up to ten people) is $5,000, and Claude Operator (agents that run recurring work) is $9,500. Changes to what we set up are included. Your Claude subscription is billed by Anthropic in your own name.',
  },
  {
    q: 'Are you affiliated with Anthropic?',
    a: 'No. Claude is made by Anthropic. Modern Mustard Seed is an independent studio that sets Claude up for businesses and uses it to run our own.',
  },
];
