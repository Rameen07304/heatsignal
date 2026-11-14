"use client";

import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog } from "@/components/alert-dialog";
import { RiskBadge } from "@/components/risk-badge";
import { cityHref, type City } from "@/lib/cities";
import { RISK_COLORS } from "@/lib/risk";
import { formatDay } from "@/lib/utils";
import type { DailySummary, Forecast } from "@/lib/weather";

/** 7 bars, one per day: height = daily max WBGT, colour = risk level. */
function RiskSparkline({ daily }: { daily: DailySummary[] }) {
  const values = daily.map((d) => d.maxWbgt);
  const lo = Math.min(...values) - 2;
  const span = Math.max(...values) - lo || 1;
  return (
    <div>
      <div className="flex h-10 items-end gap-1" role="img" aria-label="7-day forecast of daily maximum WBGT">
        {daily.map((d) => (
          <div
            key={d.date}
            title={`${formatDay(d.date)}: ${d.maxWbgt.toFixed(1)} °C WBGT — ${d.risk}`}
            className="flex-1 rounded-sm"
            style={{ height: `${((d.maxWbgt - lo) / span) * 100}%`, backgroundColor: RISK_COLORS[d.risk] }}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">7-day max WBGT</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

interface Props {
  city: City;
  /** undefined while loading */
  forecast?: Forecast | Error;
  onRemove: () => void;
  onRetry: () => void;
}

export function CityCard({ city, forecast, onRemove, onRetry }: Props) {
  const ok = forecast && !(forecast instanceof Error) ? forecast : null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate">{city.name}</CardTitle>
          <CardDescription className="truncate">{city.country}</CardDescription>
        </div>
        <div className="flex items-center gap-1">
          {ok && <RiskBadge level={ok.current.risk} />}
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Stop monitoring ${city.name}`}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {forecast === undefined && (
          <>
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        )}
        {forecast instanceof Error && (
          <div role="alert" className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Couldn’t load weather data.
            </p>
            <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
          </div>
        )}
        {ok && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Temp" value={`${ok.current.temp.toFixed(1)}°`} />
              <Stat label="Humidity" value={`${ok.current.rh.toFixed(0)}%`} />
              <Stat label="WBGT" value={`${ok.current.wbgt.toFixed(1)}°`} />
            </div>
            <RiskSparkline daily={ok.daily} />
          </>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={cityHref(city)}>View Details</Link>
        </Button>
        {ok && <AlertDialog city={city} current={ok.current} size="sm" className="flex-1" />}
      </CardFooter>
    </Card>
  );
}
