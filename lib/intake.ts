import { byId } from '@/data/proposal-menu';

/**
 * Onboarding intake: scope-aware question sets. The base section is always
 * shown; the rest are chosen from the services on the client's proposal so we
 * only ask what is relevant to what we are building.
 */
export type IntakeField = { key: string; label: string; type: 'text' | 'textarea' | 'url'; placeholder?: string };
export type IntakeSection = { key: string; title: string; intro?: string; fields: IntakeField[] };

const BASICS: IntakeSection = {
  key: 'basics',
  title: 'The basics',
  intro: 'A few essentials so we start aligned.',
  fields: [
    { key: 'business', label: 'Business name', type: 'text', placeholder: 'e.g. Herbal Butters' },
    { key: 'what', label: 'What you do, in a sentence', type: 'textarea' },
    { key: 'audience', label: 'Who you serve', type: 'text', placeholder: 'Your ideal customer' },
    { key: 'goal', label: 'The #1 goal for this project', type: 'textarea' },
    { key: 'success', label: 'What does success look like? A number or signal', type: 'text' },
    { key: 'deadline', label: 'Any hard deadline, and what is driving it?', type: 'text' },
    { key: 'links', label: 'Links: current site, socials, anything relevant', type: 'textarea' },
  ],
};

const BRAND_SITE: IntakeSection = {
  key: 'brand_site',
  title: 'Brand and website',
  fields: [
    { key: 'brand_assets', label: 'Logo, colors, fonts: paste a link or note "need help"', type: 'textarea' },
    { key: 'domain', label: 'Domain name + who controls the registrar login', type: 'text' },
    { key: 'pages', label: 'Pages or sections you need', type: 'textarea', placeholder: 'Home, Shop, About, Contact...' },
    { key: 'copy', label: 'Who writes the words? You, us, or together?', type: 'text' },
    { key: 'examples', label: 'Two or three sites you love, and why', type: 'textarea' },
  ],
};

const AGENT: IntakeSection = {
  key: 'agent',
  title: 'Voice / AI agent',
  fields: [
    { key: 'phone', label: 'Business phone number (or "need one")', type: 'text' },
    { key: 'hours', label: 'Hours it should cover', type: 'text' },
    { key: 'call_reasons', label: 'Top reasons people call', type: 'textarea' },
    { key: 'handle_escalate', label: 'What should it handle vs. send to a human?', type: 'textarea' },
    { key: 'calendar_crm', label: 'Calendar and CRM it should connect to', type: 'text' },
  ],
};

const AUTOMATION: IntakeSection = {
  key: 'automation',
  title: 'Automation and systems',
  fields: [
    { key: 'task', label: 'The repeating task you want gone', type: 'textarea' },
    { key: 'tools', label: 'Tools you use today', type: 'text', placeholder: 'CRM, spreadsheets, email, etc.' },
    { key: 'data', label: 'Where the data lives', type: 'text' },
    { key: 'access', label: 'Who can grant access to those tools?', type: 'text' },
  ],
};

const VISIBILITY: IntakeSection = {
  key: 'visibility',
  title: 'Search and AI visibility',
  fields: [
    { key: 'gbp', label: 'Google Business Profile: do you have one? Who controls it?', type: 'text' },
    { key: 'locations', label: 'Locations / areas you serve', type: 'text' },
    { key: 'keywords', label: 'What should people find you for?', type: 'textarea' },
    { key: 'competitors', label: 'Main competitors', type: 'text' },
  ],
};

const SKILLS: IntakeSection = {
  key: 'skills',
  title: 'Claude skills / workflow',
  fields: [
    { key: 'workflow', label: 'The workflow you want a skill for', type: 'textarea' },
    { key: 'inputs', label: 'What goes in', type: 'text' },
    { key: 'outputs', label: 'What should come out', type: 'text' },
  ],
};

const LOGISTICS: IntakeSection = {
  key: 'logistics',
  title: 'Logistics',
  fields: [
    { key: 'contact', label: 'Best way and time to reach you', type: 'text' },
    { key: 'others', label: 'Anyone else involved in decisions?', type: 'text' },
    { key: 'anything', label: 'Anything else we should know?', type: 'textarea' },
  ],
};

const ALL: Record<string, IntakeSection> = {
  basics: BASICS,
  brand_site: BRAND_SITE,
  agent: AGENT,
  automation: AUTOMATION,
  visibility: VISIBILITY,
  skills: SKILLS,
  logistics: LOGISTICS,
};

// Map a service group to the intake sections it needs.
const GROUP_SECTIONS: Record<string, string[]> = {
  'Idea to Product': ['brand_site'],
  'AI Visibility and Web': ['brand_site', 'visibility'],
  'AI Systems and Automation': ['automation'],
  'AI Agents': ['agent'],
  'Claude Skills': ['skills'],
  'Marketing Funnels': ['brand_site'],
  'Retainers & Subscriptions': [],
  Advisory: [],
  'Running Costs': [],
};

/** Choose the intake sections for a set of proposal service ids. */
export function selectSections(serviceIds: string[]): IntakeSection[] {
  const keys: string[] = ['basics'];
  const groups = new Set<string>();
  for (const id of serviceIds) {
    const s = byId(id);
    if (s) groups.add(s.group);
  }
  for (const g of groups) {
    for (const k of GROUP_SECTIONS[g] ?? []) if (!keys.includes(k)) keys.push(k);
  }
  // Sensible default if we could not infer anything from a proposal.
  if (keys.length === 1) keys.push('brand_site');
  keys.push('logistics');
  return keys.map((k) => ALL[k]).filter(Boolean);
}
