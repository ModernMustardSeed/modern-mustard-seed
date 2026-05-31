import { getSupabase } from './supabase';
import { normalizeEmail } from './client-auth';

/**
 * The MMS partner outreach method, encoded. The four tiers, the five-point fit
 * rubric, and the verbatim message templates from the Outreach Kit. The AI
 * draft agent scores fit against the rubric and personalizes these templates.
 * Generous and honest. The system drafts; Sarah always approves.
 */

export const CHANNEL_TYPES = ['email', 'instagram', 'linkedin', 'x', 'youtube', 'warm'] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const TIERS: Record<number, string> = {
  1: 'Operator voices (consultants, agencies, fractional leaders) — their audiences hold build clients',
  2: 'Builder educators (teach building with AI, no-code, indie hacking) — high product fit',
  3: 'Audience holders (newsletters, podcasts, communities in startup/AI)',
  4: 'Warm circle (your buyers, past clients, your network) — start here',
};

export const RUBRIC = [
  { key: 'audience', label: 'Audience relevance', five: 'Their people actively want to build things or get something built' },
  { key: 'trust', label: 'Trust and engagement', five: 'Their audience listens and acts on what they recommend' },
  { key: 'values', label: 'Values fit', five: 'Honest, generous, not hypey. They will represent the brand well' },
  { key: 'buildClient', label: 'Build-client potential', five: 'Their audience contains founders and operators who could become build clients' },
  { key: 'warmth', label: 'Warmth', five: 'You already have a relationship, or a real reason to connect' },
] as const;

const FREE_ACCESS_LINK = 'https://modernmustardseed.com/partners';

/** Verbatim three-touch cold email sequence from the kit. */
export const EMAIL_TOUCHES = [
  {
    touch: 1,
    subject: 'a partner idea for [their channel or audience]',
    body: `Hi [first name],

I have been following [their work] and the way you [specific, genuine detail about what they do well]. I run Modern Mustard Seed, where I build AI products and teach people to build their own.

I just launched two products your audience would actually use: one that teaches anyone to become a fullstack builder with Claude Code, and one that turns an idea into a buildable spec. I would love to set you up as a partner. You would earn 50 percent on every sale, get both products free so you can speak to them honestly, and earn 10 percent of any build fee if someone you send wants something built for them.

No cost, no pressure. Want me to send you free access to look first?

Go build something good,
Sarah`,
  },
  {
    touch: 2,
    subject: 'free access, no strings',
    body: `Hi [first name],

Following up with something useful instead of a nudge. I opened free access to both products so you can see whether they fit your audience before you decide anything: ${FREE_ACCESS_LINK}

If it is a fit, setting up the partner side takes two minutes and pays generously. If it is not, keep the access anyway, no strings.

Sarah`,
  },
  {
    touch: 3,
    subject: 'last note from me',
    body: `Hi [first name],

I will stop here so I am not cluttering your inbox. The free access stays open if you ever want to look: ${FREE_ACCESS_LINK}

And if you would ever rather have a system like this, the products, the partner program, the whole thing, built for your own business, that is exactly what we do. Either way, I am cheering you on.

Sarah`,
  },
];

/** Verbatim single-message templates for short channels and the warm path. */
export const SOCIAL_TEMPLATES: Record<Exclude<ChannelType, 'email'>, string> = {
  instagram: `Hi [first name], love what you are doing with [their work]. I just launched two products your audience would actually use, one on learning to build with AI, one on turning an idea into a spec, and I would love to set you up as a partner: 50 percent per sale, both free for you, plus 10 percent of any build fees. Want me to send free access to look? No pressure.`,
  linkedin: `Connect note: Hi [first name], I build AI products and teach people to build their own. I think there may be a fit with your audience and would love to connect.

Message: Thanks for connecting, [first name]. I just launched two products your audience would use, and I run a partner program that pays 50 percent per sale, gives you both products free, and pays 10 percent of any build fee for clients you send. Happy to send free access so you can see if it fits. Want me to?`,
  x: `Hey [first name], big fan of [their work]. Just launched two products your audience would use. Want to set you up as a partner: 50 percent per sale, both free for you, 10 percent of build fees. Want free access to peek?`,
  youtube: `Hi [first name], your video on [specific video] was excellent, especially [detail]. I build AI products and just launched two your viewers would genuinely use. I would love to set you up as a partner: 50 percent per sale, both free for you to try, and 10 percent of any build fee if a viewer wants something built. Want me to send free access first? Sarah`,
  warm: `Hi [first name], you have been through [the product they own], so you know it works. I just opened a partner program, and you would be perfect for it. You earn 50 percent sharing what you already use, and 10 percent of any build fee if someone you send wants a build. Want me to turn on your partner links? It takes two minutes and there is no cost, only upside.`,
};

export function templateFor(channel: ChannelType, touch: number): { subject?: string; body: string } {
  if (channel === 'email') {
    const t = EMAIL_TOUCHES.find((e) => e.touch === touch) ?? EMAIL_TOUCHES[0];
    return { subject: t.subject, body: t.body };
  }
  return { body: SOCIAL_TEMPLATES[channel] };
}

/** Days to wait before the next email touch. Touch 1 -> 2 is 3 days, 2 -> 3 is 4. */
export const CADENCE_WAIT_DAYS: Record<number, number> = { 2: 3, 3: 4 };

/** Follow-up touches (2 and 3) only need the first name filled. They carry no
 *  invented specifics, so they can be sent on cadence without the AI. */
export function personalizeTouch(touch: number, firstName: string): { subject: string; body: string } {
  const t = EMAIL_TOUCHES.find((e) => e.touch === touch) ?? EMAIL_TOUCHES[0];
  const fn = (firstName || 'there').trim();
  return {
    subject: t.subject.replace('[their channel or audience]', 'your audience'),
    body: t.body.replace(/\[first name\]/g, fn),
  };
}

/** Is this contact on the permanent suppression list (opted out)? */
export async function isSuppressed(contact: string): Promise<boolean> {
  const client = getSupabase();
  if (!client || !contact) return false;
  try {
    const { data } = await client.from('suppression').select('id').eq('contact', contact.toLowerCase().trim()).maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/** Never contact an existing affiliate or a duplicate prospect. */
export async function alreadyKnown(contact: string): Promise<'affiliate' | 'prospect' | null> {
  const client = getSupabase();
  if (!client || !contact) return null;
  const c = contact.toLowerCase().trim();
  try {
    const { data: aff } = await client.from('affiliates').select('id').eq('email', normalizeEmail(c)).maybeSingle();
    if (aff) return 'affiliate';
    const { data: pr } = await client.from('prospects').select('id').eq('contact', c).maybeSingle();
    if (pr) return 'prospect';
  } catch {
    /* ignore */
  }
  return null;
}
