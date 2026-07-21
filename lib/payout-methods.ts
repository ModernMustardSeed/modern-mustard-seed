/**
 * Payout rails a partner can pick from their dashboard. Lives in its own
 * dependency-free module because both server routes and client components read
 * it. Deliberately no raw bank-account option: account numbers do not belong
 * in a plaintext column.
 */
export const PAYOUT_METHODS = [
  { value: 'paypal', label: 'PayPal', hint: 'Your PayPal email' },
  { value: 'venmo', label: 'Venmo', hint: 'Your @venmo handle' },
  { value: 'cashapp', label: 'Cash App', hint: 'Your $cashtag' },
  { value: 'zelle', label: 'Zelle', hint: 'The email or phone on your Zelle' },
  { value: 'check', label: 'Paper check', hint: 'The mailing address to send it to' },
  { value: 'other', label: 'Something else', hint: 'Tell us what works for you' },
] as const;

export function payoutMethodLabel(value?: string | null): string {
  return PAYOUT_METHODS.find((m) => m.value === value)?.label ?? (value || '');
}
