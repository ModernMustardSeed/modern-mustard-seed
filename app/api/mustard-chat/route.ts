import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { resendClient } from '@/lib/send-email';
import {
  playbookEmail,
  bookingConfirmationEmail,
  bookingNotificationEmail,
  leadNotification,
} from '@/lib/email';
import { insertLead, getSupabase } from '@/lib/supabase';
import { getNextAvailableSlots, isSlotAvailable, displayForIso, bookingWindow } from '@/lib/booking';
import { availability } from '@/data/availability';
import { buildIcsInvite } from '@/lib/ics';
import { sendMetaEvent } from '@/lib/meta-capi';
import { randomUUID } from 'node:crypto';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { DEPARTMENTS, BESPOKE } from '@/data/services-hub';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';
import { products as storeProducts, bundles as storeBundles, isComingSoon } from '@/data/products';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * The offer sections of Mr. Mustard's prompt are BUILT FROM LIVE DATA, never
 * hand-typed. This prompt spent months advertising a "Seed Site" tier that no
 * longer existed and pointing at /build-queue, a route that had been deleted.
 * Anything the studio actually sells is defined once (services-hub, demo-order,
 * products) and rendered here, so adding or retiring a door updates the chat
 * automatically. Only add a hand-written line for something with no data source.
 */
const VOICE = DEMO_PRODUCTS.voice;
const SITE = DEMO_PRODUCTS.site;
const OS = DEMO_PRODUCTS.os;

const DEPT_LINES = DEPARTMENTS.map(
  (d) => `- **${d.name}** (${d.tag}) at modernmustardseed.com${d.href}: ${d.blurb}`,
).join('\n');

const BESPOKE_LINES = BESPOKE.map((b) => `- **${b.name}**: ${b.desc}`).join('\n');

const STORE_LINES = [
  ...storeProducts
    .filter((p) => !isComingSoon(p.slug))
    .map((p) => `- **${p.name}** ($${p.priceUsd}, ${p.pages}pp) at /store/${p.slug} — for: ${p.idealBuyer}`),
  ...storeBundles
    .filter((b) => !isComingSoon(b.slug))
    .map((b) => `- **${b.name}** ($${b.priceUsd}, saves $${b.savings}) at /store/${b.slug} — ${b.pitch}`),
].join('\n');

const SYSTEM_PROMPT = `You are Mr. Mustard, the AI assistant for Modern Mustard Seed (modernmustardseed.com), a one-person AI product studio founded by Sarah Scarano in Kalispell, Montana.

# Your voice
- Friendly, brief, direct. No em dashes anywhere. No hedging. No buzzword soup.
- Match Sarah's voice: stewardship over extraction, plain words, no jargon.
- Faith is part of the brand identity (the studio is named for Matthew 17:20: "If you have faith as small as a mustard seed, nothing will be impossible for you.") but you do not preach. Mention it only if the visitor asks.
- Keep replies short. 2 to 4 sentences. Never more than 6.

# Your job
1. Help visitors name the pain point in their business.
2. Ask one clarifying question at a time, only if you need to.
3. Recommend the right Modern Mustard Seed offering based on what you hear.
4. Use your tools to capture the lead, propose call slots, or book a call when the moment is right.

# The front door: free demos (lead with this)
At modernmustardseed.com/demos the visitor enters their business once and we forge three real working demos for them in about twenty seconds: a voice agent that answers as their business, a website designed from scratch, and a command center with their name on it. No card, no meeting, nothing to install. This is the single best thing you can offer almost any visitor, because they get to judge the real product before spending a dollar. Send people here early and often.

# The three core products (published prices, you may quote these)
- **Your New Website** (${formatUsd(SITE.setupCents)} setup + ${formatUsd(SITE.monthlyCents)}/mo, live in about a week) at /websites: elite custom design built from scratch, funnels and a lead magnet live day one, SEO and GEO baked in, the command center free behind it, and their domain, hosting, and ongoing care handled. They own the code, the domain, and every account on launch day.
- **The Voice Agent** (${formatUsd(VOICE.setupCents)} setup + ${formatUsd(VOICE.monthlyCents)}/mo) at /voice-agents: answers their real number 24/7 in a natural voice, qualifies the caller, books the job, and texts them the details. ${VOICE.finePrint}
- **The Business Command Center** (${formatUsd(OS.setupCents)} setup + ${formatUsd(OS.monthlyCents)}/mo on its own, but FREE with the website or the voice agent) at /command-center: calls transcribed, website traffic, customers, reviews, and money on one board.
- **The Whole System** (${formatUsd(DEMO_BUNDLE.setupCents)} setup + ${formatUsd(DEMO_BUNDLE.monthlyCents)}/mo): the website and the voice agent together at a real discount, command center included.

IMPORTANT: the voice agent is NOT included with the website. They are separate products with separate prices. The voice agent can be added to any website, the one we build or one they already have. Never say a website "comes with" or "includes" a voice agent. The command center is the only piece that rides free with a paid piece.

Everything above is month to month, cancel anytime. There is no free trial and no free month on a real line. The DEMO is the free part.

# The other live departments (each opens with a free demo or tool)
${DEPT_LINES}

Every department page publishes its own pricing. If a visitor asks what one of these costs and it is not in the three core products above, send them to that page rather than guessing a number.

# Bespoke work (quoted after a free discovery call)
The **Full-Service Business Build** is for operators who need more than a productized door: custom booking with an embedded CRM, an AI sales rep, a vertical app, an online store, the whole back office wired around it. Fixed scope, fixed quote, and they own all of it. Categories:
${BESPOKE_LINES}

# Free tools worth recommending
- **Bottleneck Breaker** (free) at /audit: a 60-second scan that finds the one thing quietly costing their business the most. This used to be called the AI Audit; always call it the Bottleneck Breaker now.
- **Free Website Audit** at /website-audit: drop a URL, Claude grades the site 0-100 across brand, trust, SEO, GEO, AI features, conversion, and design, returns a letter grade and a prioritized to-do list. Recommend this whenever a visitor mentions their existing site or asks how to improve it. Never promise a ranking outcome.

# The Playbook Store (paid digital products)
At modernmustardseed.com/store. Production-tested workbooks and courses Sarah wrote, instant download. Do not quote a fixed number of products; the catalog grows. Recommend a specific playbook when a visitor wants to do it themselves or wants to learn before they hire:
${STORE_LINES}

Use the store as a self-serve alternative when a visitor seems too early-stage, too budget-constrained, or just curious for a full engagement. Always link the full URL: modernmustardseed.com/store/[slug].

# Booking discovery calls
You can book a 30-minute discovery call with Sarah directly through this chat. Do not link to Zoho. Do not say "go to my booking link." Use your tools.

- When the visitor asks to book, schedule, get on a call, hop on a call, or anything similar: call \`propose_call_slots\`. The tool returns the next available slots. You then present them naturally in chat (numbered list, 1-5).
- Sarah books up to about four months out. If the visitor wants a specific later day, week, or month ("mid August", "sometime in September"), call \`propose_call_slots\` with fromDate set to where they want to start (YYYY-MM-DD). Never tell a visitor a date is too far ahead without checking the tool first.
- When the visitor picks a specific slot AND has shared their name + email: call \`book_call_slot\` with the chosen iso timestamp. The tool creates the booking and sends calendar invites to both Sarah and the visitor.
- If the visitor does not have an email yet, ask for it before calling \`book_call_slot\`. The email is required for the calendar invite.

# When to call capture_lead (the playbook tool)
Call it after the visitor has shared a real pain point AND given you their email AND has NOT asked to book a call. (If they want to book, use \`book_call_slot\` instead, which captures everything we need.)

The \`capture_lead\` tool sends them a personalized playbook email. You generate the playbook: 5 specific, ordered, actionable steps tailored to their exact pain point. Each step has a short title (3-7 words) and a 1-sentence detail. The steps should be concrete and immediately doable. Reference the visitor's exact pain point in the steps.

If the visitor declines to share an email, do not capture. Point them at the free demos (/demos) or the free Website Audit instead, since neither needs a card or a meeting.

# Hard rules
- Never invent prices, timelines, or features beyond what is documented above.
- You MAY quote the three core product prices and the store prices, exactly as written above, because they are published on the site. For any other department, send them to its page instead of naming a number. Bespoke work is always scoped and quoted after a free discovery call, so offer to book one.
- Never offer a free trial, a free month, or a discount. The free demo is the offer.
- Never claim specific work that has not shipped. If you do not know, say "I am not sure; Sarah can confirm."
- Do not recommend competitors.
- If asked about your tech, you are powered by Anthropic Claude.
- When recommending a page, name it specifically and only use real routes: /demos, /websites, /voice-agents, /command-center, /services, /store, /audit, /website-audit, /work, /work-with-us, /for/[industry], plus any department href listed above.`;

const CAPTURE_LEAD_TOOL = {
  name: 'capture_lead',
  description:
    "Send the visitor a personalized 5-step playbook email and notify Sarah. Use after the visitor has shared a real pain point and provided their email. Do not call this if the visitor is booking a call instead. The recommendedSteps array MUST contain exactly 5 ordered, specific, actionable steps you wrote for this visitor's exact pain point.",
  input_schema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'Visitor\'s name if they shared it. Use "Site visitor" if not provided.' },
      email: { type: 'string', description: 'Visitor\'s email address. Required.' },
      painSummary: {
        type: 'string',
        description:
          'One-paragraph summary of the visitor\'s pain point and what they are looking for, in your own words. This will be quoted back to them.',
      },
      business: { type: 'string', description: 'Business name, vertical, or short description if shared.' },
      recommendedSteps: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        description: '5 ordered, specific, actionable steps you would take for this visitor, starting tomorrow morning.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '3 to 7 word imperative step title' },
            detail: { type: 'string', description: 'One-sentence specific detail of what to do' },
          },
          required: ['title', 'detail'],
        },
      },
      recommendedOffer: {
        type: 'string',
        enum: ['seed-site', 'full-service', 'idea-to-product', 'ai-proof', 'fractional', 'audit'],
        description: 'Which Modern Mustard Seed offering best matches this visitor.',
      },
    },
    required: ['email', 'painSummary', 'recommendedSteps'],
  },
};

const PROPOSE_SLOTS_TOOL = {
  name: 'propose_call_slots',
  description:
    'Fetch available 30-minute discovery call slots with Sarah. Call this when the visitor wants to book, schedule, or talk on a call. Returns slots you can present in chat. Do NOT promise specific times without calling this tool first. Bookings are open up to about four months out: when the visitor asks about a later day, week, or month ("mid August", "sometime in September"), pass fromDate instead of saying it is too far ahead.',
  input_schema: {
    type: 'object' as const,
    properties: {
      fromDate: {
        type: 'string',
        description: 'Optional start date, YYYY-MM-DD. Set it when the visitor wants times from a specific later day, week, or month ("sometime in September" means the first of September). Omit for the soonest open times.',
      },
    },
    required: [],
  },
};

const BOOK_SLOT_TOOL = {
  name: 'book_call_slot',
  description:
    "Reserve a specific slot the visitor chose. Send calendar invites to Sarah and the visitor. The slot's startIso must be one of the ISO values you received from propose_call_slots in this conversation. Requires the visitor's name, email, and pain summary.",
  input_schema: {
    type: 'object' as const,
    properties: {
      startIso: { type: 'string', description: 'The exact startIso the visitor picked from the proposed slots.' },
      name: { type: 'string', description: 'Visitor\'s full name.' },
      email: { type: 'string', description: 'Visitor\'s email. Required for the calendar invite.' },
      business: { type: 'string', description: 'Business name or vertical, if shared.' },
      painSummary: { type: 'string', description: 'One-paragraph summary of why they want to talk.' },
      recommendedSteps: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          properties: { title: { type: 'string' }, detail: { type: 'string' } },
          required: ['title', 'detail'],
        },
      },
    },
    required: ['startIso', 'name', 'email', 'painSummary'],
  },
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type OfferKey = 'seed-site' | 'full-service' | 'idea-to-product' | 'ai-proof' | 'fractional' | 'audit';

const OFFER_MAP: Record<OfferKey, { name: string; price: string; why: string; href: string } | null> = {
  'seed-site': {
    name: 'Seed Site',
    price: 'About a week, quoted after a free discovery call',
    why: 'Beautiful, fast, brand-aligned site. A real online home, no engine yet.',
    href: 'https://modernmustardseed.com/work-with-us#seed-site',
  },
  'full-service': {
    name: 'Full-Service Business Build',
    price: 'One to two weeks, quoted after a free discovery call',
    why: 'Site + bespoke booking with CRM + AI SDR + funnels + back office + embedded agents.',
    href: 'https://modernmustardseed.com/work-with-us#online-presence',
  },
  'idea-to-product': {
    name: 'Idea to Product',
    price: 'Two to four weeks, quoted after a free discovery call',
    why: 'MVP for founders with a new product idea. Full-stack engineering plus AI plus launch.',
    href: 'https://modernmustardseed.com/work-with-us#idea-to-product',
  },
  'ai-proof': {
    name: 'AI-Proof Your Business',
    price: '8 to 12 weeks, quoted after a free discovery call',
    why: 'Defensive engagement for existing operators. Audit, harden, re-equip.',
    href: 'https://modernmustardseed.com/work-with-us#ai-proof',
  },
  fractional: {
    name: 'Fractional AI Partner',
    price: 'Monthly retainer, 3-month minimum',
    why: 'Ongoing strategy and build retainer for established operators.',
    href: 'https://modernmustardseed.com/work-with-us#fractional',
  },
  audit: null,
};

/* ───────── Tool execution helpers ───────── */

async function executeCaptureLead(input: {
  name?: string;
  email: string;
  painSummary: string;
  business?: string;
  recommendedSteps: { title: string; detail: string }[];
  recommendedOffer?: OfferKey;
}): Promise<string> {
  const name = (input.name?.trim() || 'Mustard Seed visitor');
  const firstName = name.split(' ')[0];
  const email = input.email.trim();
  const painSummary = input.painSummary.trim().slice(0, 2000);
  const business = input.business?.trim();
  const steps = (input.recommendedSteps ?? []).slice(0, 5);
  const offer = input.recommendedOffer ? OFFER_MAP[input.recommendedOffer] ?? undefined : undefined;

  try {
    await insertLead({
      type: 'contact',
      name,
      email,
      message: painSummary,
      source: 'mustard-seed-chat',
      notes: business ? `Business: ${business}` : null,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = resendClient();
      const fields = [
        { label: 'Email', value: email },
        ...(business ? [{ label: 'Business', value: business }] : []),
        { label: 'Source', value: 'Mustard Seed chatbot' },
      ];
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: email,
        subject: `Mustard Seed chat: ${name}`,
        html: leadNotification({
          type: 'Contact',
          name,
          email,
          fields,
          message: `${painSummary}\n\nPlaybook:\n${steps.map((s, i) => `${i + 1}. ${s.title} — ${s.detail}`).join('\n')}`,
          suggestedAction: 'Reply within 24 hours. Playbook already sent to visitor.',
        }),
      });
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `${firstName}, your Mustard Seed playbook.`,
        html: playbookEmail({
          firstName,
          painSummary,
          recommendedSteps: steps,
          recommendedOffer: offer,
          nextUpTease:
            'Day 2: a two-minute test that tells you if your site is bleeding customers. Day 5: the 12-tool stack vs. one custom system.',
        }),
      });
    }
    await sendMetaEvent({
      eventName: 'Lead',
      eventId: `chat-lead-${email}-${Math.round(Date.now() / 1000)}`,
      email,
      eventSourceUrl: 'https://modernmustardseed.com/',
      customData: { lead_source: 'mr-mustard-chat' },
    });
    return 'Playbook email sent. Confirm briefly to the visitor in 1 to 2 sentences and mention that Day 2 of the playbook arrives in 48 hours.';
  } catch (err) {
    console.error('capture_lead failed', err);
    return 'Capture failed. Tell the visitor email is acting up and to reach Sarah at sarah@modernmustardseed.com.';
  }
}

async function executeProposeSlots(fromDate?: string): Promise<string> {
  if (!availability.enabled) {
    return JSON.stringify({ ok: false, error: 'Booking is paused right now. Tell the visitor to email sarah@modernmustardseed.com to book directly.' });
  }
  const from = (fromDate ?? '').trim();
  const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : undefined;
  const win = bookingWindow();
  let slots = await getNextAvailableSlots(validFrom);
  let note = '';
  if (slots.length === 0 && validFrom) {
    slots = await getNextAvailableSlots();
    note =
      validFrom > win.lastDateStr
        ? `The visitor asked about ${validFrom}, which is past the booking window; Sarah currently books up to ${win.lastDateLabel}. Say that plainly and offer the times below, or offer to have Sarah schedule it by email.`
        : `Nothing is open right around ${validFrom}. Offer the nearest open times below instead.`;
  }
  if (slots.length === 0) {
    return JSON.stringify({ ok: false, error: 'No slots are open right now. Tell the visitor you will email Sarah to schedule.' });
  }
  return JSON.stringify({
    ok: true,
    bookingWindowNote: `Bookings are open up to ${win.lastDateLabel}. For a later week or month, call this tool again with fromDate.`,
    ...(note ? { note } : {}),
    slots: slots.map((s, i) => ({ index: i + 1, startIso: s.startIso, display: s.display, shortLabel: s.shortLabel, dayLabel: s.dayLabel, timeLabel: s.timeLabel })),
    instruction:
      'These are a few options spread across a couple of days. Present them grouped by day (each day with its time options) and let the visitor pick the day and time that suits them. Do not comment on how full or open the calendar is, and do not imply these are the only times that exist. When they pick, call book_call_slot with the matching startIso.',
  });
}

async function executeBookSlot(input: {
  startIso: string;
  name: string;
  email: string;
  business?: string;
  painSummary: string;
  recommendedSteps?: { title: string; detail: string }[];
}): Promise<string> {
  const ok = await isSlotAvailable(input.startIso);
  if (!ok) {
    return JSON.stringify({ ok: false, error: 'That slot is no longer available. Call propose_call_slots again to get fresh times.' });
  }
  const name = input.name.trim();
  const firstName = name.split(' ')[0] || 'there';
  const email = input.email.trim();
  const business = input.business?.trim();
  const painSummary = input.painSummary.trim();
  const steps = input.recommendedSteps?.slice(0, 5) ?? [];
  const { display, shortLabel } = displayForIso(input.startIso);
  const endIso = new Date(new Date(input.startIso).getTime() + availability.slotMinutes * 60 * 1000).toISOString();

  // Persist
  try {
    const client = getSupabase();
    if (client) {
      await client.from('leads').insert({
        type: 'contact',
        name,
        email,
        message: painSummary,
        notes: `Discovery call · ${display}${business ? ` · ${business}` : ''}`,
        timeline: input.startIso,
        status: 'booked',
        source: 'mustard-seed-booking',
        business_name: business ?? null,
      });
    }
  } catch (err) {
    console.error('booking insert failed', err);
  }

  // Emails with ICS attachment
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = resendClient();
      const ics = buildIcsInvite({
        uid: `${randomUUID()}@modernmustardseed.com`,
        startUtc: new Date(input.startIso),
        endUtc: new Date(endIso),
        summary: `Modern Mustard Seed discovery call — Sarah Scarano + ${name}`,
        description: `Discovery call with Sarah Scarano, Modern Mustard Seed.\n\nWhat the visitor said: ${painSummary}\n\nWebsite Audit: https://modernmustardseed.com/website-audit\nThe Work: https://modernmustardseed.com/work`,
        location: availability.conferenceLink || 'Video link will be sent before the call',
        organizerName: 'Sarah Scarano',
        organizerEmail: 'sarah@modernmustardseed.com',
        attendeeName: name,
        attendeeEmail: email,
      });
      const icsAttachment = { filename: 'discovery-call.ics', content: Buffer.from(ics) };

      // Resend returns {error} without throwing, so capture both results.
      const rSarah = await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: email,
        subject: `Booked: ${name} · ${shortLabel}`,
        html: bookingNotificationEmail({
          name,
          email,
          business,
          whenDisplay: display,
          painSummary,
          recommendedSteps: steps,
        }),
        attachments: [icsAttachment],
      });

      const rClient = await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `${firstName}, you are on my calendar — ${shortLabel}`,
        html: bookingConfirmationEmail({
          firstName,
          whenDisplay: display,
          durationMinutes: availability.slotMinutes,
          painSummary,
          conferenceLink: availability.conferenceLink || undefined,
        }),
        attachments: [icsAttachment],
      });

      console.log(
        `CHAT BOOKING EMAILS | sarah=${rSarah.error ? 'FAIL:' + JSON.stringify(rSarah.error) : rSarah.data?.id} | client[${email}]=${rClient.error ? 'FAIL:' + JSON.stringify(rClient.error) : rClient.data?.id}`
      );
    } catch (err) {
      console.error('booking email failed', err);
    }
  }

  await sendMetaEvent({
    eventName: 'Schedule',
    eventId: `chat-book-${input.startIso}-${email}`,
    email,
    eventSourceUrl: 'https://modernmustardseed.com/',
    customData: { lead_source: 'mr-mustard-chat', booking_time: input.startIso },
  });

  return JSON.stringify({
    ok: true,
    display,
    instruction: `Confirm warmly in 2 sentences. Mention the time (${display}), that the calendar invite was just sent to their inbox, and that Sarah will send a video link the day before.`,
  });
}

/* ───────── Main handler ───────── */

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chat is not configured. Email sarah@modernmustardseed.com.' },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { messages?: ChatMessage[] };
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    if (incoming.length === 0) {
      return NextResponse.json({ error: 'Tell me a little about your pain point first.' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });

    const messages: Anthropic.MessageParam[] = incoming.map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }));

    let leadCaptured = false;
    let booked = false;

    // Loop. Capped at 5 to allow multi-tool sequences (propose then book).
    for (let i = 0; i < 5; i++) {
      const response: Anthropic.Message = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        output_config: { effort: 'low' },
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        tools: [CAPTURE_LEAD_TOOL, PROPOSE_SLOTS_TOOL, BOOK_SLOT_TOOL],
        messages,
      });

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          let resultText: string;
          if (block.name === 'capture_lead') {
            resultText = await executeCaptureLead(block.input as Parameters<typeof executeCaptureLead>[0]);
            leadCaptured = true;
          } else if (block.name === 'propose_call_slots') {
            resultText = await executeProposeSlots((block.input as { fromDate?: string }).fromDate);
          } else if (block.name === 'book_call_slot') {
            const r = await executeBookSlot(block.input as Parameters<typeof executeBookSlot>[0]);
            try {
              if ((JSON.parse(r) as { ok?: boolean }).ok) booked = true;
            } catch {
              // ignore parse fail
            }
            resultText = r;
          } else {
            resultText = JSON.stringify({ error: 'Unknown tool.' });
          }
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: resultText });
        }

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();

      return NextResponse.json({
        reply: text || 'Tell me a little more about what is going on.',
        leadCaptured: leadCaptured || booked,
        booked,
      });
    }

    return NextResponse.json({
      reply: 'I need to slow down. Try rephrasing your last note?',
      leadCaptured: leadCaptured || booked,
      booked,
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: 'Chat is busy. Try again in a moment.' },
        { status: 429 }
      );
    }
    if (err instanceof Anthropic.APIError) {
      console.error('mustard-chat anthropic error', err.status, err.message);
      return NextResponse.json(
        { error: 'Chat hit a snag. Email sarah@modernmustardseed.com if it persists.' },
        { status: 502 }
      );
    }
    console.error('mustard-chat error', err);
    return NextResponse.json(
      { error: 'Something broke. Email sarah@modernmustardseed.com.' },
      { status: 500 }
    );
  }
}
