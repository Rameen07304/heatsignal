import type { AirForecast, AirPoint } from "./air";
import { compoundBand, compoundRiskScore, type CompoundLevel } from "./risk";
import type { DailySummary, Forecast, HourlyPoint } from "./weather";

/** One hour of weather joined with that hour's air quality and the compound score. */
export interface CombinedHour extends HourlyPoint {
  air?: AirPoint;
  /** Compound score 0–100; null where there is no air-quality data for the hour. */
  score: number | null;
  level: CompoundLevel | null;
}

export interface CombinedDay extends DailySummary {
  maxAqi?: number;
  maxPm25?: number;
  maxScore?: number;
  level?: CompoundLevel;
}

export interface Conditions {
  hours: CombinedHour[];
  days: CombinedDay[];
  now: CombinedHour;
  /** Whether any air-quality data was available. */
  hasAir: boolean;
}

export function combineHours(hourly: HourlyPoint[], air?: AirForecast): CombinedHour[] {
  return hourly.map((h) => {
    const a = air?.byTime.get(h.time);
    const score = a ? compoundRiskScore(h.wbgt, a.aqi, a.uv) : null;
    return { ...h, air: a, score, level: score == null ? null : compoundBand(score).level };
  });
}

const max = (xs: number[]) => (xs.length ? Math.max(...xs) : undefined);

export function combineDays(daily: DailySummary[], hours: CombinedHour[]): CombinedDay[] {
  return daily.map((d) => {
    const day = hours.filter((h) => h.time.startsWith(d.date));
    const withAir = day.filter((h) => h.air);
    const maxScore = max(withAir.map((h) => h.score!));
    return {
      ...d,
      maxAqi: max(withAir.map((h) => h.air!.aqi)),
      maxPm25: max(withAir.map((h) => h.air!.pm25)),
      maxScore,
      level: maxScore == null ? undefined : compoundBand(maxScore).level,
    };
  });
}

export function buildConditions(forecast: Forecast, air?: AirForecast): Conditions {
  const hours = combineHours(forecast.hourly, air);
  return {
    hours,
    days: combineDays(forecast.daily, hours),
    now: hours.find((h) => h.time === forecast.current.time) ?? hours[0],
    hasAir: hours.some((h) => h.air),
  };
}

/** The next `n` hours starting with the current one. */
export const nextHours = (c: Conditions, n: number) => {
  const i = c.hours.indexOf(c.now);
  return c.hours.slice(i, i + n);
};
