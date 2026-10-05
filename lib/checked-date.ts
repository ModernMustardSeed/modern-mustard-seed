/** '2026-10-05' to 'October 5, 2026', fixed to UTC so the server and the reader agree. */
export function formatChecked(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
