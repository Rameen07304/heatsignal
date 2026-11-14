"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchCities, type CityResult } from "@/lib/weather";
import type { City } from "@/lib/cities";

export function CitySearch({ onSelect }: { onSelect: (city: City) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    setError(false);
    if (q.length < 2) {
      setResults(null);
      return;
    }
    let live = true;
    setLoading(true);
    const timer = setTimeout(() => {
      searchCities(q)
        .then((r) => live && setResults(r))
        .catch(() => live && setError(true))
        .finally(() => live && setLoading(false));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);

  const open = query.trim().length >= 2 && (results !== null || error);

  return (
    <div className="relative z-30 w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="city-results"
        aria-label="Search for a city to monitor"
        placeholder="Add any city worldwide…"
        className="pl-9"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery("");
          if (e.key === "Enter" && results?.[0]) {
            onSelect(results[0]);
            setQuery("");
          }
        }}
      />
      {loading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
      {open && (
        <ul
          id="city-results"
          role="listbox"
          className="absolute mt-1 w-full overflow-hidden rounded-md border bg-card shadow-lg"
        >
          {error && <li className="px-3 py-2 text-sm text-destructive">Search failed. Check your connection.</li>}
          {results?.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No cities found.</li>}
          {results?.map((r) => (
            <li key={`${r.lat},${r.lon}`} role="option" aria-selected={false}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                onClick={() => {
                  onSelect({ name: r.name, country: r.country, lat: r.lat, lon: r.lon });
                  setQuery("");
                }}
              >
                <span className="font-medium">{r.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {[r.region, r.country].filter(Boolean).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
