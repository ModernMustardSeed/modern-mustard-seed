/**
 * THE REVENUE RECOVERY MACHINE, RENDERED FOR OUTLOOK.
 *
 * The same Model RR-1 that sits on the homepage journey, on /mustard and on
 * every demo hub (components/RecoveryMachine.tsx), rebuilt in tables so it
 * survives an email client. Sarah, 2026-08-22: "add our recovery calculator to
 * the first emails, the popart kind that is on hero page and demo suite. its so
 * cute and helpful".
 *
 * What had to change, and why:
 *   NO JAVASCRIPT       no mail client runs any, so the display is a picture and
 *                       the keys cannot type. They are links instead, and each
 *                       digit key carries ITS OWN digit plus these three inputs
 *                       to the live machine, so a tap on "6" opens it with a 6
 *                       punched in and the same figure on the readout. The
 *                       label says so, because a reader who taps four keys
 *                       waiting for the total to move decides we sent a broken
 *                       email.
 *   NO BOX SHADOW       Gmail strips it. The hard pop-art shadow is a black
 *                       rounded cell with the mustard panel sitting on its
 *                       top-left corner, which every client renders.
 *   NO BACKGROUND IMAGE the CRT scanlines are gone. Nothing else is.
 *   NO TRANSFORM        mail clients ignore it, so the machine sits straight
 *                       rather than at its usual half degree of tilt.
 *
 * The arithmetic is `Estimate`, the same sum the React component runs, so the
 * email and the page can never disagree about the same three inputs.
 *
 * HONESTY IS A PARAMETER. `personalized` picks which label the machine wears.
 * True means the inputs were worked back from their own public listing and it
 * says so, with every assumption printed underneath. False means we could not
 * see their numbers, and the machine says THAT rather than dressing house
 * defaults up as research.
 */

import type { Estimate } from '@/lib/acq/personalize';

const INK = '#161616';
const MUSTARD = '#F5B700';
const CREAM = '#FFFDF6';
const LCD = '#080C16';
const DIGIT = '#FFDD55';
const DIM = '#C79A2E';
const RED = '#E0301E';
const BLUE = '#1E50C8';
const MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,Courier,monospace";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif";

const usd = (cents: number): string => '$' + Math.round(cents / 100).toLocaleString('en-US');

export function recoveryMachineBlock(args: {
  /** Their inputs, when we have them. Omitted in blank mode. */
  est?: Estimate;
  /**
   * BLANK MODE (Sarah, 2026-08-25: "the ai guesstimator is remarkably wrong,
   * Dolphin Pools came back at $250 a job"). No figure is printed anywhere.
   * The slots read as empty, the display invites them, and every key opens the
   * live machine with nothing pre-filled but the digit they pressed.
   */
  blank?: boolean;
  business: string;
  /** True only when the inputs came from this business's own public record. */
  personalized: boolean;
  /** Where the live, typeable machine lives. Every key points here. */
  liveUrl: string;
  /** Fragment appended after the query, so a tap lands on the machine itself. */
  hash?: string;
  escape: (s: string) => string;
}): string {
  const { business, personalized, liveUrl, hash, escape: esc } = args;
  const blank = args.blank === true || !args.est;
  const est: Estimate | null = blank ? null : (args.est as Estimate);

  /**
   * EVERY KEY CARRIES ITS DIGIT.
   *
   * No email client on earth runs JavaScript, so a keypad in an inbox can never
   * change a number in place. What it CAN do is finish the job on the web: a tap
   * on "6" opens the live machine with a 6 already punched into the active
   * field, so the key does the thing it looks like it does, one screen later.
   *
   * The three inputs ride along too. Without them the reader lands on a
   * calculator showing the house defaults, quoting a different figure than the
   * email they just tapped, which is the fastest way to lose an argument you had
   * already won.
   */
  const machineUrl = (typed?: string): string => {
    const q = new URLSearchParams(
      est ? { m: String(est.missedPerWeek), c: String(est.closeRatePct), t: String(Math.round(est.avgJobValue)) } : { blank: '1' },
    );
    if (typed) q.set('k', typed);
    // The fragment goes last, after the query, or the browser reads the rest of
    // the parameters as part of the anchor name and nothing carries.
    return liveUrl + (liveUrl.includes('?') ? '&' : '?') + q.toString() + (hash ? '#' + hash : '');
  };

  const slot = (label: string, hint: string, value: string, on: boolean) =>
    '<tr><td style="padding:0 0 6px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' +
    (on ? MUSTARD : '#FFFFFF') +
    '" style="background:' +
    (on ? MUSTARD : '#FFFFFF') +
    ';border:2px solid ' +
    (on ? INK : '#D9D2C2') +
    ';border-radius:7px"><tr>' +
    '<td style="padding:7px 10px">' +
    '<div style="font-family:' +
    MONO +
    ';font-size:9px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:' +
    INK +
    ';line-height:1.3">' +
    esc(label) +
    '</div>' +
    '<div style="font-family:' +
    SANS +
    ';font-size:10.5px;color:#6F6A5F;line-height:1.4">' +
    esc(hint) +
    '</div></td>' +
    '<td align="right" style="padding:7px 12px 7px 0;font-family:' +
    MONO +
    ';font-size:17px;font-weight:bold;color:' +
    INK +
    ';white-space:nowrap">' +
    esc(value) +
    '</td></tr></table></td></tr>';

  // The keypad is decoration that works. A key looks tappable, so every key is a
  // link to the live machine rather than a dead rectangle.
  const key = (face: string, bg: string, fg: string, span = 1, typed?: string) =>
    '<td width="' +
    (span === 2 ? '50%' : '25%') +
    '" colspan="' +
    span +
    '" style="padding:3px">' +
    '<a href="' +
    machineUrl(typed) +
    '" style="display:block;text-align:center;text-decoration:none;background:' +
    bg +
    ';color:' +
    fg +
    ';border:2px solid ' +
    INK +
    ';border-bottom:5px solid ' +
    INK +
    ';border-radius:7px;padding:8px 0 6px;font-family:' +
    MONO +
    ';font-size:15px;font-weight:bold;line-height:1.1">' +
    face +
    '</a></td>';

  const wordKey = (face: string, bg: string, fg: string) =>
    '<td width="25%" style="padding:3px">' +
    '<a href="' +
    machineUrl() +
    '" style="display:block;text-align:center;text-decoration:none;background:' +
    bg +
    ';color:' +
    fg +
    ';border:2px solid ' +
    INK +
    ';border-bottom:5px solid ' +
    INK +
    ';border-radius:7px;padding:11px 0 9px;font-family:' +
    MONO +
    ';font-size:9px;font-weight:bold;letter-spacing:0.8px;line-height:1.1">' +
    face +
    '</a></td>';

  const keypad =
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px">' +
    '<tr>' + key('7', '#FFFFFF', INK, 1, '7') + key('8', '#FFFFFF', INK, 1, '8') + key('9', '#FFFFFF', INK, 1, '9') + key('C', RED, '#FBF6EA', 1, 'C') + '</tr>' +
    '<tr>' + key('4', '#FFFFFF', INK, 1, '4') + key('5', '#FFFFFF', INK, 1, '5') + key('6', '#FFFFFF', INK, 1, '6') + key('&#9003;', BLUE, '#FBF6EA') + '</tr>' +
    '<tr>' + key('1', '#FFFFFF', INK, 1, '1') + key('2', '#FFFFFF', INK, 1, '2') + key('3', '#FFFFFF', INK, 1, '3') + wordKey('NEXT', BLUE, '#FBF6EA') + '</tr>' +
    '<tr>' + key('0', '#FFFFFF', INK, 2, '0') + key('00', '#FFFFFF', INK, 1, '0') + key('=', INK, MUSTARD) + '</tr>' +
    '</table>';

  const plate =
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td style="font-family:' + MONO + ';font-size:9px;font-weight:bold;letter-spacing:2.4px;text-transform:uppercase;color:' + INK + ';line-height:1.5">' +
    'Modern Mustard Seed<br>' +
    '<span style="font-size:8px;letter-spacing:1.6px;color:#7A6410">Model RR-1 &middot; Revenue Recovery</span>' +
    '</td>' +
    '<td align="right" width="54" style="width:54px">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="' + LCD + '" style="background:' + LCD + ';border:2px solid ' + INK + ';border-radius:5px">' +
    '<tr><td style="padding:4px 6px;font-family:' + MONO + ';font-size:11px;letter-spacing:2px;color:' + BLUE + ';line-height:1">&#9646;&#9646;&#9646;</td></tr>' +
    '</table></td></tr></table>';

  const lcd =
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + LCD + '" style="background:' + LCD + ';border:2px solid ' + INK + ';border-radius:9px;margin-top:10px">' +
    '<tr><td style="padding:12px 14px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td style="font-family:' + MONO + ';font-size:9px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:' + DIM + '">Leaking Every Month</td>' +
    '<td align="right" style="font-family:' + MONO + ';font-size:9px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase;color:' + RED + ';white-space:nowrap">&#9679; Live</td>' +
    '</tr></table>' +
    '<div style="text-align:right;font-family:' + MONO + ';font-size:38px;font-weight:bold;color:' + DIGIT + ';line-height:1.15;padding-top:6px">' + (est ? usd(est.monthlyLeakCents) : '$ _ _ _ _') + '</div>' +
    '<div style="text-align:right;font-family:' + MONO + ';font-size:9px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:' + DIM + ';padding-top:3px">' + (est ? usd(est.annualLeakCents) + ' a year' : 'your numbers, not ours') + '</div>' +
    '</td></tr></table>';

  // The false branch names nobody on purpose. A possessive built from a company
  // name is a coin flip ("Ross Plumbing's" against "Ross Plumbing'"), and the
  // sentence does not need the name to be true.
  // WHAT THE LABEL MAY PROMISE. It used to say "tap a key and change them",
  // which describes a calculator that types. Nothing in an inbox types: a mail
  // client runs no JavaScript, so the display below is a picture and the keys
  // are links. Tapping one opens the live machine carrying these three numbers
  // and the digit that was pressed. The label says that, because a reader who
  // taps four keys waiting for the total to move decides the email is broken.
  const label = blank
    ? 'Nothing on this one is guessed. Tap any key to open the live machine, put in the three numbers you already know, and the display shows what the calls you miss are costing ' + esc(business) + '.'
    : personalized
      ? 'Worked back from what ' + esc(business) + ' shows in public. Every guess is printed under the machine. Tap any key to open it and change them.'
      : 'We could not see your numbers, so these three are ours. Tap any key to open the live one and put yours in.';

  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 10px"><tr>' +
    '<td bgcolor="' + INK + '" style="background:' + INK + ';border-radius:20px;padding:0 6px 6px 0">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + MUSTARD + '" style="background:' + MUSTARD + ';border:3px solid ' + INK + ';border-radius:18px">' +
    '<tr><td style="padding:14px">' +
    plate +
    lcd +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + CREAM + '" style="background:' + CREAM + ';border:2px solid ' + INK + ';border-radius:9px;margin-top:10px">' +
    '<tr><td style="padding:9px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
    slot('Calls You Miss A Week', 'Rings out, voicemail, after hours', est ? String(est.missedPerWeek) : '_ _', true) +
    slot('Would Have Hired You', 'Of the people you actually talk to', est ? est.closeRatePct + '%' : '_ _ %', false) +
    slot('Average Job Value', 'What one is worth to you', est ? '$' + est.avgJobValue.toLocaleString('en-US') : '$ _ _ _', false) +
    '</table>' +
    keypad +
    '</td></tr></table>' +
    '<p style="margin:11px 2px 0;font-family:' + SANS + ';font-size:11.5px;line-height:1.55;color:#5B4A0E">' + label + '</p>' +
    '</td></tr></table></td></tr></table>'
  );
}

/**
 * The receipt under the machine. Every input, why we believe it, and an open
 * invitation to correct the two we guessed. Printed as plain small type rather
 * than hidden behind a tooltip, which is the whole reason the machine reads as
 * persuasive instead of insulting.
 *
 * Only rendered when the inputs actually came from their listing. House
 * defaults have nothing to cite, and citing them would be the lie the machine
 * exists to avoid.
 */
export function machineAssumptions(est: Estimate, esc: (s: string) => string): string {
  const lines = est.inputs
    .map((i) => '<strong style="color:#5a564f">' + esc(i.label) + ':</strong> ' + esc(i.because) + '.')
    .join('<br>');

  return (
    '<p style="margin:0 0 9px;font-family:' + SANS + ';font-size:12px;line-height:1.6;color:#8a8375">' + lines + '</p>' +
    '<p style="margin:0 0 18px;font-family:' + SANS + ';font-size:12px;line-height:1.6;color:#8a8375">' +
    'The job value and the close rate are guesses, and they are the two you would know better than we do. ' +
    'If your average job is bigger than ' +
    esc('$' + est.avgJobValue.toLocaleString('en-US')) +
    ', the number on the display is low.</p>'
  );
}
