"use client";

import { use, useState } from "react";
import Link from "next/link";
import { HardHat, HeartPulse, Printer, Siren, Timer } from "lucide-react";
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
import { SITE_KEY } from "@/components/site-hero";
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
import { cityName, placeName } from "@/lib/places";
import { FlagAnswer } from "@/components/site-hero";
import { PageTop, Section } from "@/components/page-top";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTab } from "@/lib/use-url-tab";

interface Props {
  searchParams: Promise<{ lat?: string; lon?: string; name?: string; country?: string }>;
}

const WS_TABS = ["today", "checkin", "crew", "site"] as const;

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
  const [selected, setSelectedState] = useState<City>(fromUrl ?? DEFAULT);
  // Remembered for the dashboard hero ("Right now at your site").
  const setSelected = (c: City) => {
    setSelectedState(c);
    try {
      localStorage.setItem(SITE_KEY, JSON.stringify(c));
    } catch {}
  };
  const [ctx] = useWorkerContext();
  const { t, n, lang } = useT();
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

  const [tab, setTab] = useUrlTab(WS_TABS, "today");
  const open = (next: (typeof WS_TABS)[number]) => {
    setTab(next);
    setTimeout(() => document.getElementById("ws-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const printNotice = () => {
    setTab("site");
    setTimeout(() => window.print(), 300);
  };
  const heavyFlag = now ? heatFlag(workRegimen(now.wbgt, "heavy", ctx)) : null;
  const panel = "space-y-6 data-[state=inactive]:hidden";

  return (
    <div className="space-y-8">
      <div className="no-print space-y-4">
        <PageTop
          icon={<HardHat className="h-7 w-7 text-primary" />}
          title={t("workerSafety")}
          intro={t("wsQuestion")}
          aside={
            <label className="text-xs text-muted-foreground">
              <span className="mb-1 block">{t("workSite")}</span>
              <select
                className="h-11 w-full rounded-md border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
                value={cityKey(selected)}
                onChange={(e) => setSelected(options.find((o) => cityKey(o) === e.target.value) ?? DEFAULT)}
              >
                {options.map((o) => (
                  <option key={cityKey(o)} value={cityKey(o)}>{placeName(o, lang)}</option>
                ))}
              </select>
            </label>
          }
          answer={
            result.error ? (
              <ErrorState message={t("forecastLoadError")} onRetry={result.retry} />
            ) : (
              <FlagAnswer c={c ?? null} />
            )
          }
          actions={
            <>
              <Button onClick={() => open("crew")}><Timer /> {t("actStartTimer")}</Button>
              <Button variant="outline" onClick={() => open("checkin")}><HeartPulse /> {t("heroCheckFeel")}</Button>
              <Button variant="outline" onClick={printNotice} disabled={!now}><Printer /> {t("printSiteNotice")}</Button>
            </>
          }
        />
        <div className="space-y-3 empty:hidden">
            {now && heavyFlag?.escalate && (
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-lg bg-red-500/10 p-3 text-sm" role="note">
                <Siren className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <p className="min-w-0 flex-1"><b>{t(heavyFlag.key)}:</b> {t("heatEscalate")}</p>
                <Link href="/first-aid" className="font-semibold text-primary underline-offset-4 hover:underline">{t("firstAidSteps")} →</Link>
              </div>
            )}
            {today.some((h) => isDusty(h.air)) && (
              <p className="rounded-lg bg-amber-500/10 p-3 text-sm">
                <b>{t("dustToday")}</b> {t("dustAction")}
              </p>
            )}
            {now?.air && now.air.aqi >= UNHEALTHY_AQI && (
              <p className="rounded-lg bg-red-500/10 p-3 text-sm">
                <b>{t("airUnhealthyNow", { aqi: formatAqi(now.air.aqi) })}</b> {t("airUnhealthyAction")}
              </p>
            )}
        </div>
        <WorkerContextPicker compact />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6" id="ws-tabs">
        <TabsList className="no-print h-auto flex-wrap scroll-mt-20" aria-label={t("detailTabs")}>
          <TabsTrigger value="today">{t("tabToday")}</TabsTrigger>
          <TabsTrigger value="checkin">{t("tabCheckin")}</TabsTrigger>
          <TabsTrigger value="crew">{t("tabCrew")}</TabsTrigger>
          <TabsTrigger value="site">{t("tabSiteTools")}</TabsTrigger>
        </TabsList>

        <TabsContent value="today" forceMount className={panel}>
          {result.loading && <Skeleton className="h-72 w-full rounded-lg" />}
          {c && now && (
            <>
              <Card className="no-print">
                <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle>{t("rightNowIn", { city: cityName(selected.name, lang) })}</CardTitle>
                    <CardDescription>{t("rightNowLine", { wbgt: n(now.wbgt, 1), time: now.time.slice(11, 16), temp: n(now.temp, 1), rh: n(now.rh) })}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {now.air && <AqiBadge aqi={now.air.aqi} />}
                    {now.score != null && <CompoundBadge score={now.score} />}
                    <ShareDialog
                      title={`${t("workerSafety")}: ${cityName(selected.name, lang)}`}
                      text={[
                        `⚠️ ${t("workerSafety")}: ${cityName(selected.name, lang)}`,
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
                        <div key={i.key} className="rounded-lg p-3" style={{ backgroundColor: `${r.color}14` }}>
                          <div className="text-xs font-medium text-muted-foreground">{t(i.labelKey)}</div>
                          <div className="mt-1 flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />{t(r.key)}</div>
                          <div className="text-xs text-muted-foreground">{t(flag.key)} · {t(i.examplesKey)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("heatLimitsNote")}</p>
                </CardContent>
              </Card>
              <LeadTime hours={c.hours} now={now} days={c.days} pastDays={recent.data ?? []} ctx={ctx} />
              <div className="no-print space-y-6">
                <WorkPlanner hourly={c.hours} now={now.time.slice(0, 13)} initialIntensity="heavy" ctx={ctx} />
                <ShiftPlanner hours={c.hours} now={now.time.slice(0, 13)} />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="checkin" forceMount className={panel}>
          <div id="checkin" className="scroll-mt-20">
            {now ? <WorkerCheckin wbgt={now.wbgt} ctx={ctx} hotDayStreak={streak?.day} /> : <Skeleton className="h-40 w-full rounded-lg" />}
          </div>
        </TabsContent>

        <TabsContent value="crew" forceMount className={panel}>
          {c && now ? (
            <>
              <BreakTimer hours={c.hours} now={now} ctx={ctx} />
              <CrewBoard hours={c.hours} now={now} />
            </>
          ) : (
            <Skeleton className="h-40 w-full rounded-lg" />
          )}
        </TabsContent>

        <TabsContent value="site" forceMount className={panel}>
          {c && now && (
            <>
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
        </TabsContent>
      </Tabs>

      <div className="no-print space-y-3">
        <MedicalDisclaimer>{t("workerSafetyDisclaimer")}</MedicalDisclaimer>
        <Section title={t("learnMore")}>
          <p className="text-sm text-muted-foreground">{t("workerSafetyIntro")}</p>
        </Section>
        <p className="text-xs text-muted-foreground">
          {t("workerRightsFooter")}{" "}
          <Link href="/about#worker-rights" className="font-medium text-primary underline-offset-2 hover:underline">{t("workerRightsLink")}</Link>
        </p>
      </div>
    </div>
  );
}
