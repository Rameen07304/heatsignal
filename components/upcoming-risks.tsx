"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUpcoming } from "@/components/early-warning-banner";
import { cityHref, cityKey } from "@/lib/cities";
import { useT } from "@/lib/i18n";
import { compoundBand } from "@/lib/risk";
import { formatDay } from "@/lib/utils";

const PAGE = 6;

/** Cities whose compound risk is forecast to cross into High or Critical within 48 hours, soonest first. */
export function UpcomingRisks() {
  const { t } = useT();
  const [all, setAll] = useState(false);
  const list = [...useUpcoming()].sort((a, b) => a.u.hoursUntil - b.u.hoursUntil);
  if (!list.length) return null;
  const shown = all ? list : list.slice(0, PAGE);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">⚡ {t("upcomingRisks")}</h2>
        <p className="text-sm text-muted-foreground">
          {list.length} {list.length === 1 ? "city is" : "cities are"} forecast to cross into High or Critical compound risk within 48 hours.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(({ city, u }) => {
          const now = compoundBand(u.nowScore);
          const peak = compoundBand(u.peakScore);
          const jump = u.peakScore - u.nowScore;
          return (
            <Card key={cityKey(city)} className={u.severity === "critical" ? "border-red-500/50" : "border-yellow-500/40"}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={cityHref(city)} className="font-semibold hover:underline">{city.name}</Link>
                    <div className="text-xs text-muted-foreground">{city.country}</div>
                  </div>
                  <span className={`text-2xl font-black ${u.severity === "critical" ? "text-red-500" : "text-yellow-500"}`} aria-label={`rising by ${jump} points`}>
                    {jump >= 30 ? "↑↑" : jump >= 15 ? "↑" : "↗"}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2 tabular-nums">
                  <span className="text-xl font-bold" style={{ color: now.color }}>{u.nowScore}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-3xl font-black" style={{ color: peak.color }}>{u.peakScore}</span>
                  <span className="text-xs font-semibold" style={{ color: peak.color }}>{t(peak.level.toLowerCase() as "low")}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Crosses {u.severity === "critical" ? "Critical" : "High"} in <b className="text-foreground">{u.hoursUntil} h</b> · peaks{" "}
                  {formatDay(u.peakTime)} {u.peakTime.slice(11, 16)} local time
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {list.length > PAGE && (
        <Button variant="outline" size="sm" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${list.length}`}
        </Button>
      )}
    </section>
  );
}
