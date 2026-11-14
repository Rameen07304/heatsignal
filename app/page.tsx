"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CityCard } from "@/components/city-card";
import { CitySearch } from "@/components/city-search";
import { RISK_BANDS, classifyRisk, isElevated, RISK_COLORS } from "@/lib/risk";
import { DEFAULT_CITIES, cityKey, type City } from "@/lib/cities";
import { fetchForecast, type Forecast } from "@/lib/weather";

const WeatherMap = dynamic(() => import("@/components/weather-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[360px] w-full" />,
});

const STORAGE_KEY = "heatsignal-cities";

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
  const [cities, setCities] = useState<City[]>(DEFAULT_CITIES);
  const [forecasts, setForecasts] = useState<Record<string, Forecast | Error | undefined>>({});
  const requested = useRef(new Set<string>());

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

  const load = useCallback((city: City) => {
    const key = cityKey(city);
    setForecasts((f) => ({ ...f, [key]: undefined }));
    fetchForecast(city.lat, city.lon).then(
      (data) => setForecasts((f) => ({ ...f, [key]: data })),
      (e) => setForecasts((f) => ({ ...f, [key]: e instanceof Error ? e : new Error(String(e)) })),
    );
  }, []);

  useEffect(() => {
    for (const city of cities) {
      if (requested.current.has(cityKey(city))) continue;
      requested.current.add(cityKey(city));
      load(city);
    }
  }, [cities, load]);

  const loaded = cities.flatMap((city) => {
    const f = forecasts[cityKey(city)];
    return f && !(f instanceof Error) ? [{ city, f }] : [];
  });
  const elevated = loaded.filter(({ f }) => isElevated(f.current.risk)).length;
  const hottest = loaded.reduce<{ city: City; wbgt: number } | null>((best, { city, f }) => {
    const wbgt = f.daily[0].maxWbgt;
    return !best || wbgt > best.wbgt ? { city, wbgt } : best;
  }, null);
  const pending = loaded.length === 0 && cities.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Heat stress dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live Wet Bulb Globe Temperature (WBGT) risk for monitored cities.
          </p>
        </div>
        <CitySearch
          onSelect={(city) => {
            if (!cities.some((c) => cityKey(c) === cityKey(city))) save([city, ...cities]);
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Cities monitored" value={String(cities.length)} />
        <StatTile
          label="At High / Extreme risk now"
          value={pending ? "–" : String(elevated)}
          color={elevated > 0 ? RISK_COLORS.Extreme : undefined}
          sub={pending ? "Loading…" : `of ${loaded.length} with live data`}
        />
        <StatTile
          label="Highest WBGT today"
          value={hottest ? `${hottest.wbgt.toFixed(1)} °C` : "–"}
          color={hottest ? RISK_COLORS[classifyRisk(hottest.wbgt)] : undefined}
          sub={hottest ? hottest.city.name : pending ? "Loading…" : undefined}
        />
      </div>

      <WeatherMap cities={cities} forecasts={forecasts} />

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {RISK_BANDS.map((b, i) => (
          <span key={b.level} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
            {b.level} {i === 0 ? "< 27" : i === RISK_BANDS.length - 1 ? `≥ ${b.min}` : `${b.min}–${RISK_BANDS[i + 1].min}`} °C
          </span>
        ))}
      </div>

      {cities.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No cities monitored. Search above to add one.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <CityCard
              key={cityKey(city)}
              city={city}
              forecast={forecasts[cityKey(city)]}
              onRetry={() => load(city)}
              onRemove={() => {
                requested.current.delete(cityKey(city));
                save(cities.filter((c) => cityKey(c) !== cityKey(city)));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
