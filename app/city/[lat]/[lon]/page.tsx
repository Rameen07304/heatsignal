"use client";

import Link from "next/link";
import { ArrowLeft, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertSection } from "@/components/alert";
import { CompoundChart } from "@/components/compound-chart";
import { ConditionsPanel } from "@/components/conditions-panel";
import { ErrorState } from "@/components/error-state";
import { ForecastTable } from "@/components/forecast-table";
import { CompoundBadge, RiskBadge } from "@/components/risk-badge";
import { VulnerableGroups } from "@/components/vulnerable-groups";
import { WorkPlanner } from "@/components/work-planner";
import { fetchAir } from "@/lib/air";
import { buildConditions, type CombinedHour } from "@/lib/conditions";
import { compoundBand } from "@/lib/risk";
import { useAsync } from "@/lib/use-async";
import { formatDay } from "@/lib/utils";
import { fetchForecast, fetchSeasonalAverage, type DailySummary } from "@/lib/weather";

interface Props {
  params: { lat: string; lon: string };
  searchParams: { name?: string; country?: string };
}

function Delta({ label, today, average }: { label: string; today: number; average: number }) {
  const diff = today - average;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums">{today.toFixed(1)} °C</div>
      <div className="text-sm text-muted-foreground">
        Seasonal average {average.toFixed(1)} °C ·{" "}
        <span className={diff > 0 ? "font-medium text-orange-500" : "font-medium text-sky-500"}>
          {diff > 0 ? "+" : "−"}
          {Math.abs(diff).toFixed(1)} °C
        </span>
      </div>
    </div>
  );
}

function HistoricalComparison({ lat, lon, today }: { lat: number; lon: number; today: DailySummary }) {
  const history = useAsync(() => fetchSeasonalAverage(lat, lon, today.date), [lat, lon, today.date]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compared with a normal year</CardTitle>
        <CardDescription>Today’s forecast peak vs. the same two-week window over the previous 5 years.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.loading && <Skeleton className="h-20 w-full" />}
        {history.error && (
          <p className="text-sm text-muted-foreground">Historical data is not available for this location right now.</p>
        )}
        {history.data && (
          <div className="grid gap-6 sm:grid-cols-2">
            <Delta label="Max temperature today" today={today.maxTemp} average={history.data.avgMaxTemp} />
            <Delta label="Max WBGT today" today={today.maxWbgt} average={history.data.avgMaxWbgt} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CityPage({ params, searchParams }: Props) {
  const lat = Number(params.lat);
  const lon = Number(params.lon);
  const valid = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const city = {
    name: searchParams.name?.slice(0, 100) || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    country: searchParams.country?.slice(0, 100) ?? "",
    lat,
    lon,
  };

  const result = useAsync(async () => {
    if (!valid) throw new Error("Invalid coordinates");
    // Air quality is an extra layer: if it fails the page shows heat only.
    const [forecast, air] = await Promise.all([fetchForecast(lat, lon), fetchAir(lat, lon).catch(() => undefined)]);
    return buildConditions(forecast, air);
  }, [lat, lon]);
  const c = result.data;

  const today = c?.days[0];
  const todayHours = c?.hours.filter((h) => h.time.startsWith(today!.date)) ?? [];
  const peak = todayHours.reduce<CombinedHour | undefined>(
    (p, h) => (!p || (h.score ?? h.wbgt) > (p.score ?? p.wbgt) ? h : p),
    undefined,
  );
  const minTemp = todayHours.length ? Math.min(...todayHours.map((h) => h.temp)) : 0;

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{valid ? city.name : "Unknown location"}</h1>
          <p className="text-sm text-muted-foreground">
            {[city.country, valid && `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`, c && `Local time ${formatDay(c.now.time)}, ${c.now.time.slice(11, 16)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {c && (
          <div className="flex flex-wrap items-center gap-3">
            {c.now.score != null ? (
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Compound risk now</div>
                <CompoundBadge score={c.now.score} className="mt-1 px-3 py-1.5 text-base" />
                <div className="mt-1 text-xs text-muted-foreground">{compoundBand(c.now.score).description}</div>
              </div>
            ) : (
              <RiskBadge level={c.now.risk} className="px-3 py-1.5 text-base" />
            )}
          </div>
        )}
      </div>

      {result.loading && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-60 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      )}

      {result.error && (
        <ErrorState
          message={valid ? "Couldn’t load the forecast for this location." : "These coordinates aren’t valid."}
          onRetry={result.retry}
        />
      )}

      {c && today && (
        <>
          <ConditionsPanel now={c.now} today={today} minTemp={minTemp} />

          <Card>
            <CardHeader>
              <CardTitle>Compound risk timeline</CardTitle>
              <CardDescription>
                7 days, hour by hour: heat stress (WBGT), air quality (US AQI) and the combined score. Shaded bands are
                the compound-risk levels.{!c.hasAir && " Air-quality data is not available here, so only heat is shown."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompoundChart
                nowTime={c.now.time}
                data={c.hours.map((h) => ({ time: h.time, wbgt: h.wbgt, aqi: h.air?.aqi, score: h.score ?? undefined }))}
              />
            </CardContent>
          </Card>

          <VulnerableGroups hour={c.now} peak={peak} />

          <WorkPlanner hourly={c.hours} now={c.now.time.slice(0, 13)} />
          <div className="-mt-3 flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/worker-safety?lat=${lat}&lon=${lon}&name=${encodeURIComponent(city.name)}&country=${encodeURIComponent(city.country)}`}>
                <HardHat /> Plan a work shift and print a site notice
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily forecast</CardTitle>
              <CardDescription>Air-quality forecasts reach about 5 days ahead; later days show heat only.</CardDescription>
            </CardHeader>
            <CardContent>
              <ForecastTable daily={c.days} />
            </CardContent>
          </Card>

          <AlertSection city={city} hour={c.now} />

          <HistoricalComparison lat={lat} lon={lon} today={today} />
        </>
      )}
    </div>
  );
}
