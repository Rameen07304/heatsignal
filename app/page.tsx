"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useT } from "@/lib/i18n";
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

const TASKS = [
  { href: "/risk-assessment", icon: UserRound, title: "Check my own risk", text: "Based on your age, health and plans" },
  { href: "/safety-advisor", icon: ClipboardCheck, title: "Plan an outdoor event", text: "Go, adjust or postpone, up to a week ahead" },
  { href: "/worker-safety", icon: HardHat, title: "Keep workers safe", text: "Work and rest times, water, site notice" },
  { href: "/health-advisor", icon: Pill, title: "Food and supplements", text: "Vitamin D, water and protection for today" },
  { href: compareHref(lahore, abuDhabi), icon: GitCompare, title: "Compare two cities", text: "Side by side, next 3 days" },
];

const SORTS = {
  compound: { label: "Combined risk", value: (c: Conditions) => c.days[0].maxScore ?? -1 },
  heat: { label: "Heat", value: (c: Conditions) => c.days[0].maxWbgt },
  air: { label: "Air quality", value: (c: Conditions) => c.now.air?.aqi ?? -1 },
};
type Sort = keyof typeof SORTS;

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

const LEGENDS: Record<MapMode, { label: string; color: string }[]> = {
  compound: COMPOUND_BANDS.map((b) => ({ label: b.level, color: b.color })),
  heat: RISK_BANDS.map((b) => ({ label: b.level, color: b.color })),
  air: AQI_BANDS.map((b) => ({ label: b.label.replace(" for sensitive groups", " (sensitive)"), color: b.color })),
  vitd: [], // Health Advisor only
  work: [], // Workforce Risk only
};

export default function Dashboard() {
  const { t } = useT();
  const router = useRouter();
  const { cities, add, remove, reset, data, airFailed, retry } = useCities();
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
  const upcoming = useUpcoming();
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

  const monitored = useMemo(() => new Set(cities.map(cityKey)), [cities]);
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
  const isDefaultList = cities.length === WORLD_CITIES.length && cities.every((c, i) => cityKey(c) === cityKey(WORLD_CITIES[i]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("isItSafe")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Live heat, air pollution and UV risk for {cities.length} cities worldwide. Find your city to see how risky it is
            outside today, and what to do about it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddCityDialog
            onAdd={(c) => router.push(cityHref(c))}
            monitored={NONE}
            label="Check your city"
            title="Find your city"
            icon={<Search />}
          />
          <AddCityDialog onAdd={add} monitored={monitored} variant="outline" />
          <OfficialsMenu rows={loaded} />
        </div>
      </div>

      <nav aria-label="What do you want to do?" className="grid grid-cols-2 gap-3 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        {TASKS.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
            <Icon className="h-5 w-5 text-primary" />
            <div className="mt-2 text-sm font-medium group-hover:text-primary">{title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{text}</div>
          </Link>
        ))}
      </nav>

      {failed ? (
        <ErrorState message="Couldn’t load weather data. Check your connection and try again." onRetry={retry} />
      ) : (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 [&>*]:min-w-0 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Kpi label={t("citiesMonitored")} sub={pending ? "Loading…" : `${loaded.length} with live data`}>
              <CountUp value={cities.length} />
            </Kpi>
            <Kpi label={t("atCritical")} sub={pending ? "Loading…" : `≈ ${people(critical).toLocaleString("en")} million people`}>
              {pending || airFailed ? "–" : <CountUp value={critical.length} />}
            </Kpi>
            <Kpi label={t("highestWbgt")} sub={hottest ? `WBGT · ${hottest.city.name}, ${hottest.city.country}` : "Loading…"}>
              {hottest ? <><CountUp value={hottest.c.days[0].maxWbgt} decimals={1} /> °C</> : "–"}
            </Kpi>
            <Kpi
              label={t("worstAqi")}
              sub={worstAir ? `${worstAir.city.name} · ${aqiBand(worstAir.c.now.air!.aqi).label}` : airFailed ? "Air-quality feed unavailable" : "Loading…"}
            >
              {worstAir ? formatAqi(worstAir.c.now.air!.aqi) : "–"}
            </Kpi>
            <Kpi label={t("risingRisks")} sub="High or worse in 48 h">
              {pending || airFailed ? "–" : <CountUp value={upcoming.length} />}
            </Kpi>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="flex min-w-0 flex-col xl:col-span-2">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Risk map</CardTitle>
                  <CardDescription>
                    {mapMode === "air" ? "Air quality right now." : "Today’s peak at each city. Larger dots are higher risk."} Click a
                    dot for details.
                  </CardDescription>
                </div>
                <Tabs value={mapMode} onValueChange={(v) => setMapMode(v as MapMode)}>
                  <TabsList aria-label="Map layer">
                    <TabsTrigger value="compound">Combined</TabsTrigger>
                    <TabsTrigger value="heat">Heat</TabsTrigger>
                    <TabsTrigger value="air">Air</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="min-h-[320px] flex-1 sm:min-h-[420px]">
                  <WeatherMap cities={cities} data={data} mode={mapMode} />
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Map legend">
                  {LEGENDS[mapMode].map((l) => (
                    <li key={l.label} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Highest risk today</CardTitle>
                <CardDescription>Each city’s worst hour today, with its heat and air at that hour.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {pending ? (
                  <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="ps-4">City · at peak hour</TableHead>
                        <TableHead className="pe-4 text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top.map(({ city, c, peak }) => (
                        <TableRow key={cityKey(city)}>
                          <TableCell className="ps-4">
                            <Link href={cityHref(city)} className="font-medium hover:underline">{city.name}</Link>
                            <div className="text-xs text-muted-foreground">{city.country} · peak {peak.time.slice(11, 16)}</div>
                            <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                              <span className="whitespace-nowrap" title="Heat stress (WBGT)">Heat {peak.wbgt.toFixed(1)}°</span>
                              {peak.air && <span className="whitespace-nowrap">AQI {formatAqi(peak.air.aqi)}</span>}
                              {peak.air && peak.air.dust > 100 && <span className="whitespace-nowrap">dust</span>}
                            </div>
                          </TableCell>
                          <TableCell className="pe-4 text-right">{c.days[0].maxScore != null ? <CompoundBadge score={c.days[0].maxScore} /> : "–"}</TableCell>
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
                <h2 className="flex items-center gap-2 text-base font-semibold"><HardHat className="h-5 w-5 text-primary" /> Workforce impact today</h2>
                <p className="text-sm text-muted-foreground">Heavy outdoor work (construction, farming, sanitation) at each city’s hottest hour.</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link href="/workforce-risk">Plan by industry</Link></Button>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Must stop outdoor work", pending ? "–" : `${work.stop.length} of ${work.total}`, pending ? "" : `≈ ${people(work.stop).toLocaleString("en")} million people live in these cities`],
                ["Need break schedules", pending ? "–" : `${work.breaks.length} of ${work.total}`, pending ? "" : `≈ ${people(work.breaks).toLocaleString("en")} million people`],
                ["Normal work all day", pending ? "–" : `${work.total - work.stop.length - work.breaks.length} of ${work.total}`, "cities"],
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
              <p className="text-sm text-muted-foreground">Every monitored city, this hour. Click a column to sort.</p>
            </div>
            {pending ? <Skeleton className="h-96 w-full" /> : <Leaderboard rows={loaded} />}
          </section>
        </>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t("monitoredCities")}</h2>
            <p className="text-sm text-muted-foreground">Heat, air and combined risk now, with the next 24 hours.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <TabsList aria-label="Sort cities by">
                {Object.entries(SORTS).map(([k, s]) => <TabsTrigger key={k} value={k}>{s.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="search" aria-label="Filter monitored cities" placeholder="Filter cities…" className="ps-9" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
          </div>
        </div>

        {cities.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            <p>No cities monitored.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
              Restore the {WORLD_CITIES.length} default cities
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No monitored city matches “{filter}”. Use {t("addCity")} to search the whole world.
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
              {showAll ? `Show top ${PAGE}` : `Show all ${sorted.length} cities`}
            </Button>
          )}
          {!isDefaultList && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset to the {WORLD_CITIES.length} default cities
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
