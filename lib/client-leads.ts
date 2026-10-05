/**
 * LEADS FROM A CLIENT'S OWN SITE: the parts shared by the endpoint, the
 * portal, and the Monday digest.
 *
 * Priority comes from the buyer's starting point, in the order Carmen gave
 * on the onboarding: land and plans, land without plans, plans without land,
 * then a remodel. The visitor's own words are stored as given; this only
 * reads them.
 */
import { resendClient } from '@/lib/send-email';
import { sendSms, toE164 } from '@/lib/sms';
import { SITE } from '@/lib/seo';

export type ClientProject = {
  key: string;
  /** Their own sign-in door, modernmustardseed.com/cc/<door>. Defaults to key. */
  door?: string;
  /**
   * The day their site went public. Website chats from before it were our own
   * testing on the preview, so the chat sync never copies them into the room.
   */
  recordsSince?: string;
  /**
   * False hides the Domains room until their names are moved to us and read
   * live there. A room listing two of twenty names asks a question it cannot
   * answer yet.
   */
  domainsReady?: boolean;
  /**
   * Rooms this client does not get, because another system of theirs already
   * does the job: a Buildertrend shop keeps its pipeline in Lead Opportunities
   * and its subs in Subs and Vendors, and a second copy is homework. A hidden
   * room is absent from the rail and nothing feeds it: no briefs, no board
   * reads, no certificate warnings, no Operator job actions.
   */
  hiddenRooms?: Array<'jobs' | 'field' | 'trades'>;
  /** People keys who get the 7:13 morning brief by email (app/api/cron/cc-morning). */
  morningBrief?: string[];
  clientEmail: string;
  business: string;
  siteUrl: string;
  /** The domain that outlives hosting. QR codes and printed links point here. */
  publicUrl: string;
  origins: string[];
  notify: { phone: string | null; emails: string[] };
  /** Named people a form can be addressed to; the note goes to them first. */
  people?: Record<string, { name: string; email: string; mailbox?: string; aliases?: string[] }>;
  /** Who answers the phone, by first name, for the visitor's confirmation. */
  answers: string;
  phone: string;
  /** The Vapi assistant behind the website chat; its conversations show in the portal. */
  assistantId: string | null;
  /** The CRM every lead is handed to. Only Buildertrend is wired today. */
  crm: 'buildertrend' | null;
  /** The domain their business email lives on, for the Command Center's email check. */
  emailDomain: string | null;
  /** The Google Business Profile, when one exists, for the reviews and profile links. */
  googleProfile: { reviewUrl: string | null; mapsUrl: string | null } | null;
  /** Where a happy customer leaves a review. Google first, Houzz for a builder. */
  reviews: Array<{ key: 'google' | 'houzz' | 'facebook'; label: string; url: string }>;
  /**
   * The address a campaign to their own contact book leaves from, on a domain
   * of THEIRS that is verified with the mail provider. Never ours. While it is
   * unset they can write, preview and test a campaign, and cannot send one.
   */
  campaignFrom?: string | null;
  /** Their postal address, printed at the foot of every campaign as the law asks. */
  postal?: string | null;
  /** The project pages on their site, for jobsite signs and photo drops. */
  /** Each carries the opening of its story and its cover, so a post can start from the page itself. */
  projects: Array<{ slug: string; title: string; story?: string; image?: string }>;
  /** Where those pages live on their site. A builder's are /projects, a studio's /work. */
  projectsPath?: string;
  /**
   * The pages a printed QR code can point at. Unset means a home builder's
   * site: home, contact, projects, services, about, blog, community and towns.
   */
  campaignPages?: Array<{ path: string; label: string; group: string }>;
  /**
   * Their Command Center's own front: their name, their address, their
   * marks and colours. The same app answers there; only the door is theirs.
   */
  office: {
    name: string;
    host: string;
    /** Origins allowed to request a sign-in link that lands on the office. */
    origins: string[];
    logo: string;
    logoOnDark: string;
    colors: { ink: string; paper: string; accent: string; accent2: string };
    guideName: string;
  };
};

/** Built Right's project pages, as built. Keep in step with the site's build.mjs. */
const BR_IMG = 'https://built-right-montana-demo.vercel.app/images/';
const BUILT_RIGHT_PROJECTS = [
  { slug: 'river-frontage-montana-style', title: 'River Frontage Montana Style', image: BR_IMG + 'p-river-13-hero-1600.webp', story: 'This home started with the water. The lot runs down to the river, so we turned the whole living space toward it and built a window wall that puts the current in the room with you. Outside, cedar and metal siding give the house a look that belongs on a Montana riverbank, and a riverview patio carries the living room out into the open air.' },
  { slug: 'kalispell-montana-mountain-views', title: 'Kalispell Montana Mountain Views', image: BR_IMG + 'p-kalispell-11-1600.webp', story: 'This custom timber-frame home sits above Kalispell for one reason, and you see it from every window: the Flathead Valley, laid out below the deck. We designed the house around that view, then built a structure worthy of it.' },
  { slug: 'modern-living-montana-built', title: 'Modern Living Montana Built', image: BR_IMG + 'p-modern-12-1600.webp', story: 'This modern mountain home proves that clean lines and Montana warmth belong together. It starts at a grand entry with accent lighting, and the welcome keeps going from there: steel beams over a warm fire, a coffered ceiling with rustic accents, and a kitchen of hickory and granite that looks straight out at the view.' },
  { slug: 'montana-lakefront-luxury-retreat', title: 'Montana Lakefront Luxury Retreat', image: BR_IMG + 'p-lakefront-12-1600.webp', story: 'Some homes are built for quiet. This one was built for company. It is a lakefront retreat with five bedrooms, three bathrooms and room to sleep a crowd, from the bunkroom we call the Montana slumber party to the bear room and a guest getaway of its own.' },
  { slug: 'mountain-modern-living-flathead-montana', title: 'Mountain Modern Living Flathead Montana', image: BR_IMG + 'p-mmodern-18-1600.webp', story: 'High on a Montana mountainside, with no neighbors in sight, this home is mountain modern living at its most complete. A large glass wall opens the living space to the view, a custom built fireplace anchors the room, and a huge skylight pours daylight across epoxy floors.' },
  { slug: 'montana-luxury-log-cabin', title: 'Montana Luxury Log Cabin', image: BR_IMG + 'p-logcabin-10-1600.webp', story: 'There is nothing quite like a real log home, and this one was handcrafted for a mountainside, with beautiful meadow views. Vaulted ceilings lift the living room, a loft looks down over it, and crafted log railings tie the two together the old way, by hand.' },
  { slug: 'glacier-park-retreat', title: 'Glacier Park Retreat', image: BR_IMG + 'p-glacier-13-1600.webp', story: 'Near Glacier National Park, this retreat was designed to feel like the park itself: open, honest and full of natural material. The open concept gathers the kitchen, dining and living space under Montana pine ceilings, all of it centered on a custom stone fireplace with a faux concrete mantle.' },
  { slug: 'secluded-flathead-montana-luxury', title: 'Secluded Flathead Montana Luxury', image: BR_IMG + 'p-secluded-16-1600.webp', story: 'Deep in the Yaak, in the Purcell Mountains, the nearest neighbor is a long way off, and that is the point. This modern home brings real luxury to real seclusion, with stone and cedar accents, Louisiana Pacific siding in three styles, a matte black garage door and a glass front door that says welcome home.' },
  { slug: 'barndominium-flathead-montana', title: 'Barndominium Flathead Montana Style', image: BR_IMG + 'p-barndo-00-1600.webp', story: 'A barndominium puts the garage and the good life under one roof, and this timber-frame build in the Flathead does both with style. Wood and metal give the exterior its elegance, and directional soffit lights bring you up the drive and home after dark.' },
  { slug: 'flathead-lake-luxury-remodel', title: 'Flathead Lake Luxury Remodel', image: BR_IMG + 'p-flathead-05-1600.webp', story: 'Some homes do not need replacing. They need reimagining. This whole-home remodel on Flathead Lake kept a well-loved property and made it new, beginning with the biggest change of all: a second story luxury addition built over an expanded garage, with a wall of windows that faces the grounds.' },
];

/**
 * Our own case studies, as they read on /work. Every story is told from the
 * page itself; an image is a JPEG already on our site, because Instagram takes
 * nothing else. A study without one still names its page in Traffic and
 * Campaigns, and stays out of "From your website", which needs a photo.
 */
const MMS = 'https://modernmustardseed.com';
const MMS_WORK = [
  { slug: 'built-right-in-montana', title: 'Built Right in Montana', image: MMS + '/images/editorial/brim-homes-1440.jpg', story: 'Built Right in Montana has built custom homes in Northwest Montana since 1997, and their old website showed none of it. We rebuilt it: 36 pages written around their real projects, twelve five-star reviews word for word, a chat that answers the way their office would, and every lead texted and emailed to the office the minute it lands. The family owns every page of it.' },
  { slug: 'cross-and-covenant', title: 'Cross + Covenant', image: MMS + '/images/editorial/cross-covenant-current-1440.jpg', story: 'Cross + Covenant went from a sketch to a live faith apparel store in under 60 days. We built the headless storefront, the WebGL hero on every collection, two production tiers and a hand-numbered signature line with a live edition counter. It reads like a fashion house and it checks out like a Shopify store.' },
  { slug: 'fiat-lux-design', title: 'Fiat Lux Design', image: MMS + '/work-shots/fiat-lux.jpg', story: 'Most virtual staging looks fake for one reason: the model melts the windows. Fiat Lux Design stages any room from a listing link or a photo in 34 editorial styles, and a second model locks the real windows and doors pixel for pixel. Then you shop the exact pieces in the picture.' },
  { slug: 'irl', title: 'IRL', image: MMS + '/video/launch-film-irl-poster.jpg', story: 'IRL ends the "what do you want to do" conversation. Everybody answers five questions separately, a wheel spins, and out comes one real plan with street addresses on it, checked against the forecast for the hours you will be out. No account, no database: the plan lives in its own link.' },
  { slug: 'voicestaff', title: 'VoiceStaff' },
  { slug: 'deed-ai', title: 'DEED AI' },
  { slug: 'ptg-deal-analyzer', title: 'PTG Deal Analyzer' },
  { slug: 'ugc-studio-secret', title: 'UGC Studio Secret' },
  { slug: 'cxc-studio', title: 'CXC Studio' },
  { slug: 'the-claw-concierge', title: 'The Claw Concierge' },
  { slug: 'wild-daisy-command-center', title: 'Wild Daisy Command Center' },
  { slug: 'olive-shoot', title: 'Olive Shoot' },
  { slug: 'make-me-studio', title: 'Make Me Studio' },
  { slug: 'ignition', title: 'Ignition' },
  { slug: 'alive-notes', title: 'Alive Notes' },
];

export const CLIENT_PROJECTS: Record<string, ClientProject> = {
  'built-right': {
    key: 'built-right',
    door: 'brim',
    // Domain cutover, 2026-09-25. Every chat before it was the studio testing.
    recordsSince: '2026-09-25T00:00:00Z',
    // Hidden until Sarah transfers their names (on hold by her call, 2026-09-28).
    domainsReady: false,
    // Shan runs the sites; the brief is for the truck before it leaves.
    morningBrief: ['shan'],
    // Buildertrend covers the pipeline and the subs (Sarah, 2026-09-29).
    hiddenRooms: ['jobs', 'field', 'trades'],
    clientEmail: 'builtbyshan@gmail.com',
    business: 'Built Right in Montana',
    siteUrl: 'https://built-right-montana-demo.vercel.app',
    publicUrl: 'https://builtrightinmontana.com',
    // brimhomes.com was bought on 2026-09-18 and serves this same site. Without it
    // here every form, the booking page and the chat would be refused by origin there.
    origins: ['https://built-right-montana-demo.vercel.app', 'https://builtrightinmontana.com', 'https://www.builtrightinmontana.com', 'https://brimhomes.com', 'https://www.brimhomes.com', 'https://built-right-prep.vercel.app'],
    // Carmen runs the office, so every lead reaches her inbox as well as Shan's.
    notify: { phone: '(406) 471-5613', emails: ['builtbyshan@gmail.com', 'builtrightinmontana@gmail.com'] },
    // "Contact Shan", "Contact Carmen", "Contact Zayne" on the team page: the
    // named person gets the note first. Zayne's address is as Carmen typed it
    // on 2026-09-16 with the obvious typo corrected; confirm with her.
    people: {
      // mailbox is each person's own inbox, the one they connect themselves and
      // only they see; the sorter and the reply writer work it like any other.
      // The office Gmail (builtrightinmontana@gmail.com) is Carmen's desk and
      // everyone's shared inbox, so it is nobody's private one. aliases are
      // the brimhomes.com addresses, which forward and hold no mail of their
      // own: they sign in, they are not inboxes (Sarah, 2026-09-29).
      shan: { name: 'Shan', email: 'builtbyshan@gmail.com', mailbox: 'builtbyshan@gmail.com', aliases: ['shan@brimhomes.com'] },
      carmen: { name: 'Carmen', email: 'builtrightinmontana@gmail.com', aliases: ['carmen@brimhomes.com'] },
      zayne: { name: 'Zayne', email: 'homesbysazayne@gmail.com', mailbox: 'homesbysazayne@gmail.com', aliases: ['zayne@brimhomes.com'] },
    },
    answers: 'Carmen',
    phone: '(406) 471-5613',
    assistantId: '5269bb2d-360f-4bf6-a07b-509ae488b482',
    crm: 'buildertrend',
    emailDomain: 'brimhomes.com',
    // Campaigns wait on a sending address of their own on brimhomes.com, verified with Resend.
    // brimhomes.com is verified at Resend; Porkbun forwards carmen@ to the office Gmail.
    campaignFrom: 'Built Right in Montana <carmen@brimhomes.com>',
    postal: '150 Shady Ln Spc 405, Kalispell, MT 59901',
    // Two profiles, two offices, decided 2026-09-21 (Google will not merge two addresses). Every NEW review
    // ask goes to Kalispell (150 Shady Ln, CID 8946601095687912218, one review, being built up). Eureka
    // (CID 6813119055619579142) keeps the eleven it earned and stays the listing the website links to.
    googleProfile: { reviewUrl: 'https://maps.google.com/?cid=8946601095687912218', mapsUrl: 'https://maps.google.com/?cid=6813119055619579142' },
    reviews: [
      { key: 'google', label: 'Google', url: 'https://maps.google.com/?cid=8946601095687912218' },
      { key: 'houzz', label: 'Houzz', url: 'https://www.houzz.com/professionals/home-builders/built-right-in-montana-llc-pfvwus-pf~1763541567' },
      { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/BuiltRightInMontana/reviews' },
    ],
    projects: BUILT_RIGHT_PROJECTS,
    office: {
      name: 'Built Right in Montana Command Center',
      host: 'office.builtrightinmontana.com',
      origins: ['https://office.builtrightinmontana.com', 'https://built-right-office.vercel.app'],
      logo: 'https://built-right-montana-demo.vercel.app/images/logo.svg',
      logoOnDark: 'https://built-right-montana-demo.vercel.app/images/logo-footer.svg',
      colors: { ink: '#161616', paper: '#f6f3ee', accent: '#48603c', accent2: '#9b4f2f' },
      guideName: 'your Built Right guide',
    },
  },
  // THE HOUSE DESK. Our own Command Center, so every room is proven on our own
  // feeds before a client's: posting to our Page and profiles, campaigns to our
  // own book, Mr. Mustard's conversations, and the traffic on this site. It is
  // the studio's account, so the studio address is the person at the desk
  // (Sarah, 2026-10-05). The Board, From the site and the Bench are a
  // builder's rooms (a Buildertrend hand-off, jobsite photos, subs' insurance),
  // so they are hidden here exactly as they are for Built Right.
  mms: {
    key: 'mms',
    door: 'mms',
    morningBrief: ['sarah'],
    hiddenRooms: ['jobs', 'field', 'trades'],
    clientEmail: 'sarah@modernmustardseed.com',
    business: 'Modern Mustard Seed',
    siteUrl: MMS,
    publicUrl: MMS,
    origins: [MMS, 'https://www.modernmustardseed.com'],
    notify: { phone: null, emails: ['sarah@modernmustardseed.com'] },
    people: {
      sarah: { name: 'Sarah', email: 'sarah@modernmustardseed.com' },
    },
    answers: 'Sarah',
    phone: SITE.phone,
    // Mr. Mustard: the site chat and the (406) 312-1223 line.
    assistantId: 'faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee',
    crm: null,
    emailDomain: 'modernmustardseed.com',
    campaignFrom: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
    postal: '14847 Montana Highway 35, Unit 5, Bigfork, MT 59911',
    // Listing 02218546627237546724, owned by makeourcitypretty@gmail.com.
    googleProfile: { reviewUrl: 'https://maps.google.com/?cid=8255098141806810627', mapsUrl: 'https://maps.google.com/?cid=8255098141806810627' },
    reviews: [
      { key: 'google', label: 'Google', url: 'https://maps.google.com/?cid=8255098141806810627' },
      { key: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61579149904370&sk=reviews' },
    ],
    projects: MMS_WORK,
    projectsPath: '/work',
    campaignPages: [
      { path: '/', label: 'Home page', group: 'Pages' },
      { path: '/contact', label: 'Contact', group: 'Pages' },
      { path: '/work', label: 'Our work', group: 'Pages' },
      { path: '/websites', label: 'Websites', group: 'Pages' },
      { path: '/website-audit', label: 'Website audit', group: 'Pages' },
      { path: '/blog', label: 'Blog', group: 'Pages' },
      { path: '/about', label: 'About', group: 'Pages' },
    ],
    office: {
      name: 'Modern Mustard Seed Command Center',
      host: 'modernmustardseed.com/cc/mms',
      origins: [],
      logo: MMS + '/brand/logo-lockup.png',
      // No white cut of the lockup exists, so the rail sets our name instead.
      logoOnDark: '',
      // Mustard-800: the pop yellow fails as text and under white type on a white card.
      colors: { ink: '#161616', paper: '#FBF6EA', accent: '#9A5E00', accent2: '#E0301E' },
      guideName: 'the house guide',
    },
  },
};

/** The project whose office front this origin belongs to, if any. */
export function projectForOfficeOrigin(origin: string): ClientProject | null {
  const o = origin.replace(/\/$/, '').toLowerCase();
  return Object.values(CLIENT_PROJECTS).find((p) => p.office.origins.includes(o)) ?? null;
}

/** The project a signed-in client belongs to, if any. */
/** True when this client does not get the room (see ClientProject.hiddenRooms). */
export function roomHidden(project: ClientProject, room: 'jobs' | 'field' | 'trades'): boolean {
  const hidden = project.hiddenRooms ?? [];
  // From the site lands photographs on a job, so it goes wherever the board goes.
  return hidden.includes(room) || (room === 'field' && hidden.includes('jobs'));
}

export function projectForEmail(email: string): ClientProject | null {
  const e = email.toLowerCase();
  return Object.values(CLIENT_PROJECTS).find((p) => p.clientEmail.toLowerCase() === e) ?? null;
}

export const PRIORITY_LABEL: Record<number, string> = { 1: 'Land and plans', 2: 'Land, no plans', 3: 'Plans, no land', 4: 'Remodel' };

/** 1 to 4 from the starting-point string, null when it says nothing usable. */
export function priorityFromLand(land: string | null | undefined): number | null {
  const s = (land ?? '').toLowerCase();
  if (!s) return null;
  const hasLand = /\bown land\b|\bhave land\b|\bland and\b|^land\b/.test(s) || (/\bland\b/.test(s) && !/no land|not yet|without land/.test(s));
  const hasPlans = /\bhave plans\b|\bland and plans\b|\bplans,? no land\b|\bplans no land\b/.test(s) || (/\bplans\b/.test(s) && !/no plans|not yet|without plans/.test(s));
  if (/remodel|addition|renovat|home i own|house i own/.test(s)) return 4;
  if (hasLand && hasPlans) return 1;
  if (hasLand) return 2;
  if (hasPlans) return 3;
  return null;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * What the visitor gets back, at once: we have it, who calls, what happens
 * next. Email whenever they gave one; a text only when they ticked the box.
 */
export async function confirmVisitor(p: ClientProject, lead: { name: string | null; email: string | null; phone: string | null; smsConsent: boolean; hasQuestionnaire: boolean }): Promise<{ email?: { ok: boolean; id?: string | null; error?: string | null }; sms?: { ok: boolean; sid?: string; error?: string } }> {
  const out: { email?: { ok: boolean; id?: string | null; error?: string | null }; sms?: { ok: boolean; sid?: string; error?: string } } = {};
  const first = (lead.name ?? '').trim().split(/\s+/)[0] || 'Hello';
  const q = `${p.siteUrl}/questionnaire`;
  const steps = [
    `${p.answers} calls you back, usually the same business day.`,
    'We talk through what you have: land, plans, or a home you want changed.',
    'We walk the site together to see whether the lot suits the idea.',
    'Then a plan, and the real numbers after a pre-construction agreement.',
  ];

  if (lead.email) {
    const html = `<div style="font:400 16px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:540px;">
      <p style="margin:0 0 14px;">${esc(first)}, we have your message. Thank you for reaching out to ${esc(p.business)}.</p>
      <p style="margin:0 0 10px;"><strong>What happens next</strong></p>
      <ol style="margin:0 0 16px;padding-left:20px;">${steps.map((s) => `<li style="margin:0 0 6px;">${esc(s)}</li>`).join('')}</ol>
      ${lead.hasQuestionnaire ? '' : `<p style="margin:0 0 14px;">If you have ten minutes before we talk, the first-week questionnaire tells us what matters: <a href="${q}" style="color:#C4380C;">${q.replace('https://', '')}</a>. Answer what you can and skip the rest.</p>`}
      <p style="margin:0 0 14px;">Anything sooner, call us at ${esc(p.phone)}.</p>
      <p style="margin:22px 0 0;">${esc(p.business)}</p>
    </div>`;
    try {
      const resend = resendClient();
      const sent = await resend.emails.send({
        from: `${p.business} <sarah@modernmustardseed.com>`,
        to: [lead.email],
        replyTo: p.notify.emails,
        subject: `We have your message, ${first}`,
        html,
        text: [`${first}, we have your message. Thank you for reaching out to ${p.business}.`, '', 'What happens next:', ...steps.map((s, i) => `${i + 1}. ${s}`), '', ...(lead.hasQuestionnaire ? [] : [`The first-week questionnaire, if you have ten minutes: ${q}`, '']), `Anything sooner, call us at ${p.phone}.`, '', p.business].join('\n'),
      });
      out.email = { ok: !sent.error, id: sent.data?.id ?? null, error: sent.error?.message ?? null };
    } catch (err) {
      out.email = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  if (lead.smsConsent && lead.phone && toE164(lead.phone)) {
    const sms = await sendSms(lead.phone, `${p.business}: we have your message, ${first}. ${p.answers} calls back, usually the same business day. Sooner: ${p.phone}.${lead.hasQuestionnaire ? '' : ` Questionnaire: ${q}`}`);
    out.sms = sms.ok ? { ok: true, sid: sms.sid } : { ok: false, error: sms.error };
  }
  return out;
}

export type DigestLead = { id: string; name: string | null; phone: string | null; email: string | null; town: string | null; land: string | null; page: string | null; source: string; sources: string[] | null; priority: number | null; handled_at: string | null; created_at: string };

const DOOR: Record<string, string> = { contact: 'Contact form', intake: 'Project form', refer: 'Refer a friend', chat: 'Website chat', questionnaire: 'Questionnaire' };

/** The Monday note: last week by door, by priority, by page, and who is still waiting on a call. */
export async function sendLeadsDigest(p: ClientProject, week: DigestLead[], open: DigestLead[]): Promise<boolean> {
  const tally = (pick: (l: DigestLead) => string[] | string | null) => {
    const m = new Map<string, number>();
    for (const l of week) {
      const v = pick(l);
      for (const k of Array.isArray(v) ? v : v ? [v] : []) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const bySource = tally((l) => (l.sources?.length ? l.sources : [l.source]).map((s) => DOOR[s] ?? s));
  const byPriority = tally((l) => (l.priority ? `${l.priority}. ${PRIORITY_LABEL[l.priority]}` : 'Not said'));
  const byPage = tally((l) => (l.page ?? '').replace(/^https?:\/\/[^/]+/, '') || null).slice(0, 6);
  const row = (title: string, rows: Array<[string, number]>) => `<td style="vertical-align:top;padding:0 14px 0 0;"><p style="margin:0 0 4px;font:700 11px/1 monospace;letter-spacing:.16em;text-transform:uppercase;color:#161616;opacity:.6;">${title}</p>${rows.length ? rows.map(([k, n]) => `<p style="margin:0 0 2px;">${esc(k)} <strong>${n}</strong></p>`).join('') : '<p style="margin:0;opacity:.5;">none</p>'}</td>`;
  const openRows = open
    .map((l) => `<tr><td style="padding:4px 10px 4px 0;white-space:nowrap;">${l.priority ? `<strong>${l.priority}</strong>` : '·'}</td><td style="padding:4px 10px 4px 0;"><strong>${esc(l.name ?? 'No name')}</strong>${l.town ? `, ${esc(l.town)}` : ''}<br><span style="opacity:.7;">${esc(l.phone ?? l.email ?? '')}${l.land ? ` · ${esc(l.land)}` : ''}</span></td><td style="padding:4px 0;white-space:nowrap;opacity:.6;">${new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td></tr>`)
    .join('');
  const html = `<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:600px;">
    <p style="margin:0 0 14px;">${esc(p.business)}, last week: <strong>${week.length}</strong> ${week.length === 1 ? 'lead' : 'leads'} through the website${open.length ? `, and <strong>${open.length}</strong> still waiting on a call` : ', and nobody waiting on a call'}.</p>
    <table style="border-collapse:collapse;margin:0 0 18px;"><tr>${row('By door', bySource)}${row('By priority', byPriority)}${row('By page', byPage)}</tr></table>
    ${open.length ? `<p style="margin:0 0 6px;font:700 11px/1 monospace;letter-spacing:.16em;text-transform:uppercase;color:#C4160B;">Waiting on a call</p><table style="border-collapse:collapse;margin:0 0 16px;">${openRows}</table><p style="margin:0 0 14px;opacity:.7;">Mark each one called in your portal and it leaves this list.</p>` : ''}
    <p style="margin:0;"><a href="${SITE.url}/portal" style="display:inline-block;background:#F5B700;color:#161616;text-decoration:none;font-weight:700;padding:12px 20px;border:2px solid #161616;box-shadow:4px 4px 0 #161616;">Open your leads</a></p>
  </div>`;
  try {
    const resend = resendClient();
    await resend.emails.send({
      from: `Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>`,
      to: p.notify.emails,
      cc: ['sarah@modernmustardseed.com'],
      replyTo: ['sarah@modernmustardseed.com'],
      subject: `${p.business}: ${week.length} ${week.length === 1 ? 'lead' : 'leads'} last week${open.length ? `, ${open.length} waiting on a call` : ''}`,
      html,
    });
    return true;
  } catch {
    return false;
  }
}
