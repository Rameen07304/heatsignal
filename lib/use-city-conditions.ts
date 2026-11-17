"use client";

import { fetchAir } from "./air";
import type { City } from "./cities";
import { buildConditions, type CombinedHour, type Conditions } from "./conditions";
import { useAsync } from "./use-async";
import { fetchForecast } from "./weather";

/** 7-day weather + air quality for one place. */
export function useCityConditions(city: City) {
  return useAsync(async () => {
    const [forecast, air] = await Promise.all([fetchForecast(city.lat, city.lon), fetchAir(city.lat, city.lon).catch(() => undefined)]);
    return buildConditions(forecast, air);
  }, [city.lat, city.lon]);
}

/** Hours of a given local date ("YYYY-MM-DD"). */
export const hoursOf = (c: Conditions, date: string) => c.hours.filter((h) => h.time.startsWith(date));

/** The worst hour of a set: highest compound score, or highest WBGT where there is no air data. */
export const worstHour = (hours: CombinedHour[]) =>
  hours.reduce<CombinedHour | undefined>((p, h) => (!p || (h.score ?? h.wbgt) > (p.score ?? p.wbgt) ? h : p), undefined);
