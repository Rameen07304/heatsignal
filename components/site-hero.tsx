"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, HeartPulse, LocateFixed, Loader2, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAqi } from "@/lib/air";
import { WORLD_CITIES, cityKey, type City } from "@/lib/cities";
import { useT, type Key } from "@/lib/i18n";
import { nextFlagChange, tomorrowPeak } from "@/lib/lead-time";
import { placeName } from "@/lib/places";
import { ok, useCities } from "@/lib/use-cities";
import { useWorkerContext } from "@/lib/use-worker-context";
import { INTENSITIES, effectiveWbgt, heatFlag, workRegimen } from "@/lib/work-rest";
import { shiftLabel } from "@/lib/workforce";

/** Shared with Worker Safety: the last work site chosen there. */
export const SITE_KEY = "heatsignal-site";
const DEFAULT_SITE = WORLD_CITIES.find((c) => c.name === "Abu Dhabi")!;

/** What each flag means for heavy outdoor work, in a few words. */
const FLAG_ACTION: Record<string, Key> = { flagGreen: "heroGreen", flagYellow: "heroYellow", flagRed: "heroRed", flagBlack: "heroBlack" };
const SHORT: Record<number, Key> = { 60: "rShort60", 45: "rShort45", 30: "rShort30", 15: "rShort15", 0: "rShort0" };

const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180));

export const siteHref = (c: City, hash = "") =>
  `/worker-safety?lat=${c.lat}&lon=${c.lon}&name=${encodeURIComponent(c.name)}&country=${encodeURIComponent(c.country)}${hash}`;

/** "Right now at your site": one flag, one sentence per workload, the next change, and three actions. */
export function SiteHero() {
  const { t, n, lang } = useT();
  const { cities, data } = useCities();
  const [ctx] = useWorkerContext();
  const [site, setSite] = useState<City>(DEFAULT_SITE);
  const [locating, setLocating] = useState(false);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SITE_KEY) ?? "null");
      if (saved && typeof saved.lat === "number" && typeof saved.lon === "number") setSite(saved);
    } catch {}
    setMinute(new Date().getMinutes());
  }, []);

  const choose = (c: City) => {
    setSite(c);
    try {
      localStorage.setItem(SITE_KEY, JSON.stringify(c));
    } catch {}
  };

  function locate() {
    if (!navigator.geolocation || !cities.length) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lon: p.coords.longitude };
        choose(cities.reduce((a, b) => (km(here, b) < km(here, a) ? b : a)));
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10_000 },
    );
  }

  // Only monitored cities have data loaded; anything else falls back to the default site.
  const options = [...cities].sort((a, b) => placeName(a, lang).localeCompare(placeName(b, lang), lang));
  const current = options.find((c) => cityKey(c) === cityKey(site)) ?? options.find((c) => cityKey(c) === cityKey(DEFAULT_SITE)) ?? options[0];
  const state = current ? data[cityKey(current)] : undefined;
  const c = ok(state) ? state : null;
  const now = c?.now;

  const regimens = now ? INTENSITIES.map((i) => ({ i, r: workRegimen(now.wbgt, i.key, ctx) })) : [];
  const flag = now ? heatFlag(workRegimen(now.wbgt, "heavy", ctx)) : null;
  const adjust = effectiveWbgt(0, ctx);
  const from = c ? Math.max(0, c.hours.findIndex((h) => h.time === c.now.time)) : 0;
  const change = c ? nextFlagChange(c.hours.slice(from), "heavy", ctx, minute) : null;
  const tomorrow = c?.days[1]?.date;
  const peak = c && tomorrow ? tomorrowPeak(c.hours.filter((h) => h.time.startsWith(tomorrow)), "heavy", ctx) : null;
  const inTime = (m: number) => (m >= 60 ? t("inHoursMinutes", { h: Math.floor(m / 60), m: m % 60 }) : t("inMinutes", { m: Math.max(0, m) }));
  const big = "h-12 w-full justify-center text-base sm:w-auto";

  return (
    <section aria-labelledby="hero-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 id="hero-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{t("heroTitle")}</h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="sr-only" htmlFor="hero-site">{t("workSite")}</label>
          <select
            id="hero-site"
            className="h-11 min-w-0 flex-1 rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64 sm:flex-none"
            value={current ? cityKey(current) : ""}
            onChange={(e) => {
              const next = options.find((o) => cityKey(o) === e.target.value);
              if (next) choose(next);
            }}
          >
            {options.map((o) => <option key={cityKey(o)} value={cityKey(o)}>{placeName(o, lang)}</option>)}
          </select>
          <Button variant="outline" className="h-11" onClick={locate} disabled={locating} aria-label={t("useMyLocation")}>
            {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
            <span className="hidden sm:inline">{t("useMyLocation")}</span>
          </Button>
        </div>
      </div>

      {!now || !flag ? (
        <Skeleton className="h-56 w-full rounded-lg" />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="px-5 py-5 text-white sm:px-6" style={{ backgroundColor: flag.color }} role="status">
            <p className="text-2xl font-black leading-tight sm:text-4xl">
              {t(flag.key).toLocaleUpperCase(lang)} — {t(FLAG_ACTION[flag.key])}
            </p>
            <p className="mt-1 text-sm opacity-95" dir="auto">
              WBGT {n(now.wbgt, 1)} °C · {n(now.temp, 0)} °C{now.air ? ` · AQI ${formatAqi(now.air.aqi)}` : ""} · {now.time.slice(11, 16)}
            </p>
          </div>
          <div className="space-y-2 px-5 py-4 sm:px-6">
            <p className="text-base font-medium">
              {regimens.map(({ i, r }) => `${t(i.labelKey)}: ${t(SHORT[r.workMin])}`).join(" · ")}
              {adjust > 0 && (
                <span className="ms-2 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 align-middle text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {t("adjustedShort", { n: n(adjust, 1) })}
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {change ? t("heroTurns", { flag: t(change.flag.key), at: change.at, in: inTime(change.inMinutes) }) : t("heroNoChange")}
              {peak?.bestStart != null && ` ${t("heroSafestTomorrow", { shift: shiftLabel(peak.bestStart) })}`}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild className={big}>
          <Link href={current ? siteHref(current) : "/worker-safety"}><ClipboardList /> {t("heroPlanCrew")}</Link>
        </Button>
        <Button asChild variant="outline" className={big}>
          <Link href={current ? siteHref(current, "#checkin") : "/worker-safety#checkin"}><HeartPulse /> {t("heroCheckFeel")}</Link>
        </Button>
        <Button asChild className={`${big} bg-red-600 text-white hover:bg-red-700`}>
          <Link href="/first-aid"><Siren /> {t("heroEmergency")}</Link>
        </Button>
      </div>
    </section>
  );
}
