"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CityCard } from "@/components/city-card";
import { CitySearch } from "@/components/city-search";
import { ErrorState } from "@/components/error-state";
import { HotspotRanking } from "@/components/hotspot-ranking";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AQI_BANDS, UNHEALTHY_AQI, aqiBand, fetchAirNow, type AirNow } from "@/lib/air";
import { RISK_BANDS, classifyRisk, isElevated, RISK_COLORS } from "@/lib/risk";
import { DEFAULT_CITIES, WORLD_CITIES, cityKey, type City } from "@/lib/cities";
import { fetchForecast, fetchForecasts, type Forecast } from "@/lib/weather";

const WeatherMap = dynamic(() => import("@/components/weather-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full" />,
});

const STORAGE_KEY = "heatsignal-cities";
const WORLD_KEYS = new Set(WORLD_CITIES.map(cityKey));
const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

function StatTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
        {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  /** "My cities": the user's pinned list. The world list is always monitored as well. */
  const [cities, setCities] = useState<City[]>(DEFAULT_CITIES);
  const [forecasts, setForecasts] = useState<Record<string, Forecast | Error | undefined>>({});
  const requested = useRef(new Set<string>());
  /** Current air quality for the world cities; stays empty if that feed is unavailable. */
  const [air, setAir] = useState<Record<string, AirNow | null>>({});
  const [mapMode, setMapMode] = useState<"heat" | "smog">("heat");

  // Saved city list is browser-only; read it after mount to keep hydration consistent.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (Array.isArray(saved)) setCities(saved);
    } catch {}
  }, []);

  const save = (next: City[]) => {
    setCities(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const setMany = (entries: [string, Forecast | Error | undefined][]) =>
    setForecasts((f) => ({ ...f, ...Object.fromEntries(entries) }));

  /** All world cities in a single request. */
  const loadWorld = useCallback(() => {
    setMany(WORLD_CITIES.map((c) => [cityKey(c), undefined]));
    fetchForecasts(WORLD_CITIES).then(
      (list) => setMany(list.map((f, i) => [cityKey(WORLD_CITIES[i]), f])),
      (e) => setMany(WORLD_CITIES.map((c) => [cityKey(c), toError(e)])),
    );
  }, []);

  const load = useCallback((city: City) => {
    setMany([[cityKey(city), undefined]]);
    fetchForecast(city.lat, city.lon).then(
      (data) => setMany([[cityKey(city), data]]),
      (e) => setMany([[cityKey(city), toError(e)]]),
    );
  }, []);

  useEffect(() => {
    if (requested.current.size) return; // React strict mode runs effects twice in dev
    WORLD_KEYS.forEach((k) => requested.current.add(k));
    loadWorld();
    // Smog is an extra layer: if it fails the heat dashboard still works, so no error state.
    fetchAirNow(WORLD_CITIES).then(
      (list) => setAir(Object.fromEntries(list.map((a, i) => [cityKey(WORLD_CITIES[i]), a]))),
      () => {},
    );
  }, [loadWorld]);

  // Cities the user added through search that aren't in the world list.
  useEffect(() => {
    for (const city of cities) {
      if (requested.current.has(cityKey(city)) || WORLD_KEYS.has(cityKey(city))) continue;
      requested.current.add(cityKey(city));
      load(city);
    }
  }, [cities, load]);

  const all = useMemo(
    () => [...cities.filter((c) => !WORLD_KEYS.has(cityKey(c))), ...WORLD_CITIES],
    [cities],
  );
  const loaded = all.flatMap((city) => {
    const f = forecasts[cityKey(city)];
    return f && !(f instanceof Error) ? [{ city, f, air: air[cityKey(city)] }] : [];
  });
  const smoggy = WORLD_CITIES.flatMap((city) => {
    const a = air[cityKey(city)];
    return a && a.aqi >= UNHEALTHY_AQI ? [{ city, aqi: a.aqi }] : [];
  });
  const peopleInSmog = smoggy.reduce((sum, { city }) => sum + (city.pop ?? 0), 0);
  const worstAir = smoggy.reduce<{ city: City; aqi: number } | null>(
    (worst, s) => (!worst || s.aqi > worst.aqi ? s : worst),
    null,
  );
  const airLoaded = Object.keys(air).length > 0;
  const worldFailed = forecasts[cityKey(WORLD_CITIES[0])] instanceof Error;
  const pending = loaded.length === 0 && !worldFailed;

  const atRisk = loaded.filter(({ f }) => isElevated(f.daily[0].risk));
  const peopleAtRisk = atRisk.reduce((sum, { city }) => sum + (city.pop ?? 0), 0);
  const hottest = loaded.reduce<{ city: City; wbgt: number } | null>((best, { city, f }) => {
    const wbgt = f.daily[0].maxWbgt;
    return !best || wbgt > best.wbgt ? { city, wbgt } : best;
  }, null);
  const pinned = new Set(cities.map(cityKey));
  const pin = (city: City) => {
    if (!pinned.has(cityKey(city))) save([city, ...cities]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Is it safe to be outside?</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Live heat stress and smog for {WORLD_CITIES.length} of the world’s most exposed cities — and any other
            place you search for. Open a city to see, hour by hour, when it is safe to work or be outdoors.
          </p>
        </div>
        <CitySearch onSelect={pin} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="People in High or Extreme heat today"
          value={pending ? "–" : `${Math.round(peopleAtRisk).toLocaleString("en")} million`}
          color={atRisk.length > 0 ? RISK_COLORS.Extreme : undefined}
          sub={pending ? "Loading…" : `in ${atRisk.length} of ${loaded.length} monitored cities`}
        />
        <StatTile
          label="People breathing unhealthy air now"
          value={airLoaded ? `${Math.round(peopleInSmog).toLocaleString("en")} million` : "–"}
          color={smoggy.length > 0 ? aqiBand(UNHEALTHY_AQI).color : undefined}
          sub={
            !airLoaded
              ? "Loading…"
              : worstAir
                ? `in ${smoggy.length} cities · worst: ${worstAir.city.name}, AQI ${Math.round(worstAir.aqi)}`
                : "No monitored city above AQI 150"
          }
        />
        <StatTile
          label="Highest WBGT today"
          value={hottest ? `${hottest.wbgt.toFixed(1)} °C` : "–"}
          color={hottest ? RISK_COLORS[classifyRisk(hottest.wbgt)] : undefined}
          sub={hottest ? `${hottest.city.name}, ${hottest.city.country}` : pending ? "Loading…" : undefined}
        />
        <StatTile label="Cities monitored" value={String(all.length)} sub="Updated hourly from Open-Meteo" />
      </div>

      <Tabs value={mapMode} onValueChange={(v) => setMapMode(v as "heat" | "smog")}>
        <TabsList aria-label="Map layer">
          <TabsTrigger value="heat">Heat stress</TabsTrigger>
          <TabsTrigger value="smog">Smog</TabsTrigger>
        </TabsList>
      </Tabs>

      <WeatherMap cities={all} forecasts={forecasts} air={air} mode={mapMode} />

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {mapMode === "heat" ? (
          <>
            <span>Today’s peak heat risk (WBGT):</span>
            {RISK_BANDS.map((b, i) => (
              <span key={b.level} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                {b.level} {i === 0 ? "< 27" : i === RISK_BANDS.length - 1 ? `≥ ${b.min}` : `${b.min}–${RISK_BANDS[i + 1].min}`} °C
              </span>
            ))}
          </>
        ) : (
          <>
            <span>Air quality now (US AQI):</span>
            {AQI_BANDS.map((b, i) => (
              <span key={b.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                {b.label} {i === AQI_BANDS.length - 1 ? "301+" : `≤ ${b.max}`}
              </span>
            ))}
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global hotspots</CardTitle>
          <CardDescription>
            Monitored cities ranked by heat stress or smog. Select a city for its safe-hours plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {worldFailed ? (
            <ErrorState message="Couldn’t load the global forecast." onRetry={loadWorld} />
          ) : pending ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : (
            <HotspotRanking rows={loaded} pinned={pinned} onPin={pin} />
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">My cities</h2>
        <p className="text-sm text-muted-foreground">Pinned for quick access and AI alerts. Saved in this browser.</p>
      </div>

      {cities.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No cities pinned. Search above or add one from the ranking.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <CityCard
              key={cityKey(city)}
              city={city}
              forecast={forecasts[cityKey(city)]}
              air={air[cityKey(city)]}
              onRetry={() => load(city)}
              onRemove={() => {
                if (!WORLD_KEYS.has(cityKey(city))) requested.current.delete(cityKey(city));
                save(cities.filter((c) => cityKey(c) !== cityKey(city)));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
