import { z } from 'zod';

/**
 * Call Prep: the prospect calls on the calendar and the brief the team reads
 * together before each one. One row per call in public.call_prep. The brief is
 * written for a person about to dial, so every list is short lines, not prose.
 */

export const CALL_STATUSES = ['lined_up', 'done', 'won', 'passed', 'no_show'] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  lined_up: 'Lined up',
  done: 'Talked',
  won: 'Won',
  passed: 'Passed',
  no_show: 'No show',
};

export type CallBrief = {
  /** Who they are, in two or three sentences. */
  who?: string;
  /** The first thirty seconds, close to word for word. */
  opening?: string;
  /** What the audit found, strongest first. */
  findings?: string[];
  /** What we ask them. */
  questions?: string[];
  /** What we put in front of them, with the real price. */
  offer?: string;
  /** What not to say or assume. */
  watch_outs?: string[];
  /** The one ask that ends the call. */
  next_step?: string;
};

export type CallAudit = { id: string; score: number | null; letter: string | null; headline: string | null };

export type CallPrep = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  call_at: string | null;
  taken_by: string | null;
  audit_id: string | null;
  status: CallStatus;
  brief: CallBrief;
  notes: string | null;
  outcome: string | null;
  created_at: string;
  updated_at: string;
  audit?: CallAudit | null;
};

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
const text = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable()).optional();
const lines = z.array(z.string().trim().min(1).max(600)).max(20).optional();

/** Pull the audit id out of a pasted /demo/audit/<id> link, or take a bare id. */
export function auditIdFrom(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0].toLowerCase() : null;
}

export const briefSchema = z.object({
  who: text(2000),
  opening: text(2000),
  findings: lines,
  questions: lines,
  offer: text(2000),
  watch_outs: lines,
  next_step: text(1000),
});

export const callCreateSchema = z.object({
  business_name: z.string().trim().min(1).max(200),
  contact_name: text(200),
  phone: text(40),
  email: z.preprocess(emptyToNull, z.string().trim().email().max(320).nullable()).optional(),
  website: text(500),
  city: text(120),
  call_at: z.preprocess(emptyToNull, z.string().datetime({ offset: true }).nullable()).optional(),
  taken_by: text(120),
  audit_id: z.preprocess((v) => (v == null || v === '' ? null : auditIdFrom(v) ?? v), z.string().uuid().nullable()).optional(),
  brief: briefSchema.optional(),
  notes: text(20000),
});
export type CallCreate = z.infer<typeof callCreateSchema>;

export const callPatchSchema = callCreateSchema.partial().extend({
  status: z.enum(CALL_STATUSES).optional(),
  outcome: text(4000),
});
export type CallPatch = z.infer<typeof callPatchSchema>;

/** A brief list field typed as one line per item in a textarea. */
export function toLines(v: string): string[] {
  return v
    .split('\n')
    .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);
}
