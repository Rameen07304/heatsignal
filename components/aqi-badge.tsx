import { Badge } from "@/components/ui/badge";
import { aqiBand } from "@/lib/air";

/** `short` shows just the number; the full form adds the EPA category name. */
export function AqiBadge({ aqi, short, className }: { aqi: number; short?: boolean; className?: string }) {
  const band = aqiBand(aqi);
  return (
    <Badge
      className={className}
      title={`US AQI ${Math.round(aqi)} — ${band.label}`}
      style={{ color: band.color, borderColor: `${band.color}80`, backgroundColor: `${band.color}1f` }}
    >
      AQI {Math.round(aqi)}
      {!short && ` · ${band.label}`}
    </Badge>
  );
}
