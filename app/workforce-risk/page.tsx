"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Flame, HardHat, MapPin, Shield, Trash2, Truck, Wheat, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState } from "@/components/error-state";
import { WorkerContextPicker } from "@/components/worker-context-picker";
import { incidentsThisWeek } from "@/components/worksite-tools";
import { KEYS, adherence, isSmallCell, readJson, todaysStatuses, todaysTimer } from "@/lib/device-store";
import { STATUS_KEY, type StatusLevel } from "@/lib/worker-status";
import { useWorkerContext } from "@/lib/use-worker-context";
import { WORLD_CITIES, cityHref, cityKey } from "@/lib/cities";
import type { Conditions } from "@/lib/conditions";
import { useT } from "@/lib/i18n";
import { ok, useCities } from "@/lib/use-cities";
import { REGIMENS, contextLabel, type Regimen } from "@/lib/work-rest";
import { INDUSTRIES, productivityLoss, shiftLabel, workDay, type WorkDay } from "@/lib/workforce";
import { cn } from "@/lib/utils";

const WeatherMap = dynamic(() => import("@/components/weather-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[320px] w-full" />,
});

const ICONS: Record<string, LucideIcon> = {
  construction: HardHat, agriculture: Wheat, "oil-gas": Flame, sanitation: Trash2, delivery: Truck, tourism: MapPin, security: Shield,
};
const PAGE = 15;
const INPUT = "h-10 w-full rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const today = (c: Conditions) => c.hours.filter((h) => h.time.startsWith(c.days[0].date));

function RegimenPill({ r }: { r: Regimen }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} aria-hidden />
      {r.label}
    </span>
  );
}

const money = (n: number) => Math.round(n).toLocaleString("en");

export default function WorkforceRiskPage() {
  const { t } = useT();
  const { cities, data, retry } = useCities();
  const [industryId, setIndustryId] = useState(INDUSTRIES[0].id);
  const industry = INDUSTRIES.find((i) => i.id === industryId)!;
  const [showAll, setShowAll] = useState(false);
  const [ctx] = useWorkerContext();

  const rows = useMemo(
    () =>
      cities
        .flatMap((city) => {
          const s = data[cityKey(city)];
          const d = ok(s) ? workDay(today(s), industry.work, ctx) : null;
          return d ? [{ city, d }] : [];
        })
        .sort((a, b) => b.d.peakWbgt - a.d.peakWbgt),
    [cities, data, industry.work, ctx],
  );
  const failed = cities.length > 0 && cities.every((c) => data[cityKey(c)] instanceof Error);
  const pending = rows.length === 0 && !failed;
  const count = (f: (d: WorkDay) => boolean) => rows.filter((r) => f(r.d)).length;
  const stop = count((d) => d.worst.workMin === 0);
  const modified = count((d) => d.worst.workMin > 0 && d.worst.workMin < 60);

  // Cost estimator
  const [siteKey, setSiteKey] = useState(cityKey(WORLD_CITIES.find((c) => c.name === "Abu Dhabi")!));
  const [workers, setWorkers] = useState(100);
  const [wage, setWage] = useState(5);
  const site = rows.find((r) => cityKey(r.city) === siteKey) ?? rows[0];
  const loss = site && productivityLoss(site.d, workers, wage);
  const [incidents, setIncidents] = useState<{ city: string }[]>([]);
  // Measures recorded on this device by the worker tools (timer, check-ins, SOS taps). Nothing leaves the device.
  const [device, setDevice] = useState<{ breaks: number | null; water: number | null; statuses: StatusLevel[]; sos: number }>({ breaks: null, water: null, statuses: [], sos: 0 });
  useEffect(() => {
    setIncidents(incidentsThisWeek());
    const weekAgo = Date.now() - 7 * 864e5;
    setDevice({
      ...adherence(todaysTimer()),
      statuses: Object.values(todaysStatuses()).map((x) => x.level),
      sos: readJson<string[]>(KEYS.sos, []).filter((d) => Date.parse(d) >= weekAgo).length,
    });
  }, []);
  const shown = (n: number) => (isSmallCell(n) ? t("fewerThan5") : String(n));
  const byStatus = (["ok", "rest", "stop", "medical"] as StatusLevel[])
    .map((l) => [l, device.statuses.filter((x) => x === l).length] as const)
    .filter(([, n]) => n > 0);
  const siteIncidents = site ? incidents.filter((i) => i.city === site.city.name).length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("workforceRisk")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pick an industry to see where its outdoor work is safe today, when to schedule shifts, and what the heat costs
          in lost working hours.
        </p>
      </div>

      <WorkerContextPicker />

      <section aria-label="Industry" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {INDUSTRIES.map((i) => {
          const Icon = ICONS[i.id];
          const active = i.id === industryId;
          return (
            <button
              key={i.id}
              type="button"
              aria-pressed={active}
              onClick={() => setIndustryId(i.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50",
                active && "border-primary bg-primary/5 ring-1 ring-primary",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-medium leading-tight">{i.label}</span>
              <span className="text-xs capitalize text-muted-foreground">{i.work} work</span>
            </button>
          );
        })}
      </section>

      {failed ? (
        <ErrorState message="Couldn’t load weather data. Check your connection and try again." onRetry={retry} />
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["Must stop outdoor work at the peak", pending ? "–" : `${stop} of ${rows.length}`, "cities today"],
              ["Need break schedules", pending ? "–" : `${modified} of ${rows.length}`, "cities today"],
              ["Normal schedule all day", pending ? "–" : `${rows.length - stop - modified} of ${rows.length}`, "cities today"],
            ].map(([k, v, s]) => (
              <div key={k} className="rounded-lg border bg-card p-4">
                <dt className="text-sm text-muted-foreground">{k}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{v}</dd>
                <dd className="text-xs text-muted-foreground">{s} · {industry.label.toLowerCase()}</dd>
              </div>
            ))}
          </dl>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Where {industry.label.toLowerCase()} work is at risk today</CardTitle>
              <CardDescription>{industry.description}. Each city is coloured by the work–rest rule at its hottest hour. Click a dot for details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-[340px] sm:h-[440px]">
                <WeatherMap cities={cities} data={data} mode="work" work={industry.work} ctx={ctx} />
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Map legend">
                {REGIMENS.map((r) => (
                  <li key={r.workMin} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.label}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shift planner by city</CardTitle>
              <CardDescription>
                Hottest cities first. Safe windows are the hours between 05:00 and 20:00 when {industry.work} work can run without
                breaks. Water is per worker for a 07:00–15:00 shift.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
              {pending ? (
                <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ps-4">City</TableHead>
                      <TableHead>At the hottest hour</TableHead>
                      <TableHead>Safe windows</TableHead>
                      <TableHead className="text-right">Safe hours</TableHead>
                      <TableHead className="text-right">Water</TableHead>
                      <TableHead className="pe-4">What to do</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showAll ? rows : rows.slice(0, PAGE)).map(({ city, d }) => (
                      <TableRow key={cityKey(city)}>
                        <TableCell className="ps-4">
                          <Link href={cityHref(city)} className="font-medium hover:underline">{city.name}</Link>
                          <div className="text-xs text-muted-foreground">{city.country} · WBGT {d.peakWbgt.toFixed(1)} °C</div>
                        </TableCell>
                        <TableCell><RegimenPill r={d.worst} /></TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {d.safeWindows.length ? d.safeWindows.map((w) => `${w.from}–${w.to}`).join(", ") : <span className="text-muted-foreground">None</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{d.safeHours} h</TableCell>
                        <TableCell className="text-right tabular-nums">{d.waterL.toFixed(1)} L</TableCell>
                        <TableCell className="pe-4 text-sm">{d.action}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {rows.length > PAGE && (
                <div className="p-4 sm:px-0">
                  <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                    {showAll ? `Show top ${PAGE}` : `Show all ${rows.length} cities`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What the heat costs</CardTitle>
              <CardDescription>
                Paid hours lost to required rest breaks in a 07:00–15:00 shift today, and how many a better shift time wins back.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span className="block">City</span>
                  <select className={INPUT} value={site ? cityKey(site.city) : ""} onChange={(e) => setSiteKey(e.target.value)}>
                    {[...rows].sort((a, b) => a.city.name.localeCompare(b.city.name)).map(({ city }) => (
                      <option key={cityKey(city)} value={cityKey(city)}>{city.name}, {city.country}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span className="block">Workers</span>
                  <input type="number" inputMode="numeric" min={1} className={INPUT} value={workers} onChange={(e) => setWorkers(Math.max(1, Math.round(Number(e.target.value)) || 1))} />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span className="block">Hourly wage (any currency)</span>
                  <input type="number" inputMode="decimal" min={0} step="0.5" className={INPUT} value={wage} onChange={(e) => setWage(Math.max(0, Number(e.target.value) || 0))} />
                </label>
              </div>

              {site && loss ? (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      ["Productive time", `${loss.productivePercent}%`, `of the 8-hour shift`],
                      ["Hours lost today", money(loss.lostTotal), `${loss.lostPerWorker.toFixed(1)} h per worker`],
                      ["Cost today", money(loss.dailyCost), "in paid rest time"],
                      ["Over a month", money(loss.monthlyCost), "22 working days like today"],
                    ].map(([k, v, s]) => (
                      <div key={k} className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">{k}</div>
                        <div className="text-2xl font-bold tabular-nums">{v}</div>
                        <div className="text-xs text-muted-foreground">{s}</div>
                      </div>
                    ))}
                  </div>
                  <p className="rounded-lg border bg-muted/40 p-3">
                    {loss.recoveredHours > 0 ? (
                      <>
                        Starting the shift at <b>{shiftLabel(site.d.bestStart)}</b> instead of 07:00–15:00 wins back{" "}
                        <b>{money(loss.recoveredHours)} hours</b> today ({loss.recoveredPercent}% of the lost time) in {site.city.name}.
                      </>
                    ) : loss.lostTotal > 0 ? (
                      <>No other 8-hour shift between 05:00 and 20:00 is cooler today. Split the shift around the hottest hours instead.</>
                    ) : (
                      <>No working time is lost to heat in {site.city.name} today.</>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rest breaks protect workers’ lives; this shows their cost so employers can plan shifts around the heat, not
                    skip the breaks. Assumes the ACGIH work–rest limits for {industry.work} work.
                  </p>
                </div>
              ) : (
                <Skeleton className="h-28 w-full" />
              )}
            </CardContent>
          </Card>

          {site && loss && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Safety and productivity measures</CardTitle>
                <CardDescription>
                  {site.city.name} today · {industry.label.toLowerCase()} ({industry.work} work) · {contextLabel(ctx)} · {workers} workers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    ["Protected rest", `${loss.lostPerWorker.toFixed(1)} h`, `per worker, vs ${site.d.standardHours.toFixed(1)} h of work in 07:00–15:00`],
                    ["Work hours lost, 07:00 start", money(loss.lostTotal), "crew total today"],
                    [`Work hours lost, best start`, money(loss.lostTotal - loss.recoveredHours), `starting ${shiftLabel(site.d.bestStart)}`],
                    ["Incidents reported this week", shown(siteIncidents), `in ${site.city.name}, anonymous log`],
                    [t("breakAdherence"), device.breaks == null ? "–" : `${device.breaks}%`, t("measuresTimerNote")],
                    [t("waterAdherence"), device.water == null ? "–" : `${device.water}%`, t("measuresTimerNote")],
                    [t("checkinsToday"), shown(device.statuses.length), byStatus.length ? byStatus.map(([l, n]) => `${t(STATUS_KEY[l])}: ${shown(n)}`).join(" · ") : t("noCheckins")],
                    [t("escalationsWeek"), String(device.sos), t("escalationsNote")],
                  ].map(([k, v, sub]) => (
                    <div key={k} className="rounded-lg border p-3">
                      <dt className="text-xs text-muted-foreground">{k}</dt>
                      <dd className="text-2xl font-bold tabular-nums">{v}</dd>
                      <dd className="text-xs text-muted-foreground">{sub}</dd>
                    </div>
                  ))}
                </dl>
                <p className="rounded-lg border bg-muted/40 p-3">
                  Rest time is protection, not lost productivity: one heat-stroke case costs more than a week of breaks.
                </p>
                <p className="text-xs text-muted-foreground">
                  Alert lead time and false-alarm rate are reported on the <Link href="/case-studies" className="font-medium text-primary underline-offset-2 hover:underline">Case Studies</Link> validation table.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
