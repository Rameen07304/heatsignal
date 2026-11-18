"use client";

import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CityPicker } from "@/components/city-picker";
import { ErrorState } from "@/components/error-state";
import { WORLD_CITIES, type City } from "@/lib/cities";
import { useT } from "@/lib/i18n";
import { RISK_COLORS } from "@/lib/risk";
import { TREND_COUNT, allSeasons, linearFit, type SeasonStats } from "@/lib/trends";
import { useAsync } from "@/lib/use-async";
import { formatDay } from "@/lib/utils";

const AXIS = "hsl(var(--muted-foreground))";
const TOOLTIP = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };

function Summary({ city, s }: { city: City; s: SeasonStats[] }) {
  const first = s[0];
  const last = s[s.length - 1];
  const years = s.map((x) => x.year);
  const days = linearFit(years, s.map((x) => x.extremeDays));
  const wbgt = linearFit(years, s.map((x) => x.avgMaxWbgt));
  const projected = Math.round(Math.min(Math.max(days.at(2030), 0), last.days));
  const change =
    first.extremeDays > 0
      ? `${last.extremeDays >= first.extremeDays ? "an increase" : "a decrease"} of ${Math.abs(Math.round(((last.extremeDays - first.extremeDays) / first.extremeDays) * 100))}% in extreme heat days`
      : last.extremeDays > 0
        ? `${last.extremeDays} extreme heat days, up from none`
        : "no extreme heat days in either summer";
  const rise = last.avgMaxWbgt - first.avgMaxWbgt;

  return (
    <Card className="border-primary/40">
      <CardHeader><CardTitle>{city.name} risk profile</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm leading-relaxed">
        <p>• Between {first.label} and {last.label}, {city.name} saw {change} (WBGT ≥ 33 °C: {first.extremeDays} → {last.extremeDays} days).</p>
        <p>• The average daily peak heat stress {rise >= 0 ? "rose" : "fell"} by <b>{Math.abs(rise).toFixed(1)} °C WBGT</b> (trend {wbgt.slope >= 0 ? "+" : "−"}{Math.abs(wbgt.slope).toFixed(2)} °C a year).</p>
        <p>• If the {TREND_COUNT}-year trend simply continued, {city.name} would see about <b>{projected} extreme days</b> in the summer of 2030.</p>
        <p className="text-xs text-muted-foreground">
          Five summers are too few to separate a climate trend from normal year-to-year swings (El Niño, monsoon timing). Treat the
          projection as an illustration, not a forecast; climate studies use 30 years or more.
        </p>
      </CardContent>
    </Card>
  );
}

export default function TrendsPage() {
  const { t } = useT();
  const [city, setCity] = useState<City>(WORLD_CITIES.find((c) => c.name === "Karachi")!);
  const result = useAsync(() => allSeasons(city), [city.lat, city.lon]);
  const s = result.data;
  const fitDays = s ? linearFit(s.map((x) => x.year), s.map((x) => x.extremeDays)) : null;
  const fitWbgt = s ? linearFit(s.map((x) => x.year), s.map((x) => x.avgMaxWbgt)) : null;
  const rows = s?.map((x) => ({ ...x, trend: +fitDays!.at(x.year).toFixed(1), wbgtTrend: +fitWbgt!.at(x.year).toFixed(2) }));
  const warming = (fitWbgt?.slope ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("trends")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            How the hottest season has changed over the last {TREND_COUNT} years, from archived weather (ERA5 via
            Open-Meteo). June–August for the northern hemisphere, December–February for the southern.
          </p>
        </div>
        <CityPicker value={city} onChange={setCity} label="City" />
      </div>

      {result.loading && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Loading {TREND_COUNT} summers of hourly data — the first time takes a few seconds; after that it’s instant.</p>
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      )}
      {result.error && <ErrorState message="Couldn’t load the archive (the free service may be busy — try again in a minute)." onRetry={result.retry} />}

      {s && rows && (
        <>
          <Summary city={city} s={s} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Extreme heat days per summer</CardTitle>
                <CardDescription>Days with peak WBGT ≥ 33 °C, with a straight-line trend.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP} formatter={(v, n) => [v, n === "trend" ? "Trend" : "Extreme days"]} />
                      <Bar dataKey="extremeDays" fill={RISK_COLORS.Extreme} radius={[4, 4, 0, 0]} />
                      <Line dataKey="trend" stroke="hsl(var(--foreground))" strokeDasharray="5 4" dot={false} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Average peak heat stress</CardTitle>
                <CardDescription>
                  Mean daily max WBGT each summer{warming ? " — trending upward" : ""}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} tickLine={false} />
                      <YAxis domain={["dataMin - 1", "dataMax + 1"]} tickFormatter={(v: number) => v.toFixed(0)} unit="°" tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP} formatter={(v, n) => [`${Number(v).toFixed(1)} °C`, n === "wbgtTrend" ? "Trend" : "Avg peak WBGT"]} />
                      <Line dataKey="avgMaxWbgt" stroke={warming ? RISK_COLORS.Extreme : "#38bdf8"} strokeWidth={3} dot={{ r: 4 }} />
                      <Line dataKey="wbgtTrend" stroke="hsl(var(--foreground))" strokeDasharray="5 4" dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Year by year</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Summer</TableHead>
                    <TableHead className="text-right">Avg max temp</TableHead>
                    <TableHead className="text-right">Avg max WBGT</TableHead>
                    <TableHead className="text-right">High days (≥ 30)</TableHead>
                    <TableHead className="text-right">Extreme days (≥ 33)</TableHead>
                    <TableHead>Hottest day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.map((x) => (
                    <TableRow key={x.year}>
                      <TableCell className="font-medium">{x.label}</TableCell>
                      <TableCell className="text-right">{x.avgMaxTemp.toFixed(1)} °C</TableCell>
                      <TableCell className="text-right">{x.avgMaxWbgt.toFixed(1)} °C</TableCell>
                      <TableCell className="text-right">{x.highDays} / {x.days}</TableCell>
                      <TableCell className="text-right font-semibold" style={{ color: x.extremeDays ? "#b91c1c" : undefined }}>{x.extremeDays}</TableCell>
                      <TableCell>{formatDay(x.hottest.date)} {x.hottest.date.slice(0, 4)} · {x.hottest.wbgt.toFixed(1)} °C</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
