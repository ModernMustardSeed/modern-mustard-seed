import { getConsent } from '@/lib/consent';

export const AI_DOMAINS = {
  'chatgpt.com': 'chatgpt', 'chat.openai.com': 'chatgpt',
  'perplexity.ai': 'perplexity', 'gemini.google.com': 'gemini',
  'copilot.microsoft.com': 'copilot', 'claude.ai': 'claude',
  'grok.com': 'grok', 'you.com': 'you',
} as const;
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
export type Attribution = {
  ai_source?: string;
  ai_source_evidence?: 'referrer' | 'utm';
  ai_landing_page?: string;
  campaign: Partial<Record<typeof UTM_KEYS[number], string>>;
  updated: number;
};
const KEY = 'mms_acquisition';
const SESSION_MS = 30 * 60 * 1000;
let memory: Attribution | undefined;

export function isPrivateAttributionPath(path: string): boolean {
  return /(?:^|\/)(admin|portal|demo|proposal|pay|intake|welcome|hq|success|thanks)(?:\/|$)/.test(path) || path.startsWith('/scaling-roadmap/r/');
}

export function classifyAIReferrer(referrer: string): string | undefined {
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    return Object.entries(AI_DOMAINS).find(([domain]) => hostname === domain || hostname.endsWith(`.${domain}`))?.[1];
  } catch { return undefined; }
}

export function attributionFrom(url: string, referrer: string, now = Date.now()): Attribution {
  const parsed = new URL(url);
  const campaign: Attribution['campaign'] = {};
  for (const key of UTM_KEYS) {
    const value = parsed.searchParams.get(key);
    // Campaign identifiers only. Do not collect free text, email addresses,
    // arbitrary query parameters, tokens or full referring URLs.
    if (value && /^[a-zA-Z0-9_. -]{1,100}$/.test(value)) campaign[key] = value;
  }
  const referrerSource = classifyAIReferrer(referrer);
  const source = campaign.utm_source?.toLowerCase();
  const utmSource = source && (Object.values(AI_DOMAINS).find((v) => v === source) || classifyAIReferrer(`https://${source}`));
  const aiSource = referrerSource || utmSource || undefined;
  return {
    campaign, updated: now,
    ...(aiSource ? { ai_source: aiSource, ai_source_evidence: referrerSource ? 'referrer' as const : 'utm' as const,
      ai_landing_page: parsed.pathname } : {}),
  };
}

export function clearAttribution() {
  memory = undefined;
  try { sessionStorage.removeItem(KEY); } catch { /* Storage is optional. */ }
}

export function readAttribution(): Attribution | undefined {
  if (typeof window === 'undefined' || getConsent() !== 'granted') return undefined;
  try {
    const saved: unknown = memory ?? JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (!saved || typeof saved !== 'object') return undefined;
    const value = saved as Attribution;
    if (typeof value.updated !== 'number' || Date.now() - value.updated > SESSION_MS || !value.campaign || typeof value.campaign !== 'object') return undefined;
    return value;
  } catch { return undefined; }
}

export function captureAttribution(url: string, referrer: string): Attribution | undefined {
  if (typeof window === 'undefined' || getConsent() !== 'granted') return undefined;
  if (isPrivateAttributionPath(new URL(url).pathname)) return undefined;
  const previous = readAttribution();
  memory = previous ?? attributionFrom(url, referrer);
  memory.updated = Date.now();
  try { sessionStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* Keep the consented context in memory. */ }
  return memory;
}

export function attributionEventParams(): Record<string, string> {
  const context = readAttribution();
  if (!context) return {};
  return {
    ...(context.ai_source ? { ai_source: context.ai_source, ai_source_evidence: context.ai_source_evidence!, ai_landing_page: context.ai_landing_page! } : {}),
    ...Object.fromEntries(Object.entries(context.campaign).map(([key, value]) => [`landing_${key}`, value])),
  };
}

/** Only public conversion destinations. Keep destination parameters and fragments. */
export function attributedHref(href: string, context?: Attribution): string {
  if (!context || !href.startsWith('/') || href.startsWith('//')) return href;
  const url = new URL(href, 'https://modernmustardseed.com');
  if (!['/demos', '/book', '/contact', '/website-audit'].includes(url.pathname)) return href;
  for (const key of UTM_KEYS) {
    const value = context.campaign[key];
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
