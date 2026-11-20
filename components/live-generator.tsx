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
import { WORLD_CITIES, cityHref, cityKey, type City } from "@/lib/cities";
import { buildConditions, type CombinedHour } from "@/lib/conditions";
import { aqiBand } from "@/lib/air";
import { compoundBand, isCompoundEvent, uvBand } from "@/lib/risk";
import { useCities } from "@/lib/use-cities";
import { fetchForecast } from "@/lib/weather";
import { workRegimen } from "@/lib/work-rest";
import { hourToInput } from "@/lib/alert-client";
import { useT, type Key } from "@/lib/i18n";
import { ruleAlert } from "@/lib/rule-alert";
import { cityName, placeName } from "@/lib/places";

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

const RUNNING_TEXT: Record<StageId, Key> = {
  data: "runData",
  analyze: "runAnalyze",
  compose: "runCompose",
  recommend: "runRecommend",
  translate: "runTranslate",
  deliver: "runDeliver",
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
    <pre className="max-h-56 overflow-auto rounded-md bg-muted/60 p-2 text-xs leading-relaxed">{JSON.stringify(value, null, 2)}</pre>
  );
}

export function LiveGenerator() {
  const { cities } = useCities();
  const { t, lang, time } = useT();
  const options = [...cities].sort((a, b) => a.name.localeCompare(b.name));
  const [key, setKey] = useState(cityKey(WORLD_CITIES.find((c) => c.name === "Lahore")!));
  const [steps, setSteps] = useState<Partial<Record<StageId, StepState>>>({});
  const [result, setResult] = useState<{ alert: HeatAlert; city: City; hour: CombinedHour } | null>(null);
  const [running, setRunning] = useState(false);
  // Lahore may have been removed from the list: fall back to the first city shown.
  const selected = options.find((c) => cityKey(c) === key) ?? options[0];

  const set = (id: StageId, s: StepState) => setSteps((prev) => ({ ...prev, [id]: s }));

  /** Run one stage, recording its status, duration and output. */
  async function stage<T>(id: StageId, fn: () => Promise<T>, show: (r: T) => unknown, fallback?: (r: T) => boolean) {
    set(id, { status: "running" });
    const started = performance.now();
    try {
      const r = await fn();
      const fb = fallback?.(r) ?? false;
      set(id, {
        status: fb ? "fallback" : "done",
        ms: Math.round(performance.now() - started),
        output: show(r),
        note: fb
          ? id === "translate"
            ? t("translationFailedNote")
            : t("rulesWroteNote")
          : undefined,
      });
      return r;
    } catch (e) {
      set(id, { status: "error", ms: Math.round(performance.now() - started), note: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  }

  async function run() {
    if (!selected) return;
    const city = selected;
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
        () => postAlert<Partial<Record<"ur" | "ar" | "ja" | "hi" | "es", AlertText | null>>>({ stage: "translate", en, lang }),
        (r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "source").map(([k, v]) => [k, (v as AlertText | null)?.risk_assessment ?? "(failed)"])),
        (r) => !r.ur || !r.ar || (lang !== "en" && !r[lang]),
      ).catch(() => null);

      const source = composed.source === "ai" && recommended.source === "ai" ? "ai" : "rules";
      // When the AI wrote nothing, the built-in rules give the alert in every language.
      const rules = source === "rules" ? (l: "ur" | "ar" | "ja" | "hi" | "es") => ruleAlert(hourToInput(city, hour), l) : () => null;
      const alert: HeatAlert = {
        en,
        ur: translated?.ur ?? rules("ur"),
        ar: translated?.ar ?? rules("ar"),
        source,
      };
      if (lang !== "en" && lang !== "ur" && lang !== "ar") alert[lang] = translated?.[lang] ?? rules(lang);
      await stage("deliver", async () => saveToHistory(city, hour, alert, "pipeline"), (e) => t("savedToHistory", { time: time(new Date(e.at)) }));
      setResult({ alert, city, hour });
    } catch {
      // The failing step already shows its error.
    } finally {
      setRunning(false);
    }
  }

  const statuses = Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, v!.status])) as Partial<Record<StageId, StageStatus>>;

  return (
    <div className="space-y-4">
      <AgentPipeline status={statuses} />

      <Card>
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{t("liveAlertTitle")}</CardTitle>
            <CardDescription>{t("liveAlertIntro")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <select
              aria-label={t("city")}
              className="h-9 w-56 rounded-md border bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selected ? cityKey(selected) : ""}
              onChange={(e) => setKey(e.target.value)}
              disabled={running}
            >
              {options.map((o) => <option key={cityKey(o)} value={cityKey(o)}>{placeName(o, lang)}</option>)}
            </select>
            <Button onClick={run} disabled={running || !selected}>
              {running ? <Loader2 className="animate-spin" /> : <Play />} {t("generateMultiAgent")}
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
                  <li key={s.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {ICON[st.status]}
                      <span className="text-sm font-semibold">{i + 1}. {t(s.name)}</span>
                      <span className="text-xs text-muted-foreground">
                        {st.status === "running" ? t(RUNNING_TEXT[s.id], { city: selected?.name ?? "" }) : st.ms != null ? `${st.ms} ms` : ""}
                      </span>
                      {s.ai && st.status === "done" && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">Gemini</span>}
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
        <Card >
          <CardHeader>
            <CardTitle>{t("finalAlertFor", { city: cityName(result.city.name, lang) })}</CardTitle>
            <CardDescription>{t("finalAlertIntro")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertView
              alert={result.alert}
              note={result.alert.source === "rules" ? t("rulesNote") : result.alert.ur && result.alert.ar ? undefined : t("translationMissingNote")}
              title={t("healthAlertFor", { city: cityName(result.city.name, lang) })}
              path={cityHref(result.city)}
              subtitle={`WBGT ${result.hour.wbgt.toFixed(1)} °C${result.hour.air ? ` · AQI ${formatAqi(result.hour.air.aqi)}` : ""}${result.hour.score != null ? ` · ${t("compoundShort")} ${result.hour.score}/100` : ""}`}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
