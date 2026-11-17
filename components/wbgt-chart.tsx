"use client";

import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { RISK_BANDS, classifyRisk } from "@/lib/risk";
import { formatDay } from "@/lib/utils";

export interface ChartPoint {
  /** "YYYY-MM-DD" (daily) or "YYYY-MM-DDTHH:00" (hourly) */
  time: string;
  wbgt: number;
  temp?: number;
  /** The usual WBGT for this date (average of previous years). */
  normal?: number;
}

interface Props {
  data: ChartPoint[];
  /** Vertical annotation lines; `x` must equal a point's `time`. */
  markers?: { x: string; label: string; color?: string }[];
  height?: number;
}

const AXIS = "hsl(var(--muted-foreground))";

export function WbgtChart({ data, markers = [], height = 320 }: Props) {
  const hourly = data[0]?.time.length > 10;
  const values = data.flatMap((d) => [d.wbgt, d.temp, d.normal].filter((v): v is number => v != null));
  // Always show at least 20–35 °C so every risk band is visible for context.
  const yMin = Math.min(20, Math.floor(Math.min(...values)) - 1);
  const yMax = Math.max(35, Math.ceil(Math.max(...values)) + 1);
  const label = (t: string) => (hourly ? `${formatDay(t)}, ${t.slice(11, 16)}` : formatDay(t));

  return (
    <div style={{ height }} role="img" aria-label="WBGT over time with risk-level bands">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 12, bottom: 0, left: -16 }}>
          {RISK_BANDS.map((band, i) => (
            <ReferenceArea
              key={band.level}
              y1={i === 0 ? yMin : band.min}
              y2={RISK_BANDS[i + 1]?.min ?? yMax}
              fill={band.color}
              fillOpacity={0.13}
              stroke="none"
            />
          ))}
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            ticks={hourly ? data.filter((d) => d.time.endsWith("T00:00")).map((d) => d.time) : undefined}
            tickFormatter={(t: string) => formatDay(t).split(" ").slice(hourly ? 0 : 1, 2).join(" ")}
            tick={{ fill: AXIS, fontSize: 11 }}
            stroke={AXIS}
            tickLine={false}
          />
          <YAxis domain={[yMin, yMax]} unit="°" tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            labelFormatter={(t) => label(String(t))}
            formatter={(v, name) => {
              const n = Number(v);
              if (name === "wbgt") return [`${n.toFixed(1)} °C (${classifyRisk(n)})`, "WBGT"];
              if (name === "normal") return [`${n.toFixed(1)} °C`, "Normal WBGT (5-yr avg)"];
              return [`${n.toFixed(1)} °C`, "Air temp"];
            }}
          />
          {markers.map((m) => (
            <ReferenceLine
              key={m.x + m.label}
              x={m.x}
              stroke={m.color ?? "hsl(var(--foreground))"}
              strokeDasharray="4 3"
              label={{ value: m.label, position: "top", fill: "hsl(var(--foreground))", fontSize: 11 }}
            />
          ))}
          {data[0]?.temp != null && (
            <Line dataKey="temp" stroke={AXIS} strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
          )}
          {data.some((d) => d.normal != null) && (
            <Line dataKey="normal" stroke="#38bdf8" strokeWidth={2} strokeDasharray="1 4" strokeLinecap="round" dot={false} isAnimationActive={false} />
          )}
          <Line
            dataKey="wbgt"
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            dot={hourly ? false : { r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
