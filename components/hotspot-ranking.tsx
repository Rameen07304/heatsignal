"use client";

import { useState } from "react";
import Link from "next/link";
import { Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AqiBadge } from "@/components/aqi-badge";
import { RiskBadge } from "@/components/risk-badge";
import type { AirNow } from "@/lib/air";
import { cityHref, cityKey, type City } from "@/lib/cities";
import { classifyRisk } from "@/lib/risk";
import type { Forecast } from "@/lib/weather";

export interface RankRow {
  city: City;
  f: Forecast;
  air?: AirNow | null;
}

const weekPeak = (f: Forecast) => Math.max(...f.daily.map((d) => d.maxWbgt));

/** `wbgt` is the heat figure shown in the row; `sort` is what the tab ranks by. */
const METRICS = {
  today: { label: "Heat: today’s peak", wbgt: (r: RankRow) => r.f.daily[0].maxWbgt, sort: (r: RankRow) => r.f.daily[0].maxWbgt },
  now: { label: "Heat: right now", wbgt: (r: RankRow) => r.f.current.wbgt, sort: (r: RankRow) => r.f.current.wbgt },
  week: { label: "Heat: 7-day peak", wbgt: (r: RankRow) => weekPeak(r.f), sort: (r: RankRow) => weekPeak(r.f) },
  smog: { label: "Smog: right now", wbgt: (r: RankRow) => r.f.daily[0].maxWbgt, sort: (r: RankRow) => r.air?.aqi ?? -1 },
};
type Metric = keyof typeof METRICS;

interface Props {
  rows: RankRow[];
  pinned: Set<string>;
  onPin: (city: City) => void;
}

export function HotspotRanking({ rows, pinned, onPin }: Props) {
  const [metric, setMetric] = useState<Metric>("today");
  const [showAll, setShowAll] = useState(false);

  const { wbgt, sort } = METRICS[metric];
  const ranked = [...rows].sort((a, b) => sort(b) - sort(a));
  const visible = showAll ? ranked : ranked.slice(0, 10);

  return (
    <div className="space-y-3">
      <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
        <TabsList className="h-auto flex-wrap justify-start">
          {Object.entries(METRICS).map(([key, m]) => (
            <TabsTrigger key={key} value={key}>{m.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="text-right">{metric === "smog" ? "WBGT today" : "WBGT"}</TableHead>
            <TableHead>Heat risk</TableHead>
            <TableHead>Air quality now</TableHead>
            <TableHead className="text-right">Temp now</TableHead>
            <TableHead className="text-right">Population</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row, i) => {
            const { city, f, air } = row;
            const value = wbgt(row);
            return (
              <TableRow key={cityKey(city)}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <Link href={cityHref(city)} className="font-medium hover:underline">{city.name}</Link>
                  <span className="ml-2 text-xs text-muted-foreground">{city.country}</span>
                </TableCell>
                <TableCell className="text-right font-semibold">{value.toFixed(1)} °C</TableCell>
                <TableCell><RiskBadge level={classifyRisk(value)} /></TableCell>
                <TableCell>
                  {air ? <AqiBadge aqi={air.aqi} /> : <span className="text-muted-foreground">–</span>}
                </TableCell>
                <TableCell className="text-right">{f.current.temp.toFixed(1)} °C</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {city.pop ? `${city.pop < 1 ? city.pop.toFixed(1) : Math.round(city.pop)} M` : "–"}
                </TableCell>
                <TableCell className="text-right">
                  {pinned.has(cityKey(city)) ? (
                    <span className="text-xs text-muted-foreground">In My cities</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPin(city)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Pin className="h-3 w-3" /> Add to My cities
                    </button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {ranked.length > 10 && (
        <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show top 10" : `Show all ${ranked.length} cities`}
        </Button>
      )}
    </div>
  );
}
