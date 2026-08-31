/**
 * The print-and-mail provider. Lob.
 *
 * Artwork is posted as a MULTIPART FILE, not a URL. The alternative is to put
 * every rendered card in a public bucket and hand the provider a link, which
 * means a public, crawlable directory of business names and street addresses
 * belonging to people who never asked us for anything. Multipart deletes that
 * whole class of problem: the PDF exists on this machine and inside Lob, and
 * nowhere else.
 *
 * ⚠️ ONE CREDENTIAL IS NEEDED AND IT IS NOT IN THE VAULT YET:
 *
 *     LOB_API_KEY_TEST=test_...      free, unlimited, prints nothing
 *     LOB_API_KEY_LIVE=live_...      spends real postage
 *
 * The runner refuses to touch the live key unless it is passed --live
 * explicitly, and refuses to spend more than MAILER_MAX_SPEND_CENTS in one
 * invocation. Postage is the one cost in this system that cannot be undone by
 * pressing something.
 *
 * VERIFY THE CONTRACT BEFORE THE FIRST PAID DROP. Field names and the exact
 * bleed spec are the provider's to change, not ours to remember. A test-key
 * send costs nothing and returns the provider's own validation errors verbatim,
 * which is worth more than any assumption written down here:
 *
 *     npx tsx scripts/mailer/run-campaign.mts --campaign proof --limit 1
 */

export type MailAddress = {
  name: string;
  company?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
  country?: string;
};

export type MailSendInput = {
  to: MailAddress;
  from: MailAddress;
  frontPdf: Uint8Array;
  backPdf: Uint8Array;
  /** Shows in the provider dashboard. Make it findable by a human. */
  description: string;
  metadata: Record<string, string>;
  /** '6x9' | '4x6' | '6x11' */
  size?: string;
};

export type MailSendResult = {
  id: string;
  costCents: number | null;
  expectedDelivery: string | null;
  raw: unknown;
};

const LOB_BASE = 'https://api.lob.com/v1';

export class MailProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string
  ) {
    super(message);
    this.name = 'MailProviderError';
  }
}

export type MailProvider = {
  live: boolean;
  send(input: MailSendInput): Promise<MailSendResult>;
};

/**
 * @param live true spends real money. There is no default: a caller has to say
 *             which world it is in, because the failure mode of guessing wrong
 *             is four thousand postcards.
 */
export function getMailProvider(live: boolean): MailProvider | null {
  const key = live ? process.env.LOB_API_KEY_LIVE : process.env.LOB_API_KEY_TEST;
  // Vercel's write-only variables read back as the literal '[SENSITIVE]', which
  // is truthy and sails through every `||`. See the env placeholder post mortem.
  if (!key || /^\[SENSITIVE\]$/i.test(key.trim())) return null;

  // A live key posted to the test path (or the reverse) is the single most
  // expensive typo available here, and Lob prefixes make it detectable.
  const trimmed = key.trim();
  if (live && !trimmed.startsWith('live_')) {
    throw new Error('LOB_API_KEY_LIVE does not start with live_. Refusing to send.');
  }
  if (!live && !trimmed.startsWith('test_')) {
    throw new Error('LOB_API_KEY_TEST does not start with test_. Refusing to send.');
  }

  const auth = `Basic ${Buffer.from(`${trimmed}:`).toString('base64')}`;

  return {
    live,
    async send(input: MailSendInput): Promise<MailSendResult> {
      const form = new FormData();
      form.set('description', input.description.slice(0, 255));
      form.set('size', input.size || '6x9');
      // Lob requires every mailpiece to declare itself. This is marketing and
      // saying otherwise would be a lie to a regulated carrier.
      form.set('use_type', 'marketing');

      const addr = (prefix: string, a: MailAddress): void => {
        form.set(`${prefix}[name]`, a.name.slice(0, 40));
        if (a.company) form.set(`${prefix}[company]`, a.company.slice(0, 40));
        form.set(`${prefix}[address_line1]`, a.line1.slice(0, 64));
        if (a.line2) form.set(`${prefix}[address_line2]`, a.line2.slice(0, 64));
        form.set(`${prefix}[address_city]`, a.city.slice(0, 200));
        form.set(`${prefix}[address_state]`, a.state.slice(0, 2));
        form.set(`${prefix}[address_zip]`, a.zip.slice(0, 10));
        form.set(`${prefix}[address_country]`, a.country || 'US');
      };
      addr('to', input.to);
      addr('from', input.from);

      for (const [k, v] of Object.entries(input.metadata)) {
        form.set(`metadata[${k}]`, String(v).slice(0, 500));
      }

      form.set('front', new Blob([new Uint8Array(input.frontPdf)], { type: 'application/pdf' }), 'front.pdf');
      form.set('back', new Blob([new Uint8Array(input.backPdf)], { type: 'application/pdf' }), 'back.pdf');

      const res = await fetch(`${LOB_BASE}/postcards`, {
        method: 'POST',
        headers: { Authorization: auth },
        body: form,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new MailProviderError(
          `provider ${res.status}: ${text.slice(0, 400)}`,
          res.status,
          text
        );
      }

      const body = JSON.parse(text) as {
        id?: string;
        expected_delivery_date?: string;
        // Lob returns price as a decimal string of dollars on accounts that
        // expose it. Absent is normal; it is not an error.
        price?: string | number | null;
      };
      const price = body.price == null ? null : Number(body.price);

      return {
        id: body.id || '',
        costCents: Number.isFinite(price as number) ? Math.round((price as number) * 100) : null,
        expectedDelivery: body.expected_delivery_date || null,
        raw: body,
      };
    },
  };
}
