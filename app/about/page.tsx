import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Bot, Cloud, Code2, Globe2, Map, Radar, Server, ShieldCheck, TrendingUp, Users, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/header";
import { AQI_BANDS } from "@/lib/air";
import { COMPOUND_BANDS, RISK_BANDS } from "@/lib/risk";

export const metadata: Metadata = { title: "About", description: "Why HeatSignal exists, how the risk score works, and the data behind it." };

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
    {children}
  </a>
);

const TEAM = [
  { name: "Rameen Fatima", role: "Lead Developer & System Design" },
  { name: "Halima Fahim", role: "Testing & Quality Assurance" },
  { name: "Dania Imran", role: "Project Management, Documentation & Pitch Video" },
];

/** Challenge 7's six desired outcomes, and where HeatSignal delivers each. */
const OUTCOMES = [
  [
    "Dynamic heat-risk assessment",
    "Worker Safety and Workforce Risk combine hourly WBGT with workload, shift timing, clothing/PPE and acclimatisation."
  ],
  [
    "Clear, graded warnings",
    "Green, yellow, red and black flags with safe actions (water, rest, shift change), clinical escalation on red and black, in six languages; 48-hour early warning and AI or rule-based Alerts."
  ],
  [
    "Worker-first governance",
    "No personal health data, anonymous incident reports with counts below 5 hidden, and a written ban on disciplinary or employment use (Worker rights and data)."
  ],
  [
    "Field-ready operation",
    "Installable app, last-known data with an offline label, First Aid offline, rule-based alerts when the AI is down, low data use."
  ],
  [
    "Supervisor decision support",
    "Crew- and site-level shift planner, break schedule, water totals, printable site notice and employer checklist; no individual clinical detail."
  ],
  [
    "Safety and productivity measures",
    "Alert lead time and false-alarm back-test (Case Studies validation), incidents this week, and protected rest vs lost work hours (Workforce Risk)."
  ]
];

const STEPS = [
  { icon: Radar, title: "Monitor", text: "Hourly heat, humidity, sunlight, air pollutants and UV for 100+ cities, from free global forecasts." },
  { icon: TrendingUp, title: "Analyze", text: "WBGT heat stress, US AQI and UV combine into one compound score, with a penalty when heat and bad air coincide." },
  { icon: BellRing, title: "Alert", text: "Safe-hour plans for workers and AI-written alerts in English, Urdu and Arabic. If the AI is down, built-in rules write the alert instead." },
];

const STACK = [
  { icon: Code2, name: "Next.js + TypeScript" },
  { icon: Bot, name: "Google Gemini" },
  { icon: Cloud, name: "Open-Meteo" },
  { icon: Map, name: "Leaflet + OpenStreetMap" },
  { icon: TrendingUp, name: "Recharts" },
  { icon: Server, name: "Vercel" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="rounded-lg border bg-card p-8 sm:p-10">
        <Logo className="h-9 w-10" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">HeatSignal</h1>
        <p className="mt-2 text-lg text-muted-foreground">Heat, air and UV warnings for the hottest, most polluted places on Earth.</p>
        <p className="mt-6 max-w-2xl leading-relaxed">
          HeatSignal answers one question for anyone who works or lives outdoors: <b>is it safe to be outside right now? If
          not, when will it be?</b> It watches heat stress, air pollution and UV together, because that is how people
          experience them.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border bg-background/60 px-3 py-1">Future Health Digital Innovation Challenge 2026, Challenge 7: Climate-Resilient Worker Health · Abu Dhabi Department of Health</span>
        </div>
      </section>

      <Card>
        <CardHeader><CardTitle>How HeatSignal meets the challenge</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {OUTCOMES.map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3">
                <dt className="font-semibold">{k}</dt>
                <dd className="mt-1 text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>The problem</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            Heat kills more people than any other type of extreme weather, and most of those deaths are preventable with
            early, specific warnings. The people most exposed are the least likely to get them: construction workers,
            farm labourers, delivery riders, and older people without cooling.
          </p>
          <p>
            Most warning systems look at air temperature alone. But 38 °C in humid Karachi is far more dangerous than
            38 °C in dry Riyadh; and in South Asia the danger outdoors doesn’t end with summer. From October to
            February, smog takes over. Studies of heat and air pollution have found that the two together raise
            mortality more than either alone: heat makes people breathe faster and deeper, taking in more of the
            polluted air.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>What’s new here</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            HeatSignal combines heat stress (WBGT), air quality (US AQI) and UV into a single <b>Compound Environmental
            Health Risk Score</b> from 0 to 100, and turns it into action: an hour-by-hour safe-work plan, a printable
            site notice, and AI-written alerts in English, Urdu and Arabic. It works for any city on Earth on day one,
            because it relies on universal physiology and free global forecasts, not on local hospital records that
            many of the hottest cities don’t have.
          </p>
          <div className="flex overflow-hidden rounded-md text-center text-xs font-semibold text-white">
            {COMPOUND_BANDS.map((b, i) => (
              <div key={b.level} className="flex-1 px-1 py-2" style={{ backgroundColor: b.color }}>
                {b.level}
                <div className="font-normal opacity-90">{i === 0 ? 0 : COMPOUND_BANDS[i - 1].max + 1}–{b.max}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-xl font-semibold tracking-tight">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Card key={title} >
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-5 w-5" /></span>
                  <span className="text-xs text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader><CardTitle>The science</CardTitle></CardHeader>
        <CardContent className="space-y-5 text-sm leading-relaxed">
          <div>
            <h3 className="mb-1 font-semibold">Heat stress (WBGT)</h3>
            <p className="text-muted-foreground">
              Wet Bulb Globe Temperature measures how hard it is for the body to shed heat. HeatSignal uses the Australian
              Bureau of Meteorology’s formula for sunny conditions. That formula overstates heat stress at night, so HeatSignal
              blends to the ISO 7243 shade formula as sunlight falls to zero.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">
{`Sun:   WBGT = 0.567 × T + 0.393 × e + 3.94,   e = (RH/100) × 6.105 × exp(17.27·T / (237.7 + T))
Shade: WBGT = 0.7 × Tw + 0.3 × T              (Tw = wet-bulb temperature, Stull 2011)`}
            </pre>
            <div className="mt-2 flex overflow-hidden rounded-md text-center text-xs font-semibold text-slate-900">
              {RISK_BANDS.map((b, i) => (
                <div key={b.level} className="flex-1 py-1.5" style={{ backgroundColor: b.color }}>
                  {b.level} {i === 0 ? "< 27" : i === RISK_BANDS.length - 1 ? `≥ ${b.min}` : `${b.min}–${RISK_BANDS[i + 1].min}`}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-1 font-semibold">Air quality and UV</h3>
            <p className="text-muted-foreground">
              The US EPA Air Quality Index for the worst of PM2.5, PM10 (including desert dust), ozone, NO₂, SO₂ and CO,
              and the WHO UV index.
            </p>
            <div className="mt-2 flex overflow-hidden rounded-md text-center text-xs font-semibold text-white">
              {AQI_BANDS.map((b) => (
                <div key={b.label} className="flex-1 px-1 py-1.5" style={{ backgroundColor: b.color }}>
                  {b.max === Infinity ? "301+" : `≤ ${b.max}`}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-1 font-semibold">Compound score</h3>
            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">
{`base    = 0.45 × min(WBGT/40, 1) + 0.40 × min(AQI/300, 1) + 0.15 × min(UV/11, 1)
penalty = 1 + 0.5 × heat × air     when heat > 0.5 and air > 0.4   (up to 1.5×)
score   = min(100, round(100 × base × penalty))`}
            </pre>
            <p className="mt-2 text-muted-foreground">
              This is HeatSignal’s own index, not a clinical standard: the weights and penalty are design choices that
              encode “both together is worse than either alone”. The inputs and their thresholds are the established ones.
            </p>
          </div>

          <div>
            <h3 className="mb-1 font-semibold">Safe work hours</h3>
            <p className="text-muted-foreground">
              Work–rest cycles (60, 45/15, 30/30, 15/45 minutes, or stop) follow the ACGIH limits published in the OSHA
              Technical Manual, separately for light, moderate and heavy work. Hydration follows CDC/NIOSH advice (about
              a cup every 15–20 minutes, at most 1.5 litres an hour).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><WifiOff className="h-5 w-5" /> Works in the field</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 ps-5 text-sm leading-relaxed">
            <li><b>Installable.</b> Add HeatSignal to a phone’s home screen; it opens like an app.</li>
            <li><b>Last-known data when offline.</b> If the network drops or the forecast service fails, the last good readings stay on screen with an amber “Offline” label and their time.</li>
            <li><b>First Aid works offline.</b> The first-aid guide is stored on the device the first time the app loads.</li>
            <li><b>Alerts without the AI service.</b> If the AI is unavailable, built-in rules write the alert from the same measurements.</li>
            <li><b>Low data use.</b> One batched request per 50 cities, refreshed every 30 minutes, so it runs on a weak mobile signal.</li>
          </ul>
        </CardContent>
      </Card>

      <Card id="worker-rights" className="scroll-mt-20">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Worker rights and data</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 ps-5 text-sm leading-relaxed">
            <li><b>No personal health data is collected.</b> Risk is calculated from weather, workload, clothing and acclimatisation only.</li>
            <li><b>Incident reports are anonymous and aggregated.</b> Counts below 5 are hidden so no report can be traced to a person.</li>
            <li><b>Data must not be used for disciplinary, hiring, ranking or pay decisions.</b> Worker protection comes before productivity.</li>
            <li>
              <b>Wearables are a future option, and only ever opt-in.</b> Signals such as heart rate or skin temperature would
              need informed consent, minimal retention, and would be visible only to the worker and the site medic.
            </li>
            <li><b>Supervisors see crew- and site-level schedules,</b> never individual clinical detail.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team</CardTitle></CardHeader>
        <CardContent>
          <p className="font-semibold">Team HeatSignal, Kinnaird College for Women, Lahore</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {TEAM.map((m) => (
              <div key={m.name} className="rounded-lg border p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">
                  {m.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div className="mt-2 font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.role}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe2 className="h-5 w-5" /> Data sources and credits</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Weather forecasts, historical archive, air quality and geocoding by <A href="https://open-meteo.com/">Open-Meteo</A>,
              licensed under <A href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</A>. Air quality from the Copernicus
              Atmosphere Monitoring Service (CAMS) model. These are model estimates, not street-level monitors.
            </li>
            <li>WBGT: <A href="http://www.bom.gov.au/info/thermal_stress/">Australian Bureau of Meteorology</A>; ISO 7243; wet-bulb temperature from Stull (2011).</li>
            <li>Work–rest limits: ACGIH, as published in the OSHA Technical Manual; heat guidance from WHO and NIOSH.</li>
            <li>US EPA Air Quality Index categories; WHO 2021 PM2.5 guideline; WHO UV index.</li>
            <li>Map tiles © Esri, HERE, Garmin and OpenStreetMap contributors.</li>
            <li>City populations are rounded metro-area estimates, used only to indicate scale.</li>
            <li>Alerts are written by Google Gemini from HeatSignal’s computed values and should be reviewed before public use.</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            {STACK.map(({ icon: Icon, name }) => (
              <span key={name} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                <Icon className="h-3.5 w-3.5 text-primary" /> {name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm">
        <Link href="/" className="font-medium text-primary underline-offset-2 hover:underline">Open the live dashboard →</Link>
      </p>
    </div>
  );
}
