"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Check,
  Copy,
  Droplets,
  Fish,
  GlassWater,
  Loader2,
  Moon,
  Share2,
  Shield,
  Sparkles,
  Sun,
  Umbrella,
  Utensils,
  Wind,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CityPicker } from "@/components/city-picker";
import { ErrorState } from "@/components/error-state";
import { GaugeRing } from "@/components/gauge-ring";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { formatAqi } from "@/lib/air";
import { alertBody, postAlert } from "@/lib/alert-client";
import { WORLD_CITIES, type City } from "@/lib/cities";
import {
  dayProfile,
  healthScores,
  LEVEL_LABEL,
  recommendations,
  VITD_COLORS,
  type Category,
  type IconName,
  type Priority,
  type Recommendation,
} from "@/lib/health-advisor";
import { useT } from "@/lib/i18n";
import { useCities } from "@/lib/use-cities";
import { hoursOf, useCityConditions, worstHour } from "@/lib/use-city-conditions";
import { formatDay } from "@/lib/utils";

const WeatherMap = dynamic(() => import("@/components/weather-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[320px] w-full" />,
});

const ICONS: Record<IconName, typeof Sun> = {
  sun: Sun, shield: Shield, wind: Wind, droplets: Droplets, glass: GlassWater, umbrella: Umbrella,
  fish: Fish, zap: Zap, utensils: Utensils, moon: Moon,
};
const PRIORITY: Record<Priority, { label: string; color: string }> = {
  essential: { label: "Essential", color: "#dc2626" },
  recommended: { label: "Recommended", color: "#ea580c" },
  optional: { label: "Optional", color: "#2563eb" },
};
const CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "supplement", label: "Nutrition" },
  { value: "hydration", label: "Hydration" },
  { value: "protection", label: "Protection" },
  { value: "lifestyle", label: "Lifestyle" },
];

const scoreColor = (s: number) => (s >= 75 ? "#16a34a" : s >= 50 ? "#eab308" : s >= 25 ? "#f97316" : "#dc2626");
const plain = (s: string) => s.replace(/\*\*/g, "");

/** Renders **marked** figures in bold. */
function Marked({ text }: { text: string }) {
  return <>{text.split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 ? <b key={i} className="text-foreground">{part}</b> : part))}</>;
}

function PriorityPill({ p }: { p: Priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY[p].color }} aria-hidden />
      {PRIORITY[p].label}
    </span>
  );
}

function RecCard({ r, i }: { r: Recommendation; i: number }) {
  const Icon = ICONS[r.icon];
  return (
    <Card className="animate-page-in" style={{ animationDelay: `${i * 50}ms` }}>
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: `${PRIORITY[r.priority].color}14`, color: PRIORITY[r.priority].color }}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <PriorityPill p={r.priority} />
        </div>
        <h3 className="font-semibold leading-snug">{r.name}</h3>
        <p className="text-sm text-muted-foreground"><Marked text={r.why} /></p>
        <p className="mt-auto border-t pt-3 text-sm text-muted-foreground">{r.suggestion}</p>
      </CardContent>
    </Card>
  );
}

function VitaminDMap() {
  const { cities, data } = useCities();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Global vitamin D map</CardTitle>
        <CardDescription>
          How likely people in each monitored city are to need vitamin D from food or supplements, from today’s daytime UV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-[360px] sm:h-[440px]">
          <WeatherMap cities={cities} data={data} mode="vitd" />
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Map legend">
          {(["low", "moderate", "high", "very_high"] as const).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VITD_COLORS[k] }} />
              {LEVEL_LABEL[k]} need
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Cities in red: daytime UV is too low today for the skin to make useful vitamin D, so residents very likely need
          it from food or a supplement. Grey cities have no UV forecast.
        </p>
      </CardContent>
    </Card>
  );
}

export default function HealthAdvisorPage() {
  const { t } = useT();
  const [city, setCity] = useState<City>(WORLD_CITIES.find((c) => c.name === "Lahore")!);
  const [category, setCategory] = useState<Category | "all">("all");
  const [report, setReport] = useState<string[] | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const result = useCityConditions(city);
  const c = result.data;
  const name = city.name;

  const today = c && dayProfile(c.hours, c.days[0].date, city.lat);
  const recs = today ? recommendations(today, name) : [];
  const shown = category === "all" ? recs : recs.filter((r) => r.category === category);
  const scores = today && healthScores(today);
  const week = c ? c.days.map((d) => ({ d, p: dayProfile(c.hours, d.date, city.lat) })) : [];

  function pickCity(next: City) {
    setCity(next);
    setReport(null);
    setReportError(null);
  }

  async function generate() {
    const worst = c && worstHour(hoursOf(c, c.days[0].date));
    if (!worst || !today) return;
    setLoading(true);
    setReport(null);
    setReportError(null);
    try {
      const r = await postAlert<{ paragraphs: string[] }>(
        alertBody(city, worst, {
          stage: "health",
          health: {
            date: formatDay(today.date),
            avgUv: today.sun?.avgUv,
            uvHours: today.sun?.uvHours,
            vitD: today.sun?.vitD,
            nightMin: today.nightMin ?? undefined,
            waterL: today.heat.waterL,
            recs: recs.slice(0, 8).map((r) => `${r.name} (${r.priority}): ${plain(r.suggestion)}`),
          },
        }),
      );
      setReport(r.paragraphs);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const reportText = (ps: string[]) =>
    [`HeatSignal health advisory — ${name}, ${today && formatDay(today.date)}`, "", ...ps.flatMap((p) => [p, ""]),
      "General wellness guidance based on environmental data, not medical advice. Consult your healthcare provider before starting any supplement."].join("\n");

  async function copy(ps: string[]) {
    try {
      await navigator.clipboard.writeText(reportText(ps));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("healthAdvisor")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          What today’s sunlight, air and heat mean for your body: vitamin D, hydration, lung and skin protection, with
          nutrition and lifestyle suggestions tied to the live numbers.
        </p>
      </div>

      <MedicalDisclaimer />

      <CityPicker value={city} onChange={pickCity} />

      {result.loading && <Skeleton className="h-96 w-full rounded-lg" />}
      {result.error && <ErrorState message="Couldn’t load conditions." onRetry={result.retry} />}

      {c && today && scores && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Temperature now", `${c.now.temp.toFixed(0)} °C`],
              ["Peak UV today", today.sun ? today.sun.peakUv.toFixed(1) : "—"],
              ["Worst AQI today", today.air ? formatAqi(today.air.aqi) : "—"],
              ["Peak WBGT today", `${today.heat.wbgt.toFixed(1)} °C`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-card p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 text-xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Environmental health score</CardTitle>
              <CardDescription>Each score runs 0–100; higher is better for your health.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {([
                ["Sunlight for vitamin D", scores.sunlight, today.sun ? `${today.sun.uvHours} h at UV 3+` : "No UV data"],
                ["Air quality", scores.air, today.air ? `AQI ${formatAqi(today.air.aqi)}` : "No air data"],
                ["Heat comfort", scores.heat, `WBGT ${today.heat.wbgt.toFixed(1)} °C`],
                ["UV skin safety", scores.skin, today.skin?.burnMin ? `Burn in ~${today.skin.burnMin} min` : today.sun ? "Low burn risk" : "No UV data"],
              ] as const).map(([label, s, sub]) => (
                <GaugeRing key={label} size={92} fraction={(s ?? 0) / 100} color={s == null ? "#94a3b8" : scoreColor(s)} value={s == null ? "—" : String(s)} label={label} sub={sub} />
              ))}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Today’s recommendations for {name}</h2>
                <p className="text-sm text-muted-foreground">Rule-based, from the numbers above. Most important first.</p>
              </div>
              <Tabs value={category} onValueChange={(v) => setCategory(v as Category | "all")}>
                <TabsList aria-label="Recommendation type" className="h-auto flex-wrap">
                  {CATEGORIES.map((x) => {
                    const n = x.value === "all" ? recs.length : recs.filter((r) => r.category === x.value).length;
                    return <TabsTrigger key={x.value} value={x.value} disabled={!n}>{x.label} {n > 0 && <span className="ms-1 text-muted-foreground">{n}</span>}</TabsTrigger>;
                  })}
                </TabsList>
              </Tabs>
            </div>
            <div key={category} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((r, i) => <RecCard key={r.id} r={r} i={i} />)}
            </div>
          </section>

          <Card className="border-s-4 border-s-primary">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">Your health report</CardTitle>
                <CardDescription>A short advisory in plain words, written by Gemini from today’s data and the recommendations above.</CardDescription>
              </div>
              <Button onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Get your health report
              </Button>
            </CardHeader>
            {(report || reportError) && (
              <CardContent className="space-y-3 text-sm">
                {reportError && <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3">{reportError}</p>}
                {report && (
                  <>
                    {report.map((p) => <p key={p} className="leading-relaxed">{p}</p>)}
                    <MedicalDisclaimer />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(report)}>
                        {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
                      </Button>
                      {canShare && (
                        <Button size="sm" variant="outline" onClick={() => navigator.share({ title: `HeatSignal health advisory — ${name}`, text: reportText(report) }).catch(() => {})}>
                          <Share2 /> Share
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">AI-generated — check it against the recommendations above.</p>
                  </>
                )}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly outlook</CardTitle>
              <CardDescription>The air-quality and UV forecast covers about five days; later days show heat only.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>UV avg</TableHead>
                    <TableHead>Vitamin D need</TableHead>
                    <TableHead>AQI</TableHead>
                    <TableHead>Lungs</TableHead>
                    <TableHead>WBGT</TableHead>
                    <TableHead>Water</TableHead>
                    <TableHead>Top recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {week.map(({ d, p }, i) => {
                    const top = recommendations(p, name)[0];
                    return (
                      <TableRow key={d.date}>
                        <TableCell className="whitespace-nowrap font-medium">{i === 0 ? "Today" : formatDay(d.date)}</TableCell>
                        <TableCell className="tabular-nums">{p.sun ? p.sun.avgUv.toFixed(1) : "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {p.sun ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: VITD_COLORS[p.sun.risk] }} aria-hidden />
                              {LEVEL_LABEL[p.sun.risk]}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">{p.air ? formatAqi(p.air.aqi) : "—"}</TableCell>
                        <TableCell>{p.air ? LEVEL_LABEL[p.air.respiratory] : "—"}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{p.heat.wbgt.toFixed(1)} °C</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{p.heat.waterL} L</TableCell>
                        <TableCell className="min-w-48">{top && <span className="inline-flex flex-wrap items-center gap-2">{top.name} <PriorityPill p={top.priority} /></span>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <VitaminDMap />
    </div>
  );
}
