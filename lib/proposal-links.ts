/** Demo links ride the proposal as the clickable "Already built for you"
 * showcase. Sanitize whatever the builder sends: cap the count, trim, drop
 * anything without a URL. */
export type ProposalDemoLink = { label: string; url: string };

export function cleanDemoLinks(v: unknown): ProposalDemoLink[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 8)
    .map((d) => ({
      label: String((d as { label?: unknown })?.label ?? '').trim().slice(0, 80),
      url: String((d as { url?: unknown })?.url ?? '').trim().slice(0, 500),
    }))
    .filter((d) => d.url);
}
