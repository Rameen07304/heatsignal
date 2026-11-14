"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { ForecastTable } from "@/components/forecast-table";
import { WbgtChart } from "@/components/wbgt-chart";
import { RISK_COLORS } from "@/lib/risk";
import { useAsync } from "@/lib/use-async";
import { formatDay } from "@/lib/utils";
import { fetchArchive, summarizeDaily, type DailySummary } from "@/lib/weather";

interface CaseStudy {
  title: string;
  place: string;
  lat: number;
  lon: number;
  start: string;
  end: string;
  summary: string;
  /** Approximate date of the worst reported impact, from contemporary reporting. */
  eventDate: string;
  eventLabel: string;
  /** How the event reads mid-sentence. */
  eventPhrase: string;
}

const CASES: CaseStudy[] = [
  {
    title: "Karachi heatwave, June 2015",
    place: "Karachi, Pakistan",
    lat: 24.86,
    lon: 67.01,
    start: "2015-06-15",
    end: "2015-06-25",
    summary:
      "Around 1,200 people died in Karachi as temperatures across Sindh reached 49 °C, with very high humidity, power cuts and Ramadan fasting compounding the heat.",
    eventDate: "2015-06-22",
    eventLabel: "Peak deaths (approx.)",
    eventPhrase: "deaths peaked",
  },
  {
    title: "Sindh heatwave, May 2024",
    place: "Jacobabad, Pakistan",
    lat: 28.28,
    lon: 68.44,
    start: "2024-05-20",
    end: "2024-05-30",
    summary:
      "Jacobabad recorded 52 °C during a prolonged heatwave across Sindh — among the highest temperatures ever measured in Pakistan.",
    eventDate: "2024-05-26",
    eventLabel: "52 °C recorded (approx.)",
    eventPhrase: "the 52 °C reading",
  },
];

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** What the data in this window actually supports — nothing is hard-coded. */
function detection(daily: DailySummary[], c: CaseStudy) {
  const firstExtreme = daily.find((d) => d.risk === "Extreme");
  const peak = daily.reduce((a, b) => (b.maxWbgt > a.maxWbgt ? b : a));
  if (!firstExtreme) return { firstExtreme, peak, headline: "WBGT stayed below the Extreme threshold in this window." };
  const lead = dayDiff(firstExtreme.date, c.eventDate);
  const headline =
    lead > 0
      ? `HeatSignal would have flagged Extreme risk ${lead} day${lead === 1 ? "" : "s"} before ${c.eventPhrase}` +
        (firstExtreme.date === c.start ? " — from the first day of this window." : ".")
      : `HeatSignal would have flagged Extreme risk on ${formatDay(firstExtreme.date)}.`;
  return { firstExtreme, peak, headline };
}

function CaseStudyCard({ c }: { c: CaseStudy }) {
  const archive = useAsync(async () => summarizeDaily(await fetchArchive(c.lat, c.lon, c.start, c.end)), [c.start]);
  const daily = archive.data;
  const d = daily?.length ? detection(daily, c) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{c.title}</CardTitle>
        <CardDescription>
          {c.place} · {formatDay(c.start)} – {formatDay(c.end)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-relaxed">{c.summary}</p>

        {archive.loading && <Skeleton className="h-80 w-full" />}
        {archive.error && <ErrorState message="Couldn’t load archive weather data." onRetry={archive.retry} />}
        {daily && !d && <p className="text-sm text-muted-foreground">No archive data returned for this period.</p>}

        {daily && d && (
          <>
            <div
              className="rounded-lg border p-4"
              style={{ borderColor: `${RISK_COLORS.Extreme}80`, backgroundColor: `${RISK_COLORS.Extreme}14` }}
            >
              <p className="font-semibold">{d.headline}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Daily max WBGT climbed from {daily[0].maxWbgt.toFixed(1)} °C on {formatDay(daily[0].date)} to a peak of{" "}
                {d.peak.maxWbgt.toFixed(1)} °C on {formatDay(d.peak.date)}.
              </p>
            </div>

            <div>
              <WbgtChart
                data={daily.map((x) => ({ time: x.date, wbgt: x.maxWbgt, temp: x.maxTemp }))}
                markers={[
                  ...(d.firstExtreme && d.firstExtreme.date !== c.eventDate
                    ? [{ x: d.firstExtreme.date, label: "Extreme flagged", color: RISK_COLORS.Extreme }]
                    : []),
                  { x: c.eventDate, label: c.eventLabel },
                ]}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Solid line: daily max WBGT. Dashed line: daily max air temperature. Source: Open-Meteo archive
                (ERA5 reanalysis), which averages over a ~10–25 km grid cell and typically reads a few degrees below
                the station records quoted above.
              </p>
            </div>

            <ForecastTable daily={daily} />
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
        <h1 className="text-2xl font-bold tracking-tight">Case studies</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Two deadly South Asian heatwaves, replayed through HeatSignal using archived weather data. The same WBGT
          formula and thresholds as the live dashboard — no local health data required.
        </p>
      </div>
      {CASES.map((c) => <CaseStudyCard key={c.title} c={c} />)}
      <p className="max-w-3xl text-xs text-muted-foreground">
        Note: in hot, humid climates the simplified WBGT formula sits above the Extreme threshold for much of the
        summer, so the day-to-day <em>rise</em> in WBGT is as informative as the threshold crossing itself.
      </p>
    </div>
  );
}
