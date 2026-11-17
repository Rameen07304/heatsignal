import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AqiBadge, CompoundBadge, RiskBadge } from "@/components/risk-badge";
import { formatAqi } from "@/lib/air";
import type { CombinedDay } from "@/lib/conditions";
import { formatDay } from "@/lib/utils";

/** Daily summary table. Air-quality and compound columns appear when any day has air data. */
export function ForecastTable({ daily }: { daily: CombinedDay[] }) {
  const air = daily.some((d) => d.maxAqi != null);
  const dash = <span className="text-muted-foreground">–</span>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Max temp</TableHead>
          <TableHead className="text-right">Max WBGT</TableHead>
          <TableHead>Heat risk</TableHead>
          {air && (
            <>
              <TableHead className="text-right">Max AQI</TableHead>
              <TableHead>Air risk</TableHead>
              <TableHead className="text-right">Max PM2.5</TableHead>
              <TableHead>Overall (compound)</TableHead>
            </>
          )}
          <TableHead>Peak heat hour</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {daily.map((d) => (
          <TableRow key={d.date}>
            <TableCell className="font-medium">{formatDay(d.date)}</TableCell>
            <TableCell className="text-right">{d.maxTemp.toFixed(1)} °C</TableCell>
            <TableCell className="text-right">{d.maxWbgt.toFixed(1)} °C</TableCell>
            <TableCell><RiskBadge level={d.risk} /></TableCell>
            {air && (
              <>
                <TableCell className="text-right">{d.maxAqi != null ? formatAqi(d.maxAqi) : dash}</TableCell>
                <TableCell>{d.maxAqi != null ? <AqiBadge aqi={d.maxAqi} /> : dash}</TableCell>
                <TableCell className="text-right">{d.maxPm25 != null ? `${d.maxPm25.toFixed(0)} µg/m³` : dash}</TableCell>
                <TableCell>{d.maxScore != null ? <CompoundBadge score={d.maxScore} /> : dash}</TableCell>
              </>
            )}
            <TableCell>{d.peakHour}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
