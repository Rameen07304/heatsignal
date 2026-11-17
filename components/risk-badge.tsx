"use client";

import { aqiBand, formatAqi } from "@/lib/air";
import { levelKey, useT } from "@/lib/i18n";
import { compoundBand, RISK_COLORS, type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";

/** Neutral pill with a coloured dot: the word always carries the meaning, colour only reinforces it. */
function Pill({ color, className, children, title }: { color: string; className?: string; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-card px-2 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const { t } = useT();
  return <Pill color={RISK_COLORS[level]} className={className}>{t(levelKey(level))}</Pill>;
}

/** `short` shows just the number; the full form adds the EPA category name. */
export function AqiBadge({ aqi, short, className }: { aqi: number; short?: boolean; className?: string }) {
  const band = aqiBand(aqi);
  return (
    <Pill color={band.color} className={className} title={`US AQI ${formatAqi(aqi)} — ${band.label}`}>
      {short ? band.label.replace(" for sensitive groups", " (sensitive)") : `AQI ${formatAqi(aqi)} · ${band.label}`}
    </Pill>
  );
}

export function CompoundBadge({ score, className }: { score: number; className?: string }) {
  const { t } = useT();
  const band = compoundBand(score);
  return (
    <Pill color={band.color} className={className} title={band.description}>
      <span className="font-semibold tabular-nums">{score}</span> {t(levelKey(band.level))}
    </Pill>
  );
}
