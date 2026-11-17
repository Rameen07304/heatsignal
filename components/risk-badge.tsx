import { Badge } from "@/components/ui/badge";
import { aqiBand, formatAqi } from "@/lib/air";
import { compoundBand, RISK_COLORS, type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";

function ColorBadge({ color, pulse, className, children, title }: {
  color: string;
  pulse?: boolean;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Badge
      title={title}
      className={cn(pulse && "animate-risk-pulse", className)}
      style={{ color, borderColor: `${color}80`, backgroundColor: `${color}1f`, ["--glow" as string]: `${color}66` }}
    >
      <span className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </Badge>
  );
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <ColorBadge color={RISK_COLORS[level]} pulse={level === "High" || level === "Extreme"} className={className}>
      {level}
    </ColorBadge>
  );
}

/** `short` shows just the number; the full form adds the EPA category name. */
export function AqiBadge({ aqi, short, className }: { aqi: number; short?: boolean; className?: string }) {
  const band = aqiBand(aqi);
  return (
    <ColorBadge color={band.color} pulse={aqi > 150} className={className} title={`US AQI ${formatAqi(aqi)} — ${band.label}`}>
      AQI {formatAqi(aqi)}
      {!short && ` · ${band.label}`}
    </ColorBadge>
  );
}

export function CompoundBadge({ score, className }: { score: number; className?: string }) {
  const band = compoundBand(score);
  return (
    <ColorBadge color={band.color} pulse={score > 50} className={className} title={band.description}>
      {band.level} · {score}/100
    </ColorBadge>
  );
}
