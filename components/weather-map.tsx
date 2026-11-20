"use client";

import { useState } from "react";
import Link from "next/link";
import { MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useFieldMode } from "@/lib/use-field-mode";
import { useTheme } from "next-themes";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { aqiBand, formatAqi } from "@/lib/air";
import { cityHref, cityKey, type City } from "@/lib/cities";
import { analyzeSunlight, LEVEL_LABEL, VITD_COLORS } from "@/lib/health-advisor";
import { compoundBand, RISK_COLORS } from "@/lib/risk";
import { ok, type CityState } from "@/lib/use-cities";
import { workRegimen, type Intensity, type WorkerContext } from "@/lib/work-rest";

export type MapMode = "compound" | "heat" | "air" | "vitd" | "work";

interface Props {
  cities: City[];
  data: Record<string, CityState>;
  mode: MapMode;
  /** For mode "work": colour by the work–rest regimen for this work type at today’s peak heat. */
  work?: Intensity;
  /** Crew clothing and acclimatisation for the "work" mode. */
  ctx?: WorkerContext;
}

const NO_DATA = "#64748b";

// Load with next/dynamic({ ssr: false }) — Leaflet needs `window`.
export default function WeatherMap({ cities, data, mode, work = "heavy", ctx }: Props) {
  const { resolvedTheme } = useTheme();
  const { t } = useT();
  const [field] = useFieldMode();
  const [show, setShow] = useState(false);
  // Esri grey canvas: free with attribution, no API key (CARTO now requires one).
  const tiles = resolvedTheme === "dark" ? "World_Dark_Gray_Base" : "World_Light_Gray_Base";
  const bounds: LatLngBoundsExpression | undefined = cities.length
    ? [
        [Math.min(...cities.map((c) => c.lat)) - 3, Math.min(...cities.map((c) => c.lon)) - 3],
        [Math.max(...cities.map((c) => c.lat)) + 3, Math.max(...cities.map((c) => c.lon)) + 3],
      ]
    : undefined;

  // Field mode: no map until asked for (map tiles cost data and battery).
  if (field && !show) {
    return (
      <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center text-sm text-muted-foreground">
        <p>{t("mapOffField")}</p>
        <Button variant="outline" onClick={() => setShow(true)}><MapIcon /> {t("showMap")}</Button>
      </div>
    );
  }

  return (
    // z-0 keeps Leaflet's internal z-indexes (up to 1000) below dialogs.
    <div className="relative z-0 h-full min-h-[300px] overflow-hidden rounded-lg border sm:min-h-[420px]">
      <MapContainer
        bounds={bounds}
        center={bounds ? undefined : [20, 40]}
        zoom={bounds ? undefined : 2}
        minZoom={2}
        scrollWheelZoom={false}
        worldCopyJump
        className="h-full w-full"
      >
        <TileLayer
          key={tiles}
          attribution="Tiles &copy; Esri, Esri, HERE, Garmin, OpenStreetMap contributors"
          url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${tiles}/MapServer/tile/{z}/{y}/{x}`}
          maxZoom={16}
        />
        {cities.map((city) => {
          const s = data[cityKey(city)];
          const c = ok(s) ? s : null;
          const today = c?.days[0];
          const air = c?.now.air;
          const regimen = mode === "work" && today ? workRegimen(today.maxWbgt, work, ctx) : null;
          const sun = mode === "vitd" && c && today ? analyzeSunlight(c.hours.filter((h) => h.time.startsWith(today.date)), city.lat) : null;
          // Heat and compound use today's peak, not this instant: on a world map half the cities are in night.
          let color = NO_DATA;
          let radius = 7;
          if (mode === "compound" && today?.maxScore != null) {
            color = compoundBand(today.maxScore).color;
            radius = 4 + (today.maxScore / 100) * 11;
          } else if (mode === "heat" && today) {
            color = RISK_COLORS[today.risk];
          } else if (mode === "air" && air) {
            color = aqiBand(air.aqi).color;
          } else if (regimen) {
            color = regimen.color;
          } else if (sun) {
            color = VITD_COLORS[sun.risk];
          }
          return (
            <CircleMarker
              key={cityKey(city)}
              center={[city.lat, city.lon]}
              radius={radius}
              pathOptions={{ color: "#0a0a0f", weight: 1.5, fillColor: color, fillOpacity: 0.9 }}
            >
              <Popup>
                <strong>{city.name}</strong>, {city.country}
                <br />
                {regimen && today ? (
                  <>
                    At today’s peak (WBGT {today.maxWbgt.toFixed(1)} °C): <strong>{regimen.label}</strong>
                  </>
                ) : sun ? (
                  <>
                    Vitamin D need: <strong>{LEVEL_LABEL[sun.risk]}</strong>
                    <br />
                    Daytime UV average {sun.avgUv.toFixed(1)}, {sun.uvHours} h at UV 3+
                  </>
                ) : c && today ? (
                  <>
                    {today.maxScore != null && (
                      <>
                        Compound risk today: <strong>{today.maxScore}/100</strong> ({today.level})
                        <br />
                      </>
                    )}
                    Peak WBGT today: {today.maxWbgt.toFixed(1)} °C ({today.risk})
                    {air && (
                      <>
                        <br />
                        Air now: AQI {formatAqi(air.aqi)}, {aqiBand(air.aqi).label}
                      </>
                    )}
                  </>
                ) : s ? (
                  "Data unavailable"
                ) : (
                  "Loading…"
                )}
                <br />
                <Link href={cityHref(city)}>Details and safe hours →</Link>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
