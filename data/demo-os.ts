import type { Niche } from '@/lib/outbound';

/**
 * Per-trade sample data for the forged BUSINESS OS demo (/demo/os/[id]).
 * Everything here is honest sample data (the app labels it as such); the
 * per-lead config only swaps in the real name, city, phone, and any mined
 * evidence. One template, every trade, zero generation cost.
 */

export type OsCustomer = { name: string; need: string; value: number; stage: 0 | 1 | 2 | 3 };
export type OsCall = { caller: string; time: string; need: string; outcome: string };
export type OsJob = { time: string; title: string; who: string };
export type OsAd = { headline: string; body: string };

export type OsPreset = {
  /** What a unit of work is called in this trade. */
  jobWord: string;
  /** Pipeline column names, New -> Done. */
  stages: [string, string, string, string];
  accent: string;
  accentSoft: string;
  weekRevenue: number;
  customers: OsCustomer[];
  overnightCalls: OsCall[];
  todayJobs: OsJob[];
  /** {biz} and {city} are interpolated at render. */
  ads: OsAd[];
  reviewAsk: string;
};

export const OS_PRESETS: Record<Niche, OsPreset> = {
  restaurant: {
    jobWord: 'order',
    stages: ['New inquiry', 'Quoted', 'Booked', 'Served'],
    accent: '#e8833a',
    accentSoft: 'rgba(232,131,58,0.14)',
    weekRevenue: 8640,
    customers: [
      { name: 'Dana W.', need: 'Catering, office lunch for 25', value: 480, stage: 0 },
      { name: 'Marcus T.', need: 'Birthday party of 12, Saturday', value: 340, stage: 1 },
      { name: 'Riverside Church', need: 'Monthly youth-night trays', value: 620, stage: 1 },
      { name: 'Elena R.', need: 'Rehearsal dinner, needs a quote', value: 900, stage: 2 },
      { name: 'Sam & Jo', need: 'Anniversary, window table', value: 120, stage: 2 },
      { name: 'K. Alvarez', need: 'Graduation brunch, 18 people', value: 510, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'Patricia', time: '9:42 PM', need: 'Party of 8 on Friday', outcome: 'Booked, 6:30 PM' },
      { caller: 'Devon', time: '10:15 PM', need: 'Gluten-free options?', outcome: 'Answered, texted the menu' },
      { caller: 'Unknown', time: '6:05 AM', need: 'Catering pricing', outcome: 'Details captured, callback set' },
    ],
    todayJobs: [
      { time: '11:30', title: 'Office lunch drop-off', who: 'Dana W.' },
      { time: '1:00', title: 'Tour for rehearsal dinner', who: 'Elena R.' },
      { time: '6:30', title: 'Party of 8', who: 'Patricia' },
    ],
    ads: [
      { headline: 'The table is set in {city}.', body: '{biz} takes the family recipes seriously and the reservations easily. Book tonight in one call.' },
      { headline: 'Dinner deserves better than a drive-thru.', body: 'Made from scratch daily at {biz}. Call ahead and the table is yours.' },
    ],
    reviewAsk: 'Thanks for coming in tonight! If we earned it, a quick Google review means the world to a family place like ours: ',
  },
  home_service: {
    jobWord: 'job',
    stages: ['New lead', 'Quoted', 'Scheduled', 'Done'],
    accent: '#d9a13b',
    accentSoft: 'rgba(217,161,59,0.14)',
    weekRevenue: 12480,
    customers: [
      { name: 'Greg H.', need: 'Water heater replacement', value: 1850, stage: 0 },
      { name: 'Mia C.', need: 'Annual service + filter', value: 240, stage: 1 },
      { name: 'Bright Path HOA', need: '12-unit maintenance contract', value: 5400, stage: 1 },
      { name: 'Tom & Ana', need: 'Remodel rough-in quote', value: 3200, stage: 2 },
      { name: 'L. Whitfield', need: 'Emergency repair follow-up', value: 480, stage: 3 },
      { name: 'Parkside Dental', need: 'Commercial install', value: 2750, stage: 2 },
    ],
    overnightCalls: [
      { caller: 'Greg H.', time: '8:58 PM', need: 'No hot water', outcome: 'Booked, 8 AM slot' },
      { caller: 'Sandra', time: '11:20 PM', need: 'Pricing for annual service', outcome: 'Quoted range, details captured' },
      { caller: 'Unknown', time: '5:47 AM', need: 'Leak under sink', outcome: 'Emergency flagged, you were texted' },
    ],
    todayJobs: [
      { time: '8:00', title: 'Water heater install', who: 'Greg H.' },
      { time: '11:00', title: 'Remodel walk-through', who: 'Tom & Ana' },
      { time: '2:30', title: 'Annual service', who: 'Mia C.' },
    ],
    ads: [
      { headline: 'Fixed right the first time in {city}.', body: '{biz} answers day and night, shows up when promised, and stands behind the work. Call now.' },
      { headline: 'Your neighbors already have our number.', body: 'Local, licensed, and on time. {biz} keeps {city} running. One call does it.' },
    ],
    reviewAsk: 'Thanks for trusting us with the job today! If everything looks great, a quick Google review helps more than you know: ',
  },
  dental_medspa: {
    jobWord: 'appointment',
    stages: ['New patient', 'Consult set', 'Booked', 'Seen'],
    accent: '#5ec2b7',
    accentSoft: 'rgba(94,194,183,0.14)',
    weekRevenue: 9860,
    customers: [
      { name: 'Hannah B.', need: 'New patient, cleaning + exam', value: 210, stage: 0 },
      { name: 'Priya S.', need: 'Whitening consult', value: 450, stage: 1 },
      { name: 'Mark D.', need: 'Crown, insurance question', value: 1250, stage: 1 },
      { name: 'Alyssa G.', need: 'Membership plan signup', value: 390, stage: 2 },
      { name: 'J. Romero', need: 'Six-month recall', value: 180, stage: 3 },
      { name: 'Coach Bell', need: 'Family of four, new patients', value: 840, stage: 2 },
    ],
    overnightCalls: [
      { caller: 'Hannah B.', time: '7:36 PM', need: 'First visit availability', outcome: 'Booked Thursday 10 AM' },
      { caller: 'Marcus', time: '9:02 PM', need: 'Tooth pain, urgent', outcome: 'First slot held, you were texted' },
      { caller: 'Unknown', time: '6:22 AM', need: 'Do you take Delta?', outcome: 'Answered, details captured' },
    ],
    todayJobs: [
      { time: '9:00', title: 'New patient exam', who: 'Hannah B.' },
      { time: '11:30', title: 'Whitening consult', who: 'Priya S.' },
      { time: '3:00', title: 'Crown seat', who: 'Mark D.' },
    ],
    ads: [
      { headline: 'A calmer visit. A better smile.', body: '{biz} in {city} answers every call, finds you a time that works, and treats you like a neighbor.' },
      { headline: 'Booked in one call, even after hours.', body: 'New patients welcome at {biz}. Call any time, the phone always answers.' },
    ],
    reviewAsk: 'It was great seeing you today! If your visit went well, a quick Google review helps other patients find us: ',
  },
  real_estate: {
    jobWord: 'showing',
    stages: ['New lead', 'Pre-qualified', 'Touring', 'Closed'],
    accent: '#8fb663',
    accentSoft: 'rgba(143,182,99,0.14)',
    weekRevenue: 15200,
    customers: [
      { name: 'The Nguyens', need: 'Buying, 3BR near schools', value: 9800, stage: 0 },
      { name: 'Carrie M.', need: 'Selling, wants a CMA', value: 7400, stage: 1 },
      { name: 'D. Okafor', need: 'Investor, duplexes', value: 12600, stage: 1 },
      { name: 'Beth & Ryan', need: 'First home, pre-approved', value: 8200, stage: 2 },
      { name: 'S. Patel', need: 'Relocation, remote tour', value: 6900, stage: 2 },
      { name: 'The Harmons', need: 'Closed on Maple St', value: 10400, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'The Nguyens', time: '8:12 PM', need: 'Saw the Elm St listing', outcome: 'Showing set, Saturday 1 PM' },
      { caller: 'Walk-in lead', time: '10:44 PM', need: 'What is my house worth?', outcome: 'CMA request captured' },
      { caller: 'Unknown', time: '7:03 AM', need: 'Open house hours', outcome: 'Answered, name captured' },
    ],
    todayJobs: [
      { time: '10:00', title: 'Listing photos', who: 'Carrie M.' },
      { time: '1:00', title: 'Showing, Elm St', who: 'The Nguyens' },
      { time: '4:30', title: 'Offer review call', who: 'Beth & Ryan' },
    ],
    ads: [
      { headline: 'Sold signs all over {city}.', body: '{biz} answers every buyer call, day or night, so your listing never misses its moment.' },
      { headline: 'Your home. The right buyer. No missed calls.', body: 'List with {biz}: every inquiry answered in two rings, every showing booked fast.' },
    ],
    reviewAsk: 'Congratulations again! If working together went well, a quick Google review helps the next family find us: ',
  },
  other: {
    jobWord: 'appointment',
    stages: ['New lead', 'Quoted', 'Booked', 'Done'],
    accent: '#b58a2a',
    accentSoft: 'rgba(181,138,42,0.14)',
    weekRevenue: 7420,
    customers: [
      { name: 'Jordan P.', need: 'New client inquiry', value: 320, stage: 0 },
      { name: 'Casey L.', need: 'Asked for a quote', value: 540, stage: 1 },
      { name: 'Northside Gym', need: 'Recurring weekly service', value: 1200, stage: 1 },
      { name: 'A. Brooks', need: 'Booked for Thursday', value: 260, stage: 2 },
      { name: 'M. Ito', need: 'Second visit', value: 410, stage: 2 },
      { name: 'R. Fontaine', need: 'Completed, invoice sent', value: 380, stage: 3 },
    ],
    overnightCalls: [
      { caller: 'Jordan P.', time: '9:10 PM', need: 'Availability this week', outcome: 'Booked Thursday 2 PM' },
      { caller: 'Unknown', time: '11:37 PM', need: 'Pricing question', outcome: 'Answered, details captured' },
      { caller: 'Casey L.', time: '6:50 AM', need: 'Follow-up on quote', outcome: 'Callback set for 9 AM' },
    ],
    todayJobs: [
      { time: '9:30', title: 'Client session', who: 'M. Ito' },
      { time: '1:00', title: 'New client consult', who: 'Jordan P.' },
      { time: '4:00', title: 'Weekly service', who: 'Northside Gym' },
    ],
    ads: [
      { headline: '{city} has one number for this.', body: '{biz} answers every call, books you fast, and shows up like they mean it.' },
      { headline: 'Booked in one call.', body: 'No voicemail, no waiting. {biz} picks up and gets you on the schedule.' },
    ],
    reviewAsk: 'Thank you for choosing us! If we did right by you, a quick Google review goes a long way: ',
  },
};

export const OS_AUTOMATIONS: { icon: string; title: string; desc: string; on: boolean }[] = [
  { icon: 'bolt', title: 'Missed call rescue', desc: 'Any call that slips through gets an instant text-back with your booking link.', on: true },
  { icon: 'star', title: '5-star chase', desc: 'Every finished {job} triggers a friendly review request. Happy customers become Google stars.', on: true },
  { icon: 'phone', title: '60-second callback', desc: 'A new web lead gets a call from your AI receptionist within a minute, while they are still looking at your site.', on: true },
  { icon: 'chart', title: 'Friday flight report', desc: 'Every Friday at 5 PM: calls caught, {job}s booked, revenue rescued, texted straight to you.', on: false },
  { icon: 'bell', title: 'No-show shield', desc: 'Tomorrow’s {job}s get a reminder text tonight. Empty slots get offered to the waitlist.', on: false },
  { icon: 'funnel', title: 'Ad-to-schedule pipe', desc: 'Leads from your ads land in Customers automatically, tagged with which ad brought them in.', on: true },
];
