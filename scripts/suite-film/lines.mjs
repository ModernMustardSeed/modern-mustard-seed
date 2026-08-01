/**
 * THE PER-LEAD FILM SCRIPT.
 *
 * Sarah, 2026-08-01: "it is supposed to show a new video of THEIR site and
 * agent and command center. It is currently just playing Wills Electric's
 * video and that is not what I want."
 *
 * So nothing here is a fixed film. Every line is written from the lead's own
 * row and their frozen OS config, and the staged call is a real call to THEIR
 * forged agent about a job THEIR trade actually gets called about. The format
 * is the one Sarah approved on the Wills Electric cut: female narrator,
 * pop-art open and close, and a live call in the middle where the agent gets
 * shown off rather than described.
 *
 * Beat ids are the contract between this file, the recorder (which holds each
 * beat for exactly its narration length) and the composer (which lays the
 * narration back down at the same offsets). Do not rename one without the
 * others.
 */

/**
 * What the staged caller says, per trade. Two turns: the ask, then the
 * commitment, because a call that only asks a question never shows the agent
 * doing the thing that makes it worth money (taking the booking).
 *
 * These are written to be true of the trade and boring on purpose. A caller
 * who monologues makes the agent look slow.
 */
const CALLER_TURNS = {
  roofing: ['Hi there. I think I have got a leak over my kitchen after that last storm. Can somebody come out and look at it?', 'Thursday morning works for me. My name is Dana Whitfield.'],
  hvac: ['Hey, my air conditioner is blowing warm and the house is not cooling down at all. How soon can somebody get out here?', 'Thursday morning works. My name is Dana Whitfield.'],
  plumbing: ['Hi, I have got water coming up around the base of my toilet and I already shut the valve off. Can you get somebody out?', 'Thursday morning is good. My name is Dana Whitfield.'],
  electrical: ['Hi, half the outlets in my kitchen just went dead and the breaker keeps tripping when I reset it. Can somebody come take a look?', 'Thursday morning works for me. My name is Dana Whitfield.'],
  restoration: ['Hi, we came home to about an inch of water in the basement and it is still spreading. Can you get a crew out?', 'Thursday morning is fine. My name is Dana Whitfield.'],
  septic: ['Hi, my septic is backing up into the downstairs shower and it smells awful. How soon can you get out here?', 'Thursday morning works. My name is Dana Whitfield.'],
  towing: ['Hey, my car died on the shoulder and I need a tow to my shop. How long is the wait?', 'That works. My name is Dana Whitfield.'],
  locksmith: ['Hi, I am locked out of my house and my keys are inside. How fast can somebody get here?', 'That works. My name is Dana Whitfield.'],
  garage_door: ['Hi, my garage door is stuck about halfway open and it will not go up or down. Can somebody come look at it?', 'Thursday morning works. My name is Dana Whitfield.'],
  tree_service: ['Hi, I have got a big limb hanging over my roof after the wind last night and it does not look safe. Can you take a look?', 'Thursday morning is good. My name is Dana Whitfield.'],
  landscaping: ['Hi, I am looking to get my yard cleaned up and back on a regular mow. Can somebody come give me a price?', 'Thursday morning works. My name is Dana Whitfield.'],
  pool_spa: ['Hi, my pool has gone completely green and I cannot get it back. Can somebody come out and look at it?', 'Thursday morning works. My name is Dana Whitfield.'],
  pest_control: ['Hi, I am seeing mice in my kitchen and I would like to get somebody out to deal with it.', 'Thursday morning is good. My name is Dana Whitfield.'],
  painting: ['Hi, I want to get the outside of my house painted this summer. Can somebody come out and give me a quote?', 'Thursday morning works. My name is Dana Whitfield.'],
  moving: ['Hi, I am moving out of a three bedroom next month and I need a quote. Do you handle the packing too?', 'Thursday morning works for a walkthrough. My name is Dana Whitfield.'],
  cleaning: ['Hi, I am looking for a regular cleaning, every other week. Can somebody come out and give me a price?', 'Thursday morning works. My name is Dana Whitfield.'],
  auto_repair: ['Hi, my check engine light came on and the car is running rough. Can you get it in this week?', 'Thursday morning works. My name is Dana Whitfield.'],
  medspa: ['Hi, I wanted to ask about your facials and see about getting in this week.', 'Thursday morning works. My name is Dana Whitfield.'],
  dental: ['Hi, I have got a tooth that has been aching for a couple of days now. Can you get me in?', 'Thursday morning works. My name is Dana Whitfield.'],
  vet: ['Hi, my dog has not been eating for two days and he seems off. Can I get him in?', 'Thursday morning works. My name is Dana Whitfield.'],
  attorney: ['Hi, I wanted to see about setting up a consultation. What does that process look like?', 'Thursday morning works. My name is Dana Whitfield.'],
  wedding: ['Hi, we are planning a wedding for next spring and I wanted to see if you still have dates open.', 'Thursday morning works for a call. My name is Dana Whitfield.'],
  salon: ['Hi, I wanted to book a cut and color. What have you got open this week?', 'Thursday morning works. My name is Dana Whitfield.'],
  cafe_bakery: ['Hi, I wanted to ask about ordering a cake for about forty people. Do you do that?', 'Thursday morning works to come in. My name is Dana Whitfield.'],
  restaurant: ['Hi, I wanted to see about a table for six on Friday evening, and whether you do anything for a birthday.', 'Seven o clock is perfect. My name is Dana Whitfield.'],
  real_estate: ['Hi, I am thinking about selling my house this year and I wanted to talk about what it might be worth.', 'Thursday morning works. My name is Dana Whitfield.'],
  home_services: ['Hi, I wanted to see about getting somebody out to take a look and give me a price.', 'Thursday morning works. My name is Dana Whitfield.'],
  professional: ['Hi, I wanted to ask what you charge and see about getting on the schedule.', 'Thursday morning works. My name is Dana Whitfield.'],
};

const FALLBACK_TURNS = [
  'Hi there, I wanted to ask what you charge and see about getting on the schedule this week.',
  'Thursday morning works for me. My name is Dana Whitfield.',
];

/** A word for the thing they sell, used in the narration. Kept plain. */
function tradeNoun(config) {
  const label = (config?.tradeLabel || '').trim();
  if (!label) return 'the work';
  return label.toLowerCase();
}

/**
 * Trim a business name down to something a narrator can say without tripping.
 * Legal suffixes read as robotic when spoken aloud.
 */
export function spokenName(business) {
  return String(business || 'your business')
    .replace(/,?\s*\b(llc|l\.l\.c\.|inc\.?|incorporated|co\.|corp\.?|ltd\.?)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'your business';
}

/**
 * Build the whole film script for one lead.
 *
 * `have` says which demos actually exist. A missing demo drops its beat rather
 * than narrating something the viewer cannot see, because a film that promises
 * a command center and then cuts to black is worse than a shorter film.
 */
export function filmScript({ lead, config, have }) {
  const biz = spokenName(lead.business_name);
  const first = (lead.contact_name || '').trim().split(/\s+/)[0] || '';
  const noun = tradeNoun(config);
  const city = (config?.city || lead.city || '').trim();
  const trade = config?.trade;
  const turns = CALLER_TURNS[trade] || FALLBACK_TURNS;

  const beats = [];

  beats.push({
    id: 'open',
    kind: 'card',
    card: 'open',
    vo: first
      ? `Hi ${first}. This is what we built for ${biz}. All of it is real, all of it is working, and all of it was made in the last hour.`
      : `This is what we built for ${biz}. All of it is real, all of it is working, and all of it was made in the last hour.`,
  });

  if (have.site) {
    beats.push({
      id: 'site-open',
      kind: 'site',
      scroll: 0,
      vo: `Start with the website. Nobody dropped your name into a template. This one was designed around ${noun}, from scratch, for you.`,
    });
    beats.push({
      id: 'site-scroll',
      kind: 'site',
      scroll: 2400,
      vo: `Every section on it is doing a job, and it is built to be found: your own search markup, written so Google and the AI assistants can read who you are${city ? ` and that you work in ${city}` : ''}.`,
    });
  }

  if (have.call) {
    beats.push({
      id: 'call-setup',
      kind: 'site',
      scroll: 0,
      vo: 'Now the part nobody expects. This website answers its own phone. Listen.',
    });
    // The call beat has no narration on purpose: the agent is the audio.
    beats.push({ id: 'call', kind: 'call', vo: null, turns });
    beats.push({
      id: 'call-land',
      kind: 'site',
      scroll: 0,
      vo: `That was your agent. It picked up on the first ring, it knew ${biz}, and it took the booking. It does that at two in the morning, on Sundays, and while you are already on another call.`,
    });
  }

  if (have.os) {
    beats.push({
      id: 'os-today',
      kind: 'os',
      tab: 'today',
      label: 'Today',
      vo: 'And every one of those calls lands here, in your command center.',
    });
    beats.push({
      id: 'os-calls',
      kind: 'os',
      tab: 'calls',
      label: 'Calls',
      vo: 'Every call it answered, what they wanted, and what it did about it.',
    });
    beats.push({
      id: 'os-jobs',
      kind: 'os',
      tab: 'jobs',
      label: 'Jobs',
      vo: 'The work that came out of them, and the schedule it filled while you were out on a job.',
    });
    beats.push({
      id: 'os-automations',
      kind: 'os',
      tab: 'automations',
      label: 'Automations',
      vo: 'And the follow ups that run themselves, so nothing sits there going cold.',
    });
  }

  beats.push({
    id: 'close',
    kind: 'card',
    card: 'close',
    vo: 'It is all live right now, waiting at your link. Nothing to sign, nothing to cancel, nothing owed. If you want it, just reply and tell us.',
  });

  return { biz, first, beats };
}
