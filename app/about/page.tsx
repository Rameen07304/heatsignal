import type { Metadata } from "next";
import { ArrowRight, Droplets, Gauge, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          HeatSignal is a real-time heat-illness early warning system. It turns free, global weather forecasts into a
          heat stress risk level for any city, and uses AI to write plain-language alerts — in English, Urdu and
          Arabic — for the people who need them.
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
            This is the Australian Bureau of Meteorology’s simplified approximation. It assumes moderate sun and light
            wind, so it can overestimate stress at night or in strong wind and underestimate it in full sun with still
            air. Wind and solar radiation are shown for context but are not part of the calculation.
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
            <li>Map tiles © <A href="https://www.openstreetmap.org/copyright">OpenStreetMap</A> contributors.</li>
            <li>Alerts generated with Google Gemini. AI-written text should be reviewed before public use.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
