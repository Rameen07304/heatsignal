"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CityCard } from "@/components/city-card";
import { AddCityDialog } from "@/components/city-search";
import { CountUp } from "@/components/count-up";
import { ErrorState } from "@/components/error-state";
import type { MapMode } from "@/components/weather-map";
import { AQI_BANDS, UNHEALTHY_AQI, aqiBand, formatAqi } from "@/lib/air";
import { WORLD_CITIES, cityKey, type City } from "@/lib/cities";
import type { Conditions } from "@/lib/conditions";
import { COMPOUND_BANDS, RISK_BANDS, RISK_COLORS, compoundBand, isCompoundEvent, isElevated } from "@/lib/risk";
import { ok, useConditions, useMonitoredCities } from "@/lib/use-cities";

const WeatherMap = dynamic(() => import("@/components/weather-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-xl sm:h-[440px]" />,
});

const PAGE = 12;

const SORTS = {
  compound: { label: "Compound risk", value: (c: Conditions) => c.days[0].maxScore ?? -1 },
  heat: { label: "Heat", value: (c: Conditions) => c.days[0].maxWbgt },
  air: { label: "Air quality", value: (c: Conditions) => c.now.air?.aqi ?? -1 },
};
type Sort = keyof typeof SORTS;

function StatTile({ label, children, sub, color }: { label: string; children: React.ReactNode; sub?: string; color?: string }) {
  return (
    <Card className="min-w-[200px] shrink-0 snap-start sm:min-w-0">
      <CardContent className="p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums" style={{ color }}>{children}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

const people = (list: { city: City }[]) => Math.round(list.reduce((s, { city }) => s + (city.pop ?? 0), 0));

export default function Dashboard() {
  const { cities, add, remove, reset } = useMonitoredCities();
  const { data, airFailed, retry } = useConditions(cities);
  const [mapMode, setMapMode] = useState<MapMode>("compound");
  const [sort, setSort] = useState<Sort>("compound");
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  const loaded = cities.flatMap((city) => {
    const s = data[cityKey(city)];
    return ok(s) ? [{ city, c: s }] : [];
  });
  const failed = cities.length > 0 && cities.every((city) => data[cityKey(city)] instanceof Error);
  const pending = loaded.length === 0 && !failed;

  const hot = loaded.filter(({ c }) => isElevated(c.days[0].risk));
  const smoggy = loaded.filter(({ c }) => (c.now.air?.aqi ?? 0) >= UNHEALTHY_AQI);
  const compoundToday = loaded.filter(({ c }) =>
    c.hours.some((h) => h.time.startsWith(c.days[0].date) && h.air && isCompoundEvent(h.wbgt, h.air.aqi)),
  );
  const worst = loaded.reduce<{ city: City; score: number } | null>((best, { city, c }) => {
    const s = c.days[0].maxScore;
    return s != null && (!best || s > best.score) ? { city, score: s } : best;
  }, null);

  const monitored = useMemo(() => new Set(cities.map(cityKey)), [cities]);
  const q = filter.trim().toLowerCase();
  const sorted = useMemo(() => {
    const value = SORTS[sort].value;
    const score = (city: City) => {
      const s = data[cityKey(city)];
      return ok(s) ? value(s) : -2;
    };
    return cities
      .filter((c) => !q || `${c.name} ${c.country}`.toLowerCase().includes(q))
      .sort((a, b) => score(b) - score(a));
  }, [cities, data, sort, q]);
  const visible = showAll || q ? sorted : sorted.slice(0, PAGE);
  const isDefaultList = cities.length === WORLD_CITIES.length && cities.every((c, i) => cityKey(c) === cityKey(WORLD_CITIES[i]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Is it safe to be outside?</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Live heat stress, air quality and UV for {cities.length} cities, combined into one compound health risk
            score. Heat and polluted air together are more dangerous than either alone — HeatSignal watches for both.
          </p>
        </div>
        <AddCityDialog onAdd={add} monitored={monitored} />
      </div>

      {/* Stats: a swipeable strip on phones, a grid on larger screens. */}
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        <StatTile label="Cities monitored" sub={pending ? "Loading…" : `${loaded.length} with live data`}>
          <CountUp value={cities.length} />
        </StatTile>
        <StatTile
          label="High+ heat today"
          color={hot.length ? RISK_COLORS.High : undefined}
          sub={pending ? "Loading…" : `≈ ${people(hot).toLocaleString("en")} M people`}
        >
          {pending ? "–" : <CountUp value={hot.length} />}
        </StatTile>
        <StatTile
          label="Unhealthy+ air now"
          color={smoggy.length ? aqiBand(UNHEALTHY_AQI).color : undefined}
          sub={airFailed ? "Air-quality feed unavailable" : pending ? "Loading…" : `≈ ${people(smoggy).toLocaleString("en")} M people`}
        >
          {pending || airFailed ? "–" : <CountUp value={smoggy.length} />}
        </StatTile>
        <StatTile
          label="Heat + bad air together"
          color={compoundToday.length ? COMPOUND_BANDS[3].color : undefined}
          sub={pending ? "Loading…" : "cities with a compound event today"}
        >
          {pending || airFailed ? "–" : <CountUp value={compoundToday.length} />}
        </StatTile>
        <StatTile
          label="Highest compound risk today"
          color={worst ? compoundBand(worst.score).color : undefined}
          sub={worst ? `${worst.city.name} · ${compoundBand(worst.score).level}` : pending ? "Loading…" : undefined}
        >
          {worst ? <><CountUp value={worst.score} /><span className="text-base text-muted-foreground">/100</span></> : "–"}
        </StatTile>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={mapMode} onValueChange={(v) => setMapMode(v as MapMode)}>
            <TabsList aria-label="Map layer">
              <TabsTrigger value="compound">Compound risk</TabsTrigger>
              <TabsTrigger value="heat">Heat</TabsTrigger>
              <TabsTrigger value="air">Air quality</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {mapMode === "compound" &&
              COMPOUND_BANDS.map((b) => (
                <span key={b.level} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                  {b.level}
                </span>
              ))}
            {mapMode === "heat" &&
              RISK_BANDS.map((b, i) => (
                <span key={b.level} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                  {b.level} {i === 0 ? "< 27" : i === RISK_BANDS.length - 1 ? `≥ ${b.min}` : `${b.min}–${RISK_BANDS[i + 1].min}`} °C
                </span>
              ))}
            {mapMode === "air" &&
              AQI_BANDS.map((b) => (
                <span key={b.label} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                  {b.label}
                </span>
              ))}
          </div>
        </div>
        <WeatherMap cities={cities} data={data} mode={mapMode} />
        <p className="text-xs text-muted-foreground">
          {mapMode === "compound"
            ? "Colour and size: today’s peak compound score (heat + air quality + UV)."
            : mapMode === "heat"
              ? "Colour: today’s peak heat stress (WBGT)."
              : "Colour: US Air Quality Index right now."}{" "}
          Click a city for details.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Monitored cities</h2>
            <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <TabsList aria-label="Sort cities by">
                {Object.entries(SORTS).map(([k, s]) => <TabsTrigger key={k} value={k}>{s.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Filter monitored cities"
              placeholder="Filter cities…"
              className="pl-9"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {failed ? (
          <ErrorState message="Couldn’t load weather data." onRetry={retry} />
        ) : cities.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <p>No cities monitored.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
              Restore the {WORLD_CITIES.length} default cities
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No monitored city matches “{filter}”. Use Add City to search the whole world.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((city, i) => (
              <CityCard
                key={cityKey(city)}
                index={i}
                city={city}
                state={data[cityKey(city)]}
                onRetry={retry}
                onRemove={() => remove(city)}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!q && sorted.length > PAGE && (
            <Button variant="outline" onClick={() => setShowAll(!showAll)}>
              {showAll ? `Show top ${PAGE}` : `Show all ${sorted.length} cities`}
            </Button>
          )}
          {!isDefaultList && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset to the {WORLD_CITIES.length} default cities
            </Button>
          )}
          {!pending && !airFailed && smoggy.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Worst air now: {smoggy.sort((a, b) => b.c.now.air!.aqi - a.c.now.air!.aqi)[0].city.name}, AQI{" "}
              {formatAqi(smoggy[0].c.now.air!.aqi)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
