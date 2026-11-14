"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskBadge } from "@/components/risk-badge";
import type { AirNow } from "@/lib/air";
import type { City } from "@/lib/cities";
import type { HourlyPoint } from "@/lib/weather";
import type { AlertText, HeatAlert } from "@/lib/gemini";

const LANGS = [
  { key: "en", label: "English", dir: "ltr", headings: ["Risk assessment", "Who is vulnerable", "Recommended actions"] },
  { key: "ur", label: "اردو", dir: "rtl", headings: ["خطرے کا جائزہ", "کون زیادہ خطرے میں ہے", "تجویز کردہ اقدامات"] },
  { key: "ar", label: "العربية", dir: "rtl", headings: ["تقييم الخطر", "الفئات الأكثر عرضة", "الإجراءات الموصى بها"] },
] as const;

function AlertBody({ text, headings, dir }: { text: AlertText; headings: readonly string[]; dir: string }) {
  return (
    <div dir={dir} className="space-y-4 text-sm leading-relaxed">
      <section>
        <h4 className="mb-1 font-semibold">{headings[0]}</h4>
        <p>{text.risk_assessment}</p>
      </section>
      <section>
        <h4 className="mb-1 font-semibold">{headings[1]}</h4>
        <ul className="list-disc space-y-0.5 ps-5">
          {text.vulnerable_groups.map((g) => <li key={g}>{g}</li>)}
        </ul>
      </section>
      <section>
        <h4 className="mb-1 font-semibold">{headings[2]}</h4>
        <ul className="list-disc space-y-0.5 ps-5">
          {text.actions.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </section>
    </div>
  );
}

export function AlertDialog({
  city,
  current,
  air,
  ...buttonProps
}: { city: City; current: HourlyPoint; air?: AirNow | null } & ButtonProps) {
  const [alert, setAlert] = useState<HeatAlert | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setAlert(null);
    try {
      const res = await fetch("/api/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: [city.name, city.country].filter(Boolean).join(", "),
          lat: city.lat,
          lon: city.lon,
          weather_data: {
            temperature: current.temp,
            humidity: current.rh,
            wind: current.wind,
            solar: current.solar,
            wbgt: current.wbgt,
            aqi: air?.aqi,
            pm25: air?.pm25,
          },
          risk_level: current.risk,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setAlert(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog onOpenChange={(open) => open && !alert && !loading && generate()}>
      <DialogTrigger asChild>
        <Button {...buttonProps}>
          <Sparkles /> Generate Alert
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Safety alert — {city.name} <RiskBadge level={current.risk} />
          </DialogTitle>
          <DialogDescription>
            WBGT {current.wbgt.toFixed(1)} °C · {current.temp.toFixed(1)} °C · {current.rh.toFixed(0)}% humidity ·
            {air ? ` AQI ${Math.round(air.aqi)} ·` : ""} AI-generated, review before sharing.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Generating alert in English, Urdu and Arabic…
          </div>
        )}

        {error && (
          <div role="alert" className="space-y-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {error}
            </p>
            <Button size="sm" variant="outline" onClick={generate}>Try again</Button>
          </div>
        )}

        {alert && (
          <Tabs defaultValue="en">
            <TabsList>
              {LANGS.map((l) => <TabsTrigger key={l.key} value={l.key}>{l.label}</TabsTrigger>)}
            </TabsList>
            {LANGS.map((l) => (
              <TabsContent key={l.key} value={l.key}>
                <AlertBody text={alert[l.key]} headings={l.headings} dir={l.dir} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
