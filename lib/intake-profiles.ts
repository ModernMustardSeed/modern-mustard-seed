/**
 * The welcome intake, tailored to the business it is sent to.
 *
 * Sarah, 2026-10-07: "we should start auto tailoring it for the type of
 * business anytime we send an intake. hyper personalization and relevance and
 * context and the right questions is uber imperative." A physical therapist
 * handed the trade form was asked for crew size, truck photos and whether she
 * is bonded. Every question here has to make sense to the owner reading it.
 *
 * How a client gets a profile, first match wins:
 *   1. clients.intake_tailor.kind, set by hand when Sarah knows the business.
 *   2. Keywords in what we already know: company name, welcome note, the
 *      project name and summary, and the lead's industry.
 *   3. `general`, written for any small business. Never the trade form by
 *      default, because the trade form reads wrong for everyone but a trade.
 *
 * On top of the profile, clients.intake_tailor.questions adds questions only
 * this one business is asked (from the meeting, the audit, the proposal), and
 * clients.intake_tailor.intro replaces the opening paragraph.
 *
 * Field names are shared across profiles wherever the meaning is the same
 * (email, phone, hours, services, bestAt, domain, licenseNumber...) so the
 * admin card, the notification email and the build read one vocabulary.
 */

export type IntakeKind =
  | 'trade'
  | 'physical-therapy'
  | 'clinic'
  | 'restaurant'
  | 'retail'
  | 'beauty'
  | 'fitness'
  | 'professional'
  | 'general';

export type IntakeInput = {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  /** Multi-line answer. */
  long?: boolean;
  type?: 'email' | 'tel' | 'text';
  /** Sits beside the next half-width field on wide screens. */
  half?: boolean;
};

export type IntakeUpload = {
  /** client_files.kind: photo | logo | doc. */
  kind: 'photo' | 'logo' | 'doc';
  /** Label prefix on the client card, e.g. "Clinic photo". */
  label: string;
  title: string;
  detail: string;
  accept?: string;
  multiple?: boolean;
  /** Show thumbnails of what landed. */
  preview?: boolean;
};

export type IntakeSection = {
  title: string;
  blurb?: string;
  uploads?: IntakeUpload[];
  /** The three-way domain choice. Renders before the fields. */
  domain?: { defaultChoice: 'have-one' | 'get-me-one' | 'not-sure' };
  /** Show "what your site already lists" above the fields when we know it. */
  knownServices?: boolean;
  fields: IntakeInput[];
};

export type IntakeProfile = {
  kind: IntakeKind;
  /** Who the business serves, in the plural: customers, patients, guests, clients. */
  audience: string;
  /** Under the welcome headline. */
  intro: string;
  sections: IntakeSection[];
  /**
   * The one answer that has to reach the live site, put in the subject of the
   * email Sarah gets: a contractor's license, a clinician's license. Null when
   * no single answer earns the subject line.
   */
  subjectField: { name: string; label: string } | null;
};

export type IntakeTailor = {
  kind?: IntakeKind;
  intro?: string;
  questions?: Array<{ name?: string; label: string; placeholder?: string; long?: boolean }>;
};

/* ------------------------------------------------------------------ */
/* Shared sections, worded per audience                                */
/* ------------------------------------------------------------------ */

function lookSection(logoDetail: string, colorsHint: string): IntakeSection {
  return {
    title: 'Your look',
    blurb: 'No logo? No problem. Say so and we will set your name in strong, clean type, which often looks better anyway.',
    uploads: [
      {
        kind: 'logo',
        label: 'Logo',
        title: 'Add your logo',
        detail: logoDetail,
        accept: 'image/*,.pdf,.svg',
      },
    ],
    fields: [
      { name: 'colors', label: 'Colors', placeholder: colorsHint },
      { name: 'likes', label: 'Websites or brands you like', placeholder: 'Anything that caught your eye. A link or a name is plenty.' },
    ],
  };
}

function domainSection(defaultChoice: 'have-one' | 'get-me-one' | 'not-sure' = 'not-sure'): IntakeSection {
  return {
    title: 'Your web address',
    blurb: 'This is the one thing we need settled before the site goes live. If you are not sure, pick that and we will sort it out together.',
    domain: { defaultChoice },
    fields: [
      {
        name: 'domainNotes',
        label: 'Your domain',
        placeholder: 'The name you own (yourname.com), where you bought it if you remember, or an old site still up somewhere',
      },
    ],
  };
}

function anythingElse(placeholder: string): IntakeSection {
  return { title: 'Anything else', fields: [{ name: 'anythingElse', label: 'Anything else', long: true, placeholder }] };
}

function contactFields(audience: string, extra: IntakeInput[] = []): IntakeInput[] {
  return [
    { name: 'email', label: 'Best email', type: 'email', half: true, placeholder: `Where ${audience} inquiries should go` },
    { name: 'phone', label: 'Best phone number', type: 'tel', half: true, placeholder: 'The one that gets answered' },
    ...extra,
  ];
}

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */

const TRADE: IntakeProfile = {
  kind: 'trade',
  audience: 'customers',
  intro: 'Thank you for trusting us with your website. This form is how it becomes unmistakably yours: your photos, your services, your towns, your name.',
  subjectField: { name: 'licenseNumber', label: 'license' },
  sections: [
    {
      title: 'Photos of your work',
      blurb:
        'The single most useful thing on this form. Finished jobs, work in progress, the crew, the trucks, the equipment. Straight off your phone is perfect. Ten to twenty is a great start, and more is better.',
      uploads: [
        {
          kind: 'photo',
          label: 'Job photo',
          title: 'Add photos',
          detail: 'Tap to choose from your phone or computer. Pick as many as you like.',
          accept: 'image/*',
          multiple: true,
          preview: true,
        },
      ],
      fields: [
        { name: 'photoNotes', label: 'Tell us about them (optional)', long: true, placeholder: 'Which job is which, the town, anything you want called out on the site.' },
      ],
    },
    {
      title: 'Your business',
      blurb: 'The basics that go on every page, so customers can reach you the first time they try.',
      fields: [
        ...contactFields('customer', [
          { name: 'years', label: 'Years in business', half: true },
          { name: 'crewSize', label: 'Crew size', half: true },
        ]),
        { name: 'towns', label: 'Towns and areas you serve', placeholder: 'Every town you will drive to. List them all.' },
        { name: 'hours', label: 'Hours and seasons', placeholder: 'When you work, and what changes in the off season' },
      ],
    },
    {
      title: 'What you do',
      blurb: 'Every service you list can become its own spot on the site, which is how people searching for that exact job find you.',
      knownServices: true,
      fields: [
        { name: 'services', label: 'Every service you offer', long: true, placeholder: 'List them all, big and small. Installs, repairs, seasonal work, maintenance plans, anything you get paid for.' },
        { name: 'bestAt', label: 'What you are best at', placeholder: 'The two or three jobs you would want a new customer to judge you on' },
        { name: 'wantMore', label: 'Work you want more of', placeholder: 'The jobs that pay best or that you enjoy most' },
        { name: 'wantLess', label: 'Work you do not want', placeholder: 'Say so and we keep it off the site' },
      ],
    },
    lookSection('Any file you have: a photo of a sign or truck door works too.', 'Off your trucks, your shirts, your signs, or what you like'),
    domainSection('get-me-one'),
    {
      title: 'Licensing and insurance',
      blurb: 'Optional. If you carry them, they go on the site, because customers comparing companies look for them.',
      uploads: [
        {
          kind: 'doc',
          label: 'Certificate',
          title: 'Add certificates',
          detail: 'Optional. Licenses, insurance certificates, manufacturer or industry certifications.',
          multiple: true,
        },
      ],
      fields: [
        { name: 'licenseNumber', label: 'License or registration number', half: true, placeholder: 'Skip if it does not apply' },
        { name: 'licenseState', label: 'Issued in', half: true, defaultValue: 'Montana' },
        { name: 'insurer', label: 'Insured?', half: true, placeholder: 'Yes, and the carrier if you like' },
        { name: 'bonded', label: 'Bonded?', half: true, placeholder: 'Yes or no' },
      ],
    },
    anythingElse('Reviews you are proud of, awards, associations, warranties, how you got started, or anything you want said or kept off.'),
  ],
};

/** Shared by physical therapy and the wider clinic profile; only the examples differ. */
function clinicProfile(kind: 'physical-therapy' | 'clinic'): IntakeProfile {
  const pt = kind === 'physical-therapy';
  return {
    kind,
    audience: 'patients',
    intro: pt
      ? 'Thank you for trusting us with your practice online. This form is how the site becomes unmistakably yours: the people you help, how you treat them, and how a new patient gets on your schedule.'
      : 'Thank you for trusting us with your practice online. This form is how the site becomes unmistakably yours: the people you care for, what you treat, and how a new patient books.',
    subjectField: { name: 'licenseNumber', label: 'license' },
    sections: [
      {
        title: 'You and your practice',
        blurb:
          'Patients choose a provider before they choose a clinic. A real photo of you does more for a new patient than anything else on the page.',
        uploads: [
          {
            kind: 'photo',
            label: 'Headshot',
            title: 'Add a photo of you',
            detail: 'A headshot or a candid at work. Straight off your phone is fine.',
            accept: 'image/*',
            multiple: true,
            preview: true,
          },
          {
            kind: 'photo',
            label: 'Clinic photo',
            title: 'Add photos of the clinic',
            detail: pt
              ? 'The front door, the treatment space, the gym floor, the equipment. Anything that shows a new patient where they are walking into.'
              : 'The front door, the waiting room, the treatment rooms. Anything that shows a new patient where they are walking into.',
            accept: 'image/*',
            multiple: true,
            preview: true,
          },
        ],
        fields: [
          {
            name: 'credentials',
            label: 'Your name and credentials, as you want them shown',
            placeholder: pt ? 'e.g. Tami Ellis, PT, DPT, OCS' : 'e.g. Jane Smith, DC',
          },
          {
            name: 'story',
            label: 'Why you practice the way you do',
            long: true,
            placeholder: pt
              ? 'How you got into physical therapy, what you do differently, why you opened your own clinic. A few lines in your own words is plenty.'
              : 'How you got started, what you do differently, why patients come back. A few lines in your own words is plenty.',
          },
          { name: 'years', label: 'Years in practice', half: true },
          { name: 'team', label: 'Anyone else on the team', half: true, placeholder: 'Names and roles, or just me' },
        ],
      },
      {
        title: 'Your patients and what you treat',
        blurb:
          'People search for the problem, not the profession. Every condition you list can become its own spot on the site, which is how someone searching for their exact pain finds you.',
        knownServices: true,
        fields: [
          {
            name: 'services',
            label: 'Conditions and injuries you treat',
            long: true,
            placeholder: pt
              ? 'Back and neck pain, knee and hip replacement rehab, rotator cuff, ACL, sports injuries, balance and fall prevention, sciatica, post-surgical...'
              : 'Every condition you see often enough to want more of',
          },
          {
            name: 'treatments',
            label: 'Treatments and techniques you use',
            long: true,
            placeholder: pt
              ? 'Manual therapy, dry needling, cupping, Graston, blood flow restriction, pelvic floor, vestibular, custom home programs...'
              : 'The approaches and tools you use',
          },
          {
            name: 'bestAt',
            label: 'The patients you help most',
            placeholder: pt
              ? 'e.g. skiers back on the mountain, golfers, people after a joint replacement, active older adults'
              : 'The people who get the best results with you',
          },
          { name: 'wantMore', label: 'Patients you want more of', placeholder: 'The cases you love or want to be known for' },
          { name: 'wantLess', label: 'Anything you do not treat', placeholder: 'Say so and we keep it off the site' },
          {
            name: 'specialties',
            label: 'Certifications and specialties',
            placeholder: pt ? 'OCS, SCS, FAAOMPT, CSCS, dry needling certified...' : 'Board certifications, advanced training',
          },
        ],
      },
      {
        title: 'How a new patient gets in',
        blurb: 'The question every new patient has before they call. Answering it on the site is how they book instead of shopping around.',
        fields: [
          ...contactFields('patient', [
            { name: 'fax', label: 'Fax for referrals', type: 'tel', half: true, placeholder: 'If doctors fax you referrals' },
            { name: 'address', label: 'Clinic address', half: true },
          ]),
          { name: 'hours', label: 'Hours', placeholder: 'Days and times, and whether it is by appointment only' },
          {
            name: 'booking',
            label: 'How patients book today',
            placeholder: 'Phone, text, an online scheduler (which one?), a patient portal, a referral first',
          },
          ...(pt
            ? [
                {
                  name: 'directAccess',
                  label: 'Can patients come straight to you, or do they need a referral?',
                  placeholder: 'Montana allows direct access. Tell us how you handle it, and any insurer that still wants a referral.',
                },
              ]
            : [{ name: 'directAccess', label: 'Do patients need a referral?', placeholder: 'Yes, no, or it depends on the insurer' }]),
          { name: 'towns', label: 'Towns your patients come from', placeholder: 'Bigfork, Kalispell, Somers, Polson, Lakeside...' },
          ...(pt
            ? [{ name: 'mobile', label: 'Home visits, telehealth or on-site work?', placeholder: 'If you treat anywhere besides the clinic, tell us where' }]
            : []),
        ],
      },
      {
        title: 'Insurance and payment',
        blurb: 'The second thing a new patient asks. Clear answers here save you the same phone call every week.',
        fields: [
          { name: 'insurance', label: 'Insurance you accept', long: true, placeholder: 'Medicare, Blue Cross Blue Shield of Montana, Pacific Source, Allegiance, workers comp, auto...' },
          { name: 'cashPay', label: 'Self-pay or cash rates you are happy to publish', placeholder: 'Leave blank to keep prices off the site' },
          { name: 'firstVisit', label: 'What happens at the first visit', long: true, placeholder: 'How long it runs, what to wear, what to bring, paperwork ahead of time' },
        ],
      },
      lookSection('Any file you have: a photo of your sign or a business card works too.', 'From your sign, your shirts, your clinic, or what you like'),
      domainSection('have-one'),
      {
        title: 'License',
        blurb: 'Optional. It goes on the site, because patients comparing providers look for it.',
        uploads: [
          {
            kind: 'doc',
            label: 'Certificate',
            title: 'Add certificates',
            detail: 'Optional. License, board certifications, continuing education you are proud of.',
            multiple: true,
          },
        ],
        fields: [
          { name: 'licenseNumber', label: pt ? 'Physical therapy license number' : 'License number', half: true, placeholder: 'Skip if you would rather not' },
          { name: 'licenseState', label: 'Issued in', half: true, defaultValue: 'Montana' },
          { name: 'npi', label: 'NPI number', half: true, placeholder: 'Optional. Helps us match your listings across the web.' },
        ],
      },
      anythingElse(
        'Patient reviews you are proud of, a story that captures your care, community work, the teams you support, or anything you want said or kept off.',
      ),
    ],
  };
}

const RESTAURANT: IntakeProfile = {
  kind: 'restaurant',
  audience: 'guests',
  intro: 'Thank you for trusting us with your website. This form is how it becomes unmistakably yours: your food, your room, your hours, your name.',
  subjectField: null,
  sections: [
    {
      title: 'Photos of the food and the room',
      blurb: 'The single most useful thing on this form. Your best plates, the bar, the room full of people, the view. Phone photos are perfect.',
      uploads: [
        { kind: 'photo', label: 'Food and room', title: 'Add photos', detail: 'Pick as many as you like.', accept: 'image/*', multiple: true, preview: true },
        { kind: 'doc', label: 'Menu', title: 'Add your menus', detail: 'A PDF, a photo of the printed menu, drinks and specials too.', multiple: true },
      ],
      fields: [{ name: 'photoNotes', label: 'Tell us about them (optional)', long: true, placeholder: 'Which dish is which, what you are famous for.' }],
    },
    {
      title: 'Getting a table',
      blurb: 'What every guest checks before they come.',
      fields: [
        ...contactFields('guest', [{ name: 'address', label: 'Address', half: true }, { name: 'years', label: 'Open since', half: true }]),
        { name: 'hours', label: 'Hours and seasons', placeholder: 'Every service, and what changes in the off season' },
        { name: 'booking', label: 'Reservations', placeholder: 'Walk-in only, phone, OpenTable, Resy, Tock...' },
        { name: 'ordering', label: 'Takeout, delivery and catering', placeholder: 'How people order, and the platforms you use' },
      ],
    },
    {
      title: 'What you serve',
      knownServices: true,
      fields: [
        { name: 'services', label: 'The food and drink, in your words', long: true, placeholder: 'Cuisine, what is made in house, where ingredients come from' },
        { name: 'bestAt', label: 'The dishes people come back for', placeholder: 'The two or three a first-timer must order' },
        { name: 'events', label: 'Private events, happy hour, music, trivia', placeholder: 'Anything on a regular night that deserves its own page' },
        { name: 'dietary', label: 'Gluten free, vegan, kids', placeholder: 'What you can do and how well' },
      ],
    },
    lookSection('Any file you have: a photo of your sign or menu cover works too.', 'From your sign, your menu, your room, or what you like'),
    domainSection(),
    anythingElse('Reviews you are proud of, press, awards, your story, other locations, or anything you want said or kept off.'),
  ],
};

const RETAIL: IntakeProfile = {
  kind: 'retail',
  audience: 'customers',
  intro: 'Thank you for trusting us with your website. This form is how it becomes unmistakably yours: your shop, your products, your name.',
  subjectField: null,
  sections: [
    {
      title: 'Photos of the shop and the products',
      blurb: 'The single most useful thing on this form. The storefront, the shelves, your best sellers, you behind the counter.',
      uploads: [{ kind: 'photo', label: 'Shop photo', title: 'Add photos', detail: 'Pick as many as you like.', accept: 'image/*', multiple: true, preview: true }],
      fields: [{ name: 'photoNotes', label: 'Tell us about them (optional)', long: true }],
    },
    {
      title: 'Finding you',
      fields: [
        ...contactFields('customer', [{ name: 'address', label: 'Address', half: true }, { name: 'years', label: 'Open since', half: true }]),
        { name: 'hours', label: 'Hours and seasons', placeholder: 'When you are open, and what changes in the off season' },
        { name: 'online', label: 'Do you sell online today?', placeholder: 'Shopify, Etsy, Square, Facebook, not yet' },
      ],
    },
    {
      title: 'What you sell',
      knownServices: true,
      fields: [
        { name: 'services', label: 'Every category you carry', long: true },
        { name: 'bestAt', label: 'Best sellers and what you are known for', placeholder: 'The two or three things people come in for' },
        { name: 'brands', label: 'Brands and makers you carry', placeholder: 'Names customers search for' },
        { name: 'wantMore', label: 'What you want to sell more of' },
      ],
    },
    lookSection('Any file you have: a photo of your sign or a bag works too.', 'From your sign, your bags, your shop, or what you like'),
    domainSection(),
    anythingElse('Reviews you are proud of, events, gift cards, your story, or anything you want said or kept off.'),
  ],
};

const BEAUTY: IntakeProfile = {
  kind: 'beauty',
  audience: 'clients',
  intro: 'Thank you for trusting us with your website. This form is how it becomes unmistakably yours: your work, your space, your services, your name.',
  subjectField: { name: 'licenseNumber', label: 'license' },
  sections: [
    {
      title: 'Photos of your work and your space',
      blurb: 'The single most useful thing on this form. Your best results, the chair, the room, you at work.',
      uploads: [{ kind: 'photo', label: 'Work photo', title: 'Add photos', detail: 'Pick as many as you like.', accept: 'image/*', multiple: true, preview: true }],
      fields: [{ name: 'photoNotes', label: 'Tell us about them (optional)', long: true }],
    },
    {
      title: 'Booking',
      fields: [
        ...contactFields('client', [{ name: 'address', label: 'Address', half: true }, { name: 'team', label: 'Who works with you', half: true }]),
        { name: 'hours', label: 'Hours', placeholder: 'Days and times, and whether it is by appointment only' },
        { name: 'booking', label: 'How clients book today', placeholder: 'Vagaro, Square, GlossGenius, Fresha, text, phone...' },
      ],
    },
    {
      title: 'Services',
      knownServices: true,
      fields: [
        { name: 'services', label: 'Every service, with prices if you publish them', long: true },
        { name: 'bestAt', label: 'What you are known for', placeholder: 'The two or three services a new client should try' },
        { name: 'products', label: 'Product lines you use or sell' },
        { name: 'wantMore', label: 'Services you want more of' },
      ],
    },
    lookSection('Any file you have: a photo of your sign or card works too.', 'From your space, your cards, or what you like'),
    domainSection(),
    {
      title: 'License',
      blurb: 'Optional. It goes on the site, because clients comparing look for it.',
      fields: [
        { name: 'licenseNumber', label: 'License number', half: true, placeholder: 'Skip if you would rather not' },
        { name: 'licenseState', label: 'Issued in', half: true, defaultValue: 'Montana' },
      ],
    },
    anythingElse('Reviews you are proud of, training, your story, policies, or anything you want said or kept off.'),
  ],
};

const FITNESS: IntakeProfile = {
  kind: 'fitness',
  audience: 'members',
  intro: 'Thank you for trusting us with your website. This form is how it becomes unmistakably yours: your space, your classes, your coaches, your name.',
  subjectField: null,
  sections: [
    {
      title: 'Photos of the space and the people',
      blurb: 'The single most useful thing on this form. A packed class, the floor, the coaches, members mid-workout.',
      uploads: [{ kind: 'photo', label: 'Studio photo', title: 'Add photos', detail: 'Pick as many as you like.', accept: 'image/*', multiple: true, preview: true }],
      fields: [{ name: 'photoNotes', label: 'Tell us about them (optional)', long: true }],
    },
    {
      title: 'Getting started',
      fields: [
        ...contactFields('member', [{ name: 'address', label: 'Address', half: true }, { name: 'team', label: 'Coaches and instructors', half: true }]),
        { name: 'hours', label: 'Schedule and hours', placeholder: 'Or the link to your schedule' },
        { name: 'booking', label: 'How people sign up today', placeholder: 'Mindbody, Wodify, Glofox, walk in, a free first class' },
        { name: 'pricing', label: 'Memberships and drop-in rates you publish', placeholder: 'Leave blank to keep prices off the site' },
      ],
    },
    {
      title: 'What you offer',
      knownServices: true,
      fields: [
        { name: 'services', label: 'Every class, program and service', long: true },
        { name: 'bestAt', label: 'Who you are best for', placeholder: 'Beginners, athletes, seniors, moms, the 5 AM crowd' },
        { name: 'wantMore', label: 'Programs you want to fill' },
      ],
    },
    lookSection('Any file you have: a photo of your sign or a shirt works too.', 'From your space, your shirts, or what you like'),
    domainSection(),
    anythingElse('Member stories, certifications, challenges, events, or anything you want said or kept off.'),
  ],
};

const PROFESSIONAL: IntakeProfile = {
  kind: 'professional',
  audience: 'clients',
  intro: 'Thank you for trusting us with your website. This form is how it becomes unmistakably yours: who you serve, how you work, and why clients choose you.',
  subjectField: { name: 'licenseNumber', label: 'license' },
  sections: [
    {
      title: 'You and your firm',
      blurb: 'Clients hire a person before a firm. A real photo of you and the team does more than anything else on the page.',
      uploads: [{ kind: 'photo', label: 'Team photo', title: 'Add photos', detail: 'Headshots, the team, the office.', accept: 'image/*', multiple: true, preview: true }],
      fields: [
        { name: 'credentials', label: 'Names and credentials, as you want them shown', placeholder: 'e.g. Jane Smith, CPA' },
        { name: 'story', label: 'Why clients choose you', long: true, placeholder: 'A few lines in your own words is plenty.' },
        { name: 'years', label: 'Years in practice', half: true },
        { name: 'team', label: 'Team size', half: true },
      ],
    },
    {
      title: 'What you do and for whom',
      knownServices: true,
      fields: [
        { name: 'services', label: 'Every service you offer', long: true },
        { name: 'bestAt', label: 'Your ideal client', placeholder: 'Who you help most, and with what' },
        { name: 'wantMore', label: 'Work you want more of' },
        { name: 'wantLess', label: 'Work you do not take', placeholder: 'Say so and we keep it off the site' },
      ],
    },
    {
      title: 'How a new client starts',
      fields: [
        ...contactFields('client', [{ name: 'address', label: 'Office address', half: true }]),
        { name: 'hours', label: 'Hours', placeholder: 'And whether meetings are in person, phone or video' },
        { name: 'booking', label: 'How a first meeting gets booked', placeholder: 'Phone, a scheduler link, a consultation form' },
        { name: 'towns', label: 'Where your clients are', placeholder: 'Towns, the whole state, nationwide' },
      ],
    },
    lookSection('Any file you have: a letterhead or card works too.', 'From your cards, your office, or what you like'),
    domainSection(),
    {
      title: 'Licensing',
      blurb: 'Optional. It goes on the site, because clients comparing look for it.',
      fields: [
        { name: 'licenseNumber', label: 'License, bar or registration number', half: true, placeholder: 'Skip if it does not apply' },
        { name: 'licenseState', label: 'Issued in', half: true, defaultValue: 'Montana' },
      ],
    },
    anythingElse('Reviews you are proud of, associations, awards, community work, or anything you want said or kept off.'),
  ],
};

const GENERAL: IntakeProfile = {
  kind: 'general',
  audience: 'customers',
  intro: 'Thank you for trusting us with your website. This form is how it becomes unmistakably yours: your photos, what you do, who you do it for, your name.',
  subjectField: null,
  sections: [
    {
      title: 'Photos',
      blurb: 'The single most useful thing on this form. Your work, your place, your people. Straight off your phone is perfect.',
      uploads: [{ kind: 'photo', label: 'Photo', title: 'Add photos', detail: 'Pick as many as you like.', accept: 'image/*', multiple: true, preview: true }],
      fields: [{ name: 'photoNotes', label: 'Tell us about them (optional)', long: true }],
    },
    {
      title: 'Your business',
      blurb: 'The basics that go on every page, so people can reach you the first time they try.',
      fields: [
        ...contactFields('customer', [{ name: 'years', label: 'Years in business', half: true }, { name: 'address', label: 'Address, if people visit', half: true }]),
        { name: 'towns', label: 'Where your customers are', placeholder: 'Towns, regions, or nationwide' },
        { name: 'hours', label: 'Hours and seasons' },
      ],
    },
    {
      title: 'What you do',
      knownServices: true,
      fields: [
        { name: 'services', label: 'Everything you offer', long: true },
        { name: 'bestAt', label: 'What you are best at', placeholder: 'What you want a new customer to judge you on' },
        { name: 'wantMore', label: 'What you want more of' },
        { name: 'wantLess', label: 'What you do not want', placeholder: 'Say so and we keep it off the site' },
      ],
    },
    lookSection('Any file you have: a photo of a sign or card works too.', 'Your colors, or what you like'),
    domainSection(),
    anythingElse('Reviews you are proud of, awards, how you got started, or anything you want said or kept off.'),
  ],
};

export const INTAKE_PROFILES: Record<IntakeKind, IntakeProfile> = {
  trade: TRADE,
  'physical-therapy': clinicProfile('physical-therapy'),
  clinic: clinicProfile('clinic'),
  restaurant: RESTAURANT,
  retail: RETAIL,
  beauty: BEAUTY,
  fitness: FITNESS,
  professional: PROFESSIONAL,
  general: GENERAL,
};

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

/**
 * Ordered: the first pattern that matches wins, so the specific sits above the
 * general. Physical therapy is checked before clinic, and clinic before beauty,
 * so "massage therapy clinic" lands on clinic and "day spa" on beauty.
 */
const MATCHERS: Array<[IntakeKind, RegExp]> = [
  ['physical-therapy', /\b(physical therap\w*|physiotherap\w*|\bp\.?t\.?\b|sports rehab|rehab(ilitation)? clinic|orthopedic rehab)\b/i],
  ['clinic', /\b(chiropract\w*|dental|dentist\w*|orthodont\w*|optometr\w*|eye care|clinic|medical|medicine|health ?care|physician|pediatric\w*|counsel(ing|or)|therap(y|ist)|massage therap\w*|acupunctur\w*|naturopath\w*|vet(erinar\w*)?|animal hospital|wellness center)\b/i],
  ['restaurant', /\b(restaurant|cafe|café|coffee|bakery|bistro|grill|pizza|diner|brew(ery|pub)?|tap ?room|bar|kitchen|eatery|food truck|catering|winery|distillery|crafthouse)\b/i],
  ['beauty', /\b(salon|spa|barber\w*|nails?|lash(es)?|brows?|esthetic\w*|aesthetic\w*|med ?spa|hair|beauty|tattoo|skin ?care)\b/i],
  ['fitness', /\b(gym|fitness|crossfit|yoga|pilates|barre|martial arts|dojo|boxing|personal train\w*|athletic club)\b/i],
  ['professional', /\b(law|attorney\w*|legal|account(ant|ing)|cpa|bookkeep\w*|tax|financial|advis[eo]r\w*|insurance|real estate|realt(or|y)|mortgage|consult\w*|architect\w*|engineer\w*|agency)\b/i],
  ['trade', /\b(construct\w*|contract\w*|build(er|ers|ing)?|built|roof\w*|plumb\w*|electric\w*|hvac|heating|cooling|landscap\w*|lawn|irrigation|sprinkler|snow|excavat\w*|concrete|paving|deck\w*|fenc\w*|paint\w*|remodel\w*|handyman|clean(ing|ers)|maids?|janitorial|junk|haul\w*|tree|septic|well drilling|garage door|windows?|flooring|cabinet\w*|pest|pool|detail(ing)?|moving|towing)\b/i],
  ['retail', /\b(shop|store|boutique|gallery|gifts?|market|outfitter\w*|books?|apparel|clothing|jewel\w*|florist|nursery|garden center|supply|botanicals?|apothecary)\b/i],
];

function match(hay: string): IntakeKind | null {
  if (!hay.trim()) return null;
  for (const [kind, re] of MATCHERS) if (re.test(hay)) return kind;
  return null;
}

/**
 * The company name decides first, because a note or a summary mentions plenty
 * of words that are not the business ("insurance" in a clinic note, "kitchen"
 * in a remodeler's). Only when the name says nothing does the rest get a vote.
 */
export function detectIntakeKind(company: string | null | undefined, ...context: Array<string | null | undefined>): IntakeKind {
  return match(company ?? '') ?? match(context.filter(Boolean).join(' \n ')) ?? 'general';
}

const KINDS = new Set<string>(Object.keys(INTAKE_PROFILES));

export function isIntakeKind(v: unknown): v is IntakeKind {
  return typeof v === 'string' && KINDS.has(v);
}

/** The safe form of a stored intake_tailor value; anything malformed is dropped. */
export function readTailor(raw: unknown): IntakeTailor {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: IntakeTailor = {};
  if (isIntakeKind(r.kind)) out.kind = r.kind;
  if (typeof r.intro === 'string' && r.intro.trim()) out.intro = r.intro.trim();
  if (Array.isArray(r.questions)) {
    out.questions = r.questions
      .filter((q): q is Record<string, unknown> => !!q && typeof q === 'object' && typeof (q as { label?: unknown }).label === 'string')
      .slice(0, 12)
      .map((q) => ({
        name: typeof q.name === 'string' ? q.name : undefined,
        label: String(q.label).trim(),
        placeholder: typeof q.placeholder === 'string' ? q.placeholder : undefined,
        long: q.long === true,
      }))
      .filter((q) => q.label);
  }
  return out;
}

/**
 * The profile this client sees, with their own questions folded in as a
 * section just before "Anything else".
 */
export function tailoredProfile(kind: IntakeKind, tailor: IntakeTailor, company: string): IntakeProfile {
  const base = INTAKE_PROFILES[kind];
  const questions = tailor.questions ?? [];
  if (!questions.length && !tailor.intro) return base;
  const sections = [...base.sections];
  if (questions.length) {
    const own: IntakeSection = {
      title: company && company !== 'your business' ? `A few questions just for ${company}` : 'A few questions just for you',
      blurb: 'From our conversation. Answer what you can.',
      fields: questions.map((q, i) => ({
        name: q.name?.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40) || `custom${i + 1}`,
        label: q.label,
        placeholder: q.placeholder,
        long: q.long,
      })),
    };
    sections.splice(Math.max(0, sections.length - 1), 0, own);
  }
  return { ...base, intro: tailor.intro ?? base.intro, sections };
}
