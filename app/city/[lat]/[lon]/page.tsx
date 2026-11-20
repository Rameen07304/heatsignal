"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, GitCompare, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertSection } from "@/components/alert";
import { CompoundChart } from "@/components/compound-chart";
import { ConditionsPanel } from "@/components/conditions-panel";
import { ErrorState } from "@/components/error-state";
import { ForecastTable } from "@/components/forecast-table";
import { CompoundBadge } from "@/components/risk-badge";
import { VulnerableGroups } from "@/components/vulnerable-groups";
import { CityActions } from "@/components/city-actions";
import { WorkPlanner } from "@/components/work-planner";
import { fetchAir } from "@/lib/air";
import { buildConditions, type CombinedHour } from "@/lib/conditions";
import { compoundBand } from "@/lib/risk";
import { useAsync } from "@/lib/use-async";
import { formatDay } from "@/lib/utils";
import { fetchForecast, fetchSeasonalAverage, type DailySummary } from "@/lib/weather";
import { LeadTime } from "@/components/lead-time";
import { cityName, countryName } from "@/lib/places";
import { useT } from "@/lib/i18n";
import { FlagAnswer } from "@/components/site-hero";
import { PageTop } from "@/components/page-top";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTab } from "@/lib/use-url-tab";
import { compareHref } from "@/components/city-actions";
import { WORLD_CITIES } from "@/lib/cities";

interface Props {
  params: Promise<{ lat: string; lon: string }>;
  searchParams: Promise<{ name?: string; country?: string }>;
}

function Delta({ label, today, average }: { label: string; today: number; average: number }) {
  const diff = today - average;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums">{today.toFixed(1)} °C</div>
      <div className="text-sm text-muted-foreground">
        Seasonal average {average.toFixed(1)} °C ·{" "}
        <span className={diff > 0 ? "font-medium text-orange-500" : "font-medium text-sky-500"}>
          {diff > 0 ? "+" : "−"}
          {Math.abs(diff).toFixed(1)} °C
        </span>
      </div>
    </div>
  );
}

function HistoricalComparison({ lat, lon, today }: { lat: number; lon: number; today: DailySummary }) {
  const history = useAsync(() => fetchSeasonalAverage(lat, lon, today.date), [lat, lon, today.date]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compared with a normal year</CardTitle>
        <CardDescription>Today’s forecast peak vs. the same two-week window over the previous 5 years.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.loading && <Skeleton className="h-20 w-full" />}
        {history.error && (
          <p className="text-sm text-muted-foreground">Historical data is not available for this location right now.</p>
        )}
        {history.data && (
          <div className="grid gap-6 sm:grid-cols-2">
            <Delta label="Max temperature today" today={today.maxTemp} average={history.data.avgMaxTemp} />
            <Delta label="Max WBGT today" today={today.maxWbgt} average={history.data.avgMaxWbgt} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CITY_TABS = ["today", "week", "air", "normal"] as const;

export default function CityPage(props: Props) {
  const { t, lang } = useT();
  const params = use(props.params);
  const searchParams = use(props.searchParams);
  const lat = Number(params.lat);
  const lon = Number(params.lon);
  const valid = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const city = {
    name: searchParams.name?.slice(0, 100) || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    country: searchParams.country?.slice(0, 100) ?? "",
    lat,
    lon,
  };

  const result = useAsync(async () => {
    if (!valid) throw new Error("Invalid coordinates");
    // Air quality is an extra layer: if it fails the page shows heat only.
    const [forecast, air] = await Promise.all([fetchForecast(lat, lon), fetchAir(lat, lon).catch(() => undefined)]);
    return buildConditions(forecast, air);
  }, [lat, lon]);
  const c = result.data;

  // A client page can't export metadata, so name the tab here.
  useEffect(() => {
    document.title = `${valid ? city.name : "Unknown location"} · HeatSignal`;
  }, [valid, city.name]);

  const today = c?.days[0];
  const todayHours = c?.hours.filter((h) => h.time.startsWith(today!.date)) ?? [];
  const peak = todayHours.reduce<CombinedHour | undefined>(
    (p, h) => (!p || (h.score ?? h.wbgt) > (p.score ?? p.wbgt) ? h : p),
    undefined,
  );
  const minTemp = todayHours.length ? Math.min(...todayHours.map((h) => h.temp)) : 0;

  const [tab, setTab] = useUrlTab(CITY_TABS, "today");
  const other = city.name === "Abu Dhabi" ? WORLD_CITIES.find((x) => x.name === "Lahore")! : WORLD_CITIES.find((x) => x.name === "Abu Dhabi")!;
  const panel = "space-y-6 data-[state=inactive]:hidden";

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("dashboard")}
      </Link>

      <PageTop
        title={valid ? cityName(city.name, lang) : "Unknown location"}
        intro={
          <>
            {[countryName(city.country, lang), valid && `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`, c && `${formatDay(c.now.time)}, ${c.now.time.slice(11, 16)}`].filter(Boolean).join(" · ")}
            <span className="block">{t("cityQuestion")}</span>
          </>
        }
        aside={c && <CityActions city={city} c={c} peak={peak} />}
        answer={
          result.error ? (
            <ErrorState message={valid ? "Couldn’t load the forecast for this location." : "These coordinates aren’t valid."} onRetry={result.retry} />
          ) : (
            <div className="space-y-2">
              <FlagAnswer c={c ?? null} />
              {c?.now.score != null && (
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t("compoundToday")}:</span>
                  <CompoundBadge score={c.now.score} />
                  <span>{t(compoundBand(c.now.score).key)}</span>
                </p>
              )}
            </div>
          )
        }
        actions={
          <>
            <Button asChild>
              <Link href={`/worker-safety?lat=${lat}&lon=${lon}&name=${encodeURIComponent(city.name)}&country=${encodeURIComponent(city.country)}`}>
                <HardHat /> {t("workerPlanCity")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={compareHref(city, other)}><GitCompare /> {t("compareWord")}</Link>
            </Button>
          </>
        }
      />

      {result.loading && <Skeleton className="h-80 w-full rounded-lg" />}

      {c && today && (
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="h-auto flex-wrap" aria-label={t("detailTabs")}>
            <TabsTrigger value="today">{t("tabToday")}</TabsTrigger>
            <TabsTrigger value="week">{t("tab7Days")}</TabsTrigger>
            <TabsTrigger value="air">{t("airQuality")}</TabsTrigger>
            <TabsTrigger value="normal">{t("tabVsNormal")}</TabsTrigger>
          </TabsList>

          <TabsContent value="today" forceMount className={panel}>
            <LeadTime hours={c.hours} now={c.now} days={c.days} />
            <WorkPlanner hourly={c.hours} now={c.now.time.slice(0, 13)} />
            <AlertSection city={city} hour={c.now} />
          </TabsContent>

          <TabsContent value="week" forceMount className={panel}>
            <Card>
              <CardHeader>
                <CardTitle>Compound risk timeline</CardTitle>
                <CardDescription>
                  7 days, hour by hour, in three aligned panels: the combined score, heat stress (WBGT) and air quality (US AQI).
                  Shaded bands are each scale’s risk levels; hover one panel to read the same hour in all three.{!c.hasAir && " Air-quality data is not available here, so only heat is shown."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompoundChart
                  height={480}
                  nowTime={c.now.time}
                  data={c.hours.map((h) => ({ time: h.time, wbgt: h.wbgt, aqi: h.air?.aqi, score: h.score ?? undefined }))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Daily forecast</CardTitle>
                <CardDescription>Air-quality forecasts reach about 5 days ahead; later days show heat only.</CardDescription>
              </CardHeader>
              <CardContent>
                <ForecastTable daily={c.days} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="air" forceMount className={panel}>
            <ConditionsPanel now={c.now} today={today} minTemp={minTemp} />
            <VulnerableGroups hour={c.now} peak={peak} />
          </TabsContent>

          <TabsContent value="normal" forceMount className={panel}>
            <HistoricalComparison lat={lat} lon={lon} today={today} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
