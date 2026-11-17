"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog } from "@/components/alert";
import { CompoundChart } from "@/components/compound-chart";
import { ErrorState } from "@/components/error-state";
import { ForecastTable } from "@/components/forecast-table";
import { WbgtChart } from "@/components/wbgt-chart";
import { listRanges } from "@/components/work-planner";
import { UNHEALTHY_AQI, fetchAirArchive, formatAqi } from "@/lib/air";
import { combineDays, combineHours, type CombinedDay, type CombinedHour } from "@/lib/conditions";
import { COMPOUND_BANDS, RISK_COLORS, compoundBand } from "@/lib/risk";
import { useAsync } from "@/lib/use-async";
import { formatDay } from "@/lib/utils";
import { fetchArchive, summarizeDaily } from "@/lib/weather";
import { hourRanges, workRegimen } from "@/lib/work-rest";
import CASE_NORMALS from "@/lib/case-normals.json";

interface CaseStudy {
  id: string;
  title: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  start: string;
  end: string;
  /** Air-quality archive exists only from mid-2022. */
  withAir: boolean;
  hero: { value: string; label: string };
  summary: string;
  /** Approximate date of the worst reported impact, from contemporary reporting. */
  eventDate: string;
  eventLabel: string;
  /** How the event reads mid-sentence. */
  eventPhrase: string;
}

const CASES: CaseStudy[] = [
  {
    id: "karachi-2015",
    title: "Karachi heatwave, June 2015",
    city: "Karachi",
    country: "Pakistan",
    lat: 24.86,
    lon: 67.01,
    start: "2015-06-10",
    end: "2015-06-30",
    withAir: false,
    hero: { value: "~1,200", label: "deaths in Karachi" },
    summary:
      "Temperatures across Sindh reached 49 °C with very high humidity in Karachi. Power cuts and Ramadan fasting compounded the heat; hospitals and morgues were overwhelmed.",
    eventDate: "2015-06-22",
    eventLabel: "Peak deaths (approx.)",
    eventPhrase: "deaths peaked",
  },
  {
    id: "sindh-2024",
    title: "Sindh heatwave, May 2024",
    city: "Jacobabad",
    country: "Pakistan",
    lat: 28.28,
    lon: 68.45,
    start: "2024-05-15",
    end: "2024-06-05",
    withAir: false,
    hero: { value: "52 °C", label: "recorded in Jacobabad" },
    summary:
      "A prolonged heatwave across Sindh pushed Jacobabad to 52 °C — among the highest temperatures ever measured in Pakistan. Early warning could have triggered work-stop advisories for outdoor labourers.",
    eventDate: "2024-05-26",
    eventLabel: "52 °C recorded (approx.)",
    eventPhrase: "the 52 °C reading",
  },
  {
    id: "delhi-2023",
    title: "Delhi smog with lingering heat, November 2023",
    city: "Delhi",
    country: "India",
    lat: 28.61,
    lon: 77.21,
    start: "2023-11-01",
    end: "2023-11-15",
    withAir: true,
    hero: { value: "400+", label: "AQI on India’s own scale (“severe”)" },
    summary:
      "Delhi’s air reached “severe” levels for days in early November 2023 and primary schools were closed — while afternoons were still around 30 °C. Temperature-only warning systems saw nothing; the compound score shows both hazards at once.",
    eventDate: "2023-11-03",
    eventLabel: "Schools closed (approx.)",
    eventPhrase: "schools were closed",
  },
];

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** A heatwave: daily max WBGT at least this far above the local normal… */
const ANOMALY_C = 1;
/** …for this many days in a row. */
const RUN_DAYS = 2;
const NORMAL_YEARS = CASE_NORMALS.years;

/**
 * Usual daily max WBGT for each calendar day (MM-DD), averaged over the previous years. Precomputed by
 * scripts/case-normals.ts — history doesn't change, so visitors needn't make 5 archive requests per case.
 */
const normalsFor = (id: string) => {
  const n = (CASE_NORMALS as unknown as Record<string, Record<string, number> | undefined>)[id];
  return n ? new Map(Object.entries(n)) : undefined;
};

async function loadCase(c: CaseStudy) {
  const [hourly, air] = await Promise.all([
    fetchArchive(c.lat, c.lon, c.start, c.end),
    c.withAir ? fetchAirArchive(c.lat, c.lon, c.start, c.end) : Promise.resolve(undefined),
  ]);
  const hours = combineHours(hourly, air);
  return { hours, days: combineDays(summarizeDaily(hourly), hours), normal: normalsFor(c.id) };
}

/** The day a heatwave would be declared: the last day of the first run of RUN_DAYS unusually hot days. */
function heatwaveStart(days: CombinedDay[], normal: Map<string, number>) {
  let run = 0;
  for (const d of days) {
    const n = normal.get(d.date.slice(5));
    run = n != null && d.maxWbgt - n >= ANOMALY_C ? run + 1 : 0;
    if (run === RUN_DAYS) return { day: d, anomaly: d.maxWbgt - n! };
  }
  return null;
}

/** What the archived data actually supports — nothing below is hard-coded. */
function findings(c: CaseStudy, days: CombinedDay[], hours: CombinedHour[], normal?: Map<string, number>) {
  const peak = days.reduce((a, b) => (b.maxWbgt > a.maxWbgt ? b : a));
  const peakHours = hours.filter((h) => h.time.startsWith(peak.date));
  const peakHour = peakHours.reduce((a, b) => ((b.score ?? b.wbgt) > (a.score ?? a.wbgt) ? b : a));
  const firstExtreme = days.find((d) => d.risk === "Extreme");
  const extremeDays = days.filter((d) => d.risk === "Extreme").length;
  const stopRanges = hourRanges(peakHours, (h) => workRegimen(h.wbgt, "moderate").workMin === 0);

  if (c.withAir) {
    const worst = days.reduce((a, b) => ((b.maxScore ?? 0) > (a.maxScore ?? 0) ? b : a));
    const smogDays = days.filter((d) => (d.maxAqi ?? 0) >= UNHEALTHY_AQI).length;
    const worstHour = hours
      .filter((h) => h.time.startsWith(worst.date))
      .reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a));
    return {
      peakHour: worstHour,
      markerDate: worst.date,
      markerLabel: `Compound ${worst.maxScore}`,
      headline: `Compound risk reached ${worst.maxScore}/100 (${worst.level}) on ${formatDay(worst.date)} — while heat on its own was only “${worst.risk}”.`,
      detail: `Air quality was “Unhealthy” or worse on ${smogDays} of ${days.length} days (model peak AQI ${formatAqi(Math.max(...days.map((d) => d.maxAqi ?? 0)))}), with afternoon WBGT up to ${peak.maxWbgt.toFixed(1)} °C.`,
      actions: [
        `Unhealthy-air alerts on ${smogDays} of ${days.length} days, starting ${formatDay(days.find((d) => (d.maxAqi ?? 0) >= UNHEALTHY_AQI)?.date ?? c.start)}.`,
        "N95 masks for traffic police, street vendors, construction and delivery workers on every smog day.",
        "School sport and outdoor assemblies moved indoors; asthma and heart patients told to stay in.",
        "Compound alerts on warm afternoons, when heat raises breathing rate and so the dose of polluted air.",
      ],
    };
  }

  // In humid summers WBGT can sit above "Extreme" every day, so the threshold alone carries little
  // warning. A heatwave is heat that is unusual for this place and season.
  const wave = normal ? heatwaveStart(days, normal) : null;
  const flagDate = wave?.day.date ?? firstExtreme?.date;
  const lead = flagDate ? dayDiff(flagDate, c.eventDate) : 0;
  const peakAnomaly = normal ? Math.max(...days.map((d) => d.maxWbgt - (normal.get(d.date.slice(5)) ?? d.maxWbgt))) : 0;
  return {
    peakHour,
    markerDate: flagDate && flagDate !== c.eventDate ? flagDate : undefined,
    markerLabel: wave ? "Heatwave warning" : "Extreme flagged",
    headline: wave
      ? lead > 0
        ? `HeatSignal would have issued a heatwave warning on ${formatDay(wave.day.date)} — ${lead} day${lead === 1 ? "" : "s"} before ${c.eventPhrase} — as WBGT ran ${wave.anomaly.toFixed(1)} °C above the local normal.`
        : `HeatSignal would have issued a heatwave warning on ${formatDay(wave.day.date)}, as WBGT ran ${wave.anomaly.toFixed(1)} °C above the local normal.`
      : !firstExtreme
        ? "WBGT stayed below the Extreme threshold in this window."
        : `HeatSignal would have flagged Extreme risk on ${formatDay(firstExtreme.date)}.`,
    detail:
      `${extremeDays} of ${days.length} days were above the Extreme threshold — normal for this climate in this season, so HeatSignal also ` +
      `watches for heat that is unusual: a warning when WBGT runs ${ANOMALY_C} °C or more above the ${NORMAL_YEARS}-year normal for ${RUN_DAYS} days in a row.` +
      (normal ? ` At its worst, WBGT was ${peakAnomaly.toFixed(1)} °C above normal (peak ${peak.maxWbgt.toFixed(1)} °C on ${formatDay(peak.date)}).` : ""),
    actions: [
      wave
        ? `Heatwave warnings in Urdu and English from ${formatDay(wave.day.date)}${lead > 0 ? `, ${lead} days before ${c.eventPhrase}` : ""}.`
        : "Rising-heat advisories as WBGT climbed.",
      stopRanges.length
        ? `On the peak day, a work-stop for moderate outdoor work from ${listRanges(stopRanges)}.`
        : "Rest-break schedules for outdoor workers on the hottest afternoons.",
      "Hospitals and ambulance services told to prepare for heat-stroke cases.",
      "Neighbourhood checks on older people living alone, and cooling centres during power cuts.",
    ],
  };
}

function CaseStudyCard({ c }: { c: CaseStudy }) {
  const archive = useAsync(() => loadCase(c), [c.id]);
  const data = archive.data;
  const f = data?.days.length ? findings(c, data.days, data.hours, data.normal) : null;
  const accent = c.withAir ? COMPOUND_BANDS[3].color : RISK_COLORS.Extreme;

  return (
    <Card id={c.id}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="max-w-2xl">
          <CardTitle className="text-xl">{c.title}</CardTitle>
          <CardDescription>
            {c.city}, {c.country} · {formatDay(c.start)} – {formatDay(c.end)}
          </CardDescription>
          <p className="mt-3 text-sm leading-relaxed">{c.summary}</p>
        </div>
        <div className="rounded-xl border p-4 text-right" style={{ borderColor: `${accent}66`, backgroundColor: `${accent}14` }}>
          <div className="text-4xl font-black tracking-tight tabular-nums" style={{ color: accent }}>{c.hero.value}</div>
          <div className="text-xs text-muted-foreground">{c.hero.label}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {archive.loading && <Skeleton className="h-80 w-full rounded-xl" />}
        {archive.error && <ErrorState message="Couldn’t load archive data." onRetry={archive.retry} />}
        {data && !f && <p className="text-sm text-muted-foreground">No archive data returned for this period.</p>}

        {data && f && (
          <>
            <div className="rounded-lg border p-4" style={{ borderColor: `${accent}80`, backgroundColor: `${accent}14` }}>
              <p className="font-semibold">{f.headline}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.detail}</p>
            </div>

            <div>
              {c.withAir ? (
                <CompoundChart
                  data={data.days.map((d) => ({ time: d.date, wbgt: d.maxWbgt, aqi: d.maxAqi, score: d.maxScore }))}
                  markers={[{ x: c.eventDate, label: c.eventLabel }]}
                />
              ) : (
                <WbgtChart
                  data={data.days.map((x) => ({ time: x.date, wbgt: x.maxWbgt, temp: x.maxTemp, normal: data.normal?.get(x.date.slice(5)) }))}
                  markers={[
                    ...(f.markerDate ? [{ x: f.markerDate, label: f.markerLabel, color: RISK_COLORS.Extreme }] : []),
                    { x: c.eventDate, label: c.eventLabel },
                  ]}
                />
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {c.withAir
                  ? "Daily maxima. Air quality from the CAMS global model (Open-Meteo), which smooths over ~40 km and reads well below Delhi’s street-level monitors; India’s AQI scale also differs from the US scale used here."
                  : "Solid line: daily max WBGT. Blue dotted line: the normal WBGT for each date (average of the previous 5 years). Dashed line: daily max air temperature. Source: Open-Meteo archive (ERA5 reanalysis), which averages over a ~10–25 km grid cell and typically reads a few degrees below the station records quoted above."}
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
              <div>
                <h4 className="mb-2 font-semibold">What HeatSignal would have done</h4>
                <ul className="list-disc space-y-1 ps-5 text-sm">
                  {f.actions.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </div>
              <div className="flex flex-col items-start gap-2 lg:items-end">
                <AlertDialog
                  city={{ name: `${c.city} (${formatDay(f.peakHour.time)} replay)`, country: c.country, lat: c.lat, lon: c.lon }}
                  hour={f.peakHour}
                  label="AI advisory for the peak hour"
                  variant="outline"
                />
                <p className="max-w-xs text-xs text-muted-foreground lg:text-right">
                  Generates the alert HeatSignal would have sent at {f.peakHour.time.slice(11, 16)} on{" "}
                  {formatDay(f.peakHour.time)}
                  {f.peakHour.score != null ? ` (compound ${f.peakHour.score}, ${compoundBand(f.peakHour.score).level})` : ""}.
                </p>
              </div>
            </div>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">Daily data table</summary>
              <div className="mt-3"><ForecastTable daily={data.days} /></div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function CaseStudiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Case studies</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Three real events replayed through HeatSignal using archived weather and air-quality data — the same
          formulas and thresholds as the live dashboard, with no local health data required.
        </p>
      </div>
      {CASES.map((c) => <CaseStudyCard key={c.id} c={c} />)}
      <p className="max-w-3xl text-xs text-muted-foreground">
        Death tolls, records and event dates are from contemporary news reporting and are approximate. In hot, humid
        climates the simplified WBGT formula sits above the Extreme threshold for much of the summer, so the
        day-to-day <em>rise</em> in WBGT is as informative as the threshold crossing itself.
      </p>
    </div>
  );
}
