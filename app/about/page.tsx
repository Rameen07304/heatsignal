import type { Metadata } from "next";
import { ArrowRight, Droplets, Gauge, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AQI_BANDS } from "@/lib/air";
import { RISK_BANDS } from "@/lib/risk";

export const metadata: Metadata = { title: "About" };

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
    {children}
  </a>
);

const STEPS = [
  { icon: Thermometer, title: "Air temperature", text: "How hot the air is (°C)." },
  { icon: Droplets, title: "Humidity", text: "Moist air stops sweat evaporating, so the body can’t cool itself." },
  { icon: Gauge, title: "WBGT", text: "One number for how hard it is for a human body to shed heat." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">About HeatSignal</h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          HeatSignal answers one question for anyone who works or lives outdoors: is it safe to be outside right
          now, and if not, when will it be? It turns free, global weather and air-quality forecasts into an
          hour-by-hour safety plan for any city — heat stress in summer, smog in winter — and uses AI to write
          plain-language alerts in English, Urdu and Arabic.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Why it matters</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            Extreme heat kills quietly. Deaths rise days into a heatwave, mostly among outdoor workers, older people
            and those without cooling — and most are preventable with early, specific warnings.
          </p>
          <p>
            Air temperature alone understates the danger: 38 °C in humid Karachi is far more dangerous than 38 °C in
            dry Riyadh. HeatSignal measures the stress on the human body, not just the thermometer.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>How WBGT works</CardTitle></CardHeader>
        <CardContent className="space-y-5 text-sm leading-relaxed">
          <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="contents">
                {i > 0 && <ArrowRight className="mx-auto hidden h-5 w-5 self-center text-muted-foreground sm:block" />}
                <div className="rounded-lg border bg-muted/40 p-3">
                  <Icon className="mb-2 h-5 w-5 text-primary" />
                  <div className="font-semibold">{title}</div>
                  <p className="text-xs text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">
{`WBGT = 0.567 × T + 0.393 × e + 3.94
e    = (RH / 100) × 6.105 × exp(17.27 × T / (237.7 + T))

T = air temperature (°C)   RH = relative humidity (%)   e = vapour pressure (hPa)`}
          </pre>

          <div>
            <div className="flex overflow-hidden rounded-md text-center text-xs font-semibold text-slate-900">
              {RISK_BANDS.map((b) => (
                <div key={b.level} className="flex-1 py-2" style={{ backgroundColor: b.color }}>{b.level}</div>
              ))}
            </div>
            <div className="mt-1 flex text-xs text-muted-foreground">
              <span className="flex-1">below 27 °C</span>
              <span className="flex-1">27–30 °C</span>
              <span className="flex-1">30–33 °C</span>
              <span className="flex-1">33 °C and above</span>
            </div>
          </div>

          <p className="text-muted-foreground">
            This is the Australian Bureau of Meteorology’s simplified approximation, which assumes a sunny day with
            light wind. Used alone it overstates heat stress at night by several degrees in humid cities, so
            HeatSignal corrects it with measured sunlight: after dark it uses the international standard shade
            formula (ISO 7243: 0.7 × wet-bulb + 0.3 × air temperature), and it blends between the two as the sun
            rises. Wind is shown for context but is not part of the calculation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Safe outdoor hours</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            A risk colour tells you there is a problem. The safe-hours planner tells you what to do about it: for
            light, moderate or heavy activity it marks each hour as safe, needing rest breaks (45/15, 30/30 or 15/45
            minutes of work and rest), or unsafe — so a site supervisor can move a shift to the early morning, and
            a parent can pick the hour for the school run.
          </p>
          <p className="text-muted-foreground">
            The heat limits are the ACGIH work/rest screening values published in the OSHA Technical Manual. They
            assume healthy adults who are used to the heat; people new to the heat, older adults, children and
            anyone fasting or unwell need more rest than shown.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Smog: the winter half of the problem</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            In South Asia the danger outdoors does not end with summer. From October to February, cities such as
            Lahore and Delhi sit under smog that is unhealthy for everyone — the same workers who face heat stroke
            in June breathe hazardous air in November.
          </p>
          <p>
            HeatSignal tracks fine-particle pollution (PM2.5) for every monitored city and folds it into the same
            plan: an hour only counts as safe when both the heat and the air allow it.
          </p>
          <div>
            <div className="flex overflow-hidden rounded-md text-center text-[11px] font-semibold text-white">
              {AQI_BANDS.map((b) => (
                <div key={b.label} className="flex-1 px-1 py-2" style={{ backgroundColor: b.color }}>
                  {b.max === Infinity ? "301+" : `≤ ${b.max}`}
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              US AQI for PM2.5: {AQI_BANDS.map((b) => b.label.toLowerCase()).join(", ")}.
            </p>
          </div>
          <p className="text-muted-foreground">
            Air-quality figures are model estimates (Copernicus CAMS via Open-Meteo), not readings from a monitor
            on your street, and can differ from local stations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>The transfer concept</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            Most heat-health warning systems are trained on local hospital or mortality records — data that many of
            the world’s hottest cities don’t have. HeatSignal instead uses universal heat stress physics: the human
            body responds to heat and humidity the same way in Lahore, Dubai or Tokyo.
          </p>
          <p>
            That means it works anywhere a weather forecast exists, with no local health data, on day one. Local
            data can later refine the thresholds, but is never required to get started.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Team</CardTitle></CardHeader>
        <CardContent className="text-sm leading-relaxed">
          <p className="font-semibold">Team HeatSignal — Kinnaird College for Women, Lahore</p>
          <p className="text-muted-foreground">A team of 3 members.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data sources and credits</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Weather forecasts, historical archive and geocoding by <A href="https://open-meteo.com/">Open-Meteo</A>,
              licensed under <A href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</A>.
            </li>
            <li>
              WBGT approximation from the{" "}
              <A href="http://www.bom.gov.au/info/thermal_stress/">Australian Bureau of Meteorology</A>.
            </li>
            <li>Risk thresholds informed by WHO and NIOSH occupational heat stress guidance.</li>
            <li>Wet-bulb temperature from Stull (2011); shade WBGT weighting from ISO 7243.</li>
            <li>Work/rest limits: ACGIH screening values as published in the OSHA Technical Manual.</li>
            <li>
              Air quality from the Open-Meteo Air Quality API (Copernicus Atmosphere Monitoring Service), using US
              EPA AQI categories and the WHO 2021 PM2.5 guideline.
            </li>
            <li>City populations are rounded metro-area estimates, used only to indicate scale.</li>
            <li>Map tiles © <A href="https://www.openstreetmap.org/copyright">OpenStreetMap</A> contributors.</li>
            <li>Alerts generated with Google Gemini. AI-written text should be reviewed before public use.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
