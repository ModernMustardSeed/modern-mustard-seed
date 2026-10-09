import { bootcampTiers, usd } from '@/data/bootcamp';
import CheckoutButton from './CheckoutButton';
import { Check, btn } from './ui';

/**
 * The three seats. VIP is the featured card and goes dark. Every number comes
 * from data/bootcamp.ts; the button carries only the slug.
 */
export default function TierCards({ open, email, host }: { open: boolean; email?: string; host?: string | null }) {
  return (
    <div className="grid lg:grid-cols-3 gap-6 lg:gap-5 mt-10 items-stretch">
      {bootcampTiers.map((t) => {
        const dark = !!t.featured;
        return (
          <article
            key={t.slug}
            aria-labelledby={`tier-${t.slug}`}
            className={`relative flex flex-col rounded-[4px] border-2 border-[#141210] p-6 sm:p-7 ${
              dark ? 'bg-[#141210] text-[#fcfaf3] shadow-[8px_8px_0_0_#f5b700] lg:-translate-y-2' : 'bg-white'
            }`}
          >
            {dark && (
              <span className="absolute -top-3.5 left-6 rounded-full bg-[#f5b700] border-2 border-[#141210] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#141210]">
                Most seats go here
              </span>
            )}
            <p className={`font-mono text-[10px] uppercase tracking-[0.22em] font-bold ${dark ? 'text-[#e8ecd0]' : 'text-[#0f4c47]'}`}>{t.chip}</p>
            <h3 id={`tier-${t.slug}`} className="font-display text-2xl font-black mt-3">{t.name}</h3>
            <p className="mt-3 flex items-baseline gap-2">
              <span className={`font-display text-5xl sm:text-6xl font-black tracking-tight leading-none ${dark ? 'text-[#f5b700]' : 'text-[#141210]'}`}>{usd(t.priceCents)}</span>
              <span className={`font-mono text-[10px] uppercase tracking-[0.2em] font-bold ${dark ? 'text-[#fcfaf3]/60' : 'text-[#141210]/55'}`}>one seat</span>
            </p>
            <p className={`font-body text-[15px] leading-relaxed mt-3 ${dark ? 'text-[#fcfaf3]/85' : 'text-[#141210]/75'}`}>{t.pitch}</p>
            <ul className="mt-5 space-y-2.5 flex-1">
              {t.includes.map((line) => (
                <Check key={line} dark={dark}>{line}</Check>
              ))}
            </ul>
            {t.frontRowSeats && (
              <p className={`mt-4 font-mono text-[10px] uppercase tracking-[0.2em] font-bold ${dark ? 'text-[#e8ecd0]' : 'text-[#0f4c47]'}`}>
                Front row: first {t.frontRowSeats} seats
              </p>
            )}
            <CheckoutButton tier={t.slug} label={`${t.cta} · ${usd(t.priceCents)}`} open={open} className={dark ? btn.onDark : btn.dark} email={email} host={host} />
            <p className={`mt-3 text-center font-body text-xs ${dark ? 'text-[#fcfaf3]/55' : 'text-[#141210]/55'}`}>
              Replays for {t.replayDays === 182 ? 'six months' : `${t.replayDays} days`}. Card or bank, through Stripe.
            </p>
          </article>
        );
      })}
    </div>
  );
}
