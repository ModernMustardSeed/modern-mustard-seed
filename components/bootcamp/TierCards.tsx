import { bootcampTiers } from '@/data/bootcamp';
import CheckoutButton from './CheckoutButton';
import { Check, btn } from './ui';

/**
 * The three seats. VIP is the featured card and goes dark. No price on the card
 * (conversation first, 2026-10-10): the button opens a note to Sarah with the
 * seat named, and the seat is settled with her.
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
            <h3 id={`tier-${t.slug}`} className={`font-display text-4xl sm:text-5xl font-black tracking-tight leading-none mt-3 ${dark ? 'text-[#f5b700]' : 'text-[#141210]'}`}>{t.name}</h3>
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
            <CheckoutButton tier={t.slug} label={`Ask Sarah for ${t.name}`} open={open} className={dark ? btn.onDark : btn.dark} email={email} host={host} />
            <p className={`mt-3 text-center font-body text-xs ${dark ? 'text-[#fcfaf3]/55' : 'text-[#141210]/55'}`}>
              Replays for {t.replayDays === 182 ? 'six months' : `${t.replayDays} days`}. Sarah answers inside one business day.
            </p>
          </article>
        );
      })}
    </div>
  );
}
