"use client";

import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { aqiBand, type AirNow } from "@/lib/air";
import { cityHref, cityKey, type City } from "@/lib/cities";
import { RISK_COLORS } from "@/lib/risk";
import type { Forecast } from "@/lib/weather";

interface Props {
  cities: City[];
  forecasts: Record<string, Forecast | Error | undefined>;
  air: Record<string, AirNow | null | undefined>;
  /** What the marker colour shows. */
  mode: "heat" | "smog";
}

const NO_DATA = "#64748b";

// Load with next/dynamic({ ssr: false }) — Leaflet needs `window`.
export default function WeatherMap({ cities, forecasts, air, mode }: Props) {
  return (
    // z-0 keeps Leaflet's internal z-indexes (up to 1000) below dialogs and the search dropdown.
    <div className="relative z-0 h-[420px] overflow-hidden rounded-lg border">
      <MapContainer center={[20, 40]} zoom={2} minZoom={2} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cities.map((city) => {
          const f = forecasts[cityKey(city)];
          const ok = f && !(f instanceof Error) ? f : null;
          const a = air[cityKey(city)];
          // Heat is coloured by today's peak, not this instant: on a world map half the cities are in night.
          const color =
            mode === "smog" ? (a ? aqiBand(a.aqi).color : NO_DATA) : ok ? RISK_COLORS[ok.daily[0].risk] : NO_DATA;
          return (
            <CircleMarker
              key={cityKey(city)}
              center={[city.lat, city.lon]}
              radius={7}
              pathOptions={{ color: "#0f172a", weight: 1.5, fillColor: color, fillOpacity: 0.95 }}
            >
              <Popup>
                <strong>{city.name}</strong>
                <br />
                {ok
                  ? `Heat today: ${ok.daily[0].risk}, peak WBGT ${ok.daily[0].maxWbgt.toFixed(1)} °C`
                  : f
                    ? "Weather data unavailable"
                    : "Loading…"}
                {a && (
                  <>
                    <br />
                    Air now: AQI {Math.round(a.aqi)}, {aqiBand(a.aqi).label}
                  </>
                )}
                <br />
                <Link href={cityHref(city)}>Details and safe hours</Link>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
