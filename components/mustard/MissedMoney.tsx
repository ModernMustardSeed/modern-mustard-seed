'use client';

import RecoveryMachine from '@/components/RecoveryMachine';

/**
 * THE ARITHMETIC, ON THE PAGE, AS THE DESK CALCULATOR.
 *
 * Sarah, 2026-08-18: "maybe add small calculator on page too so they can see
 * the math?" Then 2026-08-20: "use that calc on the /mustard page too, it's so
 * much cuter", meaning the pop-art Revenue Recovery machine from the homepage
 * journey. This is now a thin wrapper around the shared RecoveryMachine, so
 * /mustard, the demo suites, and the homepage can never quote a different
 * number for the same inputs.
 *
 * ⚠️ STILL NOT THE LEAD MAGNET. components/MissedCallCalculator.tsx gates its
 * result behind an email on /voice-agents. This one asks for nothing, gates
 * nothing, and just answers, because this page exists to get Mr. Mustard on
 * the phone and a second form would compete with that.
 */
/**
 * The numbers can arrive from the cold email.
 *
 * The email renders this same machine in tables and its keypad is a row of
 * links, so a tap carries the three inputs and the pressed digit here. Without
 * that, a reader who tapped "6" on a machine reading $5,456 landed on one
 * reading the house defaults, and the email's own figure became a number we
 * apparently made up. Absent params, the presets are unchanged.
 */
export default function MissedMoney({
  monthlyPrice,
  missedPreset,
  closePreset,
  ticketPreset,
  typedKey,
}: {
  monthlyPrice: string;
  missedPreset?: number | null;
  closePreset?: number | null;
  ticketPreset?: number | null;
  typedKey?: string | null;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4160B]">Do the math yourself</p>
      <h3 className="mt-3 mb-5 font-display text-[1.7rem] sm:text-[2.1rem] font-extrabold leading-tight tracking-tight">
        What the missed ones are <span className="italic">costing</span>
      </h3>
      <RecoveryMachine
        missedPreset={missedPreset ?? 10}
        closePreset={closePreset ?? 35}
        ticketPreset={ticketPreset ?? 500}
        ticketLabel="Average Job Value"
        typedKey={typedKey}
      />
      <p className="mt-4 text-[13.5px] leading-relaxed text-[#161616]/60">
        Your numbers, not ours. Punch in your week. He costs {monthlyPrice} a month and answers every one of those calls.
      </p>
    </div>
  );
}
