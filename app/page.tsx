"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FileDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CityCard } from "@/components/city-card";
import { AddCityDialog } from "@/components/city-search";
import { CountUp } from "@/components/count-up";
import { ErrorState } from "@/components/error-state";
import { Leaderboard } from "@/components/leaderboard";
import { UpcomingRisks } from "@/components/upcoming-risks";
import type { MapMode } from "@/components/weather-map";
import { AQI_BANDS, aqiBand, formatAqi } from "@/lib/air";
import { WORLD_CITIES, cityKey, type City } from "@/lib/cities";
import type { Conditions } from "@/lib/conditions";
import { useT } from "@/lib/i18n";
import { globalReport } from "@/lib/report";
import { COMPOUND_BANDS, RISK_BANDS, RISK_COLORS, classifyRisk, compoundBand } from "@/lib/risk";
import { CRITICAL_SCORE, isRising } from "@/lib/risk-forecast";
import { ok, useCities } from "@/lib/use-cities";

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

function StatTile({ icon, label, children, sub, color }: { icon: string; label: string; children: React.ReactNode; sub?: string; color?: string }) {
  return (
    <Card className="min-w-[200px] shrink-0 snap-start sm:min-w-0">
      <CardContent className="p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span aria-hidden="true">{icon}</span> {label}
        </div>
        <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums" style={{ color }}>{children}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

const people = (list: { city: City }[]) => Math.round(list.reduce((s, { city }) => s + (city.pop ?? 0), 0));

export default function Dashboard() {
  const { t } = useT();
  const { cities, add, remove, reset, data, airFailed, retry, updatedAt } = useCities();
  const [view, setView] = useState<"map" | "rankings">("map");
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

  const critical = loaded.filter(({ c }) => (c.days[0].maxScore ?? 0) >= CRITICAL_SCORE);
  const rising = loaded.filter(({ c }) => isRising(c));
  const hottest = loaded.reduce<{ city: City; c: Conditions } | null>((b, r) => (!b || r.c.days[0].maxWbgt > b.c.days[0].maxWbgt ? r : b), null);
  const worstAir = loaded.reduce<{ city: City; c: Conditions } | null>(
    (b, r) => (r.c.now.air && (!b || r.c.now.air.aqi > b.c.now.air!.aqi) ? r : b),
    null,
  );

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
          <h1 className="text-3xl font-bold tracking-tight">{t("isItSafe")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Live heat stress, air quality and UV for {cities.length} cities, combined into one compound health risk
            score. Heat and polluted air together are more dangerous than either alone — HeatSignal watches for both.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!loaded.length} onClick={() => globalReport(loaded)}>
            <FileDown /> {t("downloadReport")}
          </Button>
          <AddCityDialog onAdd={add} monitored={monitored} />
        </div>
      </div>

      {/* Stats: a swipeable strip on phones, a grid on larger screens. */}
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        <StatTile icon="🌍" label={t("citiesMonitored")} sub={updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loading…"}>
          <CountUp value={cities.length} />
        </StatTile>
        <StatTile
          icon="🔴"
          label={t("atCritical")}
          color={critical.length ? COMPOUND_BANDS[3].color : undefined}
          sub={pending ? "Loading…" : `today’s peak ≥ ${CRITICAL_SCORE} · ≈ ${people(critical).toLocaleString("en")} M people`}
        >
          {pending || airFailed ? "–" : <CountUp value={critical.length} />}
        </StatTile>
        <StatTile
          icon="🌡️"
          label={t("highestWbgt")}
          color={hottest ? RISK_COLORS[classifyRisk(hottest.c.days[0].maxWbgt)] : undefined}
          sub={hottest ? `${hottest.city.name}, ${hottest.city.country}` : "Loading…"}
        >
          {hottest ? <><CountUp value={hottest.c.days[0].maxWbgt} decimals={1} /><span className="text-base">°C</span></> : "–"}
        </StatTile>
        <StatTile
          icon="💨"
          label={t("worstAqi")}
          color={worstAir ? aqiBand(worstAir.c.now.air!.aqi).color : undefined}
          sub={worstAir ? `${worstAir.city.name} · ${aqiBand(worstAir.c.now.air!.aqi).label}` : airFailed ? "Air-quality feed unavailable" : "Loading…"}
        >
          {worstAir ? (worstAir.c.now.air!.aqi > 500 ? "500+" : <CountUp value={Math.round(worstAir.c.now.air!.aqi)} />) : "–"}
        </StatTile>
        <StatTile
          icon="⚠️"
          label={t("risingRisks")}
          color={rising.length ? COMPOUND_BANDS[2].color : undefined}
          sub={pending ? "Loading…" : "next 48 h peak above today’s"}
        >
          {pending || airFailed ? "–" : <CountUp value={rising.length} />}
        </StatTile>
      </div>

      <div className="space-y-3">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="map">{t("map")}</TabsTrigger>
            <TabsTrigger value="rankings">{t("globalRankings")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {view === "map" ? (
          <>
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
          </>
        ) : pending ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <Leaderboard rows={loaded} />
        )}
      </div>

      <UpcomingRisks />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">{t("monitoredCities")}</h2>
            <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <TabsList aria-label="Sort cities by">
                {Object.entries(SORTS).map(([k, s]) => <TabsTrigger key={k} value={k}>{s.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input type="search" aria-label="Filter monitored cities" placeholder="Filter cities…" className="ps-9" value={filter} onChange={(e) => setFilter(e.target.value)} />
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
            No monitored city matches “{filter}”. Use {t("addCity")} to search the whole world.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((city, i) => (
              <CityCard key={cityKey(city)} index={i} city={city} state={data[cityKey(city)]} onRetry={retry} onRemove={() => remove(city)} />
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
          {worstAir && (
            <span className="text-xs text-muted-foreground">
              Highest compound score today:{" "}
              {(() => {
                const top = [...loaded].sort((a, b) => (b.c.days[0].maxScore ?? -1) - (a.c.days[0].maxScore ?? -1))[0];
                return top?.c.days[0].maxScore != null ? `${top.city.name}, ${top.c.days[0].maxScore}/100 (${compoundBand(top.c.days[0].maxScore).level})` : "–";
              })()}
              {" · "}worst air now: {worstAir.city.name}, AQI {formatAqi(worstAir.c.now.air!.aqi)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
