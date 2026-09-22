/**
 * THE BUILD WEEK.
 *
 * Every other dashboard in this industry shows a builder a weather icon, which
 * they can get by looking out of the window. The question a superintendent in
 * the Flathead actually asks at 6am is narrower and worth money: can we pour
 * on Thursday, can the excavator work Friday, is Monday a roofing day, and
 * when does the first hard freeze end the season.
 *
 * So this reads the National Weather Service forecast (free, no key, and the
 * source the local crews already trust) and answers those questions rather
 * than printing a sun.
 *
 * THE RULES, and where they come from. These are ACI 306 cold weather
 * practice and ordinary Montana site sense, not invention:
 *   CONCRETE  needs the air above 40F and rising for the pour, and the real
 *             risk is the night: fresh concrete that freezes in the first
 *             twenty four hours loses strength it never gets back. So a pour
 *             day needs a night above 32F after it, and a night at or below
 *             28F is a no.
 *   DIRT      frozen ground and heavy rain are the two stoppers. Ground frost
 *             lags air temperature, so a single cold night is survivable and
 *             three in a row is not.
 *   ROOF      wind is the thing that hurts people. Above 25 mph nobody should
 *             be handling sheet material on a roof.
 *
 * Every verdict says which rule produced it, because a builder will not trust
 * a red day that does not explain itself, and should not.
 */

export type Period = {
  name: string;
  startTime: string;
  isDaytime: boolean;
  temperature: number;
  windSpeed: string;
  windGustMph: number | null;
  precipPercent: number | null;
  shortForecast: string;
};

export type DayVerdict = {
  date: string;
  label: string;
  high: number | null;
  low: number | null;
  windMph: number | null;
  precipPercent: number | null;
  sky: string;
  concrete: { ok: boolean; why: string };
  dirt: { ok: boolean; why: string };
  roof: { ok: boolean; why: string };
};

export type BuildWeek = {
  place: string;
  days: DayVerdict[];
  /** The first night at or below freezing in the window, if there is one. */
  firstFreeze: { date: string; low: number } | null;
  source: string;
  at: string;
};

const UA = 'ModernMustardSeed/1.0 (sarah@modernmustardseed.com)';

/** The top of a wind range: "5 to 15 mph" is a 15 mph day for a roofer. */
export function topWind(s: string | null | undefined): number | null {
  const nums = String(s ?? '').match(/\d+/g);
  if (!nums?.length) return null;
  return Math.max(...nums.map(Number));
}

async function nws<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/geo+json' }, signal: AbortSignal.timeout(15_000), next: { revalidate: 1800 } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** The forecast for a point, and the name the service gives that place. */
export async function forecastFor(lat: number, lon: number): Promise<{ place: string; periods: Period[] } | null> {
  const point = await nws<{ properties: { forecast: string; relativeLocation: { properties: { city: string; state: string } } } }>(`https://api.weather.gov/points/${lat},${lon}`);
  if (!point?.properties?.forecast) return null;
  const fc = await nws<{ properties: { periods: Array<Record<string, unknown>> } }>(point.properties.forecast);
  if (!fc?.properties?.periods) return null;
  const place = `${point.properties.relativeLocation?.properties?.city ?? ''}, ${point.properties.relativeLocation?.properties?.state ?? ''}`.replace(/^, /, '');
  const periods: Period[] = fc.properties.periods.slice(0, 14).map((p) => ({
    name: String(p.name ?? ''),
    startTime: String(p.startTime ?? ''),
    isDaytime: Boolean(p.isDaytime),
    temperature: Number(p.temperature ?? 0),
    windSpeed: String(p.windSpeed ?? ''),
    windGustMph: topWind(p.windGust as string | undefined),
    precipPercent: ((p.probabilityOfPrecipitation as { value?: number } | undefined)?.value ?? null) as number | null,
    shortForecast: String(p.shortForecast ?? ''),
  }));
  return { place, periods };
}

const dayOf = (iso: string) => iso.slice(0, 10);

/**
 * Turn the service's day and night periods into one verdict per day.
 *
 * The night AFTER a day is what decides its concrete, which is why this pairs
 * them rather than reading each period on its own.
 */
export function buildWeek(place: string, periods: Period[]): BuildWeek {
  const days = new Map<string, { day?: Period; night?: Period }>();
  for (const p of periods) {
    const key = dayOf(p.startTime);
    const slot = days.get(key) ?? {};
    if (p.isDaytime) slot.day = p;
    else slot.night = p;
    days.set(key, slot);
  }

  const keys = [...days.keys()].sort();
  const out: DayVerdict[] = [];
  let firstFreeze: BuildWeek['firstFreeze'] = null;
  let coldNights = 0;

  for (const [i, key] of keys.entries()) {
    const { day, night } = days.get(key)!;
    const ref = day ?? night;
    if (!ref) continue;

    const high = day?.temperature ?? null;
    // The night that follows this day, which is the one fresh concrete has to survive.
    const low = night?.temperature ?? days.get(keys[i + 1] ?? '')?.night?.temperature ?? null;
    const wind = topWind(ref.windSpeed) ?? ref.windGustMph;
    const precip = Math.max(day?.precipPercent ?? 0, night?.precipPercent ?? 0) || (day?.precipPercent ?? night?.precipPercent ?? null);

    if (low !== null && low <= 32) {
      coldNights += 1;
      if (!firstFreeze) firstFreeze = { date: key, low };
    } else {
      coldNights = 0;
    }

    const concrete =
      high !== null && high < 40
        ? { ok: false, why: `Only ${high}F in the day. Concrete wants 40F and rising.` }
        : low !== null && low <= 28
          ? { ok: false, why: `Down to ${low}F that night. Fresh concrete that freezes never gets that strength back.` }
          : low !== null && low <= 32
            ? { ok: false, why: `${low}F overnight. Pour only with blankets and a plan.` }
            : (precip ?? 0) >= 60
              ? { ok: false, why: `${precip}% chance of rain. A pour in that is a finish you fight.` }
              : { ok: true, why: high !== null ? `${high}F day, ${low ?? '?'}F night. Good pour window.` : 'Within the window.' };

    const dirt =
      coldNights >= 3
        ? { ok: false, why: 'Third freezing night running. The ground will be hard.' }
        : (precip ?? 0) >= 70
          ? { ok: false, why: `${precip}% chance of rain. Mud, ruts and a mess to fix after.` }
          : { ok: true, why: (precip ?? 0) >= 40 ? `${precip}% chance of rain. Workable, watch it.` : 'Ground should work.' };

    const roof =
      wind !== null && wind >= 25
        ? { ok: false, why: `Wind to ${wind} mph. Nobody should be handling sheet material up there.` }
        : (precip ?? 0) >= 60
          ? { ok: false, why: `${precip}% chance of rain. Wet decking is how people fall.` }
          : { ok: true, why: wind !== null ? `Wind to ${wind} mph.` : 'Fine for roof work.' };

    out.push({
      date: key,
      label: new Date(`${key}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
      high,
      low,
      windMph: wind,
      precipPercent: precip ?? null,
      sky: ref.shortForecast,
      concrete,
      dirt,
      roof,
    });
  }

  return { place, days: out.slice(0, 7), firstFreeze, source: 'National Weather Service', at: new Date().toISOString() };
}
