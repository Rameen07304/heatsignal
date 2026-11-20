"use client";

import { useEffect, useState } from "react";
import { AlarmClock } from "lucide-react";
import type { CombinedHour } from "@/lib/conditions";
import { useT } from "@/lib/i18n";
import { hotStreak, nextFlagChange, tomorrowPeak } from "@/lib/lead-time";
import { INTENSITIES, type Intensity, type WorkerContext } from "@/lib/work-rest";
import { shiftLabel } from "@/lib/workforce";

/**
 * Early warning with a lead time: when today's flag gets worse, tomorrow's peak and best shift start, and where
 * today sits in a run of hot days.
 */
export function LeadTime({
  hours,
  now,
  days,
  pastDays,
  work = "heavy",
  ctx,
}: {
  hours: CombinedHour[];
  now: CombinedHour;
  days: { date: string; maxWbgt: number }[];
  pastDays?: { maxWbgt: number }[];
  work?: Intensity;
  ctx?: WorkerContext;
}) {
  const { t, n } = useT();
  const [minute, setMinute] = useState(0);
  useEffect(() => {
    const tick = () => setMinute(new Date().getMinutes());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const from = Math.max(0, hours.findIndex((h) => h.time === now.time));
  const change = nextFlagChange(hours.slice(from), work, ctx, minute);
  const tomorrowDate = days[1]?.date;
  const peak = tomorrowDate ? tomorrowPeak(hours.filter((h) => h.time.startsWith(tomorrowDate)), work, ctx) : null;
  const streak = hotStreak(pastDays ?? [], days);
  const label = t(INTENSITIES.find((i) => i.key === work)!.labelKey);

  const inTime = (m: number) => (m >= 60 ? t("inHoursMinutes", { h: Math.floor(m / 60), m: m % 60 }) : t("inMinutes", { m: Math.max(0, m) }));
  const lines = [
    change && {
      color: change.flag.color,
      text: t("flagChangesAt", { flag: t(change.flag.key), at: change.at, in: inTime(change.inMinutes) }),
    },
    peak && {
      color: peak.flag.color,
      text: t("tomorrowPeak", {
        flag: t(peak.flag.key),
        hours: peak.ranges.map((r) => `${r.from}–${r.to}`).join(", "),
        start: peak.bestStart != null ? shiftLabel(peak.bestStart) : "–",
      }),
    },
    streak && streak.total > 1 && {
      color: "#ea580c",
      text: t("hotStreak", { day: n(streak.day), total: n(streak.total) }),
    },
  ].filter(Boolean) as { color: string; text: string }[];

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold"><AlarmClock className="h-4 w-4 text-primary" /> {t("leadTimeTitle", { work: label.toLowerCase() })}</h2>
      {lines.length ? (
        <ul className="mt-2 space-y-1.5 text-sm">
          {lines.map((l) => (
            <li key={l.text} className="flex gap-2">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color, outline: "1px solid hsl(var(--border))" }} />
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{t("noFlagChange")}</p>
      )}
    </div>
  );
}
