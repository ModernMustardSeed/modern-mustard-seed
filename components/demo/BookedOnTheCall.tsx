/**
 * WHAT YOUR AGENT BOOKED WHILE YOU WERE ON THE PHONE.
 *
 * This card only exists once, and only for people who did the thing that sells
 * the product: they called their own demo agent, played a customer, and got put
 * on a schedule. Showing that back to them in writing is the proof the call
 * already made out loud, and it is the difference between "that was a neat
 * chatbot" and "that just booked a job for me".
 *
 * Renders NOTHING when nobody has booked. An empty "your appointments" panel on
 * a hub is worse than no panel: it advertises a feature the visitor has not
 * seen work yet, and it makes the suite look half finished on first open, which
 * is exactly when most people decide.
 */

type Booked = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  service: string | null;
  starts_at: string;
};

/** Mountain, matching what the agent said out loud on the call. If these two
 *  ever disagree the caller thinks they were booked for a different day, so the
 *  zone is deliberately the same constant the voice route passes to sayable. */
const TZ = 'America/Denver';

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));
}

export default function BookedOnTheCall({
  appointments,
  business,
  jobWord = 'job',
}: {
  appointments: Booked[];
  business: string;
  /** "job", "appointment", "table", "consult": the word this trade uses. */
  jobWord?: string;
}) {
  if (!appointments.length) return null;
  const many = appointments.length > 1;

  return (
    <section className="animate-[hubIn_.5s_ease-out_both]">
      <div className="text-center mb-5">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold">
          Booked on the call
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2">
          {many ? `${appointments.length} ${jobWord}s` : `A ${jobWord}`} your agent booked
        </h2>
        <p className="font-body text-[14px] text-[#161616]/60 mt-1">
          Nobody typed {many ? 'these' : 'this'} in. Your agent took the call and put it on the schedule.
        </p>
      </div>

      <ul className="rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] overflow-hidden">
        {appointments.map((a, i) => (
          <li
            key={a.id}
            className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 sm:px-5 py-3.5 ${
              i ? 'border-t-2 border-[#161616]/12' : ''
            }`}
          >
            <span className="font-display text-[15px] sm:text-base font-bold text-[#161616]">
              {when(a.starts_at)}
            </span>
            <span className="font-body text-[13px] text-[#161616]/70">
              {a.customer_name || 'A caller'}
              {a.service ? `, ${a.service}` : ''}
            </span>
            {a.customer_phone && (
              <span className="font-mono text-[12px] text-[#161616]/45 ml-auto">{a.customer_phone}</span>
            )}
          </li>
        ))}
      </ul>

      <p className="font-body text-[13px] text-[#161616]/55 text-center mt-3">
        This is a demo calendar, so {many ? 'these are' : 'this is'} yours to play with. On {business}&rsquo; real
        line it is your real schedule.
      </p>
    </section>
  );
}
