"use client";

import { useState } from "react";
import { Check, Copy, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CityPicker } from "@/components/city-picker";
import { ErrorState } from "@/components/error-state";
import { GaugeRing } from "@/components/gauge-ring";
import { aqiBand, formatAqi } from "@/lib/air";
import { WORLD_CITIES, type City } from "@/lib/cities";
import { useT } from "@/lib/i18n";
import {
  assess,
  type Access,
  type Activity,
  type AgeGroup,
  type Condition,
  type Outdoors,
  type Profile,
  type Sun,
} from "@/lib/personal-risk";
import { compoundBand } from "@/lib/risk";
import { hoursOf, useCityConditions, worstHour } from "@/lib/use-city-conditions";
import { cn, formatDay } from "@/lib/utils";

function Choice<T extends string>({ legend, options, value, onChange }: {
  legend: string;
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, label]) => (
          <label
            key={v}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === v ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <input type="radio" className="sr-only" checked={value === v} onChange={() => onChange(v)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const CONDITIONS: [Condition, string][] = [
  ["respiratory", "Asthma or respiratory condition"],
  ["heart", "Heart or cardiovascular condition"],
  ["diabetes", "Diabetes"],
  ["kidney", "Kidney disease"],
  ["obesity", "Obesity"],
  ["pregnant", "Currently pregnant"],
  ["medication", "Medication that affects heat tolerance"],
];

const PART_LABEL = {
  environment: "Environmental conditions",
  age: "Age factor",
  activity: "Activity exposure",
  health: "Health conditions",
  protective: "Protective factors",
};

export default function RiskAssessmentPage() {
  const { t } = useT();
  const [city, setCity] = useState<City>(WORLD_CITIES.find((c) => c.name === "Lahore")!);
  const [p, setP] = useState<Profile>({
    age: "18-40",
    activity: "outdoor",
    outdoors: "3-6",
    conditions: [],
    ac: "limited",
    water: "yes",
    sun: "partially",
  });
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof Profile>(k: K) => (v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const result = useCityConditions(city);
  const c = result.data;
  const peak = c ? worstHour(hoursOf(c, c.days[0].date)) : undefined;
  const env = peak && { wbgt: peak.wbgt, aqi: peak.air?.aqi ?? null, uv: peak.air?.uv ?? null, score: peak.score };
  const r = env ? assess(p, env) : null;

  async function share() {
    if (!r || !peak || !c) return;
    const text = [
      `My HeatSignal Risk Assessment — ${city.name}${city.country ? `, ${city.country}` : ""}, ${formatDay(c.now.time)}`,
      peak.score != null ? `Environmental Risk: ${compoundBand(peak.score).level} (Score: ${peak.score}/100)` : null,
      `Heat Stress (WBGT): ${peak.wbgt.toFixed(1)} °C — ${peak.risk}`,
      peak.air ? `Air Quality (AQI): ${formatAqi(peak.air.aqi)} — ${aqiBand(peak.air.aqi).label}` : null,
      `My Personal Risk: ${r.level.label} (${r.score}/100)`,
      `Key advice: ${r.advice[0]}`,
      `💧 Drink at least ${r.litres} litres of water today`,
      `Check your risk at ${location.origin}/risk-assessment`,
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const positive = r ? Object.values(r.parts).reduce((s, v) => s + Math.max(v, 0), 0) || 1 : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("riskAssessment")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Your own risk from today’s heat and air, based on who you are and what you’re doing. Instant, private — nothing
          you enter leaves this page.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">1 · Your location</CardTitle></CardHeader>
            <CardContent><CityPicker value={city} onChange={setCity} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">2 · About you</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Choice legend="Age group" value={p.age} onChange={set("age")} options={[["under5", "Under 5"], ["5-17", "5–17"], ["18-40", "18–40"], ["41-64", "41–64"], ["65+", "65+"]] as [AgeGroup, string][]} />
              <Choice legend="Activity" value={p.activity} onChange={set("activity")} options={[["indoor", "Indoor worker"], ["outdoor", "Outdoor worker"], ["student", "Student"], ["athlete", "Athlete"], ["elderly", "Elderly at home"], ["tourist", "Tourist"]] as [Activity, string][]} />
              <Choice legend="Time outdoors today" value={p.outdoors} onChange={set("outdoors")} options={[["0-1", "0–1 h"], ["1-3", "1–3 h"], ["3-6", "3–6 h"], ["6+", "6+ h"]] as [Outdoors, string][]} />
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Health conditions</legend>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {CONDITIONS.map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={p.conditions.includes(k)}
                        onChange={(e) => set("conditions")(e.target.checked ? [...p.conditions, k] : p.conditions.filter((x) => x !== k))}
                      />
                      {label}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={p.conditions.length === 0} onChange={() => set("conditions")([])} />
                    None of the above
                  </label>
                </div>
              </fieldset>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">3 · Your environment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Choice legend="Air conditioning" value={p.ac} onChange={set("ac")} options={[["yes", "Yes"], ["limited", "Limited"], ["no", "No"]] as [Access, string][]} />
              <Choice legend="Clean drinking water" value={p.water} onChange={set("water")} options={[["yes", "Yes"], ["limited", "Limited"], ["no", "No"]] as [Access, string][]} />
              <Choice legend="Working in direct sunlight" value={p.sun} onChange={set("sun")} options={[["yes", "Yes"], ["partially", "Partly"], ["no", "No"]] as [Sun, string][]} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
          {result.loading && <Skeleton className="h-[520px] w-full rounded-lg" />}
          {result.error && <ErrorState message="Couldn’t load conditions for this place." onRetry={result.retry} />}
          {r && peak && (
            <Card  style={{ borderColor: `${r.level.color}80` }}>
              <CardHeader>
                <CardDescription>Your risk today in {city.name}</CardDescription>
                <div className="flex items-center gap-4">
                  <GaugeRing label="Your score" fraction={r.score / 100} color={r.level.color} value={String(r.score)} unit="/ 100" size={110} />
                  <div>
                    <div className="flex items-center gap-2 text-3xl font-semibold tracking-tight"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: r.level.color }} />{r.level.label}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Today’s peak at {peak.time.slice(11, 16)}: WBGT {peak.wbgt.toFixed(1)} °C
                      {peak.air ? ` · AQI ${formatAqi(peak.air.aqi)}` : ""}
                      {peak.score != null ? ` · compound ${peak.score}` : ""}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold">What drives your risk</h3>
                  {(Object.keys(PART_LABEL) as (keyof typeof PART_LABEL)[]).map((k) => {
                    const v = r.parts[k];
                    const pct = Math.round((Math.abs(v) / positive) * 100);
                    return (
                      <div key={k} className="text-xs">
                        <div className="flex justify-between">
                          <span>{PART_LABEL[k]}</span>
                          <span className="tabular-nums text-muted-foreground">{v < 0 ? `−${pct}% (lowers risk)` : `${pct}%`}</span>
                        </div>
                        <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: v < 0 ? "#22c55e" : r.level.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-base font-semibold">
                  <Droplets className="me-2 inline h-5 w-5 align-[-3px] text-sky-600" />Drink at least {r.litres} litres of water today
                </p>

                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">What to do</h3>
                  <ul className="list-disc space-y-1 ps-5 text-sm">
                    {r.advice.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>

                <Button className="w-full" onClick={share}>
                  {copied ? <Check /> : <Copy />} {copied ? "Copied to clipboard" : "Share my risk"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  A screening heuristic for awareness, not a medical diagnosis. If you feel unwell, see the First Aid page or call for help.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
