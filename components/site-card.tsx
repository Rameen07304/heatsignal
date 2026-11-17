"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNHEALTHY_AQI, formatAqi } from "@/lib/air";
import type { City } from "@/lib/cities";
import type { CombinedHour } from "@/lib/conditions";
import { formatDay } from "@/lib/utils";
import { INTENSITIES, REGIMENS, heatFlag, hourRanges, litresPerHour, workRegimen, type Intensity } from "@/lib/work-rest";
import { listRanges } from "@/components/work-planner";
import { emergencyLine } from "@/lib/emergency";

/** A one-page notice to print and post at a work site. */
export function SiteCard({ city, now, today }: { city: City; now: CombinedHour; today: CombinedHour[] }) {
  const [intensity, setIntensity] = useState<Intensity>("heavy");
  const daytime = today.filter((h) => {
    const hour = Number(h.time.slice(11, 13));
    return hour >= 6 && hour < 20;
  });
  const withRegimen = daytime.map((h) => ({ ...h, regimen: workRegimen(h.wbgt, intensity) }));
  // The posted flag is the day's worst daytime hour, not the moment it was printed.
  const strictest = withRegimen.reduce((a, b) => (b.regimen.workMin < a.regimen.workMin ? b : a), withRegimen[0] ?? { ...now, regimen: workRegimen(now.wbgt, intensity) });
  const flag = heatFlag(strictest.regimen);
  const peakLitres = Math.max(...withRegimen.map((h) => litresPerHour(h.regimen)));
  const maxAqi = Math.max(0, ...today.map((h) => h.air?.aqi ?? 0));

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Tabs value={intensity} onValueChange={(v) => setIntensity(v as Intensity)}>
          <TabsList aria-label="Work type on this site">
            {INTENSITIES.map((i) => <TabsTrigger key={i.key} value={i.key}>{i.label} work</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Button onClick={() => window.print()}>
          <Printer /> Print site notice
        </Button>
      </div>

      <div className="site-card overflow-hidden rounded-xl border-2 bg-card" style={{ borderColor: flag.color }}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-white" style={{ backgroundColor: flag.color }}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-90">Heat safety notice · today</div>
            <div className="text-3xl font-black uppercase tracking-tight">{flag.name}</div>
            <div className="text-sm opacity-95">
              {flag.text}
              {strictest.regimen.workMin < 60 && ` Peak around ${strictest.time.slice(11, 16)} (WBGT ${strictest.wbgt.toFixed(1)} °C).`}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-lg font-bold">{city.name}{city.country && `, ${city.country}`}</div>
            <div>{formatDay(now.time)} · updated {now.time.slice(11, 16)} local time</div>
            <div>Now: WBGT {now.wbgt.toFixed(1)} °C · {now.temp.toFixed(0)} °C{now.air ? ` · AQI ${formatAqi(now.air.aqi)}` : ""}</div>
          </div>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-3">
          <section>
            <h3 className="mb-2 font-bold uppercase tracking-wide">Today’s work–rest schedule</h3>
            <p className="mb-2 text-xs text-muted-foreground">{INTENSITIES.find((i) => i.key === intensity)!.label} work, 06:00–20:00</p>
            <ul className="space-y-1.5 text-sm">
              {REGIMENS.map((r) => {
                const ranges = hourRanges(withRegimen, (h) => h.regimen === r);
                return ranges.length ? (
                  <li key={r.workMin} className="flex gap-2">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: r.color }} />
                    <span><b>{listRanges(ranges)}</b><br />{r.label}</span>
                  </li>
                ) : null;
              })}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-bold uppercase tracking-wide">Water &amp; protection</h3>
            <p className="text-3xl font-black tabular-nums">{peakLitres.toFixed(peakLitres < 1 ? 2 : 0)} L / hour</p>
            <p className="text-sm">in the hottest hours — one cup every 15–20 minutes, even if not thirsty. Do not exceed 1.5 L an hour.</p>
            <ul className="mt-3 list-disc space-y-1 ps-5 text-sm">
              <li>Rest in shade, never in the sun</li>
              <li>Work in pairs and watch each other</li>
              <li>New workers: half a shift for the first days</li>
              {maxAqi >= UNHEALTHY_AQI && <li><b>N95 masks required</b> — AQI {formatAqi(maxAqi)}</li>}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-bold uppercase tracking-wide">Emergency signs</h3>
            <p className="text-sm font-semibold">Heat exhaustion</p>
            <p className="mb-2 text-sm">Heavy sweating, dizziness, headache, nausea, cramps, weakness → move to shade, loosen clothes, sip water, cool with wet cloths.</p>
            <p className="text-sm font-semibold text-destructive">Heat stroke — call emergency now</p>
            <p className="text-sm">Confusion, slurred speech, fainting, seizures, very hot skin → call for help, cool the body with water and fanning, do not give drinks if not alert.</p>
            <p className="mt-2 text-xs font-semibold">Emergency: {emergencyLine(city.country)}</p>
          </section>
        </div>
        <p className="border-t px-5 py-2 text-[11px] text-muted-foreground">
          HeatSignal · ACGIH work–rest limits (OSHA Technical Manual) for healthy, heat-acclimatised workers. Unacclimatised,
          older or unwell workers need more rest. Not a substitute for a site safety officer.
        </p>
      </div>
    </div>
  );
}
