'use client';

import { RANDOM_TEMPLATE, SITE_TEMPLATES, siteTemplate } from '@/lib/site-templates.mjs';

/**
 * THE TEMPLATE PICKER (2026-08-24). One select, on every surface that can
 * queue a website build: Random (the studio rotates by trade) or one named
 * template. The list is the registry itself, so a new template appears here
 * the moment it is merged.
 */
export function TemplatePicker({
  value,
  onChange,
  className,
  compact = false,
}: {
  value: string;
  onChange: (key: string) => void;
  className?: string;
  /** Short labels for tight rows. */
  compact?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      title="Which template the next website forge or rebuild wears. Random rotates by trade and never repeats what this lead already had. Applies to the next build, not to a site already built."
      aria-label="Site template for the website forge"
    >
      <option value={RANDOM_TEMPLATE}>{compact ? 'Style: Random' : 'Style: Random (studio rotates)'}</option>
      {SITE_TEMPLATES.map((t) => (
        <option key={t.key} value={t.key}>
          {compact ? `Style: ${t.name}` : `Style: ${t.name} · ${t.type.display}`}
        </option>
      ))}
    </select>
  );
}

/** The human name for a stored key, for chips. */
export function templateName(key: string | null | undefined): string | null {
  const t = siteTemplate(key ?? '');
  return t ? t.name : null;
}
