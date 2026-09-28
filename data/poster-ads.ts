/**
 * The Facebook poster ads made 2026-09-28: eight trade posters plus the
 * General beach poster, each in two versions (Call Sarah, Call Anthony).
 * Rendered by components/admin/PosterAds.tsx at /admin/posters.
 *
 * Captions are stored once, in Sarah's version, verbatim from CAPTIONS.txt.
 * The Anthony version is derived by forPerson(), which swaps the name and
 * number in the call line and the DM signoff, so a caption can never name a
 * different person or number than the poster it is posted with.
 *
 * Files live in public/ads/posters-2026-09-28/:
 *   <slug>-call-<person>.jpg           full resolution, 2160 x 2700, quality 92
 *   <slug>-call-<person>-preview.webp  864 x 1080 preview for the page
 * Source art: dev/mms/marketing/fb-*-poster-2026-09-28.
 */

export type PosterPerson = 'sarah' | 'anthony';

export const POSTER_PEOPLE: Record<PosterPerson, { name: string; phone: string }> = {
  sarah: { name: 'Sarah', phone: '406-250-6076' },
  anthony: { name: 'Anthony', phone: '406-334-9981' },
};

export type PosterCaption = { label: string; text: string };

export type PosterAd = {
  slug: string;
  name: string;
  /** Captions in Sarah's version. Use forPerson() to get the Anthony version. */
  captions: PosterCaption[];
};

export const POSTER_DIR = '/ads/posters-2026-09-28';
export const POSTER_WIDTH = 2160;
export const POSTER_HEIGHT = 2700;

export function posterFile(slug: string, person: PosterPerson) {
  return `${POSTER_DIR}/${slug}-call-${person}.jpg`;
}

export function posterPreview(slug: string, person: PosterPerson) {
  return `${POSTER_DIR}/${slug}-call-${person}-preview.webp`;
}

export function posterDownloadName(slug: string, person: PosterPerson) {
  return `mms-${slug}-call-${person}.jpg`;
}

/** Rewrites a Sarah-version caption or DM for the given person. */
export function forPerson(text: string, person: PosterPerson) {
  if (person === 'sarah') return text;
  const p = POSTER_PEOPLE[person];
  return text
    .split(`Sarah at ${POSTER_PEOPLE.sarah.phone}`)
    .join(`${p.name} at ${p.phone}`)
    .replace(/- Sarah$/, `- ${p.name}`);
}

/** Post this under every group post, right away. Same for both versions. */
export const POSTER_FIRST_COMMENT = "Drop your business name and town below and I'll tell you what ChatGPT says about you. Free, takes me two minutes.";

/** For owners messaged directly. No link; attach the matching poster. Sarah's version. */
export const POSTER_DM = "Hi [name]! I asked ChatGPT who the best [trade] in [town] is and [business] wasn't in the answer yet. I build websites made to be the one Google and ChatGPT recommend (poster attached, it made me laugh). Want me to send you what it said? No pressure either way. - Sarah";

export const POSTER_ADS: PosterAd[] = [
  {
    slug: "contractors",
    name: "Contractors and Builders",
    captions: [
      { label: "A", text: "Contractors, fair warning 😂 This is what happens when Google and ChatGPT start handing out your number. Mr. Mustard is on a roof. His phone won't stop. Mrs. Mustard is on lemonade break.\n\nWe build custom websites for builders and trades made to be the one Google and ChatGPT recommend when someone asks \"who's the best contractor near me.\" Built to put you at the top of your trade in your town. Want more? Add a marketing system that runs itself: automations, social posting and ads.\n\nSet package pricing. Changes included. You own everything. Call Sarah at 406-250-6076 to get started or ask a question. 🌱" },
      { label: "B", text: "Contractors: open ChatGPT right now and type \"who's the best [your trade] in [your town]?\" If your name isn't in the answer, that job went to someone else and you never knew it happened.\n\nWe build custom websites so Google and ChatGPT suggest you, built to rank at the top of your trade. Optional marketing system: automations, social posts and ads that run while you're on the job. Call Sarah at 406-250-6076. Happy to answer questions, no pressure." },
      { label: "C", text: "Builders and trades 🔨 Custom websites made to be the one Google and ChatGPT recommend, built to put you at the top of your trade in your town. Optional marketing system: automations, social posting, ads. Set package pricing, you own everything. Call Sarah at 406-250-6076." },
    ],
  },
  {
    slug: "small-business",
    name: "Small Business",
    captions: [
      { label: "A", text: "Small business owners, consider yourselves warned 😂 Mr. Mustard has a line around the block and a receipt longer than his arm. Mrs. Mustard is reading a magazine. Who sent everyone? Google. And ChatGPT.\n\nWe build custom websites made to be the one Google and ChatGPT recommend when someone asks \"who's the best ___ near me,\" built to put you at the top of your industry in your town. Add a marketing system if you want one: automations, social posting and ads.\n\nSet package pricing. Changes included. You own everything. Call Sarah at 406-250-6076. 🌱" },
      { label: "B", text: "Quick test for every business owner here: ask ChatGPT who the best [what you do] in [your town] is. It names three or four businesses. If yours isn't one, those customers never hear about you.\n\nWe build custom websites so Google and ChatGPT suggest you, built to rank at the top of your industry. Optional automations, social posting and ads. Call Sarah at 406-250-6076 to get started or ask a question." },
    ],
  },
  {
    slug: "landscaping",
    name: "Landscaping and Lawn Care",
    captions: [
      { label: "A", text: "Landscapers 😂 The dog is driving the mower now. Mr. Mustard is holding on for dear life. Mrs. Mustard is in the hammock. Forty more yards just called. Who sent them? Google. And ChatGPT.\n\nWe build custom websites for lawn and landscape crews made to be the one Google and ChatGPT recommend, built to put you at the top of your trade in town. Optional marketing system: automations, social posting, ads. Set package pricing, you own everything. Call Sarah at 406-250-6076." },
      { label: "B", text: "Lawn care owners: ask ChatGPT \"who's the best landscaper in [your town]?\" If it doesn't say your name, next season's yards are going to someone else. Custom websites built so Google and ChatGPT suggest you, plus optional automations, social and ads. Call Sarah at 406-250-6076." },
    ],
  },
  {
    slug: "plumbing-hvac",
    name: "Plumbing and HVAC",
    captions: [
      { label: "A", text: "Plumbers and HVAC pros 😂 Mr. Mustard is under a sink that turned into a fountain, holding his phone above the waterline. Mrs. Mustard brought an umbrella and tea. The calls? Google. And ChatGPT. A flood of them.\n\nWe build custom websites made to be the one Google and ChatGPT recommend when someone's pipe bursts at 2 AM and they ask \"who's the best plumber near me.\" Built to put you at the top of your trade in town. Optional automations, social posting and ads. Call Sarah at 406-250-6076." },
      { label: "B", text: "When a pipe bursts, nobody scrolls. They ask ChatGPT or Google and call the first name. Is it yours? Custom websites built to be that name, plus optional automations, social and ads. Set package pricing, you own everything. Call Sarah at 406-250-6076." },
    ],
  },
  {
    slug: "salons-spas",
    name: "Salons, Spas and Stylists",
    captions: [
      { label: "A", text: "Stylists 😂 Mr. Mustard is in foils getting the pompadour of his life and his phone will not stop booking. Mrs. Mustard is calmly blow-drying. The waiting room is full. Who booked everyone? Google. And ChatGPT.\n\nWe build custom websites for salons, spas and stylists made to be the one Google and ChatGPT recommend, built to put you at the top of your industry in town. Optional marketing system: automations, social posting, ads. Call Sarah at 406-250-6076. 💇‍♀️" },
      { label: "B", text: "Ask ChatGPT \"best hair salon in [your town].\" If your chair isn't in the answer, those clients are booking somewhere else. Custom websites built so Google and ChatGPT suggest you, plus optional automations, social and ads. Call Sarah at 406-250-6076." },
    ],
  },
  {
    slug: "restaurants-cafes",
    name: "Restaurants and Cafes",
    captions: [
      { label: "A", text: "Restaurant owners 😂 Three flaming pans, tickets raining from the ceiling, a line out the door. Mr. Mustard would like to know WHO told everyone they're the best. Mrs. Mustard knows: Google. And ChatGPT.\n\nWe build custom websites for restaurants and cafes made to be the one Google and ChatGPT recommend when someone asks \"where should we eat tonight?\" Built to put you at the top of your town. Optional automations, social posting and ads. Call Sarah at 406-250-6076." },
      { label: "B", text: "\"Where should we eat tonight?\" More people ask ChatGPT that every week. Is your place in the answer? Custom websites built to be, plus optional social posting and ads. Set package pricing, you own everything. Call Sarah at 406-250-6076." },
    ],
  },
  {
    slug: "cleaning",
    name: "Cleaning Services",
    captions: [
      { label: "A", text: "Cleaning business owners 😂 Mr. Mustard is surfing a mop across the living room, the puppy is a bubble cloud, and the phone keeps finding MORE houses. Mrs. Mustard just keeps polishing. Who's sending them? Google. And ChatGPT.\n\nWe build custom websites for cleaning services made to be the one Google and ChatGPT recommend, built to put you at the top of your trade in town. Optional automations, social posting and ads. Call Sarah at 406-250-6076. ✨" },
      { label: "B", text: "Ask ChatGPT for \"the best house cleaner in [your town].\" If it's not you, your next regular client is booking someone else. Custom websites built so Google and ChatGPT suggest you, plus optional automations, social and ads. Call Sarah at 406-250-6076." },
    ],
  },
  {
    slug: "auto-detailing",
    name: "Auto, Detailing and Repair",
    captions: [
      { label: "A", text: "Detailers and shop owners 😂 The pressure washer won. Mr. Mustard is covered in pink foam, phone bagged and held high, while a line of muddy trucks waits outside. Mrs. Mustard is sitting on the hood. Who sent the trucks? Google. And ChatGPT.\n\nWe build custom websites for detailers, body shops and mechanics made to be the one Google and ChatGPT recommend, built to put you at the top of your trade in town. Optional automations, social posting and ads. Call Sarah at 406-250-6076. 🚙" },
      { label: "B", text: "Ask ChatGPT \"best mechanic near me.\" Is your shop in the answer? Custom websites built to be, plus optional automations, social and ads. Set package pricing, you own everything. Call Sarah at 406-250-6076." },
    ],
  },
  {
    slug: "general",
    name: "General",
    captions: [
      { label: "A", text: "Small business owners 👋 Ask ChatGPT who the best in your trade is in your town. If it doesn't name you, those customers never hear about you. We build custom websites made to be the one Google and ChatGPT recommend, with an optional marketing system on top: automations, social posting and ads. Set package pricing, and you own everything. Call Sarah at 406-250-6076 to get started or ask a question." },
    ],
  },
];
