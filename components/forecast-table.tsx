import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/risk-badge";
import { formatDay } from "@/lib/utils";
import type { DailySummary } from "@/lib/weather";

export function ForecastTable({ daily }: { daily: DailySummary[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Max temp</TableHead>
          <TableHead className="text-right">Max WBGT</TableHead>
          <TableHead>Risk level</TableHead>
          <TableHead>Peak risk hour</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {daily.map((d) => (
          <TableRow key={d.date}>
            <TableCell className="font-medium">{formatDay(d.date)}</TableCell>
            <TableCell className="text-right">{d.maxTemp.toFixed(1)} °C</TableCell>
            <TableCell className="text-right">{d.maxWbgt.toFixed(1)} °C</TableCell>
            <TableCell><RiskBadge level={d.risk} /></TableCell>
            <TableCell>{d.peakHour}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
