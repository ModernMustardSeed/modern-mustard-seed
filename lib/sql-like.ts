/**
 * THE TENANT FILTER WAS A PATTERN, NOT A VALUE.
 *
 * Client-scoped queries match the signed-in address with `.ilike()` so that
 * `Bob@Corp.com` finds a row stored as `bob@corp.com`. But ILIKE takes a LIKE
 * pattern, and `_` (any one character) and `%` (any run) are wildcards inside
 * it. Real addresses contain underscores all the time, so `bob_smith@corp.com`
 * also matched `bobxsmith@corp.com`, and the only tenant boundary in the product
 * quietly became fuzzy. Found in the 2026-08-11 tenant audit.
 *
 * Escaping the wildcards keeps the case-insensitivity that made ILIKE the right
 * call while making the comparison literal again. Backslash is Postgres's
 * default LIKE escape character, so `\_` means a real underscore.
 *
 * Use this on every value interpolated into `.ilike()` / `.like()`, not just
 * emails: a raw wildcard from any untrusted string widens the match.
 */
export function likeLiteral(value: string): string {
  return String(value ?? '').replace(/([\\%_])/g, '\\$1');
}
