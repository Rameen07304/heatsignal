"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchAirMany } from "./air";
import { WORLD_CITIES, cityKey, type City } from "./cities";
import { buildConditions, type Conditions } from "./conditions";
import { fetchForecasts } from "./weather";

// v2: the monitored list now starts with every world city (v1 started with six).
const STORAGE_KEY = "heatsignal-cities-v2";
/**
 * Background refresh. Open-Meteo updates hourly and its free tier allows ~10,000 location-requests a
 * day per visitor; refreshing 100 cities every 5 minutes would exhaust that in a few hours.
 */
const REFRESH_MS = 30 * 60 * 1000;

export type CityState = Conditions | Error | undefined;

export const ok = (s: CityState): s is Conditions => s != null && !(s instanceof Error);

interface CitiesValue {
  cities: City[];
  add: (city: City) => void;
  remove: (city: City) => void;
  reset: () => void;
  data: Record<string, CityState>;
  airFailed: boolean;
  retry: () => void;
  /** When the data last arrived. */
  updatedAt: Date | null;
}

const Ctx = createContext<CitiesValue | null>(null);

/**
 * The monitored city list (saved in this browser; starts with every city in lib/cities.ts) and their
 * weather + air quality, shared by every page so the early-warning banner and alerts see the same data.
 */
export function CitiesProvider({ children }: { children: React.ReactNode }) {
  const [cities, setCities] = useState<City[]>(WORLD_CITIES);
  const [loadedList, setLoadedList] = useState(false);
  const [data, setData] = useState<Record<string, CityState>>({});
  const [airFailed, setAirFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // Read after mount so server and client render the same first frame.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (Array.isArray(saved)) setCities(saved);
    } catch {}
    setLoadedList(true);
  }, []);

  const save = (next: City[]) => {
    setCities(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const keys = cities.map(cityKey).join("|");
  const fetchedAt = useRef(0);
  useEffect(() => {
    if (!loadedList) return;
    fetchedAt.current = Date.now();
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
        setUpdatedAt(new Date());
      },
      (e) => {
        if (!live) return;
        const err = e instanceof Error ? e : new Error(String(e));
        // Keep the last good data on a failed background refresh.
        setData((prev) => (Object.values(prev).some(ok) ? prev : Object.fromEntries(cities.map((c) => [cityKey(c), err]))));
      },
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `keys` captures the city list
  }, [keys, attempt, loadedList]);

  // Refresh stale data while the tab is visible, including the moment a hidden tab comes back.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && fetchedAt.current && Date.now() - fetchedAt.current > REFRESH_MS) {
        setAttempt((n) => n + 1);
      }
    };
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const retry = useCallback(() => {
    setData({});
    setAttempt((n) => n + 1);
  }, []);

  return (
    <Ctx.Provider
      value={{
        cities,
        // New cities go last so only the final 50-city batch has to be refetched.
        add: (city) => {
          if (!cities.some((c) => cityKey(c) === cityKey(city))) save([...cities, city]);
        },
        remove: (city) => save(cities.filter((c) => cityKey(c) !== cityKey(city))),
        reset: () => save(WORLD_CITIES),
        data,
        airFailed,
        retry,
        updatedAt,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCities(): CitiesValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCities must be used inside <CitiesProvider>");
  return v;
}

/** Monitored cities with loaded data, in list order. */
export function useLoaded() {
  const { cities, data } = useCities();
  return cities.flatMap((city) => {
    const s = data[cityKey(city)];
    return ok(s) ? [{ city, c: s }] : [];
  });
}
