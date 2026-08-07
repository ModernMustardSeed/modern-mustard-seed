/**
 * Seed the HUNDREDFOLD demo: a fictional med spa taken all the way through the
 * system, so the walkthrough film has something real to walk through.
 *
 * Whitaker Med Spa does not exist. Every number below is invented for the demo
 * and the row is marked source 'demo' so it can never be counted as a lead or
 * mistaken for a client. What is NOT faked is the machinery: the interview runs
 * through the real turn engine and the plan comes out of the real synthesis, so
 * the film shows the actual product rather than a mockup of it.
 *
 *   npx tsx scripts/hundredfold-demo-seed.mts [--base http://localhost:3001]
 */

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const BASE = flag('base') ?? 'http://localhost:3001';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
process.env.SUPABASE_URL ??= process.env.supabase_url;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= process.env.supabase_service_role_key;

/**
 * The owner's answers, keyed to the question bank. The script replies to
 * whatever Mr. Mustard actually asks rather than reading a script at him, which
 * is why the transcript reads like a conversation instead of a form dump.
 *
 * Dana is deliberately a GOOD business with a specific, fixable problem: strong
 * demand, weak retention and follow-up, no recurring revenue, and an owner who
 * is the bottleneck. That is the most common shape in this market.
 */
const ANSWERS: Record<string, string> = {
  what_you_sell:
    'Med spa. Botox, fillers, laser, facials. Mostly women thirty-five to sixty here in the Flathead valley.',
  why_you:
    'We have a nurse practitioner on staff every single day, which nobody else in the valley does, and we do not upsell people. They trust us. Half our clients came because a friend told them we would tell them if they did not need something.',
  years: 'Six years this spring.',
  team: 'Four of us. Me, two injectors, and a girl at the front desk.',
  revenue: 'About nine hundred thousand last year.',
  avg_ticket: 'First visit is usually around six hundred fifty dollars.',
  margin:
    'Maybe sixty percent after product and the injector time? I have honestly never sat down and worked it out properly.',
  recurring:
    'Nothing. Every month starts at zero. That is the part that keeps me up, honestly.',
  first_30_cash:
    'They pay the day of, in full. No deposits, no payment plans, so whatever they spend that day is it.',
  last_raise:
    'Two years ago. I raised tox by a dollar a unit and lost my nerve about the rest of it.',
  new_customers: 'Maybe twenty-five new faces last month.',
  best_channel:
    'Word of mouth, mostly. Existing clients bringing friends. We have Instagram but I am terrible about posting.',
  leads_per_customer:
    'I could not tell you. People call or DM us and either they book or they do not. Nobody writes any of it down.',
  cac: 'No idea. We spend almost nothing on ads so I guess close to zero, but I know that is not really the answer.',
  list:
    'We have maybe eleven hundred people in our booking software from over the years. I have never emailed them once.',
  ads: 'We boosted a couple posts. Maybe two hundred a month, and I could not tell you if it did anything.',
  close_rate:
    'If they actually come in for a consult, eight out of ten book something. Getting them in is the hard part.',
  lose_reason:
    'They say they want to think about it, or that they need to check with their husband. I think the real reason is the price scares them and I am not good at handling that moment.',
  after_no:
    'Nothing happens. That is the honest answer. They leave, we say we will follow up, and then Friday comes and nobody has called anybody.',
  warm_unclosed:
    'Since spring? Probably sixty or seventy people came in for a consult and did not book. Their names are in the booking software and nowhere else.',
  response_time:
    'It goes to voicemail. We check it in the morning. If somebody DMs us at nine at night I usually see it at seven the next morning, sometimes later.',
  double_breaks:
    'Me. I am the one doing the consults and half the injections. We would run out of my hours before we ran out of rooms.',
  delivery_hours:
    'I am in a treatment room probably thirty-five hours a week, and then another fifteen doing orders, payroll, and the phone.',
  only_you:
    'The consults. I have not taught anyone else to do them because I have never written down how I do them.',
  resent:
    'Ordering and the insurance paperwork. And chasing people who ghost us after a consult, which is why I stopped doing it.',
  tried:
    'We hired a marketing girl for six months. She posted pretty pictures and nothing happened. I think she never actually understood what we sell.',
  avoiding:
    'Raising prices. And calling the people who did not book. Both of them make me feel like I am bothering someone.',
  best_month:
    'Last November we did about a hundred and ten thousand. We ran a holiday tox special and the room was full for three weeks straight.',
  praise:
    'They say they feel like themselves again, not like they had work done. That is the line I hear over and over.',
  twelve_months:
    'I want to clear a million and a half, and I want to be out of the treatment room two days a week.',
  why_that:
    'My daughter is a senior next year and I have missed almost everything. I do not want to look back and realize I built a job that ate the whole thing.',
};

const FALLBACK =
  'Honestly I am not sure. Give me your best guess and I will tell you if it sounds right.';

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data as Record<string, unknown>;
}

const start = (await post('/api/hundredfold/interview', {
  email: 'dana@whitakermedspa.demo',
  name: 'Dana Whitaker',
  business_name: 'Whitaker Med Spa',
  phone: '(406) 555 0142',
  channel: 'typed',
})) as { interviewId: string; memberId: string; systemPrompt: string };

console.log(`Interview ${start.interviewId} for member ${start.memberId}`);

let answer = '';
let asked = 0;
const used = new Set<string>();

for (let i = 0; i < 45; i += 1) {
  const turn = (await post(`/api/hundredfold/interview/${start.interviewId}/turn`, {
    answer,
    systemPrompt: start.systemPrompt,
  })) as { say: string; questionKey: string; done: boolean; progress: { covered: number; total: number } };

  console.log(`\n[${turn.progress.covered}/${turn.progress.total}] MUSTARD: ${turn.say.slice(0, 160)}`);
  if (turn.done) {
    console.log('\nHe called it. Closing the interview.');
    break;
  }

  const key = turn.questionKey;
  // Answer what he asked. When he pushes on the same question twice, give him a
  // little more rather than repeating, which is what a real person does.
  if (key && ANSWERS[key] && !used.has(key)) {
    answer = ANSWERS[key];
    used.add(key);
    asked += 1;
  } else if (key && ANSWERS[key]) {
    answer = `Like I said, ${ANSWERS[key][0].toLowerCase()}${ANSWERS[key].slice(1)}`;
  } else {
    answer = FALLBACK;
  }
  console.log(`         DANA: ${answer.slice(0, 120)}`);
}

await post(`/api/hundredfold/interview/${start.interviewId}/complete`, {});
console.log(`\nInterview complete. ${asked} distinct questions answered.`);
console.log(`Now run the three synthesis steps in /admin/hundredfold/${start.memberId}`);
console.log(`MEMBER_ID=${start.memberId}`);
