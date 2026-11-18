"use client";

import { useState } from "react";
import { Phone, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CityPicker } from "@/components/city-picker";
import { WORLD_CITIES, type City } from "@/lib/cities";
import { emergencyNumbers } from "@/lib/emergency";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ResultId = "unconscious" | "heatstroke" | "exhaustion" | "early" | "air" | "mild";
type Step = { q: string; yes: StepId | ResultId; no: StepId | ResultId };
type StepId = "q1" | "q2" | "q3" | "q4" | "q5";

const STEPS: Record<StepId, Step> = {
  q1: { q: "Is the person conscious and responsive?", yes: "q2", no: "unconscious" },
  q2: { q: "Are they confused, slurring their speech, or behaving strangely?", yes: "heatstroke", no: "q3" },
  q3: { q: "Are they sweating heavily, feeling sick, or having muscle cramps?", yes: "exhaustion", no: "q4" },
  q4: { q: "Do they have a headache, feel dizzy, or have a fast heartbeat?", yes: "early", no: "q5" },
  q5: { q: "Are they having trouble breathing or a tight chest?", yes: "air", no: "mild" },
};

const RESULTS: Record<ResultId, { title: string; color: string; call: boolean; steps: string[] }> = {
  unconscious: {
    title: "Emergency: call an ambulance now", color: "#dc2626", call: true,
    steps: [
      "Call an ambulance immediately.",
      "Move the person into shade or a cool place.",
      "Do NOT give water to an unconscious person.",
      "Fan them and put wet cloths on the neck, armpits and groin.",
      "If they are breathing, lay them on their side. If not, start CPR if you are trained.",
    ],
  },
  heatstroke: {
    title: "Likely heatstroke. This is a medical emergency", color: "#dc2626", call: true,
    steps: [
      "Call an ambulance now.",
      "Move them to shade or air conditioning.",
      "Remove extra clothing and cool them with wet cloths and fanning.",
      "Do not give medicine such as paracetamol or aspirin.",
      "Watch their breathing until help arrives.",
    ],
  },
  exhaustion: {
    title: "Likely heat exhaustion", color: "#ea580c", call: false,
    steps: [
      "Move them to a cool place.",
      "Give small sips of water.",
      "Loosen clothing and apply cool, wet cloths.",
      "Let them rest for at least an hour.",
      "If they get worse or don’t improve within 30 minutes, call an ambulance.",
    ],
  },
  early: {
    title: "Early heat stress", color: "#ca8a04", call: false,
    steps: [
      "Move into shade and stop all physical activity.",
      "Drink water.",
      "Loosen tight clothing.",
      "Watch them for 30 minutes; get medical help if they get worse.",
    ],
  },
  air: {
    title: "Possible reaction to polluted air", color: "#ea580c", call: false,
    steps: [
      "Move indoors to cleaner air and close the windows.",
      "If they have asthma, help them use their inhaler.",
      "If breathing gets harder, call an ambulance.",
      "Check the current air quality for the area on the HeatSignal dashboard.",
    ],
  },
  mild: {
    title: "Likely mild. Stop it getting worse", color: "#16a34a", call: false,
    steps: ["Encourage water, shade and rest as a precaution.", "Check on them again in 30 minutes."],
  },
};

const TIPS = [
  { title: "For outdoor workers", tips: ["Drink a cup of water every 15–20 minutes in the heat, even if not thirsty.", "Take rest breaks in shade. The Worker Safety page has your schedule for your schedule.", "Do the heaviest work early in the morning.", "Wear light, loose clothing and a hat.", "Work in pairs and watch each other for warning signs.", "New to the heat? Build up over 1–2 weeks."] },
  { title: "For parents and caregivers", tips: ["Never leave a child in a parked car, even for a minute.", "Keep babies out of direct sun; dress them lightly.", "Offer water often; breastfed babies may need more feeds.", "Move play indoors in the hottest hours.", "Watch for unusual sleepiness, irritability or fewer wet nappies."] },
  { title: "For elderly people living alone", tips: ["Arrange for someone to check on you twice a day in a heatwave.", "Stay in the coolest room; close curtains on the sunny side.", "Drink regularly even if you don’t feel thirsty.", "Take cool showers or use wet cloths.", "Know where the nearest cooled public space is."] },
  { title: "For athletes and exercisers", tips: ["Train early morning or evening.", "Weigh yourself before and after; drink to replace losses.", "Cut intensity when WBGT is above 28 °C.", "Stop at once if you feel dizzy, confused or stop sweating.", "Acclimatise gradually over 10–14 days."] },
  { title: "For people with chronic conditions", tips: ["Ask your doctor whether your medicines affect heat tolerance.", "Keep inhalers and medicines cool and with you.", "Avoid going out when the air is unhealthy (AQI above 150).", "Have a plan for power cuts if you rely on cooling.", "Get help early. Symptoms can get worse fast."] },
];

export default function FirstAidPage() {
  const { t } = useT();
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("firstAid")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Someone may be suffering from heat illness. Answer a few questions and we’ll tell you what to do. This guide is
          fixed advice, not AI, so it works instantly and offline once loaded.
        </p>
      </div>

      <CityPicker value={city} onChange={setCity} label="Where are you? (for emergency numbers)" />

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-label={`Step ${r ? 5 : path.length} of 5`}>
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
            <p className="text-sm text-muted-foreground">Question {path.length}</p>
            <h2 className="text-2xl font-bold leading-snug">{STEPS[current].q}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-16 text-lg" onClick={() => answer(true)}>Yes</Button>
              <Button className="h-16 text-lg" variant="outline" onClick={() => answer(false)}>No</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div key={result} className="space-y-4">
          <div className="rounded-lg p-6 text-white" style={{ backgroundColor: r.color }} role="alert">
            <p className="text-3xl font-black leading-tight">{r.title}</p>
            <ol className="mt-4 list-decimal space-y-1.5 ps-6 text-lg">
              {r.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </div>
          <Card className={r.call ? "border-red-500" : undefined}>
            <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Emergency numbers: {city.country || city.name}</CardTitle></CardHeader>
            <CardContent>
              {numbers ? (
                <div className="flex flex-wrap gap-3">
                  {numbers.map((n) => (
                    <a key={n.number} href={`tel:${n.number}`} className="rounded-lg border px-4 py-2 hover:bg-muted">
                      <span className="block text-3xl font-black tabular-nums">{n.number}</span>
                      <span className="text-xs text-muted-foreground">{n.label}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-lg font-semibold">Call your local emergency number.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Preventing heat illness</h2>
        <div className="space-y-2">
          {TIPS.map((g) => (
            <details key={g.title} className="glass group rounded-lg px-4 py-3">
              <summary className="cursor-pointer font-medium">{g.title}</summary>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">
                {g.tips.map((tip) => <li key={tip}>{tip}</li>)}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Based on standard heat-illness first aid (CDC/NIOSH, WHO). This is not a substitute for medical care. When in doubt, call for help.
      </p>
    </div>
  );
}
