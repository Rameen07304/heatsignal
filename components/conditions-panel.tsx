import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GaugeRing } from "@/components/gauge-ring";
import { AqiBadge, RiskBadge } from "@/components/risk-badge";
import { WHO_PM25_DAILY, aqiBand, formatAqi } from "@/lib/air";
import type { CombinedDay, CombinedHour } from "@/lib/conditions";
import { RISK_COLORS, uvBand } from "@/lib/risk";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-xs tabular-nums">
      {label} <span className="font-semibold">{value.toFixed(0)}</span>
    </span>
  );
}

/** Danger line used for "above/below threshold": the start of High heat risk. */
const HIGH_WBGT = 30;

export function ConditionsPanel({ now, today, minTemp }: { now: CombinedHour; today: CombinedDay; minTemp: number }) {
  const air = now.air;
  const gap = now.wbgt - HIGH_WBGT;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Temperature</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-5xl font-bold tracking-tight tabular-nums">{now.temp.toFixed(1)}°</div>
          <div className="space-y-1">
            {now.feels != null && <Row label="Feels like" value={`${now.feels.toFixed(1)} °C`} />}
            <Row label="Today min / max" value={`${minTemp.toFixed(0)}° / ${today.maxTemp.toFixed(0)}°`} />
            <Row label="Humidity" value={`${now.rh.toFixed(0)} %`} />
            <Row label="Wind" value={`${now.wind.toFixed(0)} km/h`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm text-muted-foreground">Heat stress</CardTitle>
          <RiskBadge level={now.risk} />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2">
          <GaugeRing label="WBGT" fraction={now.wbgt / 40} color={RISK_COLORS[now.risk]} value={now.wbgt.toFixed(1)} unit="°C" size={120} />
          <p className="text-center text-sm">
            <span className="font-semibold tabular-nums" style={{ color: gap >= 0 ? "#b91c1c" : undefined }}>
              {Math.abs(gap).toFixed(1)} °C {gap >= 0 ? "above" : "below"}
            </span>{" "}
            the High-risk threshold ({HIGH_WBGT} °C)
          </p>
          <p className="text-xs text-muted-foreground">Today’s peak {today.maxWbgt.toFixed(1)} °C at {today.peakHour}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm text-muted-foreground">Air quality</CardTitle>
          {air && <AqiBadge aqi={air.aqi} short />}
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2">
          {air ? (
            <>
              <GaugeRing label="US AQI" fraction={air.aqi / 300} color={aqiBand(air.aqi).color} value={formatAqi(air.aqi)} size={120} sub={aqiBand(air.aqi).label} />
              <div className="flex flex-wrap justify-center gap-1">
                <Pill label="PM2.5" value={air.pm25} />
                <Pill label="PM10" value={air.pm10} />
                <Pill label="O₃" value={air.o3} />
                <Pill label="NO₂" value={air.no2} />
                <Pill label="SO₂" value={air.so2} />
                <Pill label="CO" value={air.co} />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                µg/m³.{" "}
                {air.pm25 > WHO_PM25_DAILY && `PM2.5 is ${(air.pm25 / WHO_PM25_DAILY).toFixed(1)}× the WHO daily guideline.`}
              </p>
            </>
          ) : (
            <p className="py-10 text-sm text-muted-foreground">No air-quality data for this location.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">UV &amp; dust</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {air ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight tabular-nums">
                  {air.uv.toFixed(0)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: uvBand(air.uv).color }} />UV {uvBand(air.uv).label}</span>
              </div>
              <div className="space-y-1">
                <Row label="Desert dust" value={`${air.dust.toFixed(0)} µg/m³`} />
                <Row label="Solar radiation" value={`${now.solar.toFixed(0)} W/m²`} />
              </div>
              <p className="text-xs text-muted-foreground">
                {air.uv >= 6 ? "Sun protection needed: hat, sunglasses, SPF 30+." : "Little sunburn risk at this hour."}
              </p>
            </>
          ) : (
            <Row label="Solar radiation" value={`${now.solar.toFixed(0)} W/m²`} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
