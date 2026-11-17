"use client";

import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AQI_BANDS, aqiBand, formatAqi } from "@/lib/air";
import { COMPOUND_BANDS, RISK_BANDS, classifyRisk, compoundBand } from "@/lib/risk";
import { formatDay } from "@/lib/utils";

export interface CompoundPoint {
  /** "YYYY-MM-DD" (daily) or "YYYY-MM-DDTHH:00" (hourly) */
  time: string;
  wbgt: number;
  aqi?: number;
  score?: number;
}

const AXIS = "hsl(var(--muted-foreground))";
const INK = "hsl(var(--foreground))";
const TOOLTIP = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };

interface PanelProps {
  rows: (CompoundPoint & { aqiPlot?: number })[];
  dataKey: "score" | "wbgt" | "aqiPlot";
  domain: [number, number];
  bands: { from: number; to: number; color: string }[];
  format: (v: number, row: CompoundPoint) => string;
  name: string;
  height: number;
  showX: boolean;
  hourly: boolean;
  nowTime?: string;
  markers: { x: string; label: string }[];
  peak?: CompoundPoint | null;
  unit?: string;
}

function Panel({ rows, dataKey, domain, bands, format, name, height, showX, hourly, nowTime, markers, peak, unit }: PanelProps) {
  const label = (t: string) => (hourly ? `${formatDay(t)}, ${t.slice(11, 16)}` : formatDay(t));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} syncId="compound" margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
          {bands.map((b) => (
            <ReferenceArea key={`${b.from}-${b.to}`} y1={b.from} y2={b.to} fill={b.color} fillOpacity={0.1} stroke="none" ifOverflow="hidden" />
          ))}
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            hide={!showX}
            ticks={hourly ? rows.filter((d) => d.time.endsWith("T00:00")).map((d) => d.time) : undefined}
            tickFormatter={(t: string) => formatDay(t).split(" ").slice(hourly ? 0 : 1, 2).join(" ")}
            tick={{ fill: AXIS, fontSize: 11 }}
            stroke={AXIS}
            tickLine={false}
          />
          <YAxis domain={domain} width={44} unit={unit} tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} tickLine={false} allowDataOverflow />
          <Tooltip
            contentStyle={TOOLTIP}
            labelStyle={{ color: INK, fontWeight: 600 }}
            labelFormatter={(t) => label(String(t))}
            formatter={(v, _n, item) => [format(Number(v), item?.payload as CompoundPoint), name]}
          />
          {nowTime && <ReferenceLine x={nowTime} stroke={AXIS} strokeDasharray="2 3" />}
          {markers.map((m) => <ReferenceLine key={m.x} x={m.x} stroke={INK} strokeDasharray="4 3" />)}
          <Line dataKey={dataKey} stroke={INK} strokeWidth={1.75} dot={hourly ? false : { r: 2.5 }} connectNulls={false} isAnimationActive={false} />
          {peak?.score != null && dataKey === "score" && (
            <ReferenceDot x={peak.time} y={peak.score} r={4.5} fill={compoundBand(peak.score).color} stroke="hsl(var(--card))" strokeWidth={2} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Three time-aligned panels, each on its own scale: the compound score (0–100) with its level bands,
 * heat stress (WBGT °C) with the heat-risk bands, and air quality (US AQI) with the EPA bands.
 * Hovering one panel shows the same hour in all three.
 */
export function CompoundChart({ data, height = 340, nowTime, markers = [] }: {
  data: CompoundPoint[];
  height?: number;
  /** Draw a "now" line at this time key. */
  nowTime?: string;
  markers?: { x: string; label: string }[];
}) {
  const hourly = data[0]?.time.length > 10;
  // AQI above 500 is off the official scale; clip so one dust storm doesn't flatten the rest.
  const rows = data.map((d) => ({ ...d, aqiPlot: d.aqi == null ? undefined : Math.min(d.aqi, 500) }));
  const hasScore = rows.some((d) => d.score != null);
  const hasAir = rows.some((d) => d.aqiPlot != null);
  const peak = rows.reduce<CompoundPoint | null>((p, d) => (d.score != null && (!p || d.score > (p.score ?? -1)) ? d : p), null);

  const wbgts = rows.map((d) => d.wbgt);
  const wMin = Math.min(15, Math.floor(Math.min(...wbgts)) - 1);
  const wMax = Math.max(36, Math.ceil(Math.max(...wbgts)) + 1);
  const aMax = Math.max(150, Math.ceil(Math.max(...rows.map((d) => d.aqiPlot ?? 0)) / 50) * 50);

  const panels = [hasScore && "score", "wbgt", hasAir && "aqi"].filter(Boolean) as string[];
  const each = Math.max(96, Math.round((height - 22) / panels.length));
  const common = { rows, hourly, nowTime, markers, peak };

  const title = (text: string, extra?: string) => (
    <div className="flex items-baseline justify-between gap-2 ps-1 text-xs">
      <span className="font-medium text-foreground">{text}</span>
      {extra && <span className="text-muted-foreground">{extra}</span>}
    </div>
  );

  return (
    <div className="space-y-2" role="img" aria-label="Compound risk score, heat stress and air quality over time, in three aligned panels">
      {markers.length > 0 && (
        <p className="text-xs text-muted-foreground">Dashed line: {markers.map((m) => `${m.label} (${formatDay(m.x)})`).join(", ")}.</p>
      )}
      {hasScore && (
        <div>
          {title("Compound score (0–100)", peak?.score != null ? `Peak ${peak.score} ${compoundBand(peak.score).level} · ${hourly ? `${formatDay(peak.time)} ${peak.time.slice(11, 16)}` : formatDay(peak.time)}` : undefined)}
          <Panel
            {...common}
            dataKey="score"
            name="Compound"
            domain={[0, 100]}
            bands={COMPOUND_BANDS.map((b, i) => ({ from: i === 0 ? 0 : COMPOUND_BANDS[i - 1].max, to: b.max, color: b.color }))}
            format={(v) => `${v}/100 (${compoundBand(v).level})`}
            height={each}
            showX={panels[panels.length - 1] === "score"}
          />
        </div>
      )}
      <div>
        {title("Heat stress (WBGT °C)")}
        <Panel
          {...common}
          dataKey="wbgt"
          name="WBGT"
          unit="°"
          domain={[wMin, wMax]}
          bands={RISK_BANDS.map((b, i) => ({ from: i === 0 ? wMin : b.min, to: RISK_BANDS[i + 1]?.min ?? wMax, color: b.color }))}
          format={(v) => `${v.toFixed(1)} °C (${classifyRisk(v)})`}
          height={each}
          showX={panels[panels.length - 1] === "wbgt"}
        />
      </div>
      {hasAir && (
        <div>
          {title("Air quality (US AQI)")}
          <Panel
            {...common}
            dataKey="aqiPlot"
            name="AQI"
            domain={[0, aMax]}
            bands={AQI_BANDS.map((b, i) => ({ from: i === 0 ? 0 : AQI_BANDS[i - 1].max, to: Math.min(b.max, aMax), color: b.color }))}
            format={(v, row) => `${formatAqi(row?.aqi ?? v)} (${aqiBand(row?.aqi ?? v).label})`}
            height={each}
            showX
          />
        </div>
      )}
    </div>
  );
}
