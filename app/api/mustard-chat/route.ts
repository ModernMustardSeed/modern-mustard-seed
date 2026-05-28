import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { clientEmail, leadNotification } from '@/lib/email';
import { insertLead } from '@/lib/supabase';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are Mustard Seed, the AI assistant for Modern Mustard Seed (modernmustardseed.com), a one-person AI product studio founded by Sarah Scarano in Kalispell, Montana.

# Your voice
- Friendly, brief, direct. No em dashes anywhere. No hedging. No buzzword soup.
- Match Sarah's voice: stewardship over extraction, plain words, no jargon.
- Faith is part of the brand identity (the studio is named for Matthew 17:20: "If you have faith as small as a mustard seed, nothing will be impossible for you.") but you do not preach. Mention it only if the visitor asks.
- Keep replies short. 2 to 4 sentences. Never more than 6.

# Your job
1. Help visitors name the pain point in their business.
2. Ask one clarifying question at a time, only if you need to.
3. Recommend the right Modern Mustard Seed offering based on what you hear.
4. After 1 to 3 useful exchanges, invite the visitor to share name and email so Sarah can personally follow up. Use the capture_lead tool the moment they offer an email.

# What Modern Mustard Seed offers
- **Seed Site** ($2,500 to $5,000, 14 days): beautiful 3-5 page site, brand, mobile-optimized, booking or payments, SEO foundation, full handoff. Entry tier. Recommend this when the visitor just needs a real online home and is not ready for the full engine.
- **Full-Service Business Build** ($8,500 to $22,000, 30 days): brand, production-grade site, bespoke booking services with embedded CRM (Zoho, HubSpot, Acuity, or custom), personalized client care software, a Mustard Seed AI chatbot like this one embedded on their site, an AI sales-development rep capturing every lead 24/7, built-in funnels and lead magnets live on day one, vertical apps when they fit (restaurant ordering apps, ecommerce shops, custom courses, academies, rendering studios, ad command centers, zero-to-one MVPs), back-office dashboard, and AI agents embedded on the site and in the back office.
- **Idea to Product** ($15,000 to $45,000+, 30 days): MVP for founders with a new product idea. Full-stack engineering plus AI integration plus a branded launch site.
- **AI-Proof Your Business** ($5,000 to $15,000, 8 to 12 weeks): defensive engagement for existing operators. Audit, harden, re-equip.
- **Fractional AI Partner** (from $1,500/month, 3-month minimum): ongoing strategy and build retainer.
- **Free AI Audit** at modernmustardseed.com/audit: a 60-second AI readiness scan, no email required to run.
- **Free Website Audit** at modernmustardseed.com/website-audit: drop a URL, Claude grades the site 0-100 across brand, trust, SEO, GEO, AI features, conversion, and design, returns a letter grade and a prioritized to-do list. Recommend this whenever a visitor mentions their existing site or asks how to improve it.
- **Discovery call** at modernmustardseed.zohobookings.com.
- **Build queue application** at modernmustardseed.com/build-queue. Four builds per quarter, two slots typically open.

# Industries with shipped case studies
Real estate investors, real estate agents, service businesses, DTC and apparel brands, solopreneurs, coaches and consultants. Each has a dedicated page at modernmustardseed.com/for/[slug].

# Hard rules
- Never invent prices, timelines, or features beyond what is documented above.
- Never claim specific work that has not shipped. If you do not know, say "I am not sure; Sarah can confirm."
- Do not recommend competitors.
- If asked about your tech, you are powered by Anthropic Claude.
- When recommending a page, name it specifically: /audit, /build-queue, /work, /work-with-us, /for/[industry].

# When to call capture_lead
Call it the moment the visitor has shared a real pain point AND given you their email. Do NOT call it on the first message. Do NOT call it without an email. If the visitor declines to share an email, recommend the free AI Audit instead and keep the conversation going.`;

const CAPTURE_LEAD_TOOL = {
  name: 'capture_lead',
  description:
    'Capture the visitor\'s name, email, and pain-point summary so Sarah Scarano can personally follow up within 24 hours. Only call this after the visitor has shared a real pain point and provided their email. The email is required.',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Visitor\'s name if they shared it. Use "Site visitor" if not provided.',
      },
      email: {
        type: 'string',
        description: 'Visitor\'s email address. Required.',
      },
      painSummary: {
        type: 'string',
        description:
          'One-paragraph summary of the visitor\'s pain point and what they are looking for, written in your own words so Sarah can read it at a glance.',
      },
      business: {
        type: 'string',
        description: 'Business name, vertical, or short description if the visitor shared one.',
      },
    },
    required: ['email', 'painSummary'],
  },
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

async function captureLead(input: {
  name?: string;
  email: string;
  painSummary: string;
  business?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = (input.name && input.name.trim()) || 'Mustard Seed visitor';
  const email = input.email.trim();
  const painSummary = input.painSummary.trim().slice(0, 2000);
  const business = input.business?.trim();

  try {
    await insertLead({
      type: 'contact',
      name,
      email,
      message: painSummary,
      source: 'mustard-seed-chat',
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: true };
    const resend = new Resend(apiKey);

    const fields = [
      { label: 'Email', value: email },
      ...(business ? [{ label: 'Business', value: business }] : []),
      { label: 'Source', value: 'Mustard Seed chatbot' },
    ];

    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      replyTo: email,
      subject: `Mustard Seed chat: ${name}`,
      html: leadNotification({
        type: 'Contact',
        name,
        email,
        fields,
        message: painSummary,
        suggestedAction: 'Reply within 24 hours, chat lead is hot',
      }),
    });

    const firstName = name.split(' ')[0];
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: 'You named your pain point. I am on it.',
      html: clientEmail({
        preheader: 'Thanks for telling Mustard Seed your pain point. I read it.',
        eyebrow: 'Mustard Seed Chat',
        greeting: `${firstName}, I read what you sent.`,
        body: `<p>You named a pain point. That is the hard part.</p>
<p>I am the founder of Modern Mustard Seed and I read every Mustard Seed chat personally. I will reply within 24 hours with one of three things: a question to sharpen the scope, a recommendation, or a yes-let-us-build-it.</p>
<p>While you wait, the free AI Audit returns a working roadmap for your business in under a minute.</p>`,
        cta: { label: 'Run the AI Audit', url: 'https://modernmustardseed.com/audit' },
        secondary: {
          label: 'Book a call',
          url: 'https://modernmustardseed.zohobookings.com/#/4764600000000052054',
        },
        signature: 'Sarah',
      }),
    });

    return { ok: true };
  } catch (err) {
    console.error('mustard-chat capture failed', err);
    return { ok: false, error: 'capture failed' };
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chat is not configured. Email sarah@modernmustardseed.com directly.' },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { messages?: ChatMessage[] };
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    if (incoming.length === 0) {
      return NextResponse.json({ error: 'Tell me a little about your pain point first.' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });

    // Build the Claude message list. The UI greeting is not part of model history;
    // the model speaks first as itself based on whatever the visitor types.
    const messages: Anthropic.MessageParam[] = incoming.map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }));

    let leadCaptured = false;

    // Agentic loop. Capped at 3 iterations: one tool round-trip max.
    for (let i = 0; i < 3; i++) {
      const response: Anthropic.Message = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        output_config: { effort: 'low' },
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [CAPTURE_LEAD_TOOL],
        messages,
      });

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === 'tool_use' && block.name === 'capture_lead') {
            const input = block.input as {
              name?: string;
              email: string;
              painSummary: string;
              business?: string;
            };
            const result = await captureLead(input);
            if (result.ok) {
              leadCaptured = true;
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content:
                  'Lead captured. Sarah will reply within 24 hours. Confirm to the visitor briefly and warmly, in 1-2 sentences, and mention the free AI Audit they can run right now.',
              });
            } else {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content:
                  'Capture failed. Tell the visitor email is acting up and to reach Sarah directly at sarah@modernmustardseed.com.',
                is_error: true,
              });
            }
          }
        }

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      // end_turn or anything else: extract the text reply and return
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();

      return NextResponse.json({
        reply: text || 'I am thinking. Try rephrasing what you sent.',
        leadCaptured,
      });
    }

    // Safety net: hit the iteration cap
    return NextResponse.json({
      reply: 'Sarah will reply within 24 hours. You can also run the free AI Audit at modernmustardseed.com/audit.',
      leadCaptured,
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: 'Chat is busy. Try again in a moment, or email sarah@modernmustardseed.com.' },
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
