"use client";

import { useState } from "react";
import { Droplets, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNHEALTHY_AQI, formatAqi } from "@/lib/air";
import type { CombinedHour } from "@/lib/conditions";
import { formatDay } from "@/lib/utils";
import { INTENSITIES, litresPerHour, workRegimen, type Intensity } from "@/lib/work-rest";

const hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
const mm = (h: number, m: number) => `${String((h + Math.floor(m / 60)) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const SELECT =
  "h-9 rounded-md border bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Plan one shift: work/rest blocks per hour, water, and protective equipment. */
export function ShiftPlanner({ hours, now }: { hours: CombinedHour[]; now: string }) {
  const days = Array.from(new Set(hours.map((h) => h.time.slice(0, 10)))).slice(0, 2);
  const [day, setDay] = useState(days[0]);
  const [start, setStart] = useState(7);
  const [length, setLength] = useState(8);
  const [intensity, setIntensity] = useState<Intensity>("heavy");

  const first = hours.findIndex((h) => h.time === `${day}T${hh(start)}`);
  const shift = (first < 0 ? [] : hours.slice(first, first + length)).map((h) => ({ ...h, regimen: workRegimen(h.wbgt, intensity) }));
  const workMinutes = shift.reduce((s, h) => s + h.regimen.workMin, 0);
  const water = shift.reduce((s, h) => s + litresPerHour(h.regimen), 0);
  const maxAqi = Math.max(0, ...shift.map((h) => h.air?.aqi ?? 0));
  const maxUv = Math.max(0, ...shift.map((h) => h.air?.uv ?? 0));
  const stops = shift.filter((h) => h.regimen.workMin === 0).length;
  const hot = shift.some((h) => h.regimen.workMin < 60);

  const ppe = [
    "Light-coloured, loose, breathable clothing; cooling towel or neck shade",
    maxUv >= 3 ? `Wide-brim hat or hard-hat sun brim, sunglasses and SPF 30+ (UV up to ${maxUv.toFixed(0)})` : "Hat for any time in direct sun",
    maxAqi >= UNHEALTHY_AQI
      ? `N95 / FFP2 mask — AQI reaches ${formatAqi(maxAqi)} during this shift, regardless of the heat`
      : maxAqi > 100
        ? `N95 mask for workers with asthma or heart conditions (AQI up to ${formatAqi(maxAqi)})`
        : null,
    stops > 0 || shift.some((h) => h.regimen.workMin <= 15) ? "Cooling vest for anyone who must keep working in the red hours" : null,
    "Shaded, ventilated rest area within a short walk; cool (not ice-cold) water at the site",
  ].filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift planner</CardTitle>
        <CardDescription>Enter a shift to get its break schedule, water target and protective equipment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Day</span>
            <select className={SELECT} value={day} onChange={(e) => setDay(e.target.value)}>
              {days.map((d, i) => <option key={d} value={d}>{i === 0 ? "Today" : "Tomorrow"} ({formatDay(d)})</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Shift starts</span>
            <select className={SELECT} value={start} onChange={(e) => setStart(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hh(h)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Length</span>
            <select className={SELECT} value={length} onChange={(e) => setLength(Number(e.target.value))}>
              {[2, 4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} hours</option>)}
            </select>
          </label>
          <div className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Work type</span>
            <Tabs value={intensity} onValueChange={(v) => setIntensity(v as Intensity)}>
              <TabsList>
                {INTENSITIES.map((i) => <TabsTrigger key={i.key} value={i.key}>{i.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {shift.length === 0 ? (
          <p className="text-sm text-muted-foreground">No forecast for that time.</p>
        ) : (
          <>
            {/* Gantt bar: each hour split into work (colour) and rest (hatched) minutes. */}
            <div>
              <div className="flex gap-0.5" role="img" aria-label="Work and rest blocks across the shift">
                {shift.map((h) => (
                  <div key={h.time} className={`flex h-12 flex-1 overflow-hidden rounded ${h.time.slice(0, 13) < now ? "opacity-40" : ""}`} title={`${h.time.slice(11, 16)} · WBGT ${h.wbgt.toFixed(1)} °C · ${h.regimen.label}`}>
                    <div style={{ width: `${(h.regimen.workMin / 60) * 100}%`, backgroundColor: h.regimen.color }} />
                    <div
                      className="flex-1"
                      style={{ background: "repeating-linear-gradient(45deg, hsl(var(--muted)), hsl(var(--muted)) 4px, hsl(var(--elevated)) 4px, hsl(var(--elevated)) 8px)" }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex text-xs tabular-nums text-muted-foreground">
                {shift.map((h) => <span key={h.time} className="flex-1">{h.time.slice(11, 16)}</span>)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Coloured = work, hatched = rest in shade.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Productive time</div>
                <div className="text-2xl font-bold tabular-nums">{(workMinutes / 60).toFixed(1)} h</div>
                <div className="text-xs text-muted-foreground">of {length} h on site{stops ? ` · ${stops} h with no outdoor work` : ""}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground"><Droplets className="h-3 w-3" /> Water per worker</div>
                <div className="text-2xl font-bold tabular-nums">{water.toFixed(1)} L</div>
                <div className="text-xs text-muted-foreground">{hot ? "1 cup (250 ml) every 15–20 min in the hot hours" : "about 2 cups an hour"}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Air during shift</div>
                <div className="text-2xl font-bold tabular-nums">{maxAqi ? `AQI ${formatAqi(maxAqi)}` : "–"}</div>
                <div className="text-xs text-muted-foreground">{maxAqi >= UNHEALTHY_AQI ? "Masks required" : maxAqi ? "Peak during the shift" : "No air-quality data"}</div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold">Break schedule</h4>
                <ol className="space-y-1 text-sm">
                  {shift.map((h) => {
                    const hour = Number(h.time.slice(11, 13));
                    const w = h.regimen.workMin;
                    return (
                      <li key={h.time} className="flex gap-3 tabular-nums">
                        <span className="w-12 shrink-0 text-muted-foreground">{h.time.slice(11, 16)}</span>
                        <span>
                          {w === 60 && "Work the full hour"}
                          {w > 0 && w < 60 && <>Work {mm(hour, 0)}–{mm(hour, w)}, rest {mm(hour, w)}–{mm(hour, 60)}</>}
                          {w === 0 && <span className="font-semibold text-destructive">No outdoor work — rest or indoor tasks</span>}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">{h.wbgt.toFixed(1)} °C</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Protective equipment</h4>
                <ul className="list-disc space-y-1 ps-5 text-sm">
                  {ppe.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
