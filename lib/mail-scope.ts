/**
 * WHOSE MAIL IS WHOSE. A business can connect one mailbox per person
 * (carmen@, shan@, zayne@ on their own domain) plus shared ones (the office
 * Gmail everyone answers). A named person at the desk sees their own inbox
 * and every shared one, never a colleague's own inbox.
 *
 * A mailbox is somebody's own only when the project names it as that
 * person's `mailbox`. A login address is never read as one: Carmen signs in
 * with the office Gmail, and that inbox belongs to everyone.
 *
 * No named person at the desk (the owner's own account sign-in, the portal,
 * Sarah looking as them) means no limit, because that is the account holder.
 */
import { getCcWho } from '@/lib/client-auth';
import { projectForEmail, type ClientProject } from '@/lib/client-leads';

const norm = (s: string) => s.trim().toLowerCase();

/** Every other named person's own inbox, for whoever is at the desk now. Null when nothing is hidden. */
export async function hiddenMailboxes(project: ClientProject): Promise<Set<string> | null> {
  const who = await getCcWho();
  if (!who) return null;
  const people = Object.values(project.people ?? {});
  const me = people.find((p) => norm(p.email) === who || (p.mailbox && norm(p.mailbox) === who));
  if (!me) return null;
  const hidden = new Set(people.filter((p) => p !== me && p.mailbox).map((p) => norm(p.mailbox as string)));
  return hidden.size ? hidden : null;
}

/** True when this mailbox may be shown to the person at the desk. Mail with no mailbox recorded is shared. */
export function mailboxVisible(hidden: Set<string> | null, mailbox: string | null | undefined): boolean {
  return !hidden || !mailbox || !hidden.has(norm(mailbox));
}

/**
 * The same rule as a PostgREST filter for `.or(...)`, so counts and lists are
 * cut in the database rather than after a limit. Null when nothing is hidden.
 */
export function mailboxFilter(hidden: Set<string> | null): string | null {
  if (!hidden) return null;
  const list = [...hidden].map((a) => `"${a.replace(/"/g, '')}"`).join(',');
  return `mailbox.is.null,mailbox.not.in.(${list})`;
}

/**
 * The filter for a client account by its email, for code that has no project
 * in hand (search, the Operator's context). Outside a request there is no desk
 * and so no person, which is the account holder: nothing hidden.
 */
export async function mailFilterFor(clientEmail: string): Promise<string | null> {
  const project = projectForEmail(clientEmail);
  if (!project) return null;
  try {
    return mailboxFilter(await hiddenMailboxes(project));
  } catch {
    return null;
  }
}
