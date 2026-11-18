"use client";

import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog } from "@/components/alert";
import { GaugeRing } from "@/components/gauge-ring";
import { aqiBand, formatAqi } from "@/lib/air";
import { cityHref, type City } from "@/lib/cities";
import { nextHours, type Conditions } from "@/lib/conditions";
import { compoundBand, RISK_COLORS, uvBand } from "@/lib/risk";
import type { CityState } from "@/lib/use-cities";

/** Next 24 hours as bars: height and colour = compound score (heat risk where air data is missing). */
function Sparkline24h({ c }: { c: Conditions }) {
  const hours = nextHours(c, 24);
  return (
    <div>
      <div className="flex h-9 items-end gap-px" role="img" aria-label="Compound risk over the next 24 hours">
        {hours.map((h) => {
          const color = h.score != null ? compoundBand(h.score).color : RISK_COLORS[h.risk];
          const height = h.score != null ? h.score : (h.wbgt / 40) * 100;
          return (
            <div
              key={h.time}
              title={`${h.time.slice(11, 16)} · ${h.score != null ? `compound ${h.score}/100 (${h.level})` : `WBGT ${h.wbgt.toFixed(1)} °C`}`}
              className="flex-1 rounded-[2px]"
              style={{ height: `${Math.max(height, 6)}%`, backgroundColor: color }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>Now</span>
        <span>Compound risk, next 24 h</span>
        <span>+24 h</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

interface Props {
  city: City;
  state: CityState;
  onRemove: () => void;
  onRetry: () => void;
}

export function CityCard({ city, state, onRemove, onRetry }: Props) {
  const c = state && !(state instanceof Error) ? state : null;
  const now = c?.now;
  const air = now?.air;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="truncate">{city.name}</CardTitle>
          <CardDescription className="truncate">{city.country}</CardDescription>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Stop monitoring ${city.name}`}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {state === undefined && (
          <>
            <div className="flex justify-around">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-[76px] rounded-full" />)}
            </div>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </>
        )}
        {state instanceof Error && (
          <div role="alert" className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Couldn’t load data.
            </p>
            <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
          </div>
        )}
        {now && c && (
          <>
            <div className="flex justify-around gap-1">
              <GaugeRing
                label="Heat"
                fraction={now.wbgt / 40}
                color={RISK_COLORS[now.risk]}
                value={now.wbgt.toFixed(1)}
                unit="°C WBGT"
                sub={now.risk}
              />
              {air ? (
                <GaugeRing
                  label="Air"
                  fraction={air.aqi / 300}
                  color={aqiBand(air.aqi).color}
                  value={formatAqi(air.aqi)}
                  unit="US AQI"
                  sub={aqiBand(air.aqi).label.replace(" for sensitive groups", " (sens.)")}
                />
              ) : (
                <GaugeRing label="Air" fraction={0} color="#64748b" value="–" sub="No data" />
              )}
              {now.score != null ? (
                <GaugeRing
                  label="Combined"
                  fraction={now.score / 100}
                  color={compoundBand(now.score).color}
                  value={String(now.score)}
                  unit="/ 100"
                  sub={now.level ?? undefined}
                />
              ) : (
                <GaugeRing label="Combined" fraction={0} color="#64748b" value="–" sub="No air data" />
              )}
            </div>

            {now.score != null && (
              <p className="text-center text-sm font-medium">{compoundBand(now.score).description}</p>
            )}

            <div className="grid grid-cols-4 gap-2 rounded-lg bg-muted/50 p-2">
              <Stat label="Temp" value={`${now.temp.toFixed(1)}°`} />
              <Stat label="Humidity" value={`${now.rh.toFixed(0)}%`} />
              <Stat label="Wind" value={`${now.wind.toFixed(0)} km/h`} />
              <Stat label="UV" value={air ? `${air.uv.toFixed(0)} ${uvBand(air.uv).label}` : "–"} />
            </div>

            {air && (
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full border px-2 py-0.5 tabular-nums">PM2.5 {air.pm25.toFixed(0)} µg/m³</span>
                <span className="rounded-full border px-2 py-0.5 tabular-nums">O₃ {air.o3.toFixed(0)} µg/m³</span>
                {air.dust > 50 && <span className="rounded-full border px-2 py-0.5 tabular-nums">Dust {air.dust.toFixed(0)} µg/m³</span>}
              </div>
            )}

            <Sparkline24h c={c} />
          </>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={cityHref(city)}>Details</Link>
        </Button>
        {now && <AlertDialog city={city} hour={now} size="sm" className="flex-1" />}
      </CardFooter>
    </Card>
  );
}
