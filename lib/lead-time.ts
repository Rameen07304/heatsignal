import type { CombinedHour } from "./conditions";
import { heatFlag, hourRanges, workRegimen, type HourRange, type Intensity, type WorkerContext } from "./work-rest";
import { workDay } from "./workforce";

/** A "hot day" for the streak count: daily max WBGT at or above this. */
export const HOT_DAY_WBGT = 30;

const hourOf = (h: { time: string }) => Number(h.time.slice(11, 13));

/**
 * The next time today that the worksite flag gets worse, and how many minutes away that is.
 * `ahead` starts at the current hour; `minute` is the minute within it.
 */
export function nextFlagChange(ahead: CombinedHour[], work: Intensity, ctx: WorkerContext | undefined, minute: number) {
  if (!ahead.length) return null;
  const today = ahead[0].time.slice(0, 10);
  const nowMin = workRegimen(ahead[0].wbgt, work, ctx).workMin;
  const i = ahead.findIndex((h) => h.time.startsWith(today) && workRegimen(h.wbgt, work, ctx).workMin < nowMin);
  if (i < 0) return null;
  const r = workRegimen(ahead[i].wbgt, work, ctx);
  return { flag: heatFlag(r), regimen: r, at: ahead[i].time.slice(11, 16), inMinutes: i * 60 - minute };
}

/** Tomorrow's worst flag, when it applies, and the 8-hour shift start with the most working time. Null if tomorrow is green all day. */
export function tomorrowPeak(tomorrow: CombinedHour[], work: Intensity, ctx?: WorkerContext) {
  const day = tomorrow.filter((h) => hourOf(h) >= 5 && hourOf(h) < 20);
  if (!day.length) return null;
  const worst = day.map((h) => workRegimen(h.wbgt, work, ctx)).reduce((a, b) => (b.workMin < a.workMin ? b : a));
  if (worst.workMin === 60) return null;
  const ranges: HourRange[] = hourRanges(day, (h) => workRegimen(h.wbgt, work, ctx).workMin === worst.workMin);
  const plan = workDay(tomorrow, work, ctx);
  return { flag: heatFlag(worst), regimen: worst, ranges, bestStart: plan?.bestStart ?? null };
}

/**
 * Where today sits in a run of hot days (daily max WBGT ≥ 30 °C). `past` are the days before today (oldest first),
 * `ahead` starts with today. Null when today is not hot. Fatigue builds up over consecutive hot days.
 */
export function hotStreak(past: { maxWbgt: number }[], ahead: { maxWbgt: number }[]) {
  const hot = (d: { maxWbgt: number }) => d.maxWbgt >= HOT_DAY_WBGT;
  if (!ahead.length || !hot(ahead[0])) return null;
  let before = 0;
  for (let i = past.length - 1; i >= 0 && hot(past[i]); i--) before++;
  let after = 0;
  while (after < ahead.length && hot(ahead[after])) after++;
  return { day: before + 1, total: before + after };
}
