'use client';

import Link from 'next/link';
import { useState } from 'react';

type Intent = {
  key: string;
  chip: string;
  emoji: string;
  title: string;
  body: string;
  playbookSlug: string;
  playbookTitle: string;
  engagement: string;
};

const INTENTS: Intent[] = [
  {
    key: 'website',
    chip: 'A website',
    emoji: '◆',
    title: 'A real website that converts',
    body: 'A custom site that loads fast, looks elite, and actually sells what you do. Built, hosted, and indexed in 30 days. You own it forever.',
    playbookSlug: '30-day-app-build',
    playbookTitle: 'The 30-Day App Build Playbook',
    engagement: 'Online Presence build — fixed scope, fixed quote',
  },
  {
    key: 'ai-tool',
    chip: 'A specialty AI tool',
    emoji: '⚡',
    title: 'A custom AI tool only your business has',
    body: 'Specialty internal or industry-facing tools that take work off your plate or sell to your niche. Think DEED AI for landscapers or PTG Deal Analyzer for title work.',
    playbookSlug: 'specialty-ai-tool',
    playbookTitle: 'The Specialty AI Tool Playbook',
    engagement: 'Idea to Product — fixed scope, four per quarter',
  },
  {
    key: 'phone-agent',
    chip: 'A phone or voice agent',
    emoji: '◐',
    title: 'A 24/7 voice agent that answers calls',
    body: 'Custom voice AI that books appointments, answers FAQs, and routes urgent calls. Sounds human. Costs less than a part-time hire.',
    playbookSlug: '14-day-voice-agent',
    playbookTitle: 'The 14-Day Voice Agent Playbook',
    engagement: 'Idea to Product — voice agent build',
  },
  {
    key: 'dashboard',
    chip: 'An internal tool',
    emoji: '▣',
    title: 'A custom admin or ops dashboard',
    body: 'Admin panels, CRMs, lead trackers, and operations dashboards built around how your team actually works. Replace the spreadsheet you outgrew last year.',
    playbookSlug: 'scope-an-ai-project',
    playbookTitle: 'How to Scope an AI Project in 90 Minutes',
    engagement: 'Idea to Product — internal tool build',
  },
  {
    key: 'audit',
    chip: 'I am not sure yet',
    emoji: '✦',
    title: 'Start with a free AI audit',
    body: 'Drop your site URL and get a personalized read on where AI could save you time or earn you money. Five minutes. No call. No spam.',
    playbookSlug: 'scope-an-ai-project',
    playbookTitle: 'How to Scope an AI Project in 90 Minutes',
    engagement: 'Free AI Audit — five-minute teardown',
  },
];

export default function WhatAreYouBuilding() {
  const [selected, setSelected] = useState<Intent | null>(null);

  return (
    <section className="relative w-full px-6 md:px-16 lg:px-24 xl:px-32 py-24 md:py-32">
      <div className="max-w-4xl mx-auto text-center">
        <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-7 block">
          Get specific
        </span>
        <h2 className="font-sans text-3xl md:text-5xl font-semibold text-white tracking-tight leading-[1.15] mb-6">
          What are you <span className="text-gradient-mustard">trying to build?</span>
        </h2>
        <p className="text-white/55 text-base md:text-lg font-body font-light leading-relaxed mb-12 max-w-2xl mx-auto">
          Tap one. Get the playbook, the engagement model, and a ready-to-send brief in three seconds.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {INTENTS.map((intent) => {
            const isSelected = selected?.key === intent.key;
            return (
              <button
                key={intent.key}
                onClick={() => setSelected(intent)}
                aria-pressed={isSelected}
                className={`group inline-flex items-center gap-2.5 px-5 py-3 rounded-full text-[11px] md:text-[12px] uppercase tracking-[0.18em] font-sans font-semibold transition-all duration-300 ${
                  isSelected
                    ? 'bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 text-white border border-mustard-500 shadow-[0_0_30px_rgba(255,107,53,0.4)] scale-[1.02]'
                    : 'bg-white/[0.04] text-white/65 border border-white/10 hover:border-mustard-500/40 hover:text-mustard-300 hover:bg-mustard-500/[0.06]'
                }`}
              >
                <span
                  className={`text-base transition-transform duration-300 ${
                    isSelected ? 'scale-110' : 'opacity-70 group-hover:opacity-100'
                  }`}
                >
                  {intent.emoji}
                </span>
                {intent.chip}
              </button>
            );
          })}
        </div>

        {selected && (
          <div
            key={selected.key}
            className="glass-card p-8 md:p-10 max-w-3xl mx-auto text-left opacity-0 animate-fade-in-up"
          >
            <span className="text-[9px] uppercase tracking-[0.3em] text-mustard-500 font-mono font-bold mb-3 block">
              Your build
            </span>
            <h3 className="font-sans text-xl md:text-2xl font-semibold text-white tracking-tight mb-3 leading-snug">
              {selected.title}
            </h3>
            <p className="text-white/65 text-sm md:text-base font-body font-light leading-relaxed mb-6">
              {selected.body}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-white/[0.06] mb-7">
              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/35 font-mono font-bold mb-2 block">
                  Engagement
                </span>
                <p className="text-mustard-200/90 text-sm font-body leading-relaxed">
                  {selected.engagement}
                </p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/35 font-mono font-bold mb-2 block">
                  Read first
                </span>
                <Link
                  href={`/playbooks/${selected.playbookSlug}`}
                  className="text-white/85 hover:text-mustard-400 text-sm font-body leading-relaxed transition-colors inline-flex items-center gap-1.5"
                >
                  {selected.playbookTitle} →
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={
                  selected.key === 'audit'
                    ? '/audit'
                    : `/build-queue?intent=${selected.key}`
                }
                className="flex-1 text-center px-8 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-bold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full hover:shadow-[0_0_40px_rgba(255,107,53,0.4)] transition-all"
              >
                {selected.key === 'audit' ? 'Run the free audit' : 'Reserve a queue slot'}
              </Link>
              <Link
                href={`/playbooks/${selected.playbookSlug}`}
                className="flex-1 text-center px-8 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-semibold text-mustard-400 border border-mustard-500/30 rounded-full hover:bg-mustard-500/10 hover:border-mustard-500/50 transition-all"
              >
                Open the playbook
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
