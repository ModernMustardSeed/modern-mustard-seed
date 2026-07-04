'use client';

/**
 * The true zero-to-one guide: for someone who has never opened a terminal or
 * used Claude at all. Free, public, no login. Mission code-01 in the paid
 * Code track assumes this ground is already covered; this page is where that
 * ground gets covered. Same visual system as /mustard-mode, calmer pace.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import Reveal from './Reveal';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="font-mono font-bold text-[10px] uppercase tracking-wider bg-[#F5B700] text-[#161616] border border-[#161616] px-2.5 py-1.5 hover:translate-y-[1px] transition-transform shrink-0"
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

const COMMANDS = [
  { cmd: 'cd folder-name', does: 'Move into a folder (change directory).' },
  { cmd: 'cd ..', does: 'Move back up one folder.' },
  { cmd: 'ls', does: 'List what is in the current folder. (Windows: dir)' },
  { cmd: 'pwd', does: 'Print where you are right now. (Windows: cd with no argument)' },
  { cmd: 'mkdir folder-name', does: 'Create a new folder.' },
  { cmd: 'clear', does: 'Wipe the screen so you can see clearly. (Windows: cls)' },
  { cmd: 'Ctrl + C', does: 'Stop whatever is running. Your emergency brake.' },
];

const STEPS = [
  {
    n: '01',
    title: 'Know the difference: claude.ai vs. Claude Code',
    body: [
      'claude.ai is the chat website. You type, Claude replies, you can attach files and images. It is the fastest way to think, write, research, and get advice. Nothing gets installed.',
      'Claude Code is a different tool: a command-line agent that lives on your own computer, inside a terminal, where it can read, write, and run real files and real code. It is what actually builds software, not just talks about it. Both run on the same subscription.',
      'Rule of thumb: chatting, writing, thinking, planning, use claude.ai. Building an app, a website, or anything that needs to run on your computer, use Claude Code.',
    ],
  },
  {
    n: '02',
    title: 'Create your account and pick a plan',
    body: [
      'Go to claude.ai and sign up with an email or Google account. Free works for light chatting. For anything in MUSTARD MODE, and for daily real use, the Pro plan (about $20/month) is the sane starting point. If you plan to run Claude Code for hours a day, Max exists for that.',
      'One account, one login, powers both claude.ai and Claude Code. You are not paying twice.',
    ],
  },
  {
    n: '03',
    title: 'Open a terminal for the first time',
    body: [
      'A terminal is just a plain text window where you type commands instead of clicking icons. It looks intimidating for about ten minutes and then it never does again.',
      'On a Mac: press Cmd + Space, type Terminal, press Enter. A black or white text window opens. That is it, that is the terminal.',
      'On Windows: press the Windows key, type PowerShell or Windows Terminal, press Enter. Either works. Windows Terminal looks nicer, PowerShell is the classic, both run the same commands.',
      'Nothing you type in a terminal by accident breaks your computer. The worst normal mistake is a typo that does nothing. Explore without fear.',
    ],
  },
  {
    n: '04',
    title: 'Install Claude Code and run your first command',
    body: [
      'With your terminal open, go to claude.ai/code and follow the one-line install command for your system. Paste it into the terminal (right-click to paste on most setups, or Cmd/Ctrl + V) and press Enter.',
      'Once installed, make yourself a practice folder so you never worry about touching real files: type mkdir mustard-lab, then cd mustard-lab, then just type claude and press Enter. You are now in a live session.',
      'Sign in when it asks (same account as claude.ai). Then type one sentence: say hello and tell me what you can do in this folder. Read the reply. You just ran your first session.',
    ],
  },
  {
    n: '05',
    title: 'The three ideas that make everything else make sense',
    body: [
      'A prompt is just what you type. Better prompts describe the who, what, and outcome specifically, instead of one vague word. "Fix my app" is a bad prompt. "The save button does nothing when I click it, here is what I expected" is a good one.',
      'Context is what Claude currently remembers: this conversation, the files in your folder, anything you have shared. Claude Code reads your project folder, claude.ai chat reads what you have typed and attached in that conversation. New chat, new folder, means a fresh memory unless you tell it otherwise.',
      'Claude Code always asks permission before it changes or runs anything on your computer. That pause is not a bug, it is your steering wheel. Read what it is about to do, then approve or redirect. You are always the one driving.',
    ],
  },
  {
    n: '06',
    title: 'Two habits that keep you safe',
    body: [
      'Never paste real passwords, API keys, or other secrets directly into a prompt as plain examples. If Claude needs a real key to run something, it will tell you where to store it safely (usually an environment file it helps you set up), not have you type it into the chat.',
      'When in doubt, ask before you approve. Claude Code will explain any action in plain English if you ask "what does this do and why." A ten-second question beats an hour of confusion.',
    ],
  },
];

export default function StartHere() {
  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-[#161616]">
        <div className="absolute inset-0 halftone-bg opacity-50" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-20">
          <Reveal variant="eyebrow">
            <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">
              Free // No account needed to read this // Mr. Mustard&apos;s beginner brief
            </p>
          </Reveal>
          <Reveal variant="slam" delay={100}>
            <h1 className="font-display italic font-extrabold text-[#161616] leading-[0.98] tracking-tight mt-4 text-4xl md:text-6xl">
              Never used Claude or a terminal?
              <br />
              Start here.
            </h1>
          </Reveal>
          <Reveal variant="rise" delay={220}>
            <p className="font-sans text-base md:text-lg text-[#161616]/80 max-w-2xl mt-6">
              This is the ten-minute setup that every MUSTARD MODE mission assumes you already have. No
              jargon, no skipped steps. By the end you will have an account, a terminal you are not afraid
              of, and Claude Code answering you for the first time.
            </p>
          </Reveal>
          <Reveal variant="drop" delay={340}>
            <div className="flex flex-wrap gap-4 mt-8">
              <a href="#step-01" className="font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] px-6 py-3 hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#161616] transition-all">
                Start the setup ↓
              </a>
              <Link href="/mustard-mode#top" className="font-sans font-bold bg-white text-[#161616] border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] px-6 py-3 hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#161616] transition-all">
                Already set up? Play free →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} variant="rise" delay={i * 40} className="scroll-mt-24" >
              <div id={`step-${s.n}`} className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-7 md:p-8">
                <span className="font-mono font-bold text-2xl text-[#F5B700]" style={{ textShadow: '1.5px 1.5px 0 #161616' }}>{s.n}</span>
                <h2 className="font-display font-extrabold text-2xl md:text-3xl text-[#161616] mt-2">{s.title}</h2>
                <div className="mt-4 space-y-3">
                  {s.body.map((p, pi) => (
                    <p key={pi} className="font-sans text-[15px] text-[#161616]/85 leading-relaxed">{p}</p>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}

          {/* Command cheat sheet */}
          <Reveal variant="rise">
            <div className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-7 md:p-8">
              <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#FFDD55] uppercase">The only 7 terminal commands you need on day one</p>
              <div className="mt-5 divide-y divide-white/10">
                {COMMANDS.map((c) => (
                  <div key={c.cmd} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
                    <div className="flex items-center gap-2 sm:w-64 shrink-0">
                      <code className="font-mono text-sm text-[#FFDD55] bg-white/5 border border-white/10 px-2 py-1">{c.cmd}</code>
                      <CopyButton text={c.cmd.replace(/^Ctrl \+ C$/, '')} />
                    </div>
                    <p className="font-sans text-sm text-white/70">{c.does}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Closer */}
          <Reveal variant="drop">
            <div className="text-center pt-6">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <Image src="/brand/mascot.png" alt="Mr. Mustard" fill sizes="80px" className="object-contain" />
              </div>
              <h3 className="font-display italic font-extrabold text-3xl md:text-4xl text-[#161616]">
                That is the whole ramp.
              </h3>
              <p className="font-sans text-[#161616]/75 max-w-xl mx-auto mt-3">
                You now know more about Claude than most people who have used it for a year. Mission one of
                the Code track picks up exactly where this page ends, with real coaching and a real build.
              </p>
              <a
                href="/mustard-mode#top"
                className="inline-block mt-6 font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] px-7 py-3.5 hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#161616] transition-all"
              >
                Play your free coaching session →
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
