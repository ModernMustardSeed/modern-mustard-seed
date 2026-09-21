/**
 * THE LEAD LOG, the part both sides read: its shape and its words. No server
 * imports, so a client component can use the same sentence the Operator reads.
 */

export type Person = { key: string; name: string };

export type LeadEventKind = 'note' | 'tried' | 'called' | 'uncalled' | 'taken' | 'handed' | 'released';

export type LeadEvent = {
  id: string;
  lead_id: string;
  kind: LeadEventKind;
  body: string | null;
  to_key: string | null;
  to_name: string | null;
  author_key: string | null;
  author_name: string;
  created_at: string;
};

export const EVENT_COLUMNS = 'id, lead_id, kind, body, to_key, to_name, author_key, author_name, created_at';

/** One plain sentence for a log row, the same words on every surface. */
export function eventSentence(e: Pick<LeadEvent, 'kind' | 'author_name' | 'to_name'>): string {
  switch (e.kind) {
    case 'note':
      return `${e.author_name} left a note`;
    case 'tried':
      return `${e.author_name} tried, no answer`;
    case 'called':
      return `${e.author_name} marked it called`;
    case 'uncalled':
      return `${e.author_name} took the called mark off`;
    case 'taken':
      return `${e.author_name} took it`;
    case 'handed':
      return `${e.author_name} handed it to ${e.to_name ?? 'someone'}`;
    case 'released':
      return `${e.author_name} let it go`;
  }
}
