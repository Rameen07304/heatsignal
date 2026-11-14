"use client";

import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cityHref, cityKey, type City } from "@/lib/cities";
import { RISK_COLORS } from "@/lib/risk";
import type { Forecast } from "@/lib/weather";

interface Props {
  cities: City[];
  forecasts: Record<string, Forecast | Error | undefined>;
}

// Load with next/dynamic({ ssr: false }) — Leaflet needs `window`.
export default function WeatherMap({ cities, forecasts }: Props) {
  return (
    // z-0 keeps Leaflet's internal z-indexes (up to 1000) below dialogs and the search dropdown.
    <div className="relative z-0 h-[360px] overflow-hidden rounded-lg border">
      <MapContainer center={[27, 75]} zoom={3} minZoom={2} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cities.map((city) => {
          const f = forecasts[cityKey(city)];
          const ok = f && !(f instanceof Error) ? f : null;
          const color = ok ? RISK_COLORS[ok.current.risk] : "#64748b";
          return (
            <CircleMarker
              key={cityKey(city)}
              center={[city.lat, city.lon]}
              radius={10}
              pathOptions={{ color: "#0f172a", weight: 2, fillColor: color, fillOpacity: 0.95 }}
            >
              <Popup>
                <strong>{city.name}</strong>
                <br />
                {ok
                  ? `${ok.current.risk} risk · WBGT ${ok.current.wbgt.toFixed(1)} °C · ${ok.current.temp.toFixed(1)} °C`
                  : f
                    ? "Weather data unavailable"
                    : "Loading…"}
                <br />
                <Link href={cityHref(city)}>View details</Link>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
