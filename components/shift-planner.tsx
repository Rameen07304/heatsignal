"use client";

import { useState } from "react";
import { Droplets, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNHEALTHY_AQI, formatAqi } from "@/lib/air";
import type { CombinedHour } from "@/lib/conditions";
import { useT } from "@/lib/i18n";
import { INTENSITIES, litresPerHour, workRegimen, type Intensity } from "@/lib/work-rest";
import { useWorkerContext } from "@/lib/use-worker-context";

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
  const [workers, setWorkers] = useState(50);
  const [ctx] = useWorkerContext();
  const { t, n, date } = useT();

  const first = hours.findIndex((h) => h.time === `${day}T${hh(start)}`);
  const shift = (first < 0 ? [] : hours.slice(first, first + length)).map((h) => ({ ...h, regimen: workRegimen(h.wbgt, intensity, ctx) }));
  const workMinutes = shift.reduce((s, h) => s + h.regimen.workMin, 0);
  const water = shift.reduce((s, h) => s + litresPerHour(h.regimen), 0);
  const maxAqi = Math.max(0, ...shift.map((h) => h.air?.aqi ?? 0));
  const maxUv = Math.max(0, ...shift.map((h) => h.air?.uv ?? 0));
  const stops = shift.filter((h) => h.regimen.workMin === 0).length;
  const hot = shift.some((h) => h.regimen.workMin < 60);
  // Cal/OSHA: enough water on site for at least 1 quart (~0.95 L) per worker per hour of the shift.
  const siteLitres = Math.ceil(workers * Math.max(water, 0.95 * shift.length));

  const ppe = [
    t("ppeClothing"),
    maxUv >= 3 ? t("ppeSunHigh", { uv: maxUv.toFixed(0) }) : t("ppeHat"),
    maxAqi >= UNHEALTHY_AQI
      ? t("ppeMaskAll", { aqi: formatAqi(maxAqi) })
      : maxAqi > 100
        ? t("ppeMaskSensitive", { aqi: formatAqi(maxAqi) })
        : null,
    stops > 0 || shift.some((h) => h.regimen.workMin <= 15) ? t("ppeCoolingVest") : null,
    t("ppeRestArea"),
  ].filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("shiftPlanner")}</CardTitle>
        <CardDescription>{t("shiftPlannerIntro")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">{t("day")}</span>
            <select className={SELECT} value={day} onChange={(e) => setDay(e.target.value)}>
              {days.map((d, i) => <option key={d} value={d}>{i === 0 ? t("today") : t("tomorrow")} ({date(d)})</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">{t("shiftStarts")}</span>
            <select className={SELECT} value={start} onChange={(e) => setStart(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hh(h)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">{t("length")}</span>
            <select className={SELECT} value={length} onChange={(e) => setLength(Number(e.target.value))}>
              {[2, 4, 6, 8, 10, 12].map((h) => <option key={h} value={h}>{t("nHours", { n: h })}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">{t("workersOnSite")}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={10000}
              className={`${SELECT} w-24`}
              value={workers}
              onChange={(e) => setWorkers(Math.min(10000, Math.max(1, Math.round(Number(e.target.value)) || 1)))}
            />
          </label>
          <div className="space-y-1 text-xs text-muted-foreground">
            <span className="block">{t("workType")}</span>
            <Tabs value={intensity} onValueChange={(v) => setIntensity(v as Intensity)}>
              <TabsList>
                {INTENSITIES.map((i) => <TabsTrigger key={i.key} value={i.key}>{t(i.labelKey)}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {shift.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noForecastThen")}</p>
        ) : (
          <>
            {/* Gantt bar: each hour split into work (colour) and rest (hatched) minutes. */}
            <div dir="ltr">
              <div className="flex gap-0.5" role="img" aria-label={t("workRestBlocks")}>
                {shift.map((h) => (
                  <div key={h.time} className={`flex h-12 flex-1 overflow-hidden rounded ${h.time.slice(0, 13) < now ? "opacity-40" : ""}`} title={`${h.time.slice(11, 16)} · WBGT ${h.wbgt.toFixed(1)} °C · ${t(h.regimen.key)}`}>
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
              <p className="mt-1 text-xs text-muted-foreground" dir="auto">{t("ganttLegend")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">{t("productiveTime")}</div>
                <div className="text-2xl font-bold tabular-nums">{t("nH", { n: n(workMinutes / 60, 1) })}</div>
                <div className="text-xs text-muted-foreground">{t("ofHoursOnSite", { n: length })}{stops ? ` · ${t("hoursNoOutdoor", { n: stops })}` : ""}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Droplets className="h-3 w-3" /> {t("waterPerWorker")}</div>
                <div className="text-2xl font-bold tabular-nums">{t("nL", { n: n(water, 1) })}</div>
                <div className="text-xs text-muted-foreground">{hot ? t("cupEvery15") : t("twoCupsHour")}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Droplets className="h-3 w-3" /> {t("waterForSite")}</div>
                <div className="text-2xl font-bold tabular-nums">{t("nL", { n: n(siteLitres) })}</div>
                <div className="text-xs text-muted-foreground">{t("siteWaterNote", { n: workers })}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">{t("airDuringShift")}</div>
                <div className="text-2xl font-bold tabular-nums">{maxAqi ? `AQI ${formatAqi(maxAqi)}` : "–"}</div>
                <div className="text-xs text-muted-foreground">{maxAqi >= UNHEALTHY_AQI ? t("masksRequired") : maxAqi ? t("peakDuringShift") : t("noAirData")}</div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold">{t("breakSchedule")}</h4>
                <ol className="space-y-1 text-sm">
                  {shift.map((h) => {
                    const hour = Number(h.time.slice(11, 13));
                    const w = h.regimen.workMin;
                    return (
                      <li key={h.time} className="flex gap-3 tabular-nums">
                        <span className="w-12 shrink-0 text-muted-foreground" dir="ltr">{h.time.slice(11, 16)}</span>
                        <span>
                          {w === 60 && t("workFullHour")}
                          {w > 0 && w < 60 && t("workThenRest", { a: mm(hour, 0), b: mm(hour, w), c: mm(hour, 60) })}
                          {w === 0 && <span className="font-semibold text-destructive">{t("noOutdoorWorkHour")}</span>}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">{h.wbgt.toFixed(1)} °C</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> {t("protectiveEquipment")}</h4>
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
