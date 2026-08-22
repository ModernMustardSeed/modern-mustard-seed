import Image from 'next/image';
import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import {
  CHARACTERS,
  CLAUDE_MD_TEMPLATE,
  CLI,
  FAQ,
  FIRST_BUILDS,
  GLOSSARY,
  KEYS,
  LOOP,
  RULES,
  SLASH,
  STARTER_STEPS,
  TRIAGE,
  WHAT_YOU_NEED,
} from '@/data/fieldguide';
import {
  CodeBlock,
  PromptLibrary,
  ReadingProgress,
  SectionRail,
  TemplateBlock,
  type RailItem,
} from '@/components/FieldGuide';

/**
 * /fieldguide - The Claude Code Field Guide.
 *
 * Sarah 2026-08-21: a sheet she can hand any friend, or post, for people who
 * want to build things and have no idea where to start. The printable field card
 * at /downloads/modern-mustard-seed-claude-code-field-guide.pdf is the hook;
 * this page is the thing the hook points at; the ranch line at the bottom is
 * where a reader who would rather have the product than the education lands.
 *
 * All content comes from data/fieldguide.ts so the page and the PDF can never
 * drift. Regenerate the sheet with: node scripts/build-fieldguide-onepager.mjs
 */

export const metadata = buildMetadata({
  title: 'The Claude Code Field Guide',
  description:
    'A free, plain-English guide to Claude Code for people who want to build software and have never written any. The install, the loop that works, 17 ready-to-paste prompts, the CLAUDE.md template, and the twelve rules a product studio learned the expensive way.',
  path: '/fieldguide',
});

const RAIL: RailItem[] = [
  { id: 'start', label: 'Start Here' },
  { id: 'loop', label: 'The Loop' },
  { id: 'prompts', label: 'Prompt Library' },
  { id: 'keys', label: 'The Keys' },
  { id: 'commands', label: 'The Commands' },
  { id: 'claudemd', label: 'CLAUDE.md' },
  { id: 'context', label: 'Context' },
  { id: 'safety', label: 'Safety Net' },
  { id: 'levelup', label: 'Level Up' },
  { id: 'rules', label: 'Twelve Rules' },
  { id: 'triage', label: 'When It Breaks' },
  { id: 'first', label: 'Your First Build' },
  { id: 'glossary', label: 'Plain English' },
  { id: 'faq', label: 'Questions' },
  { id: 'help', label: 'Get Help' },
];

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to start building software with Claude Code as a total beginner',
  description:
    'The install, the first session, and the working loop that gets usable software out of Claude Code without any prior coding experience.',
  totalTime: 'PT20M',
  step: STARTER_STEPS.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.title,
    text: s.body,
  })),
};

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'The Claude Code Field Guide',
  description:
    'A plain-English field guide to Claude Code for non-developers: install, the explore-plan-build-prove-save loop, a copyable prompt library, the CLAUDE.md template, and twelve operating rules from a working product studio.',
  proficiencyLevel: 'Beginner',
  author: { '@type': 'Person', name: SITE.founder },
  publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
  datePublished: '2026-08-21',
  dateModified: '2026-08-21',
  inLanguage: 'en-US',
  isAccessibleForFree: true,
  url: `${SITE.url}/fieldguide`,
};

export default function FieldGuidePage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Playbooks', url: '/playbooks' },
            { name: 'The Claude Code Field Guide', url: '/fieldguide' },
          ]),
          faqJsonLd(FAQ.map((f) => ({ q: f.q, a: f.a }))),
          howToJsonLd,
          articleJsonLd,
        ]}
      />

      <ReadingProgress />

      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-32 md:pt-40 pb-24">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />

        <div className="relative">
          {/* ================= HERO ================= */}
          <header className="max-w-[1180px] mx-auto px-6 md:px-8 mb-16 md:mb-24 xl:pl-[254px]">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14 lg:items-center">
          <div className="min-w-0">
            <span className="block text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-7">
              Free guide · Never built anything? Start here
            </span>

            {/* Each line is its own block with its own leading. Nothing here is
                stroked, stacked, or absolutely positioned, so nothing can
                overlap at any width. */}
            <h1 className="font-display font-black text-[#161616] tracking-tight mb-8">
              <span className="block text-[2.6rem] sm:text-6xl md:text-7xl leading-[1.06] pb-1">Claude Code,</span>
              <span className="block text-[2.6rem] sm:text-6xl md:text-7xl leading-[1.06] pb-1">
                from <em className="italic text-[#E0301E]">zero</em>.
              </span>
              <span className="block mt-5 text-[11px] sm:text-xs md:text-sm font-mono font-bold uppercase tracking-[0.32em] leading-[1.7] text-[#161616]/45">
                The Field Guide
              </span>
            </h1>

            <p className="text-[#3a3733] text-base md:text-xl font-body leading-relaxed max-w-2xl mb-6">
              You have an idea, a laptop, and no idea what happens next. This is the whole thing in one place: the setup,
              the loop that actually works, the exact words that get good output, and the mistakes that cost us real days
              so they never cost you any.
            </p>

            <p className="text-[#161616]/55 text-sm md:text-base font-body italic max-w-2xl mb-9">
              Written by a self-taught engineer who has shipped 40+ products with this tool, for the friend who keeps
              saying they would build it if they knew how.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <a
                href="#start"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Start at zero →
              </a>
              <a
                href="#prompts"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Jump to the prompts
              </a>
              <a
                href="/downloads/modern-mustard-seed-claude-code-field-guide.pdf"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
              >
                Print the field card
              </a>
            </div>

            <div className="flex flex-wrap gap-2">
              {['No coding required', 'Mac, Windows, Linux', '17 prompts you can steal', 'The guide is free'].map(
                (chip) => (
                  <span
                    key={chip}
                    className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616]/60 bg-white border-2 border-[#161616]/20 rounded-full px-3 py-1.5"
                  >
                    {chip}
                  </span>
                ),
              )}
            </div>
          </div>

          {/*
            The same footage the homepage opens with. A guide that looks like a
            developer tool is a guide nobody can tell we wrote, and the people
            this is for recognise the drive before they recognise the logo.
          */}
          <div className="hidden lg:block">
            <div className="relative aspect-square rounded-full overflow-hidden border-[3px] border-[#161616] shadow-[10px_10px_0_0_#F5B700]">
              <Image
                src="/journey/poster-drive.jpg"
                alt="Mr. and Mrs. Mustard driving a red convertible along Flathead Lake at sunset"
                fill
                sizes="300px"
                className="object-cover"
                priority
              />
            </div>
            <p className="mt-5 text-center text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/45">
              Kalispell, Montana
            </p>
          </div>
          </div>
          </header>

          {/* ================= BODY ================= */}
          <div className="max-w-[1180px] mx-auto px-6 md:px-8 xl:grid xl:grid-cols-[190px_minmax(0,1fr)] xl:gap-16">
            <SectionRail items={RAIL} />

            <div className="min-w-0 space-y-20 md:space-y-28">
              {/* --------------- THE ONE THING --------------- */}
              <div className="pop-card-yellow p-7 md:p-10">
                <span className="block text-[10px] uppercase tracking-[0.35em] text-[#8A1006] font-mono font-bold mb-4">
                  Understand this first
                </span>
                <p className="font-display text-xl md:text-3xl font-black text-[#161616] leading-[1.3] mb-5">
                  Claude Code is a very fast engineer who has read every manual ever written and knows nothing about you,
                  your project, or what you said yesterday.
                </p>
                <p className="text-[#161616]/75 text-sm md:text-base font-body font-medium leading-7 max-w-2xl">
                  It types faster than you and it will happily build the wrong thing at full speed. Every habit in this
                  guide fixes one half of that sentence: give it context, and make it prove the work. Do those two things
                  and it feels like a senior teammate. Skip them and it feels like a slot machine.
                </p>
              </div>

              {/* --------------- 01 START --------------- */}
              <Section
                id="start"
                eyebrow="Step 00"
                title="Your first twenty minutes"
                lede="In order. Do not skip the fourth one, it is the step that makes every step after it work."
              >
                {/*
                  The price goes ABOVE the install, not in a footnote. Somebody
                  who follows six steps and then meets a paywall has had their
                  evening wasted by us.
                */}
                <div className="pop-card p-6 md:p-7 mb-6">
                  <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-4">
                    First, what you need
                  </span>
                  <dl className="grid md:grid-cols-3 gap-5">
                    {WHAT_YOU_NEED.map((item) => (
                      <div key={item.label}>
                        <dt className="font-display text-base font-black text-[#161616] leading-snug mb-1.5">
                          {item.label}
                        </dt>
                        <dd className="text-[#3a3733] text-[13.5px] font-body leading-6">{item.body}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {STARTER_STEPS.map((s, i) => (
                    <div key={s.n} className={`min-w-0 ${i === 3 ? 'pop-card-yellow p-6' : 'pop-card p-6'}`}>
                      <span
                        className={`block text-[11px] font-mono font-bold tracking-[0.16em] mb-2 ${
                          i === 3 ? 'text-[#8A1006]' : 'text-[#E0301E]'
                        }`}
                      >
                        {s.n}
                      </span>
                      <h3 className="font-display text-lg md:text-xl font-black text-[#161616] leading-snug mb-2.5">
                        {s.title}
                      </h3>
                      <p
                        className={`text-sm font-body leading-7 ${
                          i === 3 ? 'text-[#161616]/80 font-medium' : 'text-[#3a3733]'
                        }`}
                      >
                        {s.body}
                      </p>
                      {s.code ? (
                        <div className="mt-4">
                          <CodeBlock code={s.code} caption={s.n === '05' ? 'Paste this in' : 'Terminal'} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Section>

              {/* --------------- 02 LOOP --------------- */}
              <Section
                id="loop"
                eyebrow="The method"
                title="The loop that actually works"
                lede="Almost every bad result comes from jumping straight to step three. This sequence is the difference between a tool that ships features and a tool that generates confident wreckage."
              >
                <div className="grid gap-3.5">
                  {LOOP.map((s) => (
                    <div
                      key={s.n}
                      className="pop-card p-5 md:p-6 grid grid-cols-[3rem_minmax(0,1fr)] md:grid-cols-[3.5rem_minmax(0,1fr)] gap-4 md:gap-6 items-start"
                    >
                      <span className="grid place-items-center h-10 rounded-lg border-2 border-[#161616] bg-[#F5B700] font-mono font-bold text-[#161616]">
                        {s.n}
                      </span>
                      <div>
                        <h3 className="font-display text-lg md:text-xl font-black text-[#161616] leading-snug mb-1.5">
                          {s.title}
                        </h3>
                        <p className="text-[#3a3733] text-sm md:text-[15px] font-body leading-7">{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* --------------- 03 PROMPTS --------------- */}
              <Section
                id="prompts"
                eyebrow="The part you will come back for"
                title="Seventeen prompts you can steal"
                lede="This is the actual skill, and it is learnable in an afternoon. Vague requests get vague answers with confident formatting. Every prompt below names the outcome, the constraint, and the proof. Tap Copy, paste it in, replace the brackets."
              >
                <PromptLibrary />
              </Section>

              {/* --------------- 04 KEYS --------------- */}
              <Section
                id="keys"
                eyebrow="Muscle memory"
                title="The keys, and the four characters"
                lede="Six keys cover ninety percent of your day. The four characters underneath are the ones nobody tells beginners about, and they change how the whole tool feels."
              >
                <div className="grid md:grid-cols-2 gap-5">
                  <KeyTable caption="Keys" rows={KEYS} />
                  <KeyTable caption="Characters that do work" rows={CHARACTERS} mono />
                </div>
                <Note>
                  Shortcuts and commands shift between versions. Whatever <Code>/help</Code> prints in your install beats
                  whatever any guide says, including this one.
                </Note>
              </Section>

              {/* --------------- 05 COMMANDS --------------- */}
              <Section
                id="commands"
                eyebrow="Reference"
                title="Commands worth knowing"
                lede="Slash commands run inside a session. Terminal commands start one. You do not need to memorize these. You need to know they exist."
              >
                <div className="grid lg:grid-cols-2 gap-5">
                  <div className="pop-card p-0 overflow-hidden min-w-0">
                    <TableCap>Inside a session</TableCap>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <tbody>
                          {SLASH.map((r) => (
                            <tr key={r.cmd} className="border-t border-[#161616]/10">
                              <td className="py-2.5 px-5 font-mono text-[12.5px] font-bold text-[#161616] whitespace-nowrap align-top">
                                {r.cmd}
                              </td>
                              <td className="py-2.5 px-5 text-[13px] font-body text-[#3a3733] leading-6">{r.when}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="pop-card p-0 overflow-hidden self-start min-w-0">
                    <TableCap>From your terminal</TableCap>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <tbody>
                          {CLI.map((r) => (
                            <tr key={r.cmd} className="border-t border-[#161616]/10">
                              <td className="py-2.5 px-5 font-mono text-[12.5px] font-bold text-[#161616] whitespace-nowrap align-top">
                                {r.cmd}
                              </td>
                              <td className="py-2.5 px-5 text-[13px] font-body text-[#3a3733] leading-6">{r.what}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Section>

              {/* --------------- 06 CLAUDE.md --------------- */}
              <Section
                id="claudemd"
                eyebrow="Highest leverage"
                title="The one file that changes everything"
                lede="A file called CLAUDE.md in your project folder gets read automatically at the start of every session, forever. Every correction you find yourself repeating belongs in it. This single file is why one person gets great output and another gets noise from the same tool."
              >
                <div className="grid lg:grid-cols-2 gap-6 items-start">
                  <div className="min-w-0">
                    <TemplateBlock template={CLAUDE_MD_TEMPLATE} />
                  </div>
                  <div className="grid gap-5 min-w-0">
                    <div className="pop-card p-6">
                      <h3 className="font-display text-lg font-black mb-2">Where these live</h3>
                      <p className="text-[#3a3733] text-sm font-body leading-7">
                        <Code>CLAUDE.md</Code> in your project folder is the project briefing, and it belongs in your
                        repo so anyone else who works on it gets the same rules. A second one at{' '}
                        <Code>~/.claude/CLAUDE.md</Code> is personal and applies to every project you ever open. Put your
                        standing preferences there once and stop retyping them.
                      </p>
                    </div>
                    <div className="pop-card p-6">
                      <h3 className="font-display text-lg font-black mb-2">Feed it as you go</h3>
                      <p className="text-[#3a3733] text-sm font-body leading-7">
                        The second time you correct the same thing, do not correct it. Type <Code>#</Code> and the rule,
                        and it is saved permanently. A CLAUDE.md grown that way beats one written in a planning session,
                        because every line in it came from a real mistake.
                      </p>
                    </div>
                    <div className="pop-card-yellow p-6">
                      <h3 className="font-display text-lg font-black mb-2">What never goes in it</h3>
                      <p className="text-[#161616]/80 text-sm font-body font-medium leading-7">
                        No passwords, no API keys, no database addresses, no tokens. Ever. Secrets live in{' '}
                        <Code light>.env.local</Code>, and that file goes in <Code light>.gitignore</Code>. If you are
                        unsure whether something counts as a secret, it does.
                      </p>
                    </div>
                  </div>
                </div>
              </Section>

              {/* --------------- 07 CONTEXT --------------- */}
              <Section
                id="context"
                eyebrow="The thing nobody warns you about"
                title="Context is the whole game"
                lede="Claude has a working memory for each session, and it fills up. A session running two hours across four unrelated tasks has already pushed out what you said in hour one. When it suddenly seems to have gotten worse, this is almost always why."
              >
                <div className="grid md:grid-cols-3 gap-5">
                  <MiniCard title="One task, one session">
                    Finish the thing, save it, then clear. Starting fresh costs ten seconds of restating the goal and buys
                    back full attention. Beginners hoard one long session as if it were progress. It is the opposite.
                  </MiniCard>
                  <MiniCard title="Point, do not make it hunt">
                    Every file it opens looking for the right one is memory spent on nothing. Use <Code>@</Code> and the
                    path. If you do not know the path, ask it to find the file, then clear and start the real task with
                    the answer.
                  </MiniCard>
                  <MiniCard title="Compacting is not free">
                    <Code>/compact</Code> squeezes the history down so you can keep going. It is a compression, so
                    details do get lost. Restating the goal in five lines right after is not optional.
                  </MiniCard>
                </div>
              </Section>

              {/* --------------- 08 SAFETY --------------- */}
              <Section
                id="safety"
                eyebrow="The safety net"
                title="Nothing here is permanent, if you set it up right"
                lede="The fear that stops beginners is that they will break something they cannot get back. Two habits make that fear obsolete, and they take four minutes total."
              >
                <div className="grid md:grid-cols-2 gap-5 mb-6">
                  <div className="pop-card p-6 min-w-0">
                    <h3 className="font-display text-lg font-black mb-2.5">Put it in git on day one</h3>
                    <p className="text-[#3a3733] text-sm font-body leading-7 mb-4">
                      Git is the undo button for your whole project. You do not need to learn it, you need to have it.
                      Say this once at the start of any project and Claude sets the whole thing up for you.
                    </p>
                    <CodeBlock
                      caption="Say this"
                      code={'Set this project up with git, add a sensible .gitignore,\nand make the first commit. Explain what you did in three lines.'}
                    />
                  </div>
                  <div className="pop-card p-6">
                    <h3 className="font-display text-lg font-black mb-2.5">Know which mode you are in</h3>
                    <p className="text-[#3a3733] text-sm font-body leading-7">
                      <strong>Shift+Tab</strong> cycles three permission modes. Know which one you are in before you walk
                      away from the keyboard, because one of them applies changes without asking.
                    </p>
                    <ul className="mt-4 space-y-2.5">
                      {[
                        ['Ask every time', 'The default. It shows you each edit and command first. Slow, and correct while you are learning.'],
                        ['Auto-accept edits', 'File changes apply without asking. Fast, and safe only when your work is in git.'],
                        ['Plan mode', 'It can read and think and cannot touch anything. Start every real task here.'],
                      ].map(([label, body]) => (
                        <li key={label} className="flex gap-3">
                          <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-[#F5B700] border border-[#161616]" />
                          <span className="text-[13.5px] font-body leading-6 text-[#3a3733]">
                            <strong className="text-[#161616]">{label}.</strong> {body}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Note tone="warn">
                  There is a flag that turns off every permission check. It exists for throwaway containers and automated
                  pipelines. Do not use it on a machine that holds anything you would miss, and never in a folder that is
                  not in git.
                </Note>
              </Section>

              {/* --------------- 09 LEVEL UP --------------- */}
              <Section
                id="levelup"
                eyebrow="When you are ready"
                title="Six ways to make it yours"
                lede="Skip this on day one. Come back on day ten, when you notice yourself typing the same paragraph for the third time. Every one of these turns a repeated instruction into infrastructure."
              >
                <div className="grid md:grid-cols-2 gap-5">
                  <MiniCard title="Custom commands">
                    Drop a markdown file in <Code>.claude/commands/</Code> and it becomes a slash command. A file named{' '}
                    <Code>ship.md</Code> becomes <Code>/ship</Code> and can hold your entire deploy checklist. Anyone who
                    pulls the project gets it too.
                  </MiniCard>
                  <MiniCard title="Subagents">
                    <Code>/agents</Code> creates a specialist with its own instructions and its own fresh memory: a
                    reviewer that only hunts bugs, a researcher that only reads. They work in parallel and never clutter
                    your main thread.
                  </MiniCard>
                  <MiniCard title="Hooks">
                    Your own scripts, run automatically on events. Format after every edit. Block edits to a protected
                    folder. Play a sound when a long job finishes. This is how a preference becomes something that cannot
                    be forgotten.
                  </MiniCard>
                  <MiniCard title="MCP servers">
                    Connect outside systems so Claude can read your database, your issue tracker, your designs, your
                    logs. Fewer copy-pastes from a browser, and far better answers, because it is looking at real data.
                  </MiniCard>
                  <MiniCard title="Skills">
                    A folder of instructions and reference files that loads itself only when the work calls for it. Where
                    a CLAUDE.md rule is always on, a skill is deep knowledge waiting in the wings. This is how a studio
                    bottles its standards.
                  </MiniCard>
                  <div className="pop-card-yellow p-6">
                    <h3 className="font-display text-lg font-black mb-2">Two terminals, two copies</h3>
                    <p className="text-[#161616]/80 text-sm font-body font-medium leading-7">
                      Claude runs happily in several windows at once, and that is a real speed multiplier. One rule keeps
                      it from becoming a disaster: give each session its own branch or its own copy of the project. Two
                      sessions editing the same files will quietly overwrite each other, and you will find out later.
                    </p>
                  </div>
                </div>
              </Section>

              {/* --------------- 10 RULES --------------- */}
              <Section
                id="rules"
                eyebrow="From the studio"
                title="Twelve rules we paid for"
                lede="Every one of these is here because ignoring it cost us a day, a deploy, or a client's afternoon. They are ordered by how much the lesson stung."
              >
                <ol className="grid gap-3">
                  {RULES.map((r, i) => (
                    <li
                      key={r.title}
                      className="pop-card p-4 md:p-5 grid grid-cols-[2rem_minmax(0,1fr)] gap-3.5 md:gap-5 items-baseline"
                    >
                      <span className="font-mono font-bold text-sm text-[#E0301E] tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-[#3a3733] text-sm md:text-[15px] font-body leading-7">
                        <strong className="text-[#161616] font-extrabold">{r.title}</strong> {r.body}
                      </p>
                    </li>
                  ))}
                </ol>
              </Section>

              {/* --------------- 11 TRIAGE --------------- */}
              <Section
                id="triage"
                eyebrow="Triage"
                title="When it goes sideways"
                lede="Find your symptom. The cause is almost never the one you assume."
              >
                <div className="pop-card p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[640px]">
                      <thead>
                        <tr className="border-b-2 border-[#161616]">
                          {['The symptom', 'What is actually happening', 'Do this'].map((h) => (
                            <th
                              key={h}
                              className="py-3 px-5 text-[9px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616]/50"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TRIAGE.map((r) => (
                          <tr key={r.symptom} className="border-t border-[#161616]/10 align-top">
                            <td className="py-3 px-5 text-[13.5px] font-body font-bold text-[#161616] leading-6">
                              {r.symptom}
                            </td>
                            <td className="py-3 px-5 text-[13px] font-body text-[#3a3733] leading-6">{r.cause}</td>
                            <td className="py-3 px-5 text-[13px] font-body text-[#3a3733] leading-6">{r.fix}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Section>

              {/* --------------- 12 FIRST BUILD --------------- */}
              <Section
                id="first"
                eyebrow="Do not overthink this"
                title="Three things worth building first"
                lede="Pick the one that describes a real annoyance in your actual week. Copy the prompt, paste it in, and answer the questions it asks you. That is the whole start."
              >
                <div className="grid md:grid-cols-3 gap-5">
                  {FIRST_BUILDS.map((b) => (
                    <div key={b.title} className="pop-card p-6 flex flex-col min-w-0">
                      <h3 className="font-display text-lg font-black text-[#161616] leading-snug mb-2">{b.title}</h3>
                      <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#E0301E] font-bold mb-4 leading-5">
                        {b.who}
                      </p>
                      <p className="rounded-lg border-2 border-[#161616]/12 bg-[#FBF6EA] px-4 py-3.5 font-mono text-[12px] leading-[1.8] text-[#161616]/85 flex-1">
                        {b.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* --------------- 13 GLOSSARY --------------- */}
              <Section
                id="glossary"
                eyebrow="No jargon left standing"
                title="Plain English"
                lede="Every word in this guide that might have stopped you, defined once."
              >
                <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                  {GLOSSARY.map((g) => (
                    <div key={g.term} className="border-l-2 border-[#F5B700] pl-4">
                      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] font-bold text-[#161616] mb-1">
                        {g.term}
                      </dt>
                      <dd className="text-[#3a3733] text-[13.5px] font-body leading-7">{g.def}</dd>
                    </div>
                  ))}
                </dl>
              </Section>

              {/* --------------- 14 FAQ --------------- */}
              <Section id="faq" eyebrow="Questions" title="The ones everybody asks">
                <div className="grid gap-3">
                  {FAQ.map((f) => (
                    <details key={f.q} className="pop-card p-5 md:p-6 group">
                      <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-display text-base md:text-lg font-black text-[#161616] leading-snug">
                        {f.q}
                        <span
                          aria-hidden="true"
                          className="shrink-0 mt-1 font-mono text-[#E0301E] transition-transform duration-200 group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="mt-3.5 text-[#3a3733] text-sm md:text-[15px] font-body leading-7">{f.a}</p>
                    </details>
                  ))}
                </div>
              </Section>

              {/* --------------- 15 HELP --------------- */}
              <section id="help" className="scroll-mt-32">
                <div className="pop-card-yellow p-7 md:p-11">
                  <div className="flex items-start gap-5 mb-4">
                    <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden border-[3px] border-[#161616] shadow-[4px_4px_0_0_#161616]">
                      <Image
                        src="/journey/poster-orchard.jpg"
                        alt="Mr. and Mrs. Mustard picking cherries on the east shore"
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <span className="block text-[10px] uppercase tracking-[0.35em] text-[#8A1006] font-mono font-bold pt-1">
                      Stuck, or would rather not
                    </span>
                  </div>
                  <h2 className="font-display text-2xl md:text-4xl font-black text-[#161616] tracking-tight leading-[1.15] mb-5">
                    Two ways to get unstuck, and neither one costs you anything to start.
                  </h2>
                  <p className="text-[#161616]/80 text-sm md:text-base font-body font-medium leading-7 max-w-2xl mb-8">
                    Call the ranch line and Mr. Mustard picks up. He is our own AI voice agent, he is awake at 2am, and
                    he will talk you through what you are stuck on or take down what you are trying to build. If you want
                    a person, book thirty minutes with Sarah and bring whatever you have, including nothing but an idea.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <a
                      href={`tel:${SITE.phoneE164}`}
                      className="px-7 py-4 text-center text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.28)] hover:-translate-y-0.5 transition-all"
                    >
                      Call Mr. Mustard · {SITE.phone}
                    </a>
                    <Link
                      href="/book"
                      className="px-7 py-4 text-center text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                    >
                      Book a free call with Sarah
                    </Link>
                  </div>

                  <div className="border-t-2 border-[#161616]/15 pt-7">
                    <p className="text-[#161616]/80 text-sm md:text-base font-body font-medium leading-7 max-w-2xl mb-5">
                      And if you read all of this and thought <em>I would rather someone just built it</em>, that is what
                      we do. Modern Mustard Seed is a product studio in Kalispell, Montana. Custom apps, websites, and AI
                      voice agents, at set package prices, shipped in weeks. You own the code, the repo, and the deploys
                      when we are done.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/work-with-us"
                        className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                      >
                        See how we work
                      </Link>
                      <Link
                        href="/work"
                        className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                      >
                        See the work
                      </Link>
                      <Link
                        href="/mustard-mode"
                        className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                      >
                        Learn it with a coach
                      </Link>
                      <a
                        href="/downloads/modern-mustard-seed-claude-code-field-guide.pdf"
                        className="px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                      >
                        Print the field card
                      </a>
                    </div>
                  </div>
                </div>

                <p className="mt-6 text-center text-[12px] font-body italic text-[#161616]/45">
                  Free to share, print, and pass along. Send it to the friend who keeps saying they would build it if
                  they knew how.
                </p>
              </section>

              <div className="pt-4">
                <NewsletterSignup
                  headline="The plays we run on real client builds, once a week."
                  subhead="Same voice as this guide. Short, specific, and nothing you cannot run yourself."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces. Server components, no state.          */
/* ------------------------------------------------------------------ */

function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className="border-b-2 border-[#161616] pb-5 mb-8">
        <span className="block text-[10px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold mb-3">
          {eyebrow}
        </span>
        <h2 className="font-display text-2xl md:text-[2.4rem] font-black text-[#161616] tracking-tight leading-[1.2] pb-1">
          {title}
        </h2>
        {lede ? (
          <p className="mt-4 text-[#3a3733] text-sm md:text-base font-body leading-7 max-w-2xl">{lede}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MiniCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pop-card p-6">
      <h3 className="font-display text-lg font-black text-[#161616] leading-snug mb-2">{title}</h3>
      <p className="text-[#3a3733] text-sm font-body leading-7">{children}</p>
    </div>
  );
}

function KeyTable({
  caption,
  rows,
  mono,
}: {
  caption: string;
  rows: { key: string; what: string }[];
  mono?: boolean;
}) {
  return (
    <div className="pop-card p-0 overflow-hidden self-start min-w-0">
      <TableCap>{caption}</TableCap>
      <table className="w-full text-left">
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-[#161616]/10 align-top">
              <td className="py-3 px-5 whitespace-nowrap">
                <span
                  className={`inline-block rounded-md border-2 border-[#161616] bg-white shadow-[2px_2px_0_0_#161616] px-2 py-0.5 font-mono font-bold text-[#161616] ${
                    mono ? 'text-base' : 'text-[11.5px]'
                  }`}
                >
                  {r.key}
                </span>
              </td>
              <td className="py-3 px-5 text-[13px] font-body text-[#3a3733] leading-6">{r.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableCap({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-4 pb-2.5">
      <span className="text-[9px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/45">{children}</span>
    </div>
  );
}

function Note({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'warn' }) {
  return (
    <div
      className={`mt-6 rounded-xl border-2 px-5 py-4 flex flex-col sm:flex-row gap-2 sm:gap-4 ${
        tone === 'warn' ? 'border-[#E0301E] bg-white' : 'border-[#161616]/20 bg-white'
      }`}
    >
      <span className="text-[9px] uppercase tracking-[0.22em] font-mono font-bold text-[#E0301E] shrink-0 pt-1">
        {tone === 'warn' ? 'Hard rule' : 'Note'}
      </span>
      <p className="text-[13.5px] font-body text-[#3a3733] leading-7">{children}</p>
    </div>
  );
}

function Code({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <code
      className={`font-mono text-[0.9em] rounded px-1.5 py-0.5 border ${
        light ? 'bg-white/60 border-[#161616]/20 text-[#161616]' : 'bg-[#161616]/[0.06] border-[#161616]/12 text-[#161616]'
      }`}
    >
      {children}
    </code>
  );
}
