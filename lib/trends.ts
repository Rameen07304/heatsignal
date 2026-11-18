import type { City } from "./cities";
import { fetchArchive, summarizeDaily } from "./weather";

export const TREND_COUNT = 5;

/** The last TREND_COUNT summers that have ended (the archive lags about a week behind). */
export function trendYears(city: City, today = new Date()): number[] {
  const y = today.getUTCFullYear();
  const done = new Date(Date.UTC(y, city.lat >= 0 ? 8 : 2, 8)) <= today; // 8 Sep / 8 Mar
  const last = done ? y : y - 1;
  return Array.from({ length: TREND_COUNT }, (_, i) => last - TREND_COUNT + 1 + i);
}

export interface SeasonStats {
  year: number;
  /** e.g. "Jun–Aug 2024" */
  label: string;
  days: number;
  avgMaxTemp: number;
  avgMaxWbgt: number;
  /** Days with max WBGT ≥ 30 (High) and ≥ 33 (Extreme). */
  highDays: number;
  extremeDays: number;
  hottest: { date: string; wbgt: number };
}

/** Summer: June–August in the northern hemisphere, December–February in the southern. */
function season(city: City, year: number) {
  return city.lat >= 0
    ? { start: `${year}-06-01`, end: `${year}-08-31`, label: `Jun–Aug ${year}` }
    : { start: `${year - 1}-12-01`, end: new Date(Date.UTC(year, 2, 0)).toISOString().slice(0, 10), label: `Dec ${year - 1}–Feb ${year}` };
}

const key = (c: City, y: number) => `heatsignal-trend-v2-${c.lat},${c.lon}-${y}`;

/** One summer's statistics. History never changes, so results are kept in this browser for good. */
export async function seasonStats(city: City, year: number): Promise<SeasonStats> {
  try {
    const cached = localStorage.getItem(key(city, year));
    if (cached) return JSON.parse(cached);
  } catch {}
  const s = season(city, year);
  const days = summarizeDaily(await fetchArchive(city.lat, city.lon, s.start, s.end));
  if (!days.length) throw new Error("No archive data");
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const hot = days.reduce((a, b) => (b.maxWbgt > a.maxWbgt ? b : a));
  const stats: SeasonStats = {
    year,
    label: s.label,
    days: days.length,
    avgMaxTemp: mean(days.map((d) => d.maxTemp)),
    avgMaxWbgt: mean(days.map((d) => d.maxWbgt)),
    highDays: days.filter((d) => d.maxWbgt >= 30).length,
    extremeDays: days.filter((d) => d.maxWbgt >= 33).length,
    hottest: { date: hot.date, wbgt: hot.maxWbgt },
  };
  try {
    localStorage.setItem(key(city, year), JSON.stringify(stats));
  } catch {}
  return stats;
}

/** Seasons one after another (gentler on the free API than all at once). */
export async function allSeasons(city: City): Promise<SeasonStats[]> {
  const out: SeasonStats[] = [];
  for (const y of trendYears(city)) out.push(await seasonStats(city, y));
  return out;
}

/** Least-squares line through (x, y). */
export function linearFit(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = sxx ? xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / sxx : 0;
  return { slope, at: (x: number) => my + slope * (x - mx) };
}
