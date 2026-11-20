"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNHEALTHY_AQI, formatAqi, isDusty } from "@/lib/air";
import type { City } from "@/lib/cities";
import type { CombinedHour } from "@/lib/conditions";
import { CLOTHING, INTENSITIES, REGIMENS, heatFlag, hourRanges, litresPerHour, workRegimen, type Intensity } from "@/lib/work-rest";
import { useWorkerContext } from "@/lib/use-worker-context";
import { listRanges } from "@/components/work-planner";
import { emergencyLine } from "@/lib/emergency";
import { useT } from "@/lib/i18n";

/** A one-page notice to print and post at a work site. */
export function SiteCard({ city, now, today }: { city: City; now: CombinedHour; today: CombinedHour[] }) {
  const [intensity, setIntensity] = useState<Intensity>("heavy");
  const [ctx] = useWorkerContext();
  const { t, date } = useT();
  const tr = (k: string) => t(k as Parameters<typeof t>[0]);
  const assumption = `${t(CLOTHING.find((c) => c.key === ctx.clothing)!.labelKey)}, ${t(ctx.acclimatised ? "crewAcclimatised" : "crewNewToHeat")}`;
  const daytime = today.filter((h) => {
    const hour = Number(h.time.slice(11, 13));
    return hour >= 6 && hour < 20;
  });
  const withRegimen = daytime.map((h) => ({ ...h, regimen: workRegimen(h.wbgt, intensity, ctx) }));
  // The posted flag is the day's worst daytime hour, not the moment it was printed.
  const strictest = withRegimen.reduce((a, b) => (b.regimen.workMin < a.regimen.workMin ? b : a), withRegimen[0] ?? { ...now, regimen: workRegimen(now.wbgt, intensity, ctx) });
  const flag = heatFlag(strictest.regimen);
  const peakLitres = Math.max(...withRegimen.map((h) => litresPerHour(h.regimen)));
  const maxAqi = Math.max(0, ...today.map((h) => h.air?.aqi ?? 0));

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Tabs value={intensity} onValueChange={(v) => setIntensity(v as Intensity)}>
          <TabsList aria-label={t("workType")}>
            {INTENSITIES.map((i) => <TabsTrigger key={i.key} value={i.key}>{t(i.labelKey)}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Button onClick={() => window.print()}>
          <Printer /> {t("printSiteNotice")}
        </Button>
      </div>

      <div className="site-card overflow-hidden rounded-lg border-2 bg-card" style={{ borderColor: flag.color }}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-white" style={{ backgroundColor: flag.color }}>
          <div>
            <div className="text-sm font-medium opacity-95">{t("heatSafetyNotice")}</div>
            <div className="text-3xl font-black uppercase tracking-tight">{t(flag.key)}</div>
            <div className="text-sm opacity-95">
              {t(flag.textKey)}
              {strictest.regimen.workMin < 60 && ` ${t("peakAround", { time: strictest.time.slice(11, 16), wbgt: strictest.wbgt.toFixed(1) })}`}
            </div>
            {flag.escalate && <div className="mt-1 max-w-xl text-sm font-semibold">{t("heatEscalate")}</div>}
          </div>
          <div className="text-right text-sm">
            <div className="text-lg font-bold">{city.name}{city.country && `, ${city.country}`}</div>
            <div>{t("noticeUpdated", { day: date(now.time), time: now.time.slice(11, 16) })}</div>
            <div dir="ltr">{t("nowShort")}: WBGT {now.wbgt.toFixed(1)} °C · {now.temp.toFixed(0)} °C{now.air ? ` · AQI ${formatAqi(now.air.aqi)}` : ""}</div>
          </div>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-3">
          <section>
            <h3 className="mb-2 font-bold uppercase tracking-wide">{t("todaysSchedule")}</h3>
            <p className="mb-2 text-xs text-muted-foreground">{t(INTENSITIES.find((i) => i.key === intensity)!.labelKey)} · 06:00–20:00 · {assumption}</p>
            <ul className="space-y-1.5 text-sm">
              {REGIMENS.map((r) => {
                const ranges = hourRanges(withRegimen, (h) => h.regimen === r);
                return ranges.length ? (
                  <li key={r.workMin} className="flex gap-2">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: r.color }} />
                    <span><b dir="ltr">{listRanges(ranges)}</b><br />{t(r.key)}</span>
                  </li>
                ) : null;
              })}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-bold uppercase tracking-wide">{t("waterAndProtection")}</h3>
            <p className="text-3xl font-black tabular-nums">{t("litresPerHour", { n: peakLitres.toFixed(peakLitres < 1 ? 2 : 0) })}</p>
            <p className="text-sm">{t("noticeWaterNote")}</p>
            <ul className="mt-3 list-disc space-y-1 ps-5 text-sm">
              <li>{t("noticeRestShade")}</li>
              <li>{t("noticePairs")}</li>
              <li>{t("noticeNewWorkers")}</li>
              {maxAqi >= UNHEALTHY_AQI && <li><b>{t("n95Required")}</b>: AQI {formatAqi(maxAqi)}</li>}
              {today.some((h) => isDusty(h.air)) && <li><b>{t("dustToday")}</b> {t("dustAction")}</li>}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 font-bold uppercase tracking-wide">{t("emergencySigns")}</h3>
            <p className="text-sm font-semibold">{t("heatExhaustion")}</p>
            <p className="mb-2 text-sm">{t("heatExhaustionSigns")}</p>
            <p className="text-sm font-semibold text-destructive">{t("heatStrokeCallNow")}</p>
            <p className="text-sm">{t("heatStrokeSigns")}</p>
            <p className="mt-2 text-xs font-semibold">{t("svcEmergency")}: <span dir="ltr">{emergencyLine(city.country, tr)}</span></p>
          </section>
        </div>
        <p className="border-t px-5 py-2 text-xs text-muted-foreground">
          HeatSignal · {t("noticeFooter", { assumption })}
        </p>
      </div>
    </div>
  );
}
