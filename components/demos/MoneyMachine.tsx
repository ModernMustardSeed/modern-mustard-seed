'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RecoveryMachine from '@/components/RecoveryMachine';

/**
 * THE CALCULATOR, ON THE PAGE THE COLD EMAIL POINTS AT.
 *
 * The email carries the same Model RR-1 drawn in tables, where no JavaScript
 * exists to make it add up, so its keypad is a row of links. Those links used to
 * land on /mustard, which is the permission page: the reader tapped a calculator
 * key and arrived somewhere asking for their phone number. Sarah, 2026-08-25,
 * after the campaign stopped asking for callbacks: "it should land on demo
 * instead of mustard."
 *
 * So the machine lives here too, and every path out of the email now converges
 * on the free build.
 *
 * WHY THE PARAMS ARE READ CLIENT-SIDE. /demos is statically prerendered and
 * should stay that way: it is the page every cold email points at, and a
 * marketing page that renders per request for the sake of three optional query
 * parameters is a bad trade. `useSearchParams` inside a Suspense boundary keeps
 * the HTML static and lets the numbers arrive on hydration.
 */
function MachineWithCarriedNumbers() {
  const params = useSearchParams();

  // Clamped, because these ride in on a link a stranger can edit.
  const num = (k: string, max: number): number | null => {
    const v = Number(params.get(k));
    return Number.isFinite(v) && v > 0 ? Math.min(max, Math.round(v)) : null;
  };
  const typed = params.get('k');

  return (
    <RecoveryMachine
      missedPreset={num('m', 200) ?? 10}
      closePreset={num('c', 100) ?? 35}
      ticketPreset={num('t', 500000) ?? 500}
      ticketLabel="Average Job Value"
      typedKey={/^([0-9]|C)$/.test(String(typed ?? '')) ? typed : null}
    />
  );
}

export default function MoneyMachine() {
  return (
    <Suspense fallback={<RecoveryMachine missedPreset={10} closePreset={35} ticketPreset={500} ticketLabel="Average Job Value" />}>
      <MachineWithCarriedNumbers />
    </Suspense>
  );
}
