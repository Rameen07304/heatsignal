"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentPipeline, STAGES, type StageId, type StageStatus } from "@/components/agent-pipeline";
import { AlertView } from "@/components/alert";
import { fetchAir, formatAqi } from "@/lib/air";
import { alertBody, postAlert, saveToHistory } from "@/lib/alert-client";
import type { AlertText, HeatAlert } from "@/lib/alert-types";
import { WORLD_CITIES, cityKey, type City } from "@/lib/cities";
import { buildConditions, type CombinedHour } from "@/lib/conditions";
import { aqiBand } from "@/lib/air";
import { compoundBand, isCompoundEvent, uvBand } from "@/lib/risk";
import { useCities } from "@/lib/use-cities";
import { fetchForecast } from "@/lib/weather";
import { workRegimen } from "@/lib/work-rest";

interface StepState {
  status: StageStatus;
  ms?: number;
  output?: unknown;
  note?: string;
}

const ICON: Record<StageStatus, React.ReactNode> = {
  idle: <CircleDashed className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  fallback: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  error: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

const RUNNING_TEXT: Record<StageId, (city: string) => string> = {
  data: (c) => `Fetching weather and air quality for ${c}…`,
  analyze: (c) => `Analyzing risk for ${c}…`,
  compose: () => "Composing alert…",
  recommend: () => "Generating recommendations…",
  translate: () => "Translating to Urdu and Arabic…",
  deliver: () => "Saving to alert history…",
};

/** The Risk Analyzer's output: every number the later agents are allowed to use. */
function analyze(h: CombinedHour) {
  return {
    time: h.time,
    heat: { wbgt_c: +h.wbgt.toFixed(1), level: h.risk, work_rest_moderate: workRegimen(h.wbgt, "moderate").label },
    air: h.air
      ? { us_aqi: formatAqi(h.air.aqi), level: aqiBand(h.air.aqi).label, pm2_5: +h.air.pm25.toFixed(1), dust: +h.air.dust.toFixed(0) }
      : "no data",
    uv: h.air ? { index: +h.air.uv.toFixed(1), level: uvBand(h.air.uv).label } : "no data",
    compound: h.score != null
      ? { score: h.score, level: h.level, penalty_active: isCompoundEvent(h.wbgt, h.air!.aqi), meaning: compoundBand(h.score).description }
      : "unavailable without air data",
  };
}

function Output({ value }: { value: unknown }) {
  if (value == null) return null;
  if (typeof value === "string") return <p className="text-sm">{value}</p>;
  return (
    <pre className="max-h-56 overflow-auto rounded-md bg-muted/60 p-2 text-[11px] leading-relaxed">{JSON.stringify(value, null, 2)}</pre>
  );
}

export function LiveGenerator() {
  const { cities } = useCities();
  const options = [...cities].sort((a, b) => a.name.localeCompare(b.name));
  const [key, setKey] = useState(cityKey(WORLD_CITIES.find((c) => c.name === "Lahore")!));
  const [steps, setSteps] = useState<Partial<Record<StageId, StepState>>>({});
  const [result, setResult] = useState<{ alert: HeatAlert; city: City; hour: CombinedHour } | null>(null);
  const [running, setRunning] = useState(false);

  const set = (id: StageId, s: StepState) => setSteps((prev) => ({ ...prev, [id]: s }));

  /** Run one stage, recording its status, duration and output. */
  async function stage<T>(id: StageId, fn: () => Promise<T>, show: (r: T) => unknown, fallback?: (r: T) => boolean) {
    set(id, { status: "running" });
    const t = performance.now();
    try {
      const r = await fn();
      const fb = fallback?.(r) ?? false;
      set(id, {
        status: fb ? "fallback" : "done",
        ms: Math.round(performance.now() - t),
        output: show(r),
        note: fb
          ? id === "translate"
            ? "One translation failed; the alert goes out in the languages that succeeded."
            : "AI unavailable — used HeatSignal’s rule-based guidance."
          : undefined,
      });
      return r;
    } catch (e) {
      set(id, { status: "error", ms: Math.round(performance.now() - t), note: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  }

  async function run() {
    const city = options.find((c) => cityKey(c) === key) ?? WORLD_CITIES[0];
    setRunning(true);
    setSteps({});
    setResult(null);
    try {
      const c = await stage(
        "data",
        async () => buildConditions(...(await Promise.all([fetchForecast(city.lat, city.lon), fetchAir(city.lat, city.lon).catch(() => undefined)]))),
        (c) => ({ hours: c.hours.length, air_quality: c.hasAir ? "available" : "unavailable", now: c.now.time }),
      );
      const hour = c.now;
      await stage("analyze", async () => analyze(hour), (a) => a);

      type Part<K extends keyof AlertText> = Pick<AlertText, K> & { source: "ai" | "rules"; note?: string };
      const composed = await stage(
        "compose",
        () => postAlert<Part<"risk_assessment" | "vulnerable_groups">>(alertBody(city, hour, { stage: "compose" })),
        (r) => ({ risk_assessment: r.risk_assessment, vulnerable_groups: r.vulnerable_groups }),
        (r) => r.source === "rules",
      );
      const recommended = await stage(
        "recommend",
        () =>
          postAlert<Part<"actions" | "worker_safety">>(
            alertBody(city, hour, { stage: "recommend", composed: { risk_assessment: composed.risk_assessment, vulnerable_groups: composed.vulnerable_groups } }),
          ),
        (r) => ({ actions: r.actions, worker_safety: r.worker_safety }),
        (r) => r.source === "rules",
      );
      const en: AlertText = {
        risk_assessment: composed.risk_assessment,
        vulnerable_groups: composed.vulnerable_groups,
        actions: recommended.actions,
        worker_safety: recommended.worker_safety,
      };
      // A failed translation doesn't stop the alert: it goes out in English.
      const translated = await stage(
        "translate",
        () => postAlert<{ ur: AlertText | null; ar: AlertText | null }>({ stage: "translate", en }),
        (r) => ({ ur: r.ur?.risk_assessment ?? "(failed)", ar: r.ar?.risk_assessment ?? "(failed)" }),
        (r) => !r.ur || !r.ar,
      ).catch(() => null);

      const alert: HeatAlert = {
        en,
        ur: translated?.ur ?? null,
        ar: translated?.ar ?? null,
        source: composed.source === "ai" && recommended.source === "ai" ? "ai" : "rules",
      };
      await stage("deliver", async () => saveToHistory(city, hour, alert, "pipeline"), (e) => `Saved to history at ${new Date(e.at).toLocaleTimeString()}.`);
      setResult({ alert, city, hour });
    } catch {
      // The failing step already shows its error.
    } finally {
      setRunning(false);
    }
  }

  const statuses = Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, v!.status])) as Partial<Record<StageId, StageStatus>>;
  const selected = options.find((c) => cityKey(c) === key);

  return (
    <div className="space-y-4">
      <AgentPipeline status={statuses} />

      <Card>
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Live multi-agent alert</CardTitle>
            <CardDescription>Pick a city and watch each agent do its part.</CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <select
              aria-label="City"
              className="h-9 w-56 rounded-md border bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={running}
            >
              {options.map((o) => <option key={cityKey(o)} value={cityKey(o)}>{o.name}, {o.country}</option>)}
            </select>
            <Button onClick={run} disabled={running || !selected}>
              {running ? <Loader2 className="animate-spin" /> : <Play />} Generate Multi-Agent Alert
            </Button>
          </div>
        </CardHeader>
        {Object.keys(steps).length > 0 && (
          <CardContent>
            <ol className="space-y-3">
              {STAGES.map((s, i) => {
                const st = steps[s.id];
                if (!st) return null;
                return (
                  <li key={s.id} className="animate-page-in rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {ICON[st.status]}
                      <span className="text-sm font-semibold">{i + 1}. {s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {st.status === "running" ? RUNNING_TEXT[s.id](selected?.name ?? "") : st.ms != null ? `${st.ms} ms` : ""}
                      </span>
                      {s.ai && st.status === "done" && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Gemini</span>}
                    </div>
                    {st.note && <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">{st.note}</p>}
                    {st.output != null && <div className="mt-2"><Output value={st.output} /></div>}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        )}
      </Card>

      {result && (
        <Card className="animate-page-in">
          <CardHeader>
            <CardTitle>Final alert — {result.city.name}</CardTitle>
            <CardDescription>Combined output of all agents.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertView
              alert={result.alert}
              note={result.alert.ur && result.alert.ar ? undefined : "A translation was not available, so some languages are missing."}
              title={`Health alert — ${result.city.name}`}
              subtitle={`WBGT ${result.hour.wbgt.toFixed(1)} °C${result.hour.air ? ` · AQI ${formatAqi(result.hour.air.aqi)}` : ""}${result.hour.score != null ? ` · compound ${result.hour.score}/100` : ""}`}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
