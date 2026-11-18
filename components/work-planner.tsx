"use client";

import { useState } from "react";
import { Droplets } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNHEALTHY_AQI, aqiBand, formatAqi } from "@/lib/air";
import { formatDay } from "@/lib/utils";
import { INTENSITIES, REGIMENS, hourRanges, workRegimen, type HourRange, type Intensity } from "@/lib/work-rest";
import type { CombinedHour } from "@/lib/conditions";

export const listRanges = (ranges: HourRange[]) => ranges.map((r) => `${r.from}–${r.to}`).join(", ");
const list = listRanges;

/** AQI above this is "Very unhealthy": outdoor exertion should be avoided, not just reduced. */
export const VERY_UNHEALTHY_AQI = 201;

interface Props {
  hourly: CombinedHour[];
  /** Local "YYYY-MM-DDTHH" of the current hour, to mark "now" and dim the past. */
  now: string;
  /** Activity level to start on. */
  initialIntensity?: Intensity;
}

export function WorkPlanner({ hourly, now, initialIntensity = "moderate" }: Props) {
  const [intensity, setIntensity] = useState<Intensity>(initialIntensity);
  const days = Array.from(new Set(hourly.map((p) => p.time.slice(0, 10)))).slice(0, 3);
  const [day, setDay] = useState(days[0]);

  const hours = hourly
    .filter((p) => p.time.startsWith(day))
    .map((p) => ({ ...p, regimen: workRegimen(p.wbgt, intensity), aqi: p.air?.aqi }));
  const hasAir = hours.some((h) => h.aqi != null);
  const badAir = (h: (typeof hours)[number]) => (h.aqi ?? 0) >= UNHEALTHY_AQI;
  const worstAir = (h: (typeof hours)[number]) => (h.aqi ?? 0) >= VERY_UNHEALTHY_AQI;

  // An hour is only "safe" if both the heat and the air allow normal activity.
  const safe = hourRanges(hours, (h) => h.regimen.workMin === 60 && !badAir(h));
  const avoid = hourRanges(hours, (h) => h.regimen.workMin <= 15 || worstAir(h));
  const safeHours = safe.reduce((n, r) => n + r.hours, 0);
  const heatLimited = hours.some((h) => h.regimen.workMin < 60);
  const activity = INTENSITIES.find((i) => i.key === intensity)!;
  const what = `${activity.label.toLowerCase()} activity`;

  // Air between 101 and 150 doesn't stop healthy adults, but the verdict must still say who it affects.
  const sensitiveAir = (h: (typeof hours)[number]) => (h.aqi ?? 0) > 100 && !badAir(h);
  const sensitiveRanges = hourRanges(hours, sensitiveAir);
  const peakAqi = Math.max(0, ...hours.map((h) => h.aqi ?? 0));
  const airNote = sensitiveRanges.length
    ? ` Sensitive groups (asthma, heart disease, children, older adults) should limit exertion. AQI up to ${formatAqi(peakAqi)}.`
    : "";

  const headline =
    safeHours === hours.length
      ? `Safe all day for ${sensitiveRanges.length ? "healthy adults doing " : ""}${what}.${airNote}`
      : safeHours === 0
        ? `No fully safe hours for ${what}. ${
            hours.every(badAir)
              ? "the air is unhealthy all day"
              : hours.every((h) => h.regimen.workMin < 60)
                ? "the heat needs rest breaks all day"
                : "every hour is limited by either heat or smog"
          }.`
        : `Best time outdoors: ${list(safe)}.${airNote}`;

  const cell = (h: (typeof hours)[number]) => {
    const key = h.time.slice(0, 13);
    return `flex-1 first:rounded-l last:rounded-r ${key < now ? "opacity-35" : ""} ${
      key === now ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""
    }`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Safe outdoor hours</CardTitle>
        <CardDescription>
          When it is safe to work or be active outside, hour by hour, counting both heat stress and smog, and how
          much rest is needed when it is not.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Tabs value={intensity} onValueChange={(v) => setIntensity(v as Intensity)}>
            <TabsList aria-label="Activity level">
              {INTENSITIES.map((i) => <TabsTrigger key={i.key} value={i.key}>{i.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <Tabs value={day} onValueChange={setDay}>
            <TabsList aria-label="Day">
              {days.map((d, i) => (
                <TabsTrigger key={d} value={d}>{["Today", "Tomorrow"][i] ?? formatDay(d)}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <p className="text-xs text-muted-foreground">
          {activity.label} activity: {activity.examples}.
        </p>

        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-lg font-semibold">{headline}</p>
          {avoid.length > 0 && (
            <p className="mt-1 text-sm">
              <span className="font-semibold" style={{ color: "#b91c1c" }}>Avoid: {list(avoid)}.</span>{" "}
              Move this activity to the safe hours or indoors.
            </p>
          )}
        </div>

        <div role="img" aria-label={`Hour-by-hour plan for ${formatDay(day)}: ${headline}`}>
          <div className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs text-muted-foreground">Heat</span>
            <div className="flex flex-1 gap-px">
              {hours.map((h) => (
                <div
                  key={h.time}
                  title={`${h.time.slice(11, 16)} · WBGT ${h.wbgt.toFixed(1)} °C · ${h.regimen.label}`}
                  className={`h-9 ${cell(h)}`}
                  style={{ backgroundColor: h.regimen.color }}
                />
              ))}
            </div>
          </div>
          {hasAir && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="w-10 shrink-0 text-xs text-muted-foreground">Air</span>
              <div className="flex flex-1 gap-px">
                {hours.map((h) => (
                  <div
                    key={h.time}
                    title={
                      h.aqi == null
                        ? `${h.time.slice(11, 16)} · no air-quality data`
                        : `${h.time.slice(11, 16)} · AQI ${formatAqi(h.aqi)} · ${aqiBand(h.aqi).label}`
                    }
                    className={`h-5 ${cell(h)}`}
                    style={{ backgroundColor: h.aqi == null ? "hsl(var(--muted))" : aqiBand(h.aqi).color }}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="ml-12 mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
            {["00:00", "06:00", "12:00", "18:00", "24:00"].map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>

        <ul className="space-y-1.5 text-sm">
          {[
            ...REGIMENS.map((r) => ({
              // In this list the row is about heat only; smog has its own rows below.
              label: r.workMin === 60 ? "No heat limit" : r.label,
              color: r.color,
              ranges: hourRanges(hours, (h) => h.regimen === r),
            })),
            {
              label: "Air fine (AQI 100 or below)",
              color: aqiBand(50).color,
              ranges: hasAir ? hourRanges(hours, (h) => h.aqi != null && h.aqi <= 100) : [],
            },
            {
              label: "Air unhealthy for sensitive groups. They should limit exertion",
              color: aqiBand(120).color,
              ranges: sensitiveRanges,
            },
            {
              label: "Unhealthy air. Wear an N95 mask and take it easy",
              color: aqiBand(UNHEALTHY_AQI).color,
              ranges: hourRanges(hours, (h) => badAir(h) && !worstAir(h)),
            },
            {
              label: "Very unhealthy air. Stay indoors if you can",
              color: aqiBand(VERY_UNHEALTHY_AQI).color,
              ranges: hourRanges(hours, worstAir),
            },
          ]
            .filter((row) => row.ranges.length > 0)
            .map((row) => (
              <li key={row.label} className="flex items-baseline gap-2">
                <span className="h-2.5 w-2.5 shrink-0 translate-y-px rounded-sm" style={{ backgroundColor: row.color }} />
                <span>
                  <span className="font-medium">{row.label}:</span>{" "}
                  <span className="tabular-nums text-muted-foreground">{list(row.ranges)}</span>
                </span>
              </li>
            ))}
        </ul>

        {heatLimited && (
          <p className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
            <span>
              In the heat-restricted hours, drink one cup of water (about 250 ml) every 15–20 minutes, roughly
              1 litre an hour, even if you are not thirsty. Rest in shade, not in the sun.
            </span>
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Heat limits follow the ACGIH work/rest values published in the OSHA Technical Manual, for healthy adults
          who are used to the heat and wearing normal work clothing. Air limits follow US EPA guidance (AQI above
          150 is unhealthy for everyone). People new to the heat, older adults, children, pregnant women and anyone
          fasting or unwell need more rest than shown. Past hours are dimmed.
        </p>
      </CardContent>
    </Card>
  );
}
