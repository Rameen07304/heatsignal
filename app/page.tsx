"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardCheck, GitCompare, HardHat, Pill, Search, UserRound } from "lucide-react";
import { compareHref } from "@/components/city-actions";
import { OfficialsMenu } from "@/components/officials-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CityCard } from "@/components/city-card";
import { AddCityDialog } from "@/components/city-search";
import { CountUp } from "@/components/count-up";
import { ErrorState } from "@/components/error-state";
import { Leaderboard } from "@/components/leaderboard";
import { CompoundBadge } from "@/components/risk-badge";
import { UpcomingRisks } from "@/components/upcoming-risks";
import type { MapMode } from "@/components/weather-map";
import { AQI_BANDS, aqiBand, formatAqi } from "@/lib/air";
import { WORLD_CITIES, cityHref, cityKey, type City } from "@/lib/cities";
import type { Conditions } from "@/lib/conditions";
import { levelKey, useT, type Key } from "@/lib/i18n";
import { COMPOUND_BANDS, RISK_BANDS } from "@/lib/risk";
import { CRITICAL_SCORE } from "@/lib/risk-forecast";
import { useUpcoming } from "@/components/early-warning-banner";
import { hoursOf, worstHour } from "@/lib/use-city-conditions";
import { ok, useCities } from "@/lib/use-cities";
import { workRegimen } from "@/lib/work-rest";

const WeatherMap = dynamic(() => import("@/components/weather-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[320px] w-full" />,
});

const PAGE = 12;
const NONE = new Set<string>();

const lahore = WORLD_CITIES.find((c) => c.name === "Lahore")!;
const abuDhabi = WORLD_CITIES.find((c) => c.name === "Abu Dhabi")!;

const TASKS: { href: string; icon: typeof HardHat; title: Key; text: Key }[] = [
  { href: "/risk-assessment", icon: UserRound, title: "taskOwnRisk", text: "taskOwnRiskText" },
  { href: "/safety-advisor", icon: ClipboardCheck, title: "taskEvent", text: "taskEventText" },
  { href: "/worker-safety", icon: HardHat, title: "taskWorkers", text: "taskWorkersText" },
  { href: "/health-advisor", icon: Pill, title: "taskFood", text: "taskFoodText" },
  { href: compareHref(lahore, abuDhabi), icon: GitCompare, title: "taskCompare", text: "taskCompareText" },
];

const SORTS: Record<string, { label: Key; value: (c: Conditions) => number }> = {
  compound: { label: "combinedRisk", value: (c) => c.days[0].maxScore ?? -1 },
  heat: { label: "heatShort", value: (c) => c.days[0].maxWbgt },
  air: { label: "airQuality", value: (c) => c.now.air?.aqi ?? -1 },
};
type Sort = "compound" | "heat" | "air";

function Kpi({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{children}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

const people = (list: { city: City }[]) => Math.round(list.reduce((s, { city }) => s + (city.pop ?? 0), 0));

const LEGENDS: Record<MapMode, { label: Key; color: string }[]> = {
  compound: COMPOUND_BANDS.map((b) => ({ label: levelKey(b.level), color: b.color })),
  heat: RISK_BANDS.map((b) => ({ label: levelKey(b.level), color: b.color })),
  air: AQI_BANDS.map((b) => ({ label: b.key as Key, color: b.color })),
  vitd: [], // Health Advisor only
  work: [], // Workforce Risk only
};

const COUNTRY_KEY = "heatsignal-dashboard-country";
/** Shown first after "All countries": the challenge host. */
const FIRST_COUNTRY = "United Arab Emirates";

// useSearchParams needs a Suspense boundary on a statically rendered page.
export default function Dashboard() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}

function DashboardPage() {
  const { t, n } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const millions = (list: { city: City }[]) => t("millionPeople", { n: n(people(list)) });
  const { cities: allCities, add, remove, reset, data, airFailed, retry } = useCities();

  // Country filter: in the URL (?country=Pakistan) and remembered in this browser.
  const [country, setCountryState] = useState(params.get("country") ?? "");
  useEffect(() => {
    if (params.get("country")) return;
    try {
      const saved = localStorage.getItem(COUNTRY_KEY);
      if (saved) setCountryState(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first load only
  }, []);
  const setCountry = (c: string) => {
    setCountryState(c);
    try {
      if (c) localStorage.setItem(COUNTRY_KEY, c);
      else localStorage.removeItem(COUNTRY_KEY);
    } catch {}
    const q = new URLSearchParams(params.toString());
    if (c) q.set("country", c);
    else q.delete("country");
    router.replace(q.size ? `/?${q}` : "/", { scroll: false });
  };
  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of allCities) if (c.country) counts.set(c.country, (counts.get(c.country) ?? 0) + 1);
    return [...counts].sort(
      ([a, x], [b, y]) => Number(b === FIRST_COUNTRY) - Number(a === FIRST_COUNTRY) || y - x || a.localeCompare(b),
    );
  }, [allCities]);
  // A country that is no longer monitored shows everything.
  const activeCountry = countries.some(([c]) => c === country) ? country : "";
  const cities = useMemo(() => (activeCountry ? allCities.filter((c) => c.country === activeCountry) : allCities), [allCities, activeCountry]);
  const [mapMode, setMapMode] = useState<MapMode>("compound");
  const [sort, setSort] = useState<Sort>("compound");
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  const loaded = cities.flatMap((city) => {
    const s = data[cityKey(city)];
    return ok(s) ? [{ city, c: s }] : [];
  });
  const failed = cities.length > 0 && cities.every((city) => data[cityKey(city)] instanceof Error);
  const pending = loaded.length === 0 && !failed && cities.length > 0;

  const critical = loaded.filter(({ c }) => (c.days[0].maxScore ?? 0) >= CRITICAL_SCORE);
  const upcoming = useUpcoming().filter(({ city }) => !activeCountry || city.country === activeCountry);
  const hottest = loaded.reduce<{ city: City; c: Conditions } | null>((b, r) => (!b || r.c.days[0].maxWbgt > b.c.days[0].maxWbgt ? r : b), null);
  const worstAir = loaded.reduce<{ city: City; c: Conditions } | null>(
    (b, r) => (r.c.now.air && (!b || r.c.now.air.aqi > b.c.now.air!.aqi) ? r : b),
    null,
  );
  // Show the values at each city’s peak hour, so the numbers explain the score beside them.
  const top = [...loaded]
    .sort((a, b) => (b.c.days[0].maxScore ?? -1) - (a.c.days[0].maxScore ?? -1))
    .slice(0, 6)
    .map((r) => ({ ...r, peak: worstHour(hoursOf(r.c, r.c.days[0].date)) ?? r.c.now }));

  const heavy = loaded.map((r) => ({ ...r, w: workRegimen(r.c.days[0].maxWbgt, "heavy").workMin }));
  const work = { total: loaded.length, stop: heavy.filter((r) => r.w === 0), breaks: heavy.filter((r) => r.w > 0 && r.w < 60) };

  const monitored = useMemo(() => new Set(allCities.map(cityKey)), [allCities]);
  const q = filter.trim().toLowerCase();
  const sorted = useMemo(() => {
    const value = SORTS[sort].value;
    const score = (city: City) => {
      const s = data[cityKey(city)];
      return ok(s) ? value(s) : -2;
    };
    return cities
      .filter((c) => !q || `${c.name} ${c.country}`.toLowerCase().includes(q))
      .sort((a, b) => score(b) - score(a));
  }, [cities, data, sort, q]);
  const visible = showAll || q ? sorted : sorted.slice(0, PAGE);
  const isDefaultList = allCities.length === WORLD_CITIES.length && allCities.every((c, i) => cityKey(c) === cityKey(WORLD_CITIES[i]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("isItSafe")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("dashIntro", { n: allCities.length })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddCityDialog
            onAdd={(c) => router.push(cityHref(c))}
            monitored={NONE}
            label={t("checkYourCity")}
            title={t("findYourCity")}
            icon={<Search />}
          />
          <AddCityDialog onAdd={add} monitored={monitored} variant="outline" />
          <OfficialsMenu rows={loaded} />
        </div>
      </div>

      {countries.length > 1 && (
        <div className="space-y-2">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:thin]" role="group" aria-label={t("filterByCountry")}>
            {[["", allCities.length] as const, ...countries].map(([c, count]) => (
              <button
                key={c || "all"}
                type="button"
                aria-pressed={activeCountry === c}
                onClick={() => setCountry(c)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  activeCountry === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                }`}
              >
                {c ? `${c} (${count})` : t("allCountries")}
              </button>
            ))}
          </div>
          {activeCountry && !pending && hottest && (
            <p className="text-sm" role="status">
              {t("countrySummary", {
                country: activeCountry,
                n: cities.length,
                city: hottest.city.name,
                wbgt: n(hottest.c.days[0].maxWbgt, 1),
                k: work.stop.length,
                p: n(people([...work.stop, ...work.breaks])),
              })}
            </p>
          )}
        </div>
      )}

      <nav aria-label={t("whatToDoNav")} className="grid grid-cols-2 gap-3 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        {TASKS.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <Icon className="h-5 w-5 text-primary" />
            <div className="mt-2 text-sm font-medium group-hover:text-primary">{t(title)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{t(text)}</div>
          </Link>
        ))}
      </nav>

      {failed ? (
        <ErrorState message={t("weatherLoadError")} onRetry={retry} />
      ) : (
        <>
          <section aria-label={t("summary")} className="grid grid-cols-2 [&>*]:min-w-0 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Kpi label={t("citiesMonitored")} sub={pending ? t("loading") : t("withLiveData", { n: loaded.length })}>
              <CountUp value={cities.length} />
            </Kpi>
            <Kpi label={t("atCritical")} sub={pending ? t("loading") : millions(critical)}>
              {pending || airFailed ? "–" : <CountUp value={critical.length} />}
            </Kpi>
            <Kpi label={t("highestWbgt")} sub={hottest ? `WBGT · ${hottest.city.name}, ${hottest.city.country}` : t("loading")}>
              {hottest ? <><CountUp value={hottest.c.days[0].maxWbgt} decimals={1} /> °C</> : "–"}
            </Kpi>
            <Kpi
              label={t("worstAqi")}
              sub={worstAir ? `${worstAir.city.name} · ${t(aqiBand(worstAir.c.now.air!.aqi).key)}` : airFailed ? t("airFeedUnavailable") : t("loading")}
            >
              {worstAir ? formatAqi(worstAir.c.now.air!.aqi) : "–"}
            </Kpi>
            <Kpi label={t("risingRisks")} sub={t("highIn48h")}>
              {pending || airFailed ? "–" : <CountUp value={upcoming.length} />}
            </Kpi>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="flex min-w-0 flex-col xl:col-span-2">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">{t("riskMap")}</CardTitle>
                  <CardDescription>{t(mapMode === "air" ? "mapAirNow" : "mapPeakToday")} {t("clickDot")}</CardDescription>
                </div>
                <Tabs value={mapMode} onValueChange={(v) => setMapMode(v as MapMode)}>
                  <TabsList aria-label={t("mapLayer")}>
                    <TabsTrigger value="compound">{t("combined")}</TabsTrigger>
                    <TabsTrigger value="heat">{t("heatShort")}</TabsTrigger>
                    <TabsTrigger value="air">{t("airShort")}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="min-h-[320px] flex-1 sm:min-h-[420px]">
                  <WeatherMap key={activeCountry} cities={cities} data={data} mode={mapMode} />
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label={t("mapLegend")}>
                  {LEGENDS[mapMode].map((l) => (
                    <li key={l.label} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                      {t(l.label)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("highestRiskToday")}</CardTitle>
                <CardDescription>{t("highestRiskTodayIntro")}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {pending ? (
                  <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="ps-4">{t("cityAtPeak")}</TableHead>
                        <TableHead className="pe-4 text-end">{t("score")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top.map(({ city, c, peak }) => (
                        <TableRow key={cityKey(city)}>
                          <TableCell className="ps-4">
                            <Link href={cityHref(city)} className="font-medium hover:underline">{city.name}</Link>
                            <div className="text-xs text-muted-foreground">{city.country} · {t("peakAt", { time: peak.time.slice(11, 16) })}</div>
                            <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                              <span className="whitespace-nowrap" title="WBGT">{t("heatShort")} {peak.wbgt.toFixed(1)}°</span>
                              {peak.air && <span className="whitespace-nowrap">AQI {formatAqi(peak.air.aqi)}</span>}
                              {peak.air && peak.air.dust > 100 && <span className="whitespace-nowrap">{t("dustWord")}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="pe-4 text-end">{c.days[0].maxScore != null ? <CompoundBadge score={c.days[0].maxScore} /> : "–"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold"><HardHat className="h-5 w-5 text-primary" /> {t("workforceImpact")}</h2>
                <p className="text-sm text-muted-foreground">{t("workforceImpactIntro")}</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link href="/workforce-risk">{t("planByIndustry")}</Link></Button>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                [t("mustStopOutdoor"), pending ? "–" : t("nOfTotal", { n: work.stop.length, total: work.total }), pending ? "" : t("liveInTheseCities", { people: millions(work.stop) })],
                [t("needBreakSchedules"), pending ? "–" : t("nOfTotal", { n: work.breaks.length, total: work.total }), pending ? "" : millions(work.breaks)],
                [t("normalWorkAllDay"), pending ? "–" : t("nOfTotal", { n: work.total - work.stop.length - work.breaks.length, total: work.total }), t("citiesWord")],
              ].map(([k, v, s]) => (
                <div key={k} className="rounded-md bg-muted/40 p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="text-xl font-semibold tabular-nums">{v}</dd>
                  <dd className="text-xs text-muted-foreground">{s}</dd>
                </div>
              ))}
            </dl>
          </section>

          <UpcomingRisks />

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{t("globalRankings")}</h2>
              <p className="text-sm text-muted-foreground">{t("rankingsIntro")}</p>
            </div>
            {pending ? <Skeleton className="h-96 w-full" /> : <Leaderboard rows={loaded} />}
          </section>
        </>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t("monitoredCities")}</h2>
            <p className="text-sm text-muted-foreground">{t("monitoredIntro")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <TabsList aria-label={t("sortBy")}>
                {Object.entries(SORTS).map(([k, s]) => <TabsTrigger key={k} value={k}>{t(s.label)}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="search" aria-label={t("filterCities")} placeholder={t("filterCitiesPlaceholder")} className="ps-9" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
          </div>
        </div>

        {cities.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            <p>{t("noCitiesMonitored")}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
              {t("restoreDefaults", { n: WORLD_CITIES.length })}
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("noCityMatches", { filter, add: t("addCity") })}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((city) => (
              <CityCard key={cityKey(city)} city={city} state={data[cityKey(city)]} onRetry={retry} onRemove={() => remove(city)} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!q && sorted.length > PAGE && (
            <Button variant="outline" onClick={() => setShowAll(!showAll)}>
              {showAll ? t("showTop", { n: PAGE }) : t("showAllCities", { n: sorted.length })}
            </Button>
          )}
          {!isDefaultList && (
            <Button variant="ghost" size="sm" onClick={reset}>
              {t("resetDefaults", { n: WORLD_CITIES.length })}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
