"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, TriangleAlert, X } from "lucide-react";
import { cityHref, cityKey, type City } from "@/lib/cities";
import { useT } from "@/lib/i18n";
import { upcomingRisk, type Upcoming } from "@/lib/risk-forecast";
import { useLoaded } from "@/lib/use-cities";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "heatsignal-dismissed-warnings";
const VISIBLE = 3;

/** Cities forecast to cross into High or Critical within 48 hours: most severe, then soonest. */
export function useUpcoming(): { city: City; u: Upcoming }[] {
  return useLoaded()
    .flatMap(({ city, c }) => {
      const u = upcomingRisk(c);
      return u ? [{ city, u }] : [];
    })
    .sort((a, b) => (a.u.severity === b.u.severity ? a.u.hoursUntil - b.u.hoursUntil : a.u.severity === "critical" ? -1 : 1));
}

/** One compact 48-hour early-warning alert at the top of every page. */
export function EarlyWarningBanner() {
  const { t } = useT();
  const upcoming = useUpcoming();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  // Dismissals last for this browser session.
  useEffect(() => {
    try {
      setDismissed(new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]")));
    } catch {}
  }, []);

  const id = (city: City, u: Upcoming) => `${cityKey(city)}|${u.severity}`;
  const save = (next: Set<string>) => {
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(next)));
    } catch {}
  };

  const list = upcoming.filter(({ city, u }) => !dismissed.has(id(city, u)));
  if (!list.length) return null;
  const critical = list.some(({ u }) => u.severity === "critical");
  const shown = expanded ? list : list.slice(0, VISIBLE);

  return (
    <section
      role="alert"
      className={cn(
        "no-print mb-6 rounded-lg border",
        critical ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <TriangleAlert className={cn("mt-0.5 h-5 w-5 shrink-0", critical ? "text-red-600" : "text-amber-600")} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {t(list.length === 1 ? "bannerHeadOne" : "bannerHeadMany", { n: list.length })}
          </p>
          <ul className="mt-1.5 space-y-2 sm:space-y-1">
            {shown.map(({ city, u }, i) => (
              // Phones show only the first warning until expanded; each row stacks its actions underneath.
              <li key={id(city, u)} className={cn("flex-wrap items-center gap-x-2 gap-y-0.5 text-sm sm:flex-nowrap", i > 0 && !expanded ? "hidden sm:flex" : "flex")}>
                <span className={cn("h-2 w-2 shrink-0 rounded-full", u.severity === "critical" ? "bg-red-600" : "bg-amber-500")} />
                <span className="min-w-0 flex-1">
                  {u.severity === "critical"
                    ? t("bannerCritical", { city: city.name, hours: u.hoursUntil })
                    : t("bannerHigh", { city: city.name, hours: u.hoursUntil, score: u.peakScore })}
                </span>
                <span className="flex w-full items-center gap-2 ps-4 sm:w-auto sm:ps-0">
                  <Link href={cityHref(city)} className="font-medium text-primary hover:underline">
                    {t("viewDetails")}
                  </Link>
                  <button
                    type="button"
                    aria-label={`${t("dismiss")} ${city.name}`}
                    onClick={() => save(new Set(dismissed).add(id(city, u)))}
                    className="rounded p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {list.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className={cn("mt-1.5 items-center gap-1 text-sm font-medium text-primary hover:underline", list.length > VISIBLE ? "inline-flex" : "inline-flex sm:hidden")}
            >
              {expanded ? t("showFewer") : (
                <>
                  <span className="sm:hidden">{t("moreWarnings", { n: list.length - 1 })}</span>
                  <span className="hidden sm:inline">{t("moreWarnings", { n: list.length - VISIBLE })}</span>
                </>
              )}
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
