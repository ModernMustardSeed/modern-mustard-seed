export function parseTeam(raw: unknown): Array<{ name: string; phone: string; when?: string }> {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => {
      const phoneMatch = line.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
      const phone = phoneMatch?.[0]?.trim() ?? '';
      const rest = line.replace(phone, '').split(',').map((p) => p.trim()).filter(Boolean);
      return { name: rest[0] ?? 'Team member', phone, when: rest.slice(1).join(', ') || undefined };
    })
    .filter((t) => t.phone.replace(/\D/g, '').length >= 10);
}
