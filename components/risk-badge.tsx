import { Badge } from "@/components/ui/badge";
import { RISK_COLORS, type RiskLevel } from "@/lib/risk";

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const color = RISK_COLORS[level];
  return (
    <Badge
      className={className}
      style={{ color, borderColor: `${color}80`, backgroundColor: `${color}1f` }}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {level}
    </Badge>
  );
}
