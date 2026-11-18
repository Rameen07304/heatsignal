"use client";

import { use, useState } from "react";
import { HardHat } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { AqiBadge, CompoundBadge } from "@/components/risk-badge";
import { ShiftPlanner } from "@/components/shift-planner";
import { SiteCard } from "@/components/site-card";
import { WorkPlanner } from "@/components/work-planner";
import { UNHEALTHY_AQI, fetchAir, formatAqi } from "@/lib/air";
import { WORLD_CITIES, cityKey, type City } from "@/lib/cities";
import { buildConditions } from "@/lib/conditions";
import { useAsync } from "@/lib/use-async";
import { useCities } from "@/lib/use-cities";
import { fetchForecast } from "@/lib/weather";
import { INTENSITIES, heatFlag, workRegimen } from "@/lib/work-rest";

interface Props {
  searchParams: Promise<{ lat?: string; lon?: string; name?: string; country?: string }>;
}

const DEFAULT = WORLD_CITIES.find((c) => c.name === "Abu Dhabi")!;

function cityFromUrl(p: Awaited<Props["searchParams"]>): City | null {
  const lat = Number(p.lat);
  const lon = Number(p.lon);
  if (!p.lat || !p.lon || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { name: p.name?.slice(0, 100) || `${lat}, ${lon}`, country: p.country?.slice(0, 100) ?? "", lat, lon };
}

export default function WorkerSafetyPage(props: Props) {
  const searchParams = use(props.searchParams);
  const { cities } = useCities();
  const fromUrl = cityFromUrl(searchParams);
  const [selected, setSelected] = useState<City>(fromUrl ?? DEFAULT);
  const options = [...cities].sort((a, b) => a.name.localeCompare(b.name));
  if (!options.some((c) => cityKey(c) === cityKey(selected))) options.unshift(selected);

  const result = useAsync(async () => {
    const [forecast, air] = await Promise.all([
      fetchForecast(selected.lat, selected.lon),
      fetchAir(selected.lat, selected.lon).catch(() => undefined),
    ]);
    return buildConditions(forecast, air);
  }, [selected.lat, selected.lon]);
  const c = result.data;
  const now = c?.now;
  const today = c ? c.hours.filter((h) => h.time.startsWith(c.days[0].date)) : [];

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <HardHat className="h-7 w-7 text-primary" /> Worker safety
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            For site supervisors and employers: when outdoor work is safe, how long breaks must be, how much water
            to provide, and a notice to print and post on site. Built for construction, farming and delivery work
            in the Gulf and South Asia.
          </p>
        </div>
        <label className="text-xs text-muted-foreground">
          <span className="mb-1 block">Work site</span>
          <select
            className="h-10 w-64 rounded-md border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={cityKey(selected)}
            onChange={(e) => setSelected(options.find((o) => cityKey(o) === e.target.value) ?? DEFAULT)}
          >
            {options.map((o) => (
              <option key={cityKey(o)} value={cityKey(o)}>{o.name}{o.country ? `, ${o.country}` : ""}</option>
            ))}
          </select>
        </label>
      </div>

      {result.loading && (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      )}
      {result.error && <ErrorState message="Couldn’t load the forecast for this site." onRetry={result.retry} />}

      {c && now && (
        <>
          <Card className="no-print">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Right now in {selected.name}</CardTitle>
                <CardDescription>
                  WBGT {now.wbgt.toFixed(1)} °C at {now.time.slice(11, 16)} local time · {now.temp.toFixed(1)} °C,{" "}
                  {now.rh.toFixed(0)}% humidity
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {now.air && <AqiBadge aqi={now.air.aqi} />}
                {now.score != null && <CompoundBadge score={now.score} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                {INTENSITIES.map((i) => {
                  const r = workRegimen(now.wbgt, i.key);
                  const flag = heatFlag(r);
                  return (
                    <div key={i.key} className="rounded-lg border p-3" style={{ borderColor: `${r.color}80`, backgroundColor: `${r.color}14` }}>
                      <div className="text-xs font-medium text-muted-foreground">{i.label} work</div>
                      <div className="mt-1 flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />{r.label}</div>
                      <div className="text-xs text-muted-foreground">{flag.name} · e.g. {i.examples}</div>
                    </div>
                  );
                })}
              </div>
              {now.air && now.air.aqi >= UNHEALTHY_AQI && (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
                  <b>Air quality is unhealthy (AQI {formatAqi(now.air.aqi)}).</b> Issue N95 masks to everyone working
                  outdoors and cut heavy exertion, whatever the heat level.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Heat limits: ACGIH work–rest values (OSHA Technical Manual). WBGT up to{" "}
                26.7 °C allows continuous moderate work; above 31.1 °C
                moderate work must stop.
              </p>
            </CardContent>
          </Card>

          <div className="no-print space-y-6">
            <WorkPlanner hourly={c.hours} now={now.time.slice(0, 13)} initialIntensity="heavy" />
            <ShiftPlanner hours={c.hours} now={now.time.slice(0, 13)} />
          </div>

          <div className="space-y-2">
            <div className="no-print">
              <h2 className="text-lg font-semibold tracking-tight">Site notice</h2>
              <p className="text-sm text-muted-foreground">Print it and post it where workers take their breaks.</p>
            </div>
            <SiteCard city={selected} now={now} today={today} />
          </div>
        </>
      )}
    </div>
  );
}
