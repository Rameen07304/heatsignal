"use client";

import Link from "next/link";
import { ArrowLeft, Droplets, Sun, Thermometer, Wind } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog } from "@/components/alert-dialog";
import { AqiBadge } from "@/components/aqi-badge";
import { aqiBand, fetchAir } from "@/lib/air";
import { ErrorState } from "@/components/error-state";
import { ForecastTable } from "@/components/forecast-table";
import { RiskBadge } from "@/components/risk-badge";
import { WbgtChart } from "@/components/wbgt-chart";
import { WorkPlanner } from "@/components/work-planner";
import { RISK_COLORS } from "@/lib/risk";
import { useAsync } from "@/lib/use-async";
import { fetchForecast, fetchSeasonalAverage, type DailySummary } from "@/lib/weather";

/** WHO 2021 air quality guideline for PM2.5, 24-hour mean (µg/m³). */
const WHO_PM25_DAILY = 15;

interface Props {
  params:{ lat: string; lon: string };
  searchParams: { name?: string; country?: string };
}

function Metric({ icon: Icon, label, value }: { icon: typeof Sun; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
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
        <CardTitle>Historical comparison</CardTitle>
        <CardDescription>
          Today’s forecast peak vs. the same two-week window over the previous 5 years.
        </CardDescription>
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

  const forecast = useAsync(
    () => (valid ? fetchForecast(lat, lon) : Promise.reject(new Error("Invalid coordinates"))),
    [lat, lon],
  );
  const data = forecast.data;
  // Smog is an extra layer: if this fails the page simply shows heat only.
  const air = useAsync(
    () => (valid ? fetchAir(lat, lon) : Promise.reject(new Error("Invalid coordinates"))),
    [lat, lon],
  );
  const airNow = air.data?.now;

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{valid ? city.name : "Unknown location"}</h1>
          <p className="text-sm text-muted-foreground">
            {[city.country, valid && `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`].filter(Boolean).join(" · ")}
          </p>
        </div>
        {data && <AlertDialog city={city} current={data.current} air={airNow} />}
      </div>

      {forecast.loading && (
        <div className="space-y-6">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      )}

      {forecast.error && (
        <ErrorState
          message={valid ? "Couldn’t load the forecast for this location." : "These coordinates aren’t valid."}
          onRetry={forecast.retry}
        />
      )}

      {data && (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Current conditions</CardTitle>
                <CardDescription>Local time {data.current.time.slice(11, 16)}</CardDescription>
              </div>
              <RiskBadge level={data.current.risk} className="px-3 py-1 text-sm" />
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">WBGT</div>
                <div className="text-5xl font-bold tabular-nums" style={{ color: RISK_COLORS[data.current.risk] }}>
                  {data.current.wbgt.toFixed(1)}°
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric icon={Thermometer} label="Temperature" value={`${data.current.temp.toFixed(1)} °C`} />
                <Metric icon={Droplets} label="Humidity" value={`${data.current.rh.toFixed(0)} %`} />
                <Metric icon={Wind} label="Wind" value={`${data.current.wind.toFixed(0)} km/h`} />
                <Metric icon={Sun} label="Solar radiation" value={`${data.current.solar.toFixed(0)} W/m²`} />
              </div>
            </CardContent>
          </Card>

          {airNow && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Air quality (smog)</CardTitle>
                  <CardDescription>Fine-particle pollution right now</CardDescription>
                </div>
                <AqiBadge aqi={airNow.aqi} className="px-3 py-1 text-sm" />
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">US AQI</div>
                  <div className="text-5xl font-bold tabular-nums" style={{ color: aqiBand(airNow.aqi).color }}>
                    {Math.round(airNow.aqi)}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p>{aqiBand(airNow.aqi).advice}</p>
                  <p className="text-muted-foreground">
                    PM2.5 is {airNow.pm25.toFixed(0)} µg/m³
                    {airNow.pm25 > WHO_PM25_DAILY &&
                      ` — ${(airNow.pm25 / WHO_PM25_DAILY).toFixed(1)}× the WHO daily guideline of ${WHO_PM25_DAILY} µg/m³`}
                    .
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <WorkPlanner hourly={data.hourly} now={data.current.time.slice(0, 13)} aqi={air.data?.hourly} />

          <Card>
            <CardHeader>
              <CardTitle>7-day hourly WBGT</CardTitle>
              <CardDescription>Shaded bands show Low, Moderate, High and Extreme risk zones.</CardDescription>
            </CardHeader>
            <CardContent>
              <WbgtChart data={data.hourly.map(({ time, wbgt }) => ({ time, wbgt }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastTable daily={data.daily} />
            </CardContent>
          </Card>

          <HistoricalComparison lat={lat} lon={lon} today={data.daily[0]} />
        </>
      )}
    </div>
  );
}
