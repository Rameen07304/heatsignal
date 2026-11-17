"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GaugeRing } from "@/components/gauge-ring";
import { AqiBadge, CompoundBadge, RiskBadge } from "@/components/risk-badge";
import { aqiBand, formatAqi } from "@/lib/air";
import { cityHref, cityKey, type City } from "@/lib/cities";
import type { Conditions } from "@/lib/conditions";
import { CRITICAL_SCORE, TREND_ARROW, isRising, sixHourTrend } from "@/lib/risk-forecast";
import { compoundBand, isCompoundEvent, uvBand } from "@/lib/risk";

type Row = { city: City; c: Conditions };

/** One line on why a city scores high right now: its biggest contributor(s). */
export function whyDangerous({ c }: Row): string {
  const n = c.now;
  const heat = 0.45 * Math.min(n.wbgt / 40, 1);
  const air = n.air ? 0.4 * Math.min(n.air.aqi / 300, 1) : 0;
  if (n.air && isCompoundEvent(n.wbgt, n.air.aqi)) {
    return `Heat (WBGT ${n.wbgt.toFixed(1)} °C) and ${aqiBand(n.air.aqi).label.toLowerCase()} air (AQI ${formatAqi(n.air.aqi)}) at the same time.`;
  }
  if (n.air && air >= heat) return `${aqiBand(n.air.aqi).label} air: AQI ${formatAqi(n.air.aqi)}, PM2.5 ${n.air.pm25.toFixed(0)} µg/m³.`;
  const uv = n.air && n.air.uv >= 6 ? `, UV ${uvBand(n.air.uv).label.toLowerCase()}` : "";
  return `${n.risk} heat stress: WBGT ${n.wbgt.toFixed(1)} °C at ${n.temp.toFixed(0)} °C and ${n.rh.toFixed(0)}% humidity${uv}.`;
}

const COLUMNS = [
  { key: "city", label: "City", value: (r: Row) => r.city.name },
  { key: "country", label: "Country", value: (r: Row) => r.city.country },
  { key: "temp", label: "Temp", value: (r: Row) => r.c.now.temp },
  { key: "wbgt", label: "WBGT", value: (r: Row) => r.c.now.wbgt },
  { key: "aqi", label: "AQI", value: (r: Row) => r.c.now.air?.aqi ?? -1 },
  { key: "pm25", label: "PM2.5", value: (r: Row) => r.c.now.air?.pm25 ?? -1 },
  { key: "score", label: "Compound", value: (r: Row) => r.c.now.score ?? -1 },
] as const;
type SortKey = (typeof COLUMNS)[number]["key"];

const TREND_COLOR = { up: "text-red-500", flat: "text-muted-foreground", down: "text-green-500" };

export function Leaderboard({ rows }: { rows: Row[] }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "score", desc: true });
  const [filter, setFilter] = useState<"all" | "critical" | "rising">("all");
  const [q, setQ] = useState("");

  const col = COLUMNS.find((c) => c.key === sort.key)!;
  const query = q.trim().toLowerCase();
  const shown = rows
    .filter((r) => (filter === "critical" ? (r.c.now.score ?? 0) >= CRITICAL_SCORE : filter === "rising" ? isRising(r.c) : true))
    .filter((r) => !query || `${r.city.name} ${r.city.country}`.toLowerCase().includes(query))
    .sort((a, b) => {
      const x = col.value(a);
      const y = col.value(b);
      const d = typeof x === "string" ? x.localeCompare(y as string) : x - (y as number);
      return sort.desc ? -d : d;
    });
  const top3 = [...rows].sort((a, b) => (b.c.now.score ?? -1) - (a.c.now.score ?? -1)).slice(0, 3);

  const header = (key: SortKey, label: string, right?: boolean) => (
    <TableHead className={right ? "text-right" : undefined} aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : typeof col.value(rows[0]) !== "string" || key !== "city" }))}
      >
        {label}
        {sort.key === key && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Most at risk right now</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {top3.map((r, i) => (
            <Card key={cityKey(r.city)} className="animate-page-in" style={{ animationDelay: `${i * 70}ms` }}>
              <CardContent className="flex items-center gap-4 p-4">
                {r.c.now.score != null && (
                  <GaugeRing label={`#${i + 1}`} fraction={r.c.now.score / 100} color={compoundBand(r.c.now.score).color} value={String(r.c.now.score)} unit="/ 100" size={96} />
                )}
                <div className="min-w-0">
                  <Link href={cityHref(r.city)} className="text-lg font-bold hover:underline">{r.city.name}</Link>
                  <div className="text-xs text-muted-foreground">{r.city.country}</div>
                  {r.c.now.score != null && <CompoundBadge score={r.c.now.score} className="mt-1" />}
                  <p className="mt-2 text-sm">{whyDangerous(r)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All cities</TabsTrigger>
            <TabsTrigger value="critical">Critical only</TabsTrigger>
            <TabsTrigger value="rising">Rising only</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input type="search" aria-label="Filter by city or country" placeholder="City or country…" className="ps-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No cities match.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  {header("city", "City")}
                  {header("country", "Country")}
                  {header("temp", "Temp", true)}
                  {header("wbgt", "WBGT", true)}
                  <TableHead>Heat risk</TableHead>
                  {header("aqi", "AQI", true)}
                  <TableHead>Air risk</TableHead>
                  {header("pm25", "PM2.5", true)}
                  {header("score", "Compound")}
                  <TableHead title="Compound score now vs. 6 hours ago">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r, i) => {
                  const n = r.c.now;
                  const trend = sixHourTrend(r.c);
                  return (
                    <TableRow key={cityKey(r.city)}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell><Link href={cityHref(r.city)} className="font-medium hover:underline">{r.city.name}</Link></TableCell>
                      <TableCell className="text-muted-foreground">{r.city.country}</TableCell>
                      <TableCell className="text-right">{n.temp.toFixed(1)}°</TableCell>
                      <TableCell className="text-right font-medium">{n.wbgt.toFixed(1)}°</TableCell>
                      <TableCell><RiskBadge level={n.risk} /></TableCell>
                      <TableCell className="text-right">{n.air ? formatAqi(n.air.aqi) : "–"}</TableCell>
                      <TableCell>{n.air ? <AqiBadge aqi={n.air.aqi} short /> : "–"}</TableCell>
                      <TableCell className="text-right">{n.air ? n.air.pm25.toFixed(0) : "–"}</TableCell>
                      <TableCell>{n.score != null ? <CompoundBadge score={n.score} /> : "–"}</TableCell>
                      <TableCell className={`text-lg font-bold ${TREND_COLOR[trend]}`} aria-label={trend}>{TREND_ARROW[trend]}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        Values are for the current hour at each city. Trend compares the compound score with 6 hours ago (±5 points);
        “Rising” means the next 48 hours will peak at least 5 points above today’s peak.
      </p>
    </div>
  );
}
