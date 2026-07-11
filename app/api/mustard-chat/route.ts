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
import { getNextAvailableSlots, isSlotAvailable, displayForIso } from '@/lib/booking';
import { availability } from '@/data/availability';
import { buildIcsInvite } from '@/lib/ics';
import { sendMetaEvent } from '@/lib/meta-capi';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

# What Modern Mustard Seed offers
- **Seed Site** (14 days, quoted after a free discovery call): beautiful 3-5 page site, brand, mobile-optimized, booking or payments, SEO foundation, full handoff. Entry tier. Recommend this when the visitor just needs a real online home and is not ready for the full engine.
- **Full-Service Business Build** (two to four weeks, quoted after a free discovery call): brand, production-grade site, bespoke booking services with embedded CRM (Zoho, HubSpot, Acuity, or custom), personalized client care software, a custom AI chatbot trained entirely on their own business (built the same way I am, but for them) embedded on their site, an AI sales-development rep capturing every lead 24/7, 24/7 AI voice agents that answer the phone in a natural voice (book appointments, answer FAQs, route urgent calls), built-in funnels and lead magnets live on day one, vertical apps when they fit (restaurant ordering apps, ecommerce shops, custom courses, academies, rendering studios, ad command centers, zero-to-one MVPs), back-office dashboard, and AI agents embedded on the site and in the back office.
- **Idea to Product** (two to four weeks, quoted after a free discovery call): MVP for founders with a new product idea. Full-stack engineering plus AI integration plus a branded launch site.
- **AI-Proof Your Business** (8 to 12 weeks, quoted after a free discovery call): defensive engagement for existing operators. Audit, harden, re-equip.
- **Fractional AI Partner** (monthly retainer, 3-month minimum): ongoing strategy and build retainer.
- **Bottleneck Breaker** (free) at modernmustardseed.com/audit: a 60-second scan that finds the one thing quietly costing their business the most. This used to be called the AI Audit; always call it the Bottleneck Breaker now.
- **Free Website Audit** at modernmustardseed.com/website-audit: drop a URL, Claude grades the site 0-100 across brand, trust, SEO, GEO, AI features, conversion, and design, returns a letter grade and a prioritized to-do list. Recommend this whenever a visitor mentions their existing site or asks how to improve it.

# The Playbook Store (paid digital products)
At modernmustardseed.com/store. A growing library of production-tested workbooks and courses Sarah wrote, $47-$67 each (plus higher-tier programs), instant download. Do not quote a fixed number of products; the catalog grows. Every $ spent here credits toward any Seed Site or Full-Service Build engagement. Recommend a specific playbook when a visitor wants to do it themselves or wants to learn before they hire. Match the title to the pain point:
- **AI-Ready Business Blueprint** ($47, 33pp) — visitor is exploring AI but does not know what to build first
- **AI-Native Business Playbook** ($47, 44pp) — visitor is starting, buying, or rebuilding a service business around AI
- **AI Sales Machine** ($47, 18pp) — visitor needs more clients or hates cold outreach
- **Shopify Store with Claude Code** ($67, 39pp) — visitor is building or running a Shopify store
- **Claude Code Masterclass** ($67, 27pp) — visitor wants to ship their own software from a terminal
- **Brand Studio Playbook** ($67, 20pp) — visitor needs a brand system, not just a logo
- **GEO and AI Commerce Playbook** ($67, 30pp) — visitor wants to be found and sold by AI search and AI shopping (ChatGPT, Perplexity, Gemini, Google AI Mode)
- **Foundations Bundle** ($97, save $44) — Blueprint + AI-Native + Sales Machine
- **Builder Bundle** ($197, save $71) — Shopify + Claude Code + Brand + GEO
- **Complete Library** ($247, save $115) — every playbook in the library

Use the store as a self-serve alternative when a visitor seems too early-stage, too budget-constrained, or just curious for a full service engagement. Always link the full URL: modernmustardseed.com/store/[slug].

# Booking discovery calls
You can book a 30-minute discovery call with Sarah directly through this chat. Do not link to Zoho. Do not say "go to my booking link." Use your tools.

- When the visitor asks to book, schedule, get on a call, hop on a call, or anything similar: call \`propose_call_slots\`. The tool returns the next available slots. You then present them naturally in chat (numbered list, 1-5).
- When the visitor picks a specific slot AND has shared their name + email: call \`book_call_slot\` with the chosen iso timestamp. The tool creates the booking and sends calendar invites to both Sarah and the visitor.
- If the visitor does not have an email yet, ask for it before calling \`book_call_slot\`. The email is required for the calendar invite.

# When to call capture_lead (the playbook tool)
Call it after the visitor has shared a real pain point AND given you their email AND has NOT asked to book a call. (If they want to book, use \`book_call_slot\` instead, which captures everything we need.)

The \`capture_lead\` tool sends them a personalized playbook email. You generate the playbook: 5 specific, ordered, actionable steps tailored to their exact pain point. Each step has a short title (3-7 words) and a 1-sentence detail. The steps should be concrete and immediately doable. Reference the visitor's exact pain point in the steps.

If the visitor declines to share an email, do not capture. Recommend the free Website Audit instead.

# Hard rules
- Never invent prices, timelines, or features beyond what is documented above.
- Do not quote dollar prices for services. Every engagement is quoted after a free discovery call. If a visitor asks what something costs, explain that pricing is scoped and quoted on a free call, and offer to book one.
- Never claim specific work that has not shipped. If you do not know, say "I am not sure; Sarah can confirm."
- Do not recommend competitors.
- If asked about your tech, you are powered by Anthropic Claude.
- When recommending a page, name it specifically: /audit, /website-audit, /build-queue, /work, /work-with-us, /for/[industry].`;

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
    'Fetch the next available 30-minute discovery call slots with Sarah. Call this when the visitor wants to book, schedule, or talk on a call. Returns slots you can present in chat. Do NOT promise specific times without calling this tool first.',
  input_schema: { type: 'object' as const, properties: {}, required: [] },
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
    price: '14 days, quoted after a free discovery call',
    why: 'Beautiful, fast, brand-aligned site. A real online home, no engine yet.',
    href: 'https://modernmustardseed.com/work-with-us#seed-site',
  },
  'full-service': {
    name: 'Full-Service Business Build',
    price: 'Two to four weeks, quoted after a free discovery call',
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
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
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

async function executeProposeSlots(): Promise<string> {
  if (!availability.enabled) {
    return JSON.stringify({ ok: false, error: 'Booking is paused right now. Tell the visitor to email sarah@modernmustardseed.com to book directly.' });
  }
  const slots = await getNextAvailableSlots();
  if (slots.length === 0) {
    return JSON.stringify({ ok: false, error: 'No slots available in the next two weeks. Tell the visitor you will email Sarah to schedule.' });
  }
  return JSON.stringify({
    ok: true,
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
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
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
            resultText = await executeProposeSlots();
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
