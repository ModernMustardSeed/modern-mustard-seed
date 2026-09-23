'use client';

import { useEffect, useState } from 'react';
import { Badge, Card, CardHead, cx, when } from '@/components/cc/ui';

/**
 * THE DESK, CHECKING ITSELF, IN ONE LINE.
 *
 * A self healing loop nobody can see is indistinguishable from one that has
 * quietly stopped. So the repairs are printed: what it put right on its own,
 * what it asked a platform and was told, and what it has handed to a person.
 *
 * It is small and it is at the bottom of Connections on purpose. This is
 * plumbing, and plumbing that shouts is plumbing people learn to ignore.
 */

type Health = {
  at: string;
  healed: Array<{ what: string; n: number }>;
  raised: string[];
  checked: number;
  failing: string[];
};

export default function Systems() {
  const [h, setH] = useState<Health | null | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/cc/health', { cache: 'no-store' });
        const j = (await r.json()) as { health: Health | null };
        setH(j.health);
      } catch {
        setH(null);
      }
    })();
  }, []);

  if (h === undefined) return null;

  return (
    <Card>
      <CardHead
        title="The desk checks itself"
        hint="Every hour it looks for work left half done, asks the platforms whether they still answer, and hands anything that needs a decision to you."
        right={
          h ? (
            <Badge tone={h.failing.length ? 'warn' : 'good'}>{h.failing.length ? 'Something needs you' : 'All clear'}</Badge>
          ) : (
            <Badge>Not run yet</Badge>
          )
        }
      />
      {!h ? (
        <p className="text-[13.5px] text-[var(--cc-muted)]">
          It runs on the hour. Nothing has been recorded yet, which is normal on a desk that was set up today.
        </p>
      ) : (
        <div className="space-y-2 text-[13.5px]">
          <p className="text-[var(--cc-muted)]">Last looked {when(h.at)}.</p>
          {h.healed.length > 0 ? (
            <ul className="space-y-1">
              {h.healed.map((x, i) => (
                <li key={i}>
                  <span className="font-semibold">{x.n}</span> {x.what}, put right on its own.
                </li>
              ))}
            </ul>
          ) : (
            <p>Nothing needed putting right.</p>
          )}
          {h.checked > 0 && (
            <p className={cx(h.failing.length ? 'text-[#B42318]' : 'text-[#067647]')}>
              {h.failing.length ? `Asked ${h.checked} connections; ${h.failing.join('; ')}.` : `Asked ${h.checked} ${h.checked === 1 ? 'connection' : 'connections'} today and every one answered.`}
            </p>
          )}
          {h.raised.length > 0 && <p>Handed to you: {h.raised.join(', ')}. It is on your first screen.</p>}
        </div>
      )}
    </Card>
  );
}
