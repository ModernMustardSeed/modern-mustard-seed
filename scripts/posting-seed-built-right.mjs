#!/usr/bin/env node
// Daily Posting for Built Right in Montana: the brief the editor works from.
// Idempotent: run it again and it updates the brief. Nothing here writes a
// post; the client writes those, in their portal, and we shape them.
//
//   node scripts/posting-seed-built-right.mjs
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CLIENT = 'builtbyshan@gmail.com';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Every line traces to the onboarding answers of 2026-09-09 or the live site.
const settings = {
  client_email: CLIENT,
  business_name: 'Built Right in Montana',
  site_url: 'https://builtrightinmontana.com',
  phone: '(406) 471-5613',
  towns: ['Kalispell', 'Whitefish', 'Bigfork', 'Columbia Falls', 'Eureka', 'Lakeside', 'Polson'],
  services: ['Custom homes', 'Remodels and renovations', 'Land and plans: matching a plan to a lot', 'Lakefront and mountain homes'],
  facts: 'Luxury custom homes in the Flathead Valley since 1997. Family business: Shan founded it, Zayne runs the sites, Carmen runs the office. Montana contractor registration 249460.',
  tone: 'Plain, confident, warm, specific. High end and simple, never busy. We speak as the business: we, us, our. It should never look like we are begging for work.',
  hard_nos: 'Never a price, a price per square foot, a timeline, a completion date, or anything about financing unless their own text says it. Nothing cartoonish. Never invent a project, a client, a review or an award. Never claim our name is on a building, truck or sign. Never mention Web Express or any past vendor.',
  platforms: ['facebook', 'instagram', 'linkedin', 'x', 'gbp', 'houzz'],
  post_hour_mt: 9,
  auto_publish: true,
  weekly_summary: true,
  notify_emails: [CLIENT],
  active: true,
  updated_at: new Date().toISOString(),
};

const { error } = await sb.from('posting_settings').upsert(settings, { onConflict: 'client_email' });
if (error) { console.error('settings:', error.message); process.exit(1); }
console.log('brief saved for', settings.business_name);
