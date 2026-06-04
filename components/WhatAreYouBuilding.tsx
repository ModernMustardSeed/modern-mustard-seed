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
    engagement: 'Idea to Product — fixed scope, now booking',
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
        <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-7 block">
          Get specific
        </span>
        <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.15] mb-6">
          What are you{' '}
          <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
            trying to build?
          </span>
        </h2>
        <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed mb-12 max-w-2xl mx-auto">
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
                className={`group inline-flex items-center gap-2.5 px-5 py-3 rounded-full text-[11px] md:text-[12px] uppercase tracking-[0.18em] font-sans font-extrabold border-2 border-[#161616] transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#F5B700] text-[#161616] shadow-[3px_3px_0_0_#161616] -translate-y-0.5'
                    : 'bg-white text-[#161616] hover:bg-[#FFF3CC]'
                }`}
              >
                <span className="text-base">{intent.emoji}</span>
                {intent.chip}
              </button>
            );
          })}
        </div>

        {selected && (
          <div
            key={selected.key}
            className="pop-card p-8 md:p-10 max-w-3xl mx-auto text-left opacity-0 animate-fade-in-up"
          >
            <span className="text-[9px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-3 block">
              Your build
            </span>
            <h3 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-3 leading-snug">
              {selected.title}
            </h3>
            <p className="text-[#3a3733] text-sm md:text-base font-body leading-relaxed mb-6">
              {selected.body}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t-2 border-[#161616]/10 mb-7">
              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold mb-2 block">
                  Engagement
                </span>
                <p className="text-[#161616] text-sm font-body font-bold leading-relaxed">
                  {selected.engagement}
                </p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold mb-2 block">
                  Read first
                </span>
                <Link
                  href={`/playbooks/${selected.playbookSlug}`}
                  className="text-[#1E50C8] hover:text-[#E0301E] text-sm font-body font-bold leading-relaxed transition-colors inline-flex items-center gap-1.5"
                >
                  {selected.playbookTitle} →
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={selected.key === 'audit' ? '/audit' : `/build-queue?intent=${selected.key}`}
                className="flex-1 text-center px-8 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                {selected.key === 'audit' ? 'Run the free audit' : 'Reserve a queue slot'}
              </Link>
              <Link
                href={`/playbooks/${selected.playbookSlug}`}
                className="flex-1 text-center px-8 py-3.5 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
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
