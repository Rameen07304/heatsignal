"use client";

import {
  CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { aqiBand, formatAqi } from "@/lib/air";
import { COMPOUND_BANDS, classifyRisk, compoundBand } from "@/lib/risk";
import { formatDay } from "@/lib/utils";

export interface CompoundPoint {
  /** "YYYY-MM-DD" (daily) or "YYYY-MM-DDTHH:00" (hourly) */
  time: string;
  wbgt: number;
  aqi?: number;
  score?: number;
}

const AXIS = "hsl(var(--muted-foreground))";
const COLORS = { wbgt: "#f97316", aqi: "#a855f7", score: "#ef4444" };

/**
 * WBGT (left axis, °C) with AQI and the compound score (right axis, index). The shaded bands are the
 * compound-score levels. The highest compound score is marked.
 */
export function CompoundChart({ data, height = 340, nowTime, markers = [] }: {
  data: CompoundPoint[];
  height?: number;
  /** Draw a "now" line at this time key. */
  nowTime?: string;
  markers?: { x: string; label: string }[];
}) {
  const hourly = data[0]?.time.length > 10;
  const wbgts = data.map((d) => d.wbgt);
  const yMin = Math.min(10, Math.floor(Math.min(...wbgts)) - 1);
  const yMax = Math.max(40, Math.ceil(Math.max(...wbgts)) + 1);
  // AQI above 500 is off the official scale; clip the line so one dust storm doesn't flatten the rest.
  const rows = data.map((d) => ({ ...d, aqiPlot: d.aqi == null ? undefined : Math.min(d.aqi, 500) }));
  const rMax = Math.max(100, ...rows.map((d) => d.aqiPlot ?? 0));
  const peak = data.reduce<CompoundPoint | null>((p, d) => (d.score != null && (!p || d.score > (p.score ?? -1)) ? d : p), null);
  const label = (t: string) => (hourly ? `${formatDay(t)}, ${t.slice(11, 16)}` : formatDay(t));

  return (
    <div style={{ height }} role="img" aria-label="Heat stress, air quality and compound risk over time">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 22, right: 0, bottom: 0, left: -12 }}>
          {COMPOUND_BANDS.map((b, i) => (
            <ReferenceArea
              key={b.level}
              yAxisId="index"
              y1={i === 0 ? 0 : COMPOUND_BANDS[i - 1].max}
              y2={b.max}
              fill={b.color}
              fillOpacity={0.08}
              stroke="none"
            />
          ))}
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            ticks={hourly ? rows.filter((d) => d.time.endsWith("T00:00")).map((d) => d.time) : undefined}
            tickFormatter={(t: string) => formatDay(t).split(" ").slice(hourly ? 0 : 1, 2).join(" ")}
            tick={{ fill: AXIS, fontSize: 11 }}
            stroke={AXIS}
            tickLine={false}
          />
          <YAxis yAxisId="wbgt" domain={[yMin, yMax]} unit="°" tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} tickLine={false} />
          <YAxis yAxisId="index" orientation="right" domain={[0, rMax]} tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            labelFormatter={(t) => label(String(t))}
            formatter={(v, name, item) => {
              const n = Number(v);
              if (name === "wbgt") return [`${n.toFixed(1)} °C (${classifyRisk(n)})`, "WBGT (heat)"];
              if (name === "aqiPlot") {
                const raw = (item?.payload as CompoundPoint)?.aqi ?? n;
                return [`${formatAqi(raw)} (${aqiBand(raw).label})`, "AQI (air)"];
              }
              return [`${n}/100 (${compoundBand(n).level})`, "Compound score"];
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) => ({ wbgt: "WBGT °C (left)", aqiPlot: "US AQI (right)", score: "Compound score (right)" })[v as string] ?? v}
          />
          {nowTime && <ReferenceLine yAxisId="wbgt" x={nowTime} stroke={AXIS} strokeDasharray="2 3" label={{ value: "Now", position: "top", fill: AXIS, fontSize: 11 }} />}
          {markers.map((m) => (
            <ReferenceLine key={m.x} yAxisId="wbgt" x={m.x} stroke="hsl(var(--foreground))" strokeDasharray="4 3" label={{ value: m.label, position: "top", fill: "hsl(var(--foreground))", fontSize: 11 }} />
          ))}
          <Line yAxisId="wbgt" dataKey="wbgt" stroke={COLORS.wbgt} strokeWidth={2} dot={hourly ? false : { r: 2.5 }} />
          <Line yAxisId="index" dataKey="aqiPlot" stroke={COLORS.aqi} strokeWidth={2} dot={hourly ? false : { r: 2.5 }} connectNulls={false} />
          <Line yAxisId="index" dataKey="score" stroke={COLORS.score} strokeWidth={2.5} dot={hourly ? false : { r: 3 }} connectNulls={false} />
          {peak?.score != null && (
            <ReferenceDot
              yAxisId="index"
              x={peak.time}
              y={peak.score}
              r={5}
              fill={COLORS.score}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              label={{ value: `Peak ${peak.score}`, position: "top", fill: "hsl(var(--foreground))", fontSize: 11 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
