import { nextHours, type CombinedHour, type Conditions } from "./conditions";
import { COMPOUND_BANDS, type CompoundLevel } from "./risk";

/** Compound score at which a level starts. */
export const HIGH_SCORE = COMPOUND_BANDS[1].max + 1; // 51
export const CRITICAL_SCORE = COMPOUND_BANDS[2].max + 1; // 76

export interface Upcoming {
  /** "critical" = will reach Critical or worse; "high" = will reach High. */
  severity: "critical" | "high";
  nowScore: number;
  /** Highest score in the next 48 hours, and when. */
  peakScore: number;
  peakLevel: CompoundLevel;
  peakTime: string;
  /** Hours from now until the threshold is first crossed. */
  hoursUntil: number;
}

/**
 * Will this city cross into High (51+) or Critical (76+) within 48 hours, when it has not reached that
 * level at any time today? Returns the most severe crossing, or null.
 */
export function upcomingRisk(c: Conditions): Upcoming | null {
  if (c.now.score == null) return null;
  const ahead = nextHours(c, 49).slice(1).filter((h): h is CombinedHour & { score: number } => h.score != null);
  if (!ahead.length) return null;
  const peak = ahead.reduce((a, b) => (b.score > a.score ? b : a));
  const now = c.now.score;
  // Only warn about levels the city has not already reached today: otherwise every humid city
  // "rises into High" every afternoon and the warning means nothing.
  const todayPeak = c.days[0]?.maxScore ?? now;
  const cross = (t: number) => (now < t && todayPeak < t ? ahead.findIndex((h) => h.score >= t) : -1);
  const critical = cross(CRITICAL_SCORE);
  const high = cross(HIGH_SCORE);
  const i = critical >= 0 ? critical : high;
  if (i < 0) return null;
  return {
    severity: critical >= 0 ? "critical" : "high",
    nowScore: now,
    peakScore: peak.score,
    peakLevel: peak.level!,
    peakTime: peak.time,
    hoursUntil: i + 1,
  };
}

export type Trend = "up" | "flat" | "down";

/** Compound score now versus 6 hours ago (WBGT where there is no air data). */
export function sixHourTrend(c: Conditions): Trend {
  const i = c.hours.indexOf(c.now);
  const then = c.hours[i - 6];
  if (!then) return "flat";
  const d = c.now.score != null && then.score != null ? c.now.score - then.score : (c.now.wbgt - then.wbgt) * 2.5;
  return d >= 5 ? "up" : d <= -5 ? "down" : "flat";
}

/**
 * "Rising" over days, not hours: the next 48 hours peak at least 5 points above today's peak. This
 * ignores the normal day–night cycle, which makes every city "rise" each morning.
 */
export function isRising(c: Conditions): boolean {
  const today = c.days[0]?.maxScore;
  const ahead = nextHours(c, 49).map((h) => h.score).filter((s): s is number => s != null);
  return today != null && ahead.length > 0 && Math.max(...ahead) >= today + 5;
}

export const TREND_ARROW: Record<Trend, string> = { up: "↑", flat: "→", down: "↓" };
