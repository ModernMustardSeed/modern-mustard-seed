/**
 * Minimal RFC 5545 ICS builder for calendar invites.
 * No dependencies. Server-side only.
 */

type IcsEvent = {
  uid: string;
  startUtc: Date;
  endUtc: Date;
  summary: string;
  description?: string;
  location?: string;
  organizerName: string;
  organizerEmail: string;
  attendeeName?: string;
  attendeeEmail: string;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fmtUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeText(s: string): string {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function foldLine(line: string): string {
  // RFC 5545: lines longer than 75 octets must be folded with CRLF + space.
  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75));
    remaining = remaining.slice(75);
  }
  chunks.push(remaining);
  return chunks.join('\r\n ');
}

/** Build an ICS invite. Returns the file contents as a string. */
export function buildIcsInvite(ev: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Modern Mustard Seed//Mustard Seed Chat//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${fmtUtc(new Date())}`,
    `DTSTART:${fmtUtc(ev.startUtc)}`,
    `DTEND:${fmtUtc(ev.endUtc)}`,
    `ORGANIZER;CN=${escapeText(ev.organizerName)}:MAILTO:${ev.organizerEmail}`,
    `ATTENDEE;CN=${escapeText(ev.attendeeName ?? ev.attendeeEmail)};RSVP=TRUE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION:MAILTO:${ev.attendeeEmail}`,
    `SUMMARY:${escapeText(ev.summary)}`,
    ev.description ? `DESCRIPTION:${escapeText(ev.description)}` : '',
    ev.location ? `LOCATION:${escapeText(ev.location)}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
