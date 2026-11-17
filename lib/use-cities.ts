"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAirMany } from "./air";
import { WORLD_CITIES, cityKey, type City } from "./cities";
import { buildConditions, type Conditions } from "./conditions";
import { fetchForecasts } from "./weather";

// v2: the monitored list now starts with every world city (v1 started with six).
const STORAGE_KEY = "heatsignal-cities-v2";

/** The monitored city list, saved in this browser. Starts with every city in lib/cities.ts. */
export function useMonitoredCities() {
  const [cities, setCities] = useState<City[]>(WORLD_CITIES);

  // Read after mount so server and client render the same first frame.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (Array.isArray(saved) && saved.length) setCities(saved);
    } catch {}
  }, []);

  const save = (next: City[]) => {
    setCities(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  return {
    cities,
    // New cities go last so only the final 50-city batch has to be refetched.
    add: (city: City) => {
      if (!cities.some((c) => cityKey(c) === cityKey(city))) save([...cities, city]);
    },
    remove: (city: City) => save(cities.filter((c) => cityKey(c) !== cityKey(city))),
    reset: () => save(WORLD_CITIES),
  };
}

export type CityState = Conditions | Error | undefined;

/** Weather and air quality for every city, fetched in 50-city batches. */
export function useConditions(cities: City[]) {
  const [data, setData] = useState<Record<string, CityState>>({});
  const [airFailed, setAirFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const keys = cities.map(cityKey).join("|");

  useEffect(() => {
    let live = true;
    Promise.all([
      fetchForecasts(cities),
      // Air quality is an extra layer: if it fails, heat data still shows.
      fetchAirMany(cities).catch(() => null),
    ]).then(
      ([forecasts, airs]) => {
        if (!live) return;
        setAirFailed(airs == null);
        setData(Object.fromEntries(cities.map((c, i) => [cityKey(c), buildConditions(forecasts[i], airs?.[i])])));
      },
      (e) => {
        if (!live) return;
        const err = e instanceof Error ? e : new Error(String(e));
        setData(Object.fromEntries(cities.map((c) => [cityKey(c), err])));
      },
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `keys` captures the city list
  }, [keys, attempt]);

  const retry = useCallback(() => {
    setData({});
    setAttempt((n) => n + 1);
  }, []);

  return { data, airFailed, retry };
}

export const ok = (s: CityState): s is Conditions => s != null && !(s instanceof Error);
