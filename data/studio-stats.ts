/**
 * THE STUDIO'S OWN NUMBERS. The one place the site states how Modern Mustard
 * Seed itself is set up. /claude, the Bootcamp pages and the Bootcamp copy read
 * from here, so a recount is one edit.
 *
 * Counted from the live setup on the date below, never estimated:
 * - laws: the standing orders every session loads
 * - skillsWritten: skills the studio wrote itself (~/.claude/skills, not the Moda suite)
 * - skillsInUse: every skill installed and in daily use, the Moda suite included
 * - hooks: safety hook scripts in ~/.claude/hooks
 * - memoryNotes: memory files in the studio's project memory
 * - specialists: Claude Code subagents on staff (~/.claude/agents), shown at OFFICE_URL
 * - backOfficeAgents: the agents in The Cove (Seedside), a separate system
 *
 * Dated blog posts keep the numbers they were published with.
 */
export const STUDIO_STATS = {
  countedOn: '2026-10-08',
  laws: 20,
  skillsWritten: 18,
  skillsInUse: 46,
  hooks: 10,
  memoryNotes: 329,
  specialists: 64,
  backOfficeAgents: 17,
} as const;

/** The public staff directory: every specialist, Mr. Mustard as chief of staff. */
export const OFFICE_URL = 'https://office.modernmustardseed.com';
