"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
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

/** Sticky 48-hour early-warning banners, shown on every page under the header. */
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
  const dismiss = (key: string) => {
    const next = new Set(dismissed).add(key);
    setDismissed(next);
    try {
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(next)));
    } catch {}
  };

  const list = upcoming.filter(({ city, u }) => !dismissed.has(id(city, u)));
  if (!list.length) return null;
  const shown = expanded ? list : list.slice(0, VISIBLE);

  return (
    <div className="no-print sticky top-14 z-30 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl space-y-1 px-4 py-2">
        {shown.map(({ city, u }, i) => {
          const critical = u.severity === "critical";
          return (
            <div
              key={id(city, u)}
              role="alert"
              className={cn(
                "flex animate-slide-down items-center gap-3 rounded-lg border px-3 py-1.5 text-sm",
                critical ? "animate-risk-pulse border-red-500/60 bg-red-500/15" : "border-yellow-500/60 bg-yellow-500/10",
              )}
              style={{ animationDelay: `${i * 60}ms`, ["--glow" as string]: "rgba(239,68,68,.45)" }}
            >
              <span aria-hidden="true">{critical ? "🚨" : "⚠️"}</span>
              <span className="min-w-0 flex-1">
                {critical
                  ? t("bannerCritical", { city: city.name, hours: u.hoursUntil })
                  : t("bannerHigh", { city: city.name, hours: u.hoursUntil, score: u.peakScore })}
              </span>
              <Link href={cityHref(city)} className="shrink-0 font-medium underline-offset-2 hover:underline">
                {t("viewDetails")} →
              </Link>
              <button type="button" aria-label={t("dismiss")} onClick={() => dismiss(id(city, u))} className="shrink-0 rounded p-1 hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {list.length > VISIBLE && (
          <button type="button" onClick={() => setExpanded(!expanded)} className="px-1 text-xs text-muted-foreground hover:text-foreground">
            {expanded ? "Show fewer" : t("moreWarnings", { n: list.length - VISIBLE })}
          </button>
        )}
      </div>
    </div>
  );
}
