"use client";

import { use, useState } from "react";
import Link from "next/link";
import { HardHat, Siren } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { AqiBadge, CompoundBadge } from "@/components/risk-badge";
import { ShareDialog } from "@/components/share-dialog";
import { EmployerChecklist, IncidentLog } from "@/components/worksite-tools";
import { ShiftPlanner } from "@/components/shift-planner";
import { SiteCard } from "@/components/site-card";
import { WorkPlanner } from "@/components/work-planner";
import { WorkerContextPicker } from "@/components/worker-context-picker";
import { WorkerCheckin } from "@/components/worker-checkin";
import { CrewBoard } from "@/components/crew-board";
import { BreakTimer } from "@/components/break-timer";
import { useWorkerContext } from "@/lib/use-worker-context";
import { UNHEALTHY_AQI, fetchAir, formatAqi, isDusty } from "@/lib/air";
import { WORLD_CITIES, cityKey, type City } from "@/lib/cities";
import { buildConditions } from "@/lib/conditions";
import { useAsync } from "@/lib/use-async";
import { useT } from "@/lib/i18n";
import { useCities } from "@/lib/use-cities";
import { fetchForecast, fetchRecentDays } from "@/lib/weather";
import { hotStreak } from "@/lib/lead-time";
import { LeadTime } from "@/components/lead-time";
import { INTENSITIES, heatFlag, workRegimen } from "@/lib/work-rest";

interface Props {
  searchParams: Promise<{ lat?: string; lon?: string; name?: string; country?: string }>;
}

const DEFAULT = WORLD_CITIES.find((c) => c.name === "Abu Dhabi")!;

function cityFromUrl(p: Awaited<Props["searchParams"]>): City | null {
  const lat = Number(p.lat);
  const lon = Number(p.lon);
  if (!p.lat || !p.lon || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { name: p.name?.slice(0, 100) || `${lat}, ${lon}`, country: p.country?.slice(0, 100) ?? "", lat, lon };
}

export default function WorkerSafetyPage(props: Props) {
  const searchParams = use(props.searchParams);
  const { cities } = useCities();
  const fromUrl = cityFromUrl(searchParams);
  const [selected, setSelected] = useState<City>(fromUrl ?? DEFAULT);
  const [ctx] = useWorkerContext();
  const { t, n } = useT();
  const options = [...cities].sort((a, b) => a.name.localeCompare(b.name));
  if (!options.some((c) => cityKey(c) === cityKey(selected))) options.unshift(selected);

  const result = useAsync(async () => {
    const [forecast, air] = await Promise.all([
      fetchForecast(selected.lat, selected.lon),
      fetchAir(selected.lat, selected.lon).catch(() => undefined),
    ]);
    return buildConditions(forecast, air);
  }, [selected.lat, selected.lon]);
  const c = result.data;
  const now = c?.now;
  const today = c ? c.hours.filter((h) => h.time.startsWith(c.days[0].date)) : [];
  // Past days only feed the hot-day streak; if they fail, the streak just starts today.
  const recent = useAsync(() => fetchRecentDays(selected.lat, selected.lon).catch(() => []), [selected.lat, selected.lon]);
  const streak = c ? hotStreak(recent.data ?? [], c.days) : null;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <HardHat className="h-7 w-7 text-primary" /> {t("workerSafety")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("workerSafetyIntro")}</p>
        </div>
        <label className="text-xs text-muted-foreground">
          <span className="mb-1 block">{t("workSite")}</span>
          <select
            className="h-10 w-64 rounded-md border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={cityKey(selected)}
            onChange={(e) => setSelected(options.find((o) => cityKey(o) === e.target.value) ?? DEFAULT)}
          >
            {options.map((o) => (
              <option key={cityKey(o)} value={cityKey(o)}>{o.name}{o.country ? `, ${o.country}` : ""}</option>
            ))}
          </select>
        </label>
      </div>

      <MedicalDisclaimer>{t("workerSafetyDisclaimer")}</MedicalDisclaimer>

      <WorkerContextPicker />

      {result.loading && (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      )}
      {result.error && <ErrorState message={t("forecastLoadError")} onRetry={result.retry} />}

      {c && now && (
        <>
          <Card className="no-print">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>{t("rightNowIn", { city: selected.name })}</CardTitle>
                <CardDescription>{t("rightNowLine", { wbgt: n(now.wbgt, 1), time: now.time.slice(11, 16), temp: n(now.temp, 1), rh: n(now.rh) })}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {now.air && <AqiBadge aqi={now.air.aqi} />}
                {now.score != null && <CompoundBadge score={now.score} />}
                <ShareDialog
                  title={`${t("workerSafety")}: ${selected.name}`}
                  text={[
                    `⚠️ ${t("workerSafety")}: ${selected.name}`,
                    "",
                    t("shareHeatLine", { wbgt: n(now.wbgt, 1), time: now.time.slice(11, 16) }),
                    ...INTENSITIES.map((i) => `${t(i.labelKey)}: ${t(workRegimen(now.wbgt, i.key, ctx).key)}`),
                    ...(now.air && now.air.aqi >= UNHEALTHY_AQI ? [t("shareAirLine", { aqi: formatAqi(now.air.aqi) })] : []),
                    "",
                    t("shareWaterLine"),
                  ].join("\n")}
                  path={`/worker-safety?lat=${selected.lat}&lon=${selected.lon}&name=${encodeURIComponent(selected.name)}&country=${encodeURIComponent(selected.country)}`}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                {INTENSITIES.map((i) => {
                  const r = workRegimen(now.wbgt, i.key, ctx);
                  const flag = heatFlag(r);
                  return (
                    <div key={i.key} className="rounded-lg border p-3" style={{ borderColor: `${r.color}80`, backgroundColor: `${r.color}14` }}>
                      <div className="text-xs font-medium text-muted-foreground">{t(i.labelKey)}</div>
                      <div className="mt-1 flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />{t(r.key)}</div>
                      <div className="text-xs text-muted-foreground">{t(flag.key)} · {t(i.examplesKey)}</div>
                    </div>
                  );
                })}
              </div>
              {heatFlag(workRegimen(now.wbgt, "heavy", ctx)).escalate && (
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm" role="note">
                  <Siren className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                  <p className="min-w-0 flex-1"><b>{t(heatFlag(workRegimen(now.wbgt, "heavy", ctx)).key)}:</b> {t("heatEscalate")}</p>
                  <Link href="/first-aid" className="font-semibold text-primary underline-offset-4 hover:underline">{t("firstAidSteps")} →</Link>
                </div>
              )}
              {today.some((h) => isDusty(h.air)) && (
                <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                  <b>{t("dustToday")}</b> {t("dustAction")}
                </p>
              )}
              {now.air && now.air.aqi >= UNHEALTHY_AQI && (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
                  <b>{t("airUnhealthyNow", { aqi: formatAqi(now.air.aqi) })}</b> {t("airUnhealthyAction")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{t("heatLimitsNote")}</p>
            </CardContent>
          </Card>

          <LeadTime hours={c.hours} now={now} days={c.days} pastDays={recent.data ?? []} ctx={ctx} />
          <WorkerCheckin wbgt={now.wbgt} ctx={ctx} hotDayStreak={streak?.day} />
          <BreakTimer hours={c.hours} now={now} ctx={ctx} />
          <CrewBoard hours={c.hours} now={now} />

          <div className="no-print space-y-6">
            <WorkPlanner hourly={c.hours} now={now.time.slice(0, 13)} initialIntensity="heavy" ctx={ctx} />
            <ShiftPlanner hours={c.hours} now={now.time.slice(0, 13)} />
          </div>

          <div className="space-y-2">
            <div className="no-print">
              <h2 className="text-lg font-semibold tracking-tight">{t("siteNotice")}</h2>
              <p className="text-sm text-muted-foreground">{t("siteNoticeIntro")}</p>
            </div>
            <SiteCard city={selected} now={now} today={today} />
          </div>

          <EmployerChecklist city={selected} today={today} />
        </>
      )}

      <IncidentLog city={selected} />

      <p className="no-print text-xs text-muted-foreground">
        {t("workerRightsFooter")}{" "}
        <Link href="/about#worker-rights" className="font-medium text-primary underline-offset-2 hover:underline">{t("workerRightsLink")}</Link>
      </p>
    </div>
  );
}
