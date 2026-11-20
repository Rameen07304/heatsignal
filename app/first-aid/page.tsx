"use client";

import { useState } from "react";
import { Phone, RotateCcw, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CityPicker } from "@/components/city-picker";
import { WORLD_CITIES, type City } from "@/lib/cities";
import { emergencyNumbers, serviceLabel } from "@/lib/emergency";
import { useT, type Key } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PageTop, Section } from "@/components/page-top";
import { openSos } from "@/components/worker-checkin";

type ResultId = "unconscious" | "heatstroke" | "exhaustion" | "early" | "air" | "mild";
type StepId = "q1" | "q2" | "q3" | "q4" | "q5";
type Step = { q: Key; yes: StepId | ResultId; no: StepId | ResultId };

const STEPS: Record<StepId, Step> = {
  q1: { q: "faQ1", yes: "q2", no: "unconscious" },
  q2: { q: "faQ2", yes: "heatstroke", no: "q3" },
  q3: { q: "faQ3", yes: "exhaustion", no: "q4" },
  q4: { q: "faQ4", yes: "early", no: "q5" },
  q5: { q: "faQ5", yes: "air", no: "mild" },
};

/** Result text lives in lib/i18n as fa<Result>Title and fa<Result>1…n. */
const RESULTS: Record<ResultId, { title: Key; color: string; call: boolean; steps: Key[] }> = {
  unconscious: { title: "faUnconsciousTitle", color: "#dc2626", call: true, steps: ["faUnconscious1", "faUnconscious2", "faUnconscious3", "faUnconscious4", "faUnconscious5"] },
  heatstroke: { title: "faHeatstrokeTitle", color: "#dc2626", call: true, steps: ["faHeatstroke1", "faHeatstroke2", "faHeatstroke3", "faHeatstroke4", "faHeatstroke5"] },
  exhaustion: { title: "faExhaustionTitle", color: "#ea580c", call: false, steps: ["faExhaustion1", "faExhaustion2", "faExhaustion3", "faExhaustion4", "faExhaustion5"] },
  early: { title: "faEarlyTitle", color: "#ca8a04", call: false, steps: ["faEarly1", "faEarly2", "faEarly3", "faEarly4"] },
  air: { title: "faAirTitle", color: "#ea580c", call: false, steps: ["faAir1", "faAir2", "faAir3", "faAir4"] },
  mild: { title: "faMildTitle", color: "#16a34a", call: false, steps: ["faMild1", "faMild2"] },
};

const TIPS: { title: Key; tips: Key[] }[] = [
  { title: "tipsWorkers", tips: ["tipW1", "tipW2", "tipW3", "tipW4", "tipW5", "tipW6"] },
  { title: "tipsParents", tips: ["tipP1", "tipP2", "tipP3", "tipP4", "tipP5"] },
  { title: "tipsElderly", tips: ["tipE1", "tipE2", "tipE3", "tipE4", "tipE5"] },
  { title: "tipsAthletes", tips: ["tipA1", "tipA2", "tipA3", "tipA4", "tipA5"] },
  { title: "tipsChronic", tips: ["tipC1", "tipC2", "tipC3", "tipC4", "tipC5"] },
];

export default function FirstAidPage() {
  const { t } = useT();
  const tr = (k: string) => t(k as Key);
  const [city, setCity] = useState<City>(WORLD_CITIES.find((c) => c.name === "Lahore")!);
  const [path, setPath] = useState<StepId[]>(["q1"]);
  const [result, setResult] = useState<ResultId | null>(null);
  const current = path[path.length - 1];
  const numbers = emergencyNumbers(city.country);

  const answer = (yes: boolean) => {
    const next = yes ? STEPS[current].yes : STEPS[current].no;
    if (next in STEPS) setPath([...path, next as StepId]);
    else setResult(next as ResultId);
  };
  const restart = () => {
    setPath(["q1"]);
    setResult(null);
  };
  const r = result ? RESULTS[result] : null;

  const startCheck = () => {
    restart();
    setTimeout(() => document.getElementById("symptom-check")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageTop
        title={t("firstAid")}
        intro={t("faQuestion")}
        answer={
          <div className="rounded-lg bg-red-600 p-5 text-white" role="alert">
            <p className="text-2xl font-black leading-tight sm:text-3xl">{t("faCallIfTitle")}</p>
            <p className="mt-1 text-base">{t("faCallIfSigns")}</p>
            {numbers ? (
              <a href={`tel:${numbers[0].number}`} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-white text-lg font-bold text-red-700 sm:w-auto sm:px-6">
                <Phone className="h-5 w-5" /> {t("callNumberNow", { number: numbers[0].number })}
              </a>
            ) : (
              <button type="button" onClick={openSos} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-white text-lg font-bold text-red-700 sm:w-auto sm:px-6">
                <Phone className="h-5 w-5" /> {t("callEmergency")}
              </button>
            )}
          </div>
        }
        actions={<Button onClick={startCheck}><Stethoscope /> {t("faStartCheck")}</Button>}
      />

      <CityPicker value={city} onChange={setCity} label={t("faWhereAreYou")} />

      <div id="symptom-check" className="flex scroll-mt-20 items-center justify-between">
        <div className="flex gap-1.5" aria-label={t("stepOf", { n: r ? 5 : path.length, total: 5 })}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("h-2 w-8 rounded-full bg-muted transition-colors", (i < path.length || r) && "bg-primary")} />
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={restart}>
          <RotateCcw /> {t("startOver")}
        </Button>
      </div>

      {!r ? (
        <Card key={current} >
          <CardContent className="space-y-6 p-6 sm:p-8">
            <p className="text-sm text-muted-foreground">{t("questionN", { n: path.length })}</p>
            <h2 className="text-2xl font-bold leading-snug">{t(STEPS[current].q)}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-16 text-lg" onClick={() => answer(true)}>{t("yes")}</Button>
              <Button className="h-16 text-lg" variant="outline" onClick={() => answer(false)}>{t("no")}</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div key={result} className="space-y-4">
          <div className="rounded-lg p-6 text-white" style={{ backgroundColor: r.color }} role="alert">
            <p className="text-3xl font-black leading-tight">{t(r.title)}</p>
            <ol className="mt-4 list-decimal space-y-1.5 ps-6 text-lg">
              {r.steps.map((s) => <li key={s}>{t(s)}</li>)}
            </ol>
          </div>
          <Card className={r.call ? "border-red-500" : undefined}>
            <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> {t("emergencyNumbersFor", { place: city.country || city.name })}</CardTitle></CardHeader>
            <CardContent>
              {numbers ? (
                <div className="flex flex-wrap gap-3">
                  {numbers.map((n) => (
                    <a key={n.number} href={`tel:${n.number}`} className="rounded-lg border px-4 py-2 hover:bg-muted">
                      <span className="block text-3xl font-black tabular-nums">{n.number}</span>
                      <span className="text-xs text-muted-foreground">{serviceLabel(n.label, tr)}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-lg font-semibold">{t("callLocalOr112")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="mb-1 text-xl font-semibold tracking-tight">{t("faStepsByCondition")}</h2>
        {(["heatstroke", "unconscious", "exhaustion", "early", "air", "mild"] as ResultId[]).map((id, i) => (
          <Section key={id} title={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RESULTS[id].color }} />{t(RESULTS[id].title)}</span>} open={i === 0}>
            <ol className="list-decimal space-y-1 ps-5 text-sm">
              {RESULTS[id].steps.map((k) => <li key={k}>{t(k)}</li>)}
            </ol>
          </Section>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">{t("preventingHeatIllness")}</h2>
        <div className="space-y-2">
          {TIPS.map((g) => (
            <details key={g.title} className="glass group rounded-lg px-4 py-3">
              <summary className="cursor-pointer font-medium">{t(g.title)}</summary>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">
                {g.tips.map((tip) => <li key={tip}>{t(tip)}</li>)}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <MedicalDisclaimer>{t("faDisclaimer")}</MedicalDisclaimer>

      <p className="text-xs text-muted-foreground">
        {t("faSource")} {t("faIntro")}
      </p>
    </div>
  );
}
