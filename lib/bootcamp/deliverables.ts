import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deliverableForFile, deliverablesFor, deliverablesReleased, type DeliverableFile } from '@/data/bootcamp';

/**
 * THE TIER DELIVERABLES ON DISK. The built files live in
 * private/bootcamp/dist (committed, never under public/), and reach a
 * person only through app/api/bootcamp/kit/[file], which checks the signed
 * room key, the tier and the release date before reading a byte.
 * next.config.ts traces the folder into that one function.
 */

const DIST = join(process.cwd(), 'private', 'bootcamp', 'dist');

export type ManifestEntry = { bytes: number; sha256: string; builtAt: string };
export type Manifest = Record<string, ManifestEntry>;

export async function readManifest(): Promise<Manifest> {
  try {
    return JSON.parse(await readFile(join(DIST, 'manifest.json'), 'utf8')) as Manifest;
  } catch {
    return {};
  }
}

/** The bytes of one deliverable file. Only names a deliverable ships are ever joined to the path. */
export async function readDeliverable(name: string): Promise<{ file: DeliverableFile; body: Buffer } | null> {
  const hit = deliverableForFile(name);
  if (!hit) return null;
  try {
    return { file: hit.file, body: await readFile(join(DIST, hit.file.name)) };
  } catch {
    return null;
  }
}

export type GateAnswer = 'ok' | 'not-yours' | 'not-yet' | 'unknown';

/** Whether this tier may download this file right now. Pure: the route and the test share it. */
export function gate(tier: string, name: string, now: number): GateAnswer {
  const hit = deliverableForFile(name);
  if (!hit) return 'unknown';
  if (!deliverablesFor(tier).some((d) => d.slug === hit.deliverable.slug)) return 'not-yours';
  if (!deliverablesReleased(now)) return 'not-yet';
  return 'ok';
}

/** "1.2 MB", "42 KB". */
export function fmtBytes(bytes: number | undefined): string {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** The signed download link for a person's own room. */
export function deliverableHref(file: string, id: string, k: string): string {
  return `/api/bootcamp/kit/${encodeURIComponent(file)}?id=${encodeURIComponent(id)}&k=${encodeURIComponent(k)}`;
}
