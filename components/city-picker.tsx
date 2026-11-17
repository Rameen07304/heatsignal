"use client";

import { useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddCityDialog } from "@/components/city-search";
import { WORLD_CITIES, cityKey, type City } from "@/lib/cities";
import { useCities } from "@/lib/use-cities";

const NONE = new Set<string>();

/** Great-circle distance in km. */
function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Choose a location: monitored cities, a worldwide search, or the browser's own position. */
export function CityPicker({ value, onChange, label = "Location" }: { value: City; onChange: (c: City) => void; label?: string }) {
  const { cities } = useCities();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = [...cities].sort((a, b) => a.name.localeCompare(b.name));
  if (!options.some((c) => cityKey(c) === cityKey(value))) options.unshift(value);

  function locate() {
    if (!navigator.geolocation) return setError("This browser can’t share its location.");
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here = { lat: Number(coords.latitude.toFixed(2)), lon: Number(coords.longitude.toFixed(2)) };
        // No reverse geocoding: name it after the nearest known city when it is close.
        const near = WORLD_CITIES.reduce((a, b) => (km(here, b) < km(here, a) ? b : a));
        const d = km(here, near);
        onChange({
          ...here,
          name: d < 40 ? `${near.name} (your location)` : `Your location (${here.lat}, ${here.lon})`,
          country: d < 40 ? near.country : "",
        });
        setLocating(false);
      },
      (e) => {
        setError(e.code === e.PERMISSION_DENIED ? "Location permission was denied." : "Couldn’t get your location.");
        setLocating(false);
      },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          <span className="mb-1 block">{label}</span>
          <select
            className="h-9 w-60 rounded-md border bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={cityKey(value)}
            onChange={(e) => onChange(options.find((o) => cityKey(o) === e.target.value) ?? value)}
          >
            {options.map((o) => <option key={cityKey(o)} value={cityKey(o)}>{o.name}{o.country ? `, ${o.country}` : ""}</option>)}
          </select>
        </label>
        <AddCityDialog onAdd={onChange} monitored={NONE} label="Search" title="Find a place" variant="outline" />
        <Button variant="outline" onClick={locate} disabled={locating}>
          {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} Use my location
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
