"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState } from "@/components/error-state";
import { GaugeRing } from "@/components/gauge-ring";
import { CompoundBadge } from "@/components/risk-badge";
import { aqiBand, fetchAir, formatAqi } from "@/lib/air";
import { cityHref, type City } from "@/lib/cities";
import { buildConditions, nextHours, type Conditions } from "@/lib/conditions";
import { COMPOUND_BANDS, RISK_COLORS, compoundBand, uvBand } from "@/lib/risk";
import { useAsync } from "@/lib/use-async";
import { fetchForecast } from "@/lib/weather";

interface Props {
  params: Promise<{ lat1: string; lon1: string; lat2: string; lon2: string }>;
  searchParams: Promise<{ n1?: string; c1?: string; n2?: string; c2?: string }>;
}

const COLORS = ["#6366f1", "#f97316"];
const AXIS = "hsl(var(--muted-foreground))";

function parse(lat: string, lon: string, name?: string, country?: string): City | null {
  const a = Number(lat);
  const b = Number(lon);
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { name: name?.slice(0, 100) || `${a}, ${b}`, country: country?.slice(0, 100) ?? "", lat: a, lon: b };
}

const load = async (c: City) => {
  const [f, air] = await Promise.all([fetchForecast(c.lat, c.lon), fetchAir(c.lat, c.lon).catch(() => undefined)]);
  return buildConditions(f, air);
};

/** Plain-language summary of which city is worse and why. */
function verdict(a: City, ca: Conditions, b: City, cb: Conditions): string {
  const sa = ca.now.score;
  const sb = cb.now.score;
  if (sa == null || sb == null) {
    const d = ca.now.wbgt - cb.now.wbgt;
    return `${d >= 0 ? a.name : b.name} has ${Math.abs(d).toFixed(1)} °C higher heat stress (WBGT) right now.`;
  }
  if (sa === sb) return `${a.name} and ${b.name} have the same compound risk right now (${sa}/100).`;
  const [hi, lo, ch, cl] = sa > sb ? [a, b, ca, cb] : [b, a, cb, ca];
  const heatGap = 0.45 * (Math.min(ch.now.wbgt / 40, 1) - Math.min(cl.now.wbgt / 40, 1));
  const airGap = 0.4 * (Math.min((ch.now.air?.aqi ?? 0) / 300, 1) - Math.min((cl.now.air?.aqi ?? 0) / 300, 1));
  const uvGap = 0.15 * (Math.min((ch.now.air?.uv ?? 0) / 11, 1) - Math.min((cl.now.air?.uv ?? 0) / 11, 1));
  const reason =
    airGap >= heatGap && airGap >= uvGap
      ? `worse air quality (AQI ${formatAqi(ch.now.air!.aqi)} vs ${formatAqi(cl.now.air?.aqi ?? 0)})`
      : heatGap >= uvGap
        ? `higher heat stress (WBGT ${ch.now.wbgt.toFixed(1)} °C vs ${cl.now.wbgt.toFixed(1)} °C)`
        : `stronger UV (${(ch.now.air?.uv ?? 0).toFixed(0)} vs ${(cl.now.air?.uv ?? 0).toFixed(0)})`;
  const gap = Math.abs(sa - sb);
  return `${hi.name} is currently ${gap} point${gap === 1 ? "" : "s"} higher risk than ${lo.name}, primarily due to ${reason}.`;
}

export default function ComparePage(props: Props) {
  const params = use(props.params);
  const searchParams = use(props.searchParams);
  const a = parse(params.lat1, params.lon1, searchParams.n1, searchParams.c1);
  const b = parse(params.lat2, params.lon2, searchParams.n2, searchParams.c2);
  const result = useAsync(async () => {
    if (!a || !b) throw new Error("Invalid coordinates");
    return Promise.all([load(a), load(b)]);
  }, [params.lat1, params.lon1, params.lat2, params.lon2]);
  const pair = result.data;

  return (
    <div className="space-y-6">
      <Link href={a ? cityHref(a) : "/"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">
        <span style={{ color: COLORS[0] }}>{a?.name ?? "?"}</span> <span className="text-muted-foreground">vs</span>{" "}
        <span style={{ color: COLORS[1] }}>{b?.name ?? "?"}</span>
      </h1>

      {result.loading && <Skeleton className="h-96 w-full rounded-lg" />}
      {result.error && <ErrorState message="Couldn’t load both cities." onRetry={result.retry} />}

      {pair && a && b && (() => {
        const [ca, cb] = pair;
        const both = [
          { city: a, c: ca },
          { city: b, c: cb },
        ];
        // Each city's timeline is in its own local time, so align by hours from now.
        const ha = nextHours(ca, 120);
        const hb = nextHours(cb, 120);
        const chart = Array.from({ length: Math.min(ha.length, hb.length) }, (_, i) => ({
          h: i,
          a: ha[i].score ?? undefined,
          b: hb[i].score ?? undefined,
        })).filter((r) => r.a != null || r.b != null);
        const rows: [string, (c: Conditions) => string][] = [
          ["Temperature", (c) => `${c.now.temp.toFixed(1)} °C`],
          ["Feels like", (c) => (c.now.feels != null ? `${c.now.feels.toFixed(1)} °C` : "–")],
          ["Humidity", (c) => `${c.now.rh.toFixed(0)} %`],
          ["Wind", (c) => `${c.now.wind.toFixed(0)} km/h`],
          ["WBGT (heat stress)", (c) => `${c.now.wbgt.toFixed(1)} °C · ${c.now.risk}`],
          ["Today’s peak WBGT", (c) => `${c.days[0].maxWbgt.toFixed(1)} °C at ${c.days[0].peakHour}`],
          ["US AQI", (c) => (c.now.air ? `${formatAqi(c.now.air.aqi)} · ${aqiBand(c.now.air.aqi).label}` : "–")],
          ["PM2.5", (c) => (c.now.air ? `${c.now.air.pm25.toFixed(0)} µg/m³` : "–")],
          ["Ozone", (c) => (c.now.air ? `${c.now.air.o3.toFixed(0)} µg/m³` : "–")],
          ["UV index", (c) => (c.now.air ? `${c.now.air.uv.toFixed(0)} · ${uvBand(c.now.air.uv).label}` : "–")],
          ["Compound score now", (c) => (c.now.score != null ? `${c.now.score}/100 · ${c.now.level}` : "–")],
          ["Today’s peak compound", (c) => (c.days[0].maxScore != null ? `${c.days[0].maxScore}/100 · ${c.days[0].level}` : "–")],
          ["Local time", (c) => c.now.time.slice(11, 16)],
        ];
        return (
          <>
            <Card className="border-primary/40">
              <CardContent className="p-4 text-lg font-medium">{verdict(a, ca, b, cb)}</CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {both.map(({ city, c }, i) => (
                <Card key={i} style={{ borderColor: `${COLORS[i]}80` }}>
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle><Link href={cityHref(city)} className="hover:underline" style={{ color: COLORS[i] }}>{city.name}</Link></CardTitle>
                      <CardDescription>{city.country}</CardDescription>
                    </div>
                    {c.now.score != null && <CompoundBadge score={c.now.score} />}
                  </CardHeader>
                  <CardContent className="flex justify-around">
                    <GaugeRing label="Heat" fraction={c.now.wbgt / 40} color={RISK_COLORS[c.now.risk]} value={c.now.wbgt.toFixed(1)} unit="°C WBGT" sub={c.now.risk} size={90} />
                    {c.now.air ? (
                      <GaugeRing label="Air" fraction={c.now.air.aqi / 300} color={aqiBand(c.now.air.aqi).color} value={formatAqi(c.now.air.aqi)} unit="US AQI" sub={aqiBand(c.now.air.aqi).label.replace(" for sensitive groups", " (sens.)")} size={90} />
                    ) : (
                      <GaugeRing label="Air" fraction={0} color="#64748b" value="–" size={90} />
                    )}
                    {c.now.score != null ? (
                      <GaugeRing label="Combined" fraction={c.now.score / 100} color={compoundBand(c.now.score).color} value={String(c.now.score)} unit="/ 100" sub={c.now.level ?? undefined} size={90} />
                    ) : (
                      <GaugeRing label="Combined" fraction={0} color="#64748b" value="–" size={90} />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Compound risk, next days</CardTitle>
                <CardDescription>Hours from now (each city in its own local time). Shaded bands are the compound-risk levels.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart} margin={{ top: 10, right: 12, bottom: 0, left: -16 }}>
                      {COMPOUND_BANDS.map((band, i) => (
                        <ReferenceArea key={band.level} y1={i === 0 ? 0 : COMPOUND_BANDS[i - 1].max} y2={band.max} fill={band.color} fillOpacity={0.08} stroke="none" />
                      ))}
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="h" ticks={chart.filter((r) => r.h % 24 === 0).map((r) => r.h)} tickFormatter={(h: number) => (h === 0 ? "Now" : `+${h / 24}d`)} tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: AXIS, fontSize: 11 }} stroke={AXIS} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        labelFormatter={(h) => (Number(h) === 0 ? "Now" : `In ${h} hours`)}
                        formatter={(v, name) => [`${v}/100 (${compoundBand(Number(v)).level})`, name === "a" ? a.name : b.name]}
                      />
                      <Legend formatter={(v) => (v === "a" ? a.name : b.name)} wrapperStyle={{ fontSize: 12 }} />
                      <Line dataKey="a" stroke={COLORS[0]} strokeWidth={2.5} dot={false} />
                      <Line dataKey="b" stroke={COLORS[1]} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Side by side</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Measure</TableHead>
                      <TableHead style={{ color: COLORS[0] }}>{a.name}</TableHead>
                      <TableHead style={{ color: COLORS[1] }}>{b.name}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(([label, f]) => (
                      <TableRow key={label}>
                        <TableCell className="text-muted-foreground">{label}</TableCell>
                        <TableCell className="font-medium">{f(ca)}</TableCell>
                        <TableCell className="font-medium">{f(cb)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        );
      })()}
    </div>
  );
}
